#!/usr/bin/env python3
"""
Asignador de imágenes desde photos.json (nuevo_nombre + url_cdn) a inventario.json.

Heurística de parseo de nuevo_nombre:
  <product>_<POS>_<color>_<idx>.ext
  POS ∈ {F,T,L,P} (F frontal -> usado como imagen_principal para cards)
Ejemplo: MiyooMiniPlus_F_RetrGrey_1.webp

Uso:
  python scripts/assign_images_from_photos.py \
    -i json/inventario.json \
    -p json/photos.json \
    -o json/inventario_con_imagenes.json \
    --dry-run -v

Si omites -o, sobrescribe inventario.json (se guarda un backup .backup.json).
"""
from __future__ import annotations
import json
import argparse
from pathlib import Path
import shutil
import re
from typing import Dict, List, Any

POS_SET = {'f','t','l','p'}

def norm(s: str) -> str:
    return re.sub(r'[^a-z0-9]+','', (s or '').lower())

def parse_nuevo_nombre(name: str):
    """
    Intenta extraer (producto_key, pos, color) desde nuevo_nombre.
    Retorna dict { product_key, pos, color, filename } donde alguno puede ser None.
    """
    base = name or ''
    fname = base.split('/')[-1]  # por si viene con ruta
    # quitar extensión
    stem = re.sub(r'\.[a-z0-9]+$','', fname, flags=re.I)
    parts = stem.split('_')
    # buscar token de longitud 1 que sea POS
    pos_idx = None
    for i, t in enumerate(parts):
        if len(t) == 1 and t.lower() in POS_SET:
            pos_idx = i
            break
    res = {'product_key': None, 'pos': None, 'color': None, 'filename': fname}
    if pos_idx is not None:
        res['pos'] = parts[pos_idx].upper()
        # product key = parts before pos joined with _
        if pos_idx >= 1:
            res['product_key'] = "_".join(parts[:pos_idx])
        # color token = next part if exists
        if pos_idx + 1 < len(parts):
            res['color'] = parts[pos_idx+1]
        return res
    # fallback: try pattern PRODUCTNAMEPOScolor...
    m = re.match(r'^([A-Za-z0-9]+)([FTLP])[_-]?([A-Za-z0-9]+)', stem)
    if m:
        res['product_key'] = m.group(1)
        res['pos'] = m.group(2)
        res['color'] = m.group(3)
        return res
    # else try to split by uppercase transitions (best-effort)
    return res

def load_inventory(path: Path) -> List[Dict[str,Any]]:
    data = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(data, dict) and isinstance(data.get('productos'), list):
        return data['productos'], data  # return inner list and original object
    if isinstance(data, list):
        return data, None
    raise RuntimeError("Formato inventario inválido")

def index_products(inventory: List[Dict[str,Any]]):
    """
    Crea mapeos para búsqueda:
      - by id string
      - by normalized name -> list of products
      - by sku normalized -> list
    """
    by_id = {}
    name_map = {}
    sku_map = {}
    for p in inventory:
        pid = str(p.get('id')) if p.get('id') is not None else None
        if pid: by_id[pid] = p
        name_key = norm(p.get('nombre') or p.get('name') or '')
        if name_key:
            name_map.setdefault(name_key, []).append(p)
        sku = p.get('sku') or p.get('codigo') or p.get('code')
        if sku:
            sku_map.setdefault(norm(str(sku)), []).append(p)
    return by_id, name_map, sku_map

def index_photos(photos_raw: Any):
    """
    photos_raw: lista de objetos que contienen 'nuevo_nombre' y 'url_cdn' (tu formato).
    Devuelve lista de entries: {filename, url, parsed}
    """
    entries = []
    if isinstance(photos_raw, list):
        for item in photos_raw:
            if not isinstance(item, dict): continue
            nombre = item.get('nuevo_nombre') or item.get('filename') or ''
            url = item.get('url_cdn') or item.get('url') or item.get('src') or ''
            if not url: continue
            parsed = parse_nuevo_nombre(nombre)
            entries.append({'filename': nombre, 'url': url, 'parsed': parsed})
    else:
        raise RuntimeError("photos.json debe ser un array")
    return entries

def match_entries_to_products(entries, by_id, name_map, sku_map, inventory):
    """
    Intenta asignar cada entry a un producto (por id, por nombre normalizado o por substring).
    Si no encuentra producto, queda en un bucket 'unmatched'
    Devuelve mapping product_id_str -> list of entries
    """
    buckets = {}
    unmatched = []
    # Build alternative search: normalized product keys map (product_key -> product)
    product_key_map = {}
    for p in inventory:
        key = norm(str(p.get('nombre') or p.get('name') or ''))
        if key:
            product_key_map[key] = p

    for e in entries:
        parsed = e['parsed']
        assigned = False
        # try product_key exact match
        pk = parsed.get('product_key')
        if pk:
            pkn = norm(pk)
            # direct match with name map
            if pkn in product_key_map:
                prod = product_key_map[pkn]
                pid = str(prod.get('id'))
                buckets.setdefault(pid, []).append(e)
                assigned = True
        if assigned: continue
        # try match by filename containing product id or sku
        fname_norm = norm(e['filename'])
        # search by id substring
        for pid in by_id:
            if pid and pid in fname_norm:
                buckets.setdefault(pid, []).append(e)
                assigned = True
                break
        if assigned: continue
        # search by name_map substring match (product name tokens)
        for name_key, prods in name_map.items():
            if not name_key: continue
            if name_key in fname_norm or fname_norm in name_key:
                prod = prods[0]
                pid = str(prod.get('id'))
                buckets.setdefault(pid, []).append(e)
                assigned = True
                break
        if assigned: continue
        # try color only heuristic later -> put unmatched
        unmatched.append(e)
    return buckets, unmatched

