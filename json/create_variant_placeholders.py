#!/usr/bin/env python3
import json, shutil, argparse
from pathlib import Path
import re

def slug(s):
    return re.sub(r'[^a-z0-9]+','-', (s or '').strip().lower()).strip('-')

def normalize_colores(raw):
    if isinstance(raw, list):
        parts = []
        for c in raw:
            if not isinstance(c, str): continue
            for p in re.split(r'[\/,;]| y ', c):
                if p.strip(): parts.append(p.strip())
        # dedupe preserving order
        seen=set(); out=[]
        for x in parts:
            k=x.lower()
            if k in seen: continue
            seen.add(k); out.append(x)
        return out
    if isinstance(raw, str):
        parts = [p.strip() for p in re.split(r'[\/,;]| y ', raw) if p.strip()]
        seen=set(); out=[]
        for x in parts:
            k=x.lower()
            if k in seen: continue
            seen.add(k); out.append(x)
        return out
    return []

def main():
    p=argparse.ArgumentParser()
    p.add_argument('-i','--input', default='json/inventario.json')
    p.add_argument('-o','--output', default=None)
    p.add_argument('-v','--verbose', action='store_true')
    args=p.parse_args()

    inv_path = Path(args.input)
    if not inv_path.exists():
        print("Input not found:", inv_path); return
    raw = json.loads(inv_path.read_text(encoding='utf-8'))
    productos = raw.get('productos') if isinstance(raw, dict) else raw
    if not isinstance(productos, list):
        print("Formato inventario inesperado"); return

    changed = 0
    for pdt in productos:
        colores = normalize_colores(pdt.get('colores') or pdt.get('color') or [])
        pdt['colores'] = colores
        if (not pdt.get('variantes')) and colores:
            pdt['variantes'] = []
            for c in colores:
                vid = f"{pdt.get('id')}-{slug(c)}"
                variant = {
                    "id": vid,
                    "nombre": f"{pdt.get('nombre')} - {c}",
                    "color": c,
                    "imagen_principal": "",
                    "imagenes": []
                }
                pdt['variantes'].append(variant)
            changed += 1
            if args.verbose:
                print(f"Creada variantes para producto id={pdt.get('id')} colors={colores}")
    if changed == 0:
        print("No se crearon variantes: todos los productos ya tenían variantes o no tenían colores.")
    else:
        out = Path(args.output) if args.output else inv_path
        if out == inv_path:
            backup = inv_path.with_suffix('.backup.json')
            shutil.copy2(inv_path, backup)
            print("Backup creado:", backup)
        if isinstance(raw, dict) and 'productos' in raw:
            raw['productos'] = productos
            out.write_text(json.dumps(raw, ensure_ascii=False, indent=2), encoding='utf-8')
        else:
            out.write_text(json.dumps(productos, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f"Escritas variantes en {out} (productos actualizados: {changed})")

if __name__=='__main__':
    main()