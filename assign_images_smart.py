#!/usr/bin/env python3
"""
assign_images_smart.py

Empareja fotos (photos.json) con productos en inventario.json de forma inteligente (fuzzy + heurísticas).
Genera imagen_principal, imagenes y variantes[].imagenes donde aplique.

Uso:
  python scripts/assign_images_smart.py -i json/inventario.json -p json/photos.json -o json/inventario_imagenes.json -v
  python scripts/assign_images_smart.py --dry-run -v

Opciones:
  -i / --inventory  : ruta a inventario.json (array o {productos: []})
  -p / --photos     : ruta a photos.json (lista de objetos con nuevo_nombre + url_cdn)
  -o / --output     : ruta de salida (si se omite, sobrescribe inventario con backup .backup.json)
  --dry-run         : no escribe, solo muestra informe
  --min-score       : umbral mínimo para asignar (defecto 35)
  -v / --verbose    : verbose
"""
from __future__ import annotations
import json
import argparse
from pathlib import Path
import shutil
import re
import difflib
from typing import List, Dict, Any, Tuple

POS_PRIORITY = {'F': 0, 'P': 1, 'L': 2, 'T': 3}
TOKEN_RE = re.compile(r'[a-z0-9]+')

def norm(s: str) -> str:
    if not s:
        return ''
    s2 = s.lower()
    # replace accents/diacritics could be added but keep simple
    return re.sub(r'[^a-z0-9]+', ' ', s2).strip()

def tokens(s: str) -> List[str]:
    return TOKEN_RE.findall((s or '').lower())

def parse_nuevo_nombre(name: str) -> Dict[str, Any]:
    """
    Extrae:
      - product_key: tokens before POS token (best-effort)
      - pos: F/T/L/P if found
      - color: token after pos if exists
      - index: trailing number token if exists
    """
    res = {'product_key': None, 'pos': None, 'color': None, 'index': None, 'stem': None}
    if not name:
        return res
    fname = name.split('/')[-1]
    stem = re.sub(r'\.[^.]+$', '', fname)  # remove extension
    res['stem'] = stem
    parts = re.split(r'[_\-\s]+', stem)
    # find 1-letter POS token
    pos_idx = None
    for i, t in enumerate(parts):
        if len(t) == 1 and t.upper() in POS_PRIORITY:
            pos_idx = i
            res['pos'] = t.upper()
            break
    if pos_idx is not None:
        if pos_idx >= 1:
            res['product_key'] = '_'.join(parts[:pos_idx])
        if pos_idx + 1 < len(parts):
            res['color'] = parts[pos_idx+1]
        # find trailing number as index
        for j in range(len(parts)-1, pos_idx, -1):
            if parts[j].isdigit():
                res['index'] = int(parts[j])
                break
        return res
    # fallback: try pattern like NamePOSColorIdx e.g. MiyooMiniPlusFRetrGrey1
    m = re.match(r'^(.+?)([FTLP])([A-Za-z0-9]+)(\d*)$', stem, flags=re.I)
    if m:
        res['product_key'] = m.group(1)
        res['pos'] = m.group(2).upper()
        res['color'] = m.group(3)
        if m.group(4).isdigit():
            res['index'] = int(m.group(4))
        return res
    # fallback: no pos
    res['product_key'] = stem
    return res

def load_inventory(path: Path) -> Tuple[List[Dict[str,Any]], Any]:
    data = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(data, dict) and isinstance(data.get('productos'), list):
        return data['productos'], data
    if isinstance(data, list):
        return data, None
    raise RuntimeError("Formato inventario no soportado")

def load_photos(path: Path) -> List[Dict[str,Any]]:
    data = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(data, list):
        raise RuntimeError("photos.json debe ser un array de objetos")
    return data

