#!/usr/bin/env python3
"""
ensure_variant_placeholders.py

Asegura que cada producto tenga una variante por cada color en product['colores'] (o product['color']),
y que cada variante tenga campos:
  - id
  - nombre
  - color
  - imagen_principal ("" por defecto)
  - imagenes (lista vacía por defecto)

Opciones:
  --inventory / -i   Ruta al inventario (default json/inventario.json)
  --output / -o      Ruta de salida (si no se indica, sobrescribe inventario con backup .backup.json)
  --dry-run          No escribe, solo muestra qué haría
  --verbose / -v     Mensajes de detalle
"""
from __future__ import annotations
import json
import argparse
from pathlib import Path
import shutil
import re

def slug(s: str) -> str:
    return re.sub(r'[^a-z0-9]+','-', (s or '').strip().lower()).strip('-')

def normalize_colores_field(raw):
    """Devuelve lista limpia de colores (strings)."""
    if raw is None:
        return []
    if isinstance(raw, list):
        parts = []
        for c in raw:
            if not isinstance(c, str): continue
            for p in re.split(r'[\/,;]| y ', c):
                part = p.strip()
                if part: parts.append(part)
        # dedupe
        seen = set(); out = []
        for x in parts:
            k = x.lower()
            if k in seen: continue
            seen.add(k); out.append(x)
        return out
    if isinstance(raw, str):
        parts = [p.strip() for p in re.split(r'[\/,;]| y ', raw) if p.strip()]
        seen = set(); out = []
        for x in parts:
            k = x.lower()
            if k in seen: continue
            seen.add(k); out.append(x)
        return out
    return []

def variant_matches_color(variant, color):
    if not variant: return False
    vcol = variant.get('color') or variant.get('nombre') or ''
    return (str(vcol).strip().lower() == str(color).strip().lower())

def ensure_placeholders(inventory, verbose=False):
    changed_count = 0
    created_variants_total = 0
    updated_variants_total = 0

    for p in inventory:
        colors = normalize_colores_field(p.get('colores') or p.get('color') or [])
        # save normalized list back
        p['colores'] = colors

        if not colors:
            # no colores => ensure variantes exists (leave as-is)
            if verbose:
                print(f"[SKIP] id={p.get('id')} no tiene colores declarados")
            continue

        if p.get('variantes') is None:
            p['variantes'] = []

        existing_variants = p['variantes']
        # build normalized map of existing variant colors -> variant
        exist_map = {}
        for v in existing_variants:
            vcol = (v.get('color') or v.get('nombre') or '').strip().lower()
            if vcol:
                exist_map[vcol] = v

        # ensure each color has a variant
        made_change_for_product = False
        for color in colors:
            if not color:
                continue
            key = color.strip().lower()
            if key in exist_map:
                # variant exists -> ensure fields imagen_principal and imagenes exist
                v = exist_map[key]
                modified = False
                if 'imagen_principal' not in v:
                    v['imagen_principal'] = ""
                    modified = True
                if 'imagenes' not in v:
                    v['imagenes'] = []
                    modified = True
                if modified:
                    updated_variants_total += 1
                    made_change_for_product = True
                    if verbose:
                        print(f"[UPDATE VARIANT] product id={p.get('id')} color={color} (added imagen/principal or imagenes fields)")
            else:
                # create new variant placeholder
                vid = f"{p.get('id')}-{slug(color)}"
                vobj = {
                    "id": vid,
                    "nombre": f"{p.get('nombre') or p.get('name','Producto')} - {color}",
                    "color": color,
                    "imagen_principal": "",
                    "imagenes": []
                }
                existing_variants.append(vobj)
                created_variants_total += 1
                made_change_for_product = True
                if verbose:
                    print(f"[CREATE VARIANT] product id={p.get('id')} color={color} -> variant id={vid}")

        if made_change_for_product:
            changed_count += 1

    return {
        'products_changed': changed_count,
        'variants_created': created_variants_total,
        'variants_updated': updated_variants_total
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('-i','--inventory', default='json/inventario.json')
    ap.add_argument('-o','--output', default=None)
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('-v','--verbose', action='store_true')
    args = ap.parse_args()

    inv_path = Path(args.inventory)
    if not inv_path.exists():
        print("ERROR: inventario no encontrado:", inv_path); return

    raw = json.loads(inv_path.read_text(encoding='utf-8'))
    productos = raw.get('productos') if isinstance(raw, dict) else raw
    if not isinstance(productos, list):
        print("ERROR: inventario no en formato esperado"); return

    stats = ensure_placeholders(productos, verbose=args.verbose)
    print("---- RESUMEN ----")
    print(f"Productos modificados: {stats['products_changed']}")
    print(f"Variantes creadas: {stats['variants_created']}")
    print(f"Variantes actualizadas: {stats['variants_updated']}")

    if args.dry_run:
        print("DRY RUN - no se escribieron cambios.")
        return

    # write output with backup if overwriting original
    out_path = Path(args.output) if args.output else inv_path
    if out_path == inv_path:
        backup = inv_path.with_suffix('.backup.json')
        shutil.copy2(inv_path, backup)
        print("Backup creado:", backup)

    if isinstance(raw, dict) and raw.get('productos') is not None:
        raw['productos'] = productos
        out_path.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding='utf-8')
    else:
        out_path.write_text(json.dumps(productos, ensure_ascii=False, indent=2), encoding='utf-8')

    print("Escrito:", out_path)

if __name__ == '__main__':
    main()