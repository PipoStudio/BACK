#!/usr/bin/env python3
"""
assign_images_for_inventory.py

Empareja photos.json -> inventario.json, crea variantes a partir de 'colores' si es necesario,
y asigna imagen_principal / imagenes / variantes[].imagenes.

Uso:
  # dry-run (no escribe)
  python .\scripts\assign_images_for_inventory.py --inventory .\json\inventario.json --photos .\json\photos.json --dry-run -v

  # aplicar cambios (hace backup inventario.backup.json)
  python .\scripts\assign_images_for_inventory.py --inventory .\json\inventario.json --photos .\json\photos.json -v

Opciones:
  -i / --inventory   : ruta inventario (default json/inventario.json)
  -p / --photos      : ruta photos (default json/photos.json)
  -o / --output      : ruta salida (si no se indica, sobrescribe inventario con backup)
  --min-score        : umbral mínimo para aceptar asignación (default 30)
  --dry-run          : no escribe cambios
  -v / --verbose     : verbose
"""
from __future__ import annotations
import json
import argparse
from pathlib import Path
import shutil
import re
import difflib
from typing import List, Dict, Any

# Prioridad de posición: frontal (F) preferida como imagen_principal
POS_PRIORITY = {'F': 0, 'P': 1, 'L': 2, 'T': 3}
TOKEN_RE = re.compile(r'[a-z0-9]+', re.I)

def norm(s: str) -> str:
    if not s: return ''
    # normalizar acentos no estrictamente necesario; quitamos no alfanuméricos
    s2 = s.lower()
    return re.sub(r'[^a-z0-9]+', ' ', s2).strip()

def tokens(s: str) -> List[str]:
    if not s: return []
    return TOKEN_RE.findall(s.lower())