def score_pair(prod: Dict[str,Any], entry: Dict[str,Any]) -> float:
    """
    Devuelve score mayor = mejor match entre product y single photo entry.
    Heurísticas ponderadas:
      SKU exact in filename/url: +100
      product id in filename/url: +90
      product_key exact normalized: +80
      token overlap: + token_count * 10
      difflib ratio scaled: ratio*50
      color match: +20
    """
    score = 0.0
    fname = entry.get('filename', '') or ''
    url = entry.get('url','') or ''
    stem = entry.get('parsed',{}).get('stem','') or ''

    prod_name = prod.get('nombre') or prod.get('name') or ''
    prod_sku = prod.get('sku') or ''
    prod_id = str(prod.get('id')) if prod.get('id') is not None else ''
    prod_color_field = prod.get('color') or ''
    prod_colors = []
    if isinstance(prod.get('colores'), list) and prod.get('colores'):
        prod_colors = prod.get('colores')
    else:
        # try split color field
        if prod_color_field:
            prod_colors = re.split(r'[,/]+', str(prod_color_field))

    # SKU match
    if prod_sku and prod_sku.lower() in fname.lower():
        score += 100
    if prod_sku and prod_sku.lower() in url.lower():
        score += 100

    # product id in filename/url
    if prod_id and prod_id in fname:
        score += 90
    if prod_id and prod_id in url:
        score += 90

    # product_key exact
    pk = entry.get('parsed',{}).get('product_key')
    if pk:
        if norm(pk) and norm(pk) in norm(prod_name):
            score += 80

    # token overlap
    t_photo = set(tokens(stem + ' ' + fname))
    t_prod = set(tokens(prod_name))
    if t_photo and t_prod:
        overlap = t_photo.intersection(t_prod)
        score += min(5, len(overlap)) * 10  # hasta +50

    # difflib similarity between stem and product name
    try:
        ratio = difflib.SequenceMatcher(None, norm(stem), norm(prod_name)).ratio()
        score += ratio * 50  # up to +50
    except Exception:
        pass

    # color match (parsed color token vs product colors)
    parsed_color = (entry.get('parsed',{}).get('color') or '').lower()
    if parsed_color:
        for pc in prod_colors:
            if not pc: continue
            if parsed_color in pc.lower() or pc.lower() in parsed_color:
                score += 20
                break

    # small bonus if filename contains notable product tokens (e.g., 'miyoominiplus' in both)
    # (already covered by token overlap)

    return score

