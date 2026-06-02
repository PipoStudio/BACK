#!/usr/bin/env python3
import json
from pathlib import Path
p = json.loads(Path("json/inventario.json").read_text(encoding="utf-8"))
productos = p.get("productos") if isinstance(p, dict) else p
needs = []
for prod in productos:
    colores = prod.get("colores") or prod.get("color") or []
    # normalizar: si es string, partimos; si es lista, verificamos si tiene algún valor no vacío
    if isinstance(colores, str):
        colores_list = [c.strip() for c in __import__("re").split(r"[\/,;]| y ", colores) if c.strip()]
    elif isinstance(colores, list):
        colores_list = [c for c in colores if isinstance(c, str) and c.strip()]
    else:
        colores_list = []
    variantes = prod.get("variantes") or []
    if colores_list and (not variantes):
        needs.append((prod.get("id"), prod.get("nombre"), colores_list))
print(f"Encontrados {len(needs)} productos con 'colores' pero sin 'variantes':")
for pid, name, cols in needs:
    print(f"- id={pid} | {name} | colores={cols}")