def assign_to_inventory(inventory, buckets, unmatched, verbose=False):
    stats = {'products':0, 'products_updated':0, 'variant_imgs_assigned':0}
    # Prepare quick lookup for variant color matching
    for p in inventory:
        pid = str(p.get('id')) if p.get('id') is not None else None
        entries = buckets.get(pid, [])
        if not entries and not unmatched:
            continue
        stats['products'] += 1
        # collect urls grouped by pos preference (F first)
        # order entries: prefer pos F then others; keep original order within same pos
        pos_order = {'F':0,'T':1,'L':2,'P':3, None:4}
        entries_sorted = sorted(entries, key=lambda x: pos_order.get((x['parsed'].get('pos') or '').upper(), 4))
        urls = [e['url'] for e in entries_sorted]
        # also include unmatched entries that likely belong here by name substring
        # (we skip for now to avoid false positives)
        # assign to product: imagen_principal = first F if any else first url
        principal = None
        for e in entries_sorted:
            if (e['parsed'].get('pos') or '').upper() == 'F':
                principal = e['url']
                break
        if not principal and urls:
            principal = urls[0]
        changed = False
        if urls:
            if p.get('imagen_principal') != principal:
                p['imagen_principal'] = principal
                changed = True
            # ensure imagenes list exists and equals urls (unique)
            uniq = []
            for u in urls:
                if u and u not in uniq: uniq.append(u)
            if p.get('imagenes') != uniq:
                p['imagenes'] = uniq
                changed = True

        # variants: try color matching from parsed color tokens and filename
        variantes = p.get('variantes') or []
        if variantes:
            # build variant color normalized map
            vmap = {}
            for i, v in enumerate(variantes):
                vcolor = v.get('color') or v.get('colores') or v.get('nombre') or v.get('name') or ''
                vnorm = norm(str(vcolor))
                if not vnorm:
                    # fallback: variant name
                    vnorm = norm(str(v.get('nombre') or v.get('name') or ''))
                if vnorm:
                    vmap[vnorm] = i
            # scan entries and unmatched for color matches
            for e in entries_sorted + unmatched:
                token_color = (e['parsed'].get('color') or '')
                tnorm = norm(token_color)
                assigned_variant_idx = None
                if tnorm and tnorm in vmap:
                    assigned_variant_idx = vmap[tnorm]
                else:
                    # try filename contains variant color token
                    fname_norm = norm(e['filename'])
                    for vnorm, idx in vmap.items():
                        if vnorm and vnorm in fname_norm:
                            assigned_variant_idx = idx
                            break
                if assigned_variant_idx is not None:
                    variant = variantes[assigned_variant_idx]
                    lst = variant.get('imagenes') or []
                    if e['url'] not in lst:
                        lst.append(e['url'])
                        variant['imagenes'] = lst
                        stats['variant_imgs_assigned'] += 1
                        changed = True
        if changed:
            stats['products_updated'] += 1
            if verbose:
                print(f"[+] Producto id={p.get('id')} actualizado: principal={'yes' if p.get('imagen_principal') else 'no'}, total_imgs={len(p.get('imagenes',[]))}, variants_imgs_assigned={stats['variant_imgs_assigned']}")
    return stats

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-i','--inventory', default='json/inventario.json')
    ap.add_argument('-p','--photos', default='json/photos.json')
    ap.add_argument('-o','--output', default=None, help='si no se especifica, sobrescribe inventory con backup .backup.json')
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

    inv_raw = json.loads(inv_path.read_text(encoding='utf-8'))
    inventory = inv_raw.get('productos') if isinstance(inv_raw, dict) and isinstance(inv_raw.get('productos'), list) else inv_raw
    if not isinstance(inventory, list):
        print("ERROR: inventario no en formato esperado"); return

    photos_raw = json.loads(photos_path.read_text(encoding='utf-8'))
    entries = index_photos(photos_raw)
    if args.verbose:
        print(f"Fotos indexadas: {len(entries)}")

    by_id, name_map, sku_map = index_products(inventory)
    buckets, unmatched = match_entries_to_products(entries, by_id, name_map, sku_map, inventory)
    if args.verbose:
        print(f"Buckets creados para {len(buckets)} productos, unmatched={len(unmatched)}")

    stats = assign_to_inventory(inventory, buckets, unmatched, verbose=args.verbose)

    if args.dry_run:
        print("DRY RUN - no se escribirán archivos. Resumen:", stats)
        return

    # write out
    if out_path is None:
        # backup and overwrite original
        backup = inv_path.with_suffix('.backup.json')
        shutil.copy2(inv_path, backup)
        target = inv_path
    else:
        target = out_path

    if isinstance(inv_raw, dict) and 'productos' in inv_raw:
        inv_raw['productos'] = inventory
        target.write_text(json.dumps(inv_raw, ensure_ascii=False, indent=2), encoding='utf-8')
    else:
        target.write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding='utf-8')

    print("Escrito:", target)
    print("Resumen:", stats)

if __name__ == '__main__':
    main()