def assign_photos_to_products(inventory: List[Dict[str,Any]], photo_entries: List[Dict[str,Any]], min_score=35, verbose=False):
    """
    Devuelve mapping product_id_str -> list of assigned entry dicts,
    y variant assignments inside product['variantes'][i]['imagenes'].
    """
    assigned_map: Dict[str, List[Dict[str,Any]]] = {}
    unassigned: List[Dict[str,Any]] = []

    # Precompute product tokens
    for entry in photo_entries:
        entry['parsed'] = parse_nuevo_nombre(entry.get('nuevo_nombre') or entry.get('filename') or '')
        entry['filename'] = entry.get('nuevo_nombre') or entry.get('filename') or ''
        entry['url'] = entry.get('url_cdn') or entry.get('url') or entry.get('url_cdn') or entry.get('src') or ''

    # iterate entries and score against all products
    for e in photo_entries:
        best_score = -1.0
        best_prod = None
        for prod in inventory:
            s = score_pair(prod, e)
            if s > best_score:
                best_score = s
                best_prod = prod
        if best_prod and best_score >= min_score:
            pid = str(best_prod.get('id'))
            assigned_map.setdefault(pid, []).append({**e, 'score': best_score})
            if verbose:
                print(f"[ASSIGN] {e.get('filename')} -> id={pid} score={best_score:.1f}")
        else:
            unassigned.append({**e, 'best_score': best_score, 'best_prod': str(best_prod.get('id')) if best_prod else None})
            if verbose:
                print(f"[UNASSIGNED] {e.get('filename')} best_score={best_score:.1f} best_prod={best_prod.get('id') if best_prod else None}")

    # For each product, order images and attempt variant assignment by color tokens
    stats = {'products_updated': 0, 'assigned_images': 0, 'variant_images': 0}
    for prod in inventory:
        pid = str(prod.get('id'))
        entries = assigned_map.get(pid, [])
        if not entries:
            continue
        # sort entries by POS priority and index and score
        def sort_key(ent):
            pos = ent.get('parsed',{}).get('pos') or ''
            pos_prio = POS_PRIORITY.get(pos.upper(), 99)
            idx = ent.get('parsed',{}).get('index')
            idx_val = idx if isinstance(idx,int) else 999
            # secondary by descending score to prefer higher-confidence within same pos/index
            return (pos_prio, idx_val, -ent.get('score',0))
        entries_sorted = sorted(entries, key=sort_key)

        # compute urls list preserving order and unique
        urls = []
        for e in entries_sorted:
            u = e.get('url')
            if u and u not in urls:
                urls.append(u)

        # determine imagen_principal: first with pos F if exists, else first url
        principal = None
        for e in entries_sorted:
            if (e.get('parsed',{}).get('pos') or '').upper() == 'F':
                principal = e.get('url'); break
        if not principal and urls:
            principal = urls[0]

        # assign to product fields
        changed = False
        if principal and prod.get('imagen_principal') != principal:
            prod['imagen_principal'] = principal
            changed = True
        if urls and prod.get('imagenes') != urls:
            prod['imagenes'] = urls
            changed = True

        # attempt variant images assignment by color token
        variantes = prod.get('variantes') or []
        if variantes:
            # build variant color normalized map
            vmap = {}
            for i, v in enumerate(variantes):
                vcolor = v.get('color') or v.get('colores') or v.get('nombre') or v.get('name') or ''
                # if colores is array, take first
                if isinstance(vcolor, list) and vcolor:
                    vcolor = vcolor[0]
                vnorm = norm(str(vcolor))
                if vnorm:
                    vmap[vnorm] = i
            # assign based on parsed color or filename contains variant color
            for e in entries_sorted:
                token_color = (e.get('parsed',{}).get('color') or '')
                assigned_variant = None
                if token_color:
                    tnorm = norm(token_color)
                    for vnorm, idx in vmap.items():
                        if vnorm and (tnorm == vnorm or tnorm in vnorm or vnorm in tnorm):
                            assigned_variant = idx
                            break
                if assigned_variant is None:
                    # try filename contains variant color
                    fname_norm = norm(e.get('filename') or '')
                    for vnorm, idx in vmap.items():
                        if vnorm and vnorm in fname_norm:
                            assigned_variant = idx
                            break
                if assigned_variant is not None:
                    variant = variantes[assigned_variant]
                    lst = variant.get('imagenes') or []
                    if e.get('url') not in lst:
                        lst.append(e.get('url'))
                        variant['imagenes'] = lst
                        stats['variant_images'] += 1
                        changed = True

        if changed:
            stats['products_updated'] += 1
            stats['assigned_images'] += len(urls)

    return assigned_map, unassigned, stats

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-i','--inventory', default='json/inventario.json')
    ap.add_argument('-p','--photos', default='json/photos.json')
    ap.add_argument('-o','--output', default=None)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--min-score', type=float, default=35.0, help='umbral mínimo para aceptar asignación')
    ap.add_argument('-v','--verbose', action='store_true')
    args = ap.parse_args()

    inv_path = Path(args.inventory)
    photos_path = Path(args.photos)
    out_path = Path(args.output) if args.output else None

    if not inv_path.exists():
        print("ERROR: inventario no encontrado:", inv_path); return
    if not photos_path.exists():
        print("ERROR: photos.json no encontrado:", photos_path); return

    inventory, inv_raw = load_inventory(inv_path)
    photos_raw = load_photos(photos_path)

    # normalize photos input to list of dicts with nuevo_nombre + url_cdn fields
    entries = []
    for p in photos_raw:
        if isinstance(p, dict):
            entries.append(p)
        elif isinstance(p, str):
            entries.append({'nuevo_nombre': Path(p).name, 'url_cdn': p})
    if args.verbose:
        print(f"Fotos entradas: {len(entries)}")

    assigned_map, unassigned, stats = assign_photos_to_products(inventory, entries, min_score=args.min_score, verbose=args.verbose)

    print("---- RESUMEN ----")
    print(f"Productos con imágenes asignadas: {stats['products_updated']}")
    print(f"Imágenes asignadas a productos: {stats['assigned_images']}")
    print(f"Imágenes asignadas a variantes: {stats['variant_images']}")
    print(f"Fotos sin asignar: {len(unassigned)}")
    if args.verbose and unassigned:
        print("Algunas fotos no asignadas (mostrar primeras 20):")
        for u in unassigned[:20]:
            print(" -", u.get('filename'), f"(best_score={u.get('best_score'):.1f} best_prod={u.get('best_prod')})")

    if args.dry_run:
        print("DRY RUN: no se escribieron cambios.")
        return

    # write output, backing up original if overwriting
    if out_path is None:
        backup = inv_path.with_suffix('.backup.json')
        shutil.copy2(inv_path, backup)
        target = inv_path
        print("Backup creado:", backup)
    else:
        target = out_path

    # preserve original shape if inv_raw is dict with 'productos'
    if inv_raw is not None:
        inv_raw['productos'] = inventory
        target.write_text(json.dumps(inv_raw, ensure_ascii=False, indent=2), encoding='utf-8')
    else:
        target.write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding='utf-8')

    print("Escrito:", target)

if __name__ == '__main__':
    main()