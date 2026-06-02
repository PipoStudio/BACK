import json
from pathlib import Path

# 1. Definimos el nombre del archivo
ARCHIVO = "inventario.json"

# 2. Definimos la carpeta base
# Cambia esto en tu script agregar_variantes.py:
CARPETA_BASE = Path(r"C:\Users\Douglas Osorio 666\Pictures\PUNTO MAL\Geekwave\json")

# 3. ¡AQUÍ ESTÁ EL TRUCO! Unimos la carpeta con el archivo usando el operador /
ruta_final = CARPETA_BASE / ARCHIVO

# Ahora abrimos la ruta exacta al archivo JSON
with open(ruta_final, "r", encoding="utf-8") as f:
    inventario = json.load(f)

modificados = 0

for producto in inventario:
    if "variantes" not in producto:
        producto["variantes"] = []
        modificados += 1

# Guardamos usando la misma ruta exacta
with open(ruta_final, "w", encoding="utf-8") as f:
    json.dump(
        inventario,
        f,
        ensure_ascii=False,
        indent=2
    )

print(f"✓ Productos actualizados: {modificados}")
print("✓ Campo 'variantes' agregado donde hacía falta")