def slug(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', (s or '').strip().lower()).strip('-')

def parse_nuevo_nombre(name: str) -> Dict[str, Any]:
    """
    Extrae product_key, pos (F/T/L/P), color token y index de nuevo_nombre.
    Ejemplo: MiyooMiniPlus_F_RetrGrey_1.webp -> product_key=MiyooMiniPlus, pos=F, color=RetrGrey, index=1
    """
    out = {'product_key': None, 'pos': None, 'color': None, 'index': None, 'stem': None}
    if not name:
        return out
    fname = name.split('/')[-1]
    stem = re.sub(r'\.[^.]+$', '', fname, flags=re.I)
    out['stem'] = stem
    parts = re.split(r'[_\-\s]+', stem)
    pos_idx = None
    for i, t in enumerate(parts):
        if len(t) == 1 and t.upper() in POS_PRIORITY:
            pos_idx = i
            out['pos'] = t.upper()
            break
    if pos_idx is not None:
        if pos_idx >= 1:
            out['product_key'] = '_'.join(parts[:pos_idx])
        if pos_idx + 1 < len(parts):
            out['color'] = parts[pos_idx+1]
        # trailing numeric index
        for j in range(len(parts)-1, pos_idx, -1):
            if parts[j].isdigit():
                out['index'] = int(parts[j]); break
        return out
    # fallback pattern: NamePOSColorIdx (ej. AlienwareFcosmic1)
    m = re.match(r'^(.+?)([FTLP])([A-Za-z0-9]+)(\d*)$', stem, flags=re.I)
    if m:
        out['product_key'] = m.group(1)
        out['pos'] = m.group(2).upper()
        out['color'] = m.group(3)
        if m.group(4).isdigit(): out['index'] = int(m.group(4))
        return out
    # fallback: no pos
    out['product_key'] = stem
    return out

def load_inventory(path: Path) -> (List[Dict[str,Any]], Any):
    raw = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(raw, dict) and isinstance(raw.get('productos'), list):
        return raw['productos'], raw
    if isinstance(raw, list):
        return raw, None
    raise RuntimeError("inventario.json formato no soportado")

def load_photos(path: Path) -> List[Dict[str,Any]]:
    raw = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(raw, list):
        return raw
    raise RuntimeError("photos.json debe ser un array")

def prepare_products_variants(inventory: List[Dict[str,Any]], verbose=False):
    """
    Si producto.variantes está vacío y producto.colores tiene elementos validos,
    crear variantes por cada color. Normaliza campo colores (splitar por ',' '/' ' y ').
    """
    for p in inventory:
        # normalize colores array (acepta strings con separadores)
        raw = p.get('colores')
        colors = []
        if isinstance(raw, list):
            for c in raw:
                if isinstance(c, str):
                    # split by common separators in case someone put "A / B" as a single string
                    for part in re.split(r'[\/,;]| y ', c):
                        tok = part.strip()
                        if tok:
                            colors.append(tok)
        elif isinstance(raw, str):
            for part in re.split(r'[\/,;]| y ', raw):
                tok = part.strip()
                if tok:
                    colors.append(tok)
        # dedupe preserving order
        seen = set(); uniq = []
        for c in colors:
            key = c.strip()
            if not key: continue
            if key.lower() in seen: continue
            seen.add(key.lower()); uniq.append(key)
        p['colores'] = uniq

        # create variantes if empty and there are colores
        if (not p.get('variantes')) and uniq:
            p['variantes'] = []
            for idx, color in enumerate(uniq):
                variant = {
                    'id': f"{p.get('id')}-{slug(color)}",
                    'nombre': f"{p.get('nombre')} - {color}",
                    'color': color,
                    # images will be assigned later
                }
                p['variantes'].append(variant)
            if verbose:
                print(f"[VARIANTS CREATED] product id={p.get('id')} colors={uniq}")

def score_photo_to_product(p: Dict[str,Any], entry: Dict[str,Any]) -> float:
    """
    Scoring heuristics (higher better):
      - sku in filename/url: +120
      - product id in filename/url: +100
      - product_key exact match: +80
      - token overlap: +10 per token (max 50)
      - difflib ratio between stem and product name scaled up to 50
      - color token match with product.colores: +25
    """
    score = 0.0
    fname = (entry.get('nuevo_nombre') or '') 
    url = (entry.get('url_cdn') or entry.get('url') or '') 
    stem = re.sub(r'\.[^.]+$','', fname.split('/')[-1]) if fname else ''
    prod_name = p.get('nombre') or p.get('name') or ''
    prod_sku = (p.get('sku') or '') 
    prod_id = str(p.get('id') or '')

    if prod_sku and prod_sku.lower() in fname.lower(): score += 120
    if prod_sku and prod_sku.lower() in url.lower(): score += 120

    if prod_id and prod_id in fname: score += 100
    if prod_id and prod_id in url: score += 100

    parsed_key = entry.get('_parsed', {}).get('product_key')
    if parsed_key and parsed_key.strip():
        if parsed_key.lower() in norm(prod_name):
            score += 80

    # token overlap
    t_photo = set(tokens(stem + ' ' + fname))
    t_prod = set(tokens(prod_name))
    if t_photo and t_prod:
        overlap = t_photo.intersection(t_prod)
        score += min(5, len(overlap)) * 10

    # difflib ratio
    try:
        ratio = difflib.SequenceMatcher(None, norm(stem), norm(prod_name)).ratio()
        score += ratio * 50
    except Exception:
        pass

    # color token
    p_colors = [c.lower() for c in (p.get('colores') or []) if c]
    parsed_color = (entry.get('_parsed', {}).get('color') or '').lower()
    if parsed_color and any(parsed_color in pc or pc in parsed_color for pc in p_colors):
        score += 25

    # also give smaller score if any color token appears in filename
    for pc in p_colors:
        if pc and pc.replace(' ','') and pc.replace(' ','') in fname.lower().replace(' ',''):
            score += 10

    return score

def assign(entries: List[Dict[str,Any]], inventory: List[Dict[str,Any]], min_score=30, verbose=False):
    """
    Asigna entradas fotos a productos y (si posible) a variantes por color.
    Devuelve stats y listas de unassigned
    """
    # pre-parse entries
    for e in entries:
        e['_parsed'] = parse_nuevo_nombre(e.get('nuevo_nombre') or e.get('filename') or '')
        e['_url'] = e.get('url_cdn') or e.get('url') or e.get('src') or ''
        e['_stem'] = e['_parsed'].get('stem') or (e.get('nuevo_nombre') or '').split('/')[-1]

    # compute best product for each entry
    product_assignments: Dict[str, List[Dict[str,Any]]] = {}
    unassigned = []
    for e in entries:
        best_score = -1.0
        best_prod = None
        for p in inventory:
            s = score_photo_to_product(p, e)
            if s > best_score:
                best_score = s
                best_prod = p
        if best_prod and best_score >= min_score:
            pid = str(best_prod.get('id'))
            product_assignments.setdefault(pid, []).append({**e, 'score': best_score})
            if verbose:
                print(f"[ASSIGNED] {e.get('nuevo_nombre')} -> product id={pid} (score {best_score:.1f})")
        else:
            unassigned.append({**e, 'best_score': best_score, 'best_prod': (best_prod.get('id') if best_prod else None)})
            if verbose:
                print(f"[UNASSIGNED] {e.get('nuevo_nombre')} best_score={best_score:.1f} best_prod={(best_prod.get('id') if best_prod else None)}")

    # Now for each product, sort entries and distribute to variant or product level
    stats = {'products_updated':0, 'assigned_images':0, 'variant_images':0}
    for p in inventory:
        pid = str(p.get('id'))
        assigned = product_assignments.get(pid, [])
        if not assigned: continue
        # sort by POS priority, index, score
        def sort_key(ent):
            pos = (ent.get('_parsed',{}).get('pos') or '').upper()
            pos_pr = POS_PRIORITY.get(pos, 99)
            idx = ent.get('_parsed',{}).get('index') or 999
            # want frontal first, and within same pos prefer higher score
            return (pos_pr, idx, -ent.get('score',0))
        assigned_sorted = sorted(assigned, key=sort_key)
        # build unique urls list in order
        urls = []
        for e in assigned_sorted:
            u = e.get('_url')
            if u and u not in urls:
                urls.append(u)
        # choose principal: first 'F' pos if exists else first url
        principal = None
        for e in assigned_sorted:
            if (e.get('_parsed',{}).get('pos') or '').upper() == 'F':
                principal = e.get('_url'); break
        if not principal and urls:
            principal = urls[0]
        changed = False
        # assign on product
        if urls:
            if p.get('imagen_principal') != principal:
                p['imagen_principal'] = principal
                changed = True
            if p.get('imagenes') != urls:
                p['imagenes'] = urls
                changed = True
        # try assign to variants by color token
        variantes = p.get('variantes') or []
        if variantes:
            # build variant color map: normalized -> idx
            vmap = {}
            for i, v in enumerate(variantes):
                vcol = v.get('color') or ''
                if not vcol:
                    # try variantes[].nombre fallback (may include color)
                    vcol = v.get('nombre') or ''
                vmap[norm(vcol)] = i
            # assign each entry that has color / filename match
            for e in assigned_sorted:
                token_color = (e.get('_parsed',{}).get('color') or '').lower()
                assigned_idx = None
                if token_color:
                    # find variant whose normalized color contains token_color or viceversa
                    for vnorm, idx in vmap.items():
                        if not vnorm: continue
                        if token_color in vnorm or vnorm in token_color:
                            assigned_idx = idx; break
                if assigned_idx is None:
                    # try filename contains variant color token
                    fname_norm = norm(e.get('nuevo_nombre') or e.get('filename') or '')
                    for vnorm, idx in vmap.items():
                        if vnorm and vnorm.replace(' ','') in fname_norm.replace(' ',''):
                            assigned_idx = idx; break
                if assigned_idx is not None:
                    variant = variantes[assigned_idx]
                    lst = variant.get('imagenes') or []
                    url = e.get('_url')
                    if url and url not in lst:
                        lst.append(url); variant['imagenes'] = lst; changed = True; stats['variant_images'] += 1
        if changed:
            stats['products_updated'] += 1
            stats['assigned_images'] += len(urls)
    return product_assignments, unassigned, stats

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-i','--inventory', default='json/inventario.json')
    ap.add_argument('-p','--photos', default='json/photos.json')
    ap.add_argument('-o','--output', default=None)
    ap.add_argument('--min-score', type=float, default=30.0)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('-v','--verbose', action='store_true')
    args = ap.parse_args()

    inv_path = Path(args.inventory)
    photos_path = Path(args.photos)
    out_path = Path(args.output) if args.output else None

    if not inv_path.exists():
        print("ERROR: inventario no encontrado:", inv_path); return
    if not photos_path.exists():
        print("ERROR: photos.json no encontrado:", photos_path); return

    inventory, raw_obj = load_inventory(inv_path)
    photos = load_photos(photos_path)

    # normalize photos into expected entries: nuevo_nombre + url_cdn
    entries = []
    for item in photos:
        if isinstance(item, dict):
            entries.append(item)
        elif isinstance(item, str):
            entries.append({'nuevo_nombre': Path(item).name, 'url_cdn': item})
    if args.verbose:
        print(f"Fotos cargadas: {len(entries)}")

    # ensure variantes exist per colores when required
    prepare_products_variants(inventory, verbose=args.verbose)

    assigned_map, unassigned, stats = assign(entries, inventory, min_score=args.min_score, verbose=args.verbose)

    print("---- RESUMEN ----")
    print(f"Productos actualizados: {stats['products_updated']}")
    print(f"Imágenes asignadas (producto-level): {stats['assigned_images']}")
    print(f"Imágenes asignadas a variantes: {stats['variant_images']}")
    print(f"Fotos no asignadas: {len(unassigned)}")

    if args.dry_run:
        print("DRY RUN - no se escribieron cambios.")
        if args.verbose and unassigned:
            print("Ejemplo fotos no asignadas:")
            for u in unassigned[:20]:
                print(" -", u.get('nuevo_nombre'), "(best_score:", u.get('best_score'), "best_prod:", u.get('best_prod'), ")")
        return

    # write output (backup if overwriting)
    if out_path is None:
        backup = inv_path.with_suffix('.backup.json')
        shutil.copy2(inv_path, backup)
        target = inv_path
        print("Backup creado:", backup)
    else:
        target = out_path

    # preserve original shape if raw_obj was dict
    if raw_obj is not None:
        raw_obj['productos'] = inventory
        target.write_text(json.dumps(raw_obj, ensure_ascii=False, indent=2), encoding='utf-8')
    else:
        target.write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding='utf-8')

    print("Escrito:", target)

if __name__ == '__main__':
    main()