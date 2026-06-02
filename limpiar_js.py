import re
from pathlib import Path

# Definimos la ruta exacta al archivo que tiene los errores
ruta_archivo = Path(
    r"C:\Users\Douglas Osorio 666\Pictures\PUNTO MAL\Geekwave\js\info.js"
)


def limpiar_codigo():
    if not ruta_archivo.exists():
        print(f"❌ No se encontró el archivo en: {ruta_archivo}")
        return

    print(f" Reading: info.js...")

    # Leyendo el archivo original
    with open(ruta_archivo, "r", encoding="utf-8") as f:
        contenido = f.read()

    # 1. Reemplazar comillas raras/curvas de Word o webs por comillas normales
    contenido_limpio = (
        contenido.replace("“", '"')
        .replace("”", '"')
        .replace("‘", "'")
        .replace("’", "'")
    )

    # 2. Remover espacios extraños o caracteres de control "Zero-Width" invisibles
    contenido_limpio = contenido_limpio.replace("\u200b", "")

    # Guardar el archivo limpio en el mismo lugar
    with open(ruta_archivo, "w", encoding="utf-8") as f:
        f.write(contenido_limpio)

    print(" ¡Limpieza completada con éxito!")
    print(" Revisa si los errores desaparecieron en VS Code.")


if __name__ == "__main__":
    limpiar_codigo()