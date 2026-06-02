import json
import shutil
from pathlib import Path

# ==========================================
# CONFIGURACIÓN DE RUTA (Corregida)
# ==========================================
# La 'r' al principio asegura que Windows lea la ruta perfectamente
ARCHIVO_JSON = r"C:\Users\Douglas Osorio 666\Pictures\PUNTO MAL\Geekwave\json\inventario.json"

ruta = Path(ARCHIVO_JSON)

if not ruta.exists():
    print(f"❌ No existe el archivo en la ruta especificada: {ARCHIVO_JSON}")
    print("Por favor, verifica que el disco o la carpeta estén accesibles.")
    exit()

# =========================
# BACKUP
# =========================

backup = ruta.with_suffix(".backup.json")
shutil.copy2(ruta, backup)

print(f"📦 Backup creado: {backup.name}")

# =========================
# CARGAR JSON
# =========================

with open(ruta, "r", encoding="utf-8") as f:
    productos = json.load(f)

modificados = 0

# =========================
# ACTUALIZAR PRODUCTOS
# =========================

for producto in productos:

    cambiado = False

    if "imagen_principal" not in producto:
        producto["imagen_principal"] = ""
        cambiado = True

    if "imagenes" not in producto:
        producto["imagenes"] = []
        cambiado = True

    if cambiado:
        modificados += 1

# =========================
# GUARDAR
# =========================

with open(ruta, "w", encoding="utf-8") as f:
    json.dump(
        productos,
        f,
        ensure_ascii=False,
        indent=2
    )

print()
print("✅ Inventario actualizado correctamente")
print(f"📦 Productos modificados: {modificados}")
print(f"📄 Archivo: {ARCHIVO_JSON}")