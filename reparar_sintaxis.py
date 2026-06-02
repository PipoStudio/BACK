from pathlib import Path
import json

ruta_info = Path(r"C:\Users\Douglas Osorio 666\Pictures\PUNTO MAL\Geekwave\js\info.js")

def reparar_archivo():
    if not ruta_info.exists():
        print(f"❌ No se encontró el archivo en: {ruta_info}")
        return

    print("⏳ Analizando y reparando estructura de info.js...")

    with open(ruta_info, "r", encoding="utf-8") as f:
        lineas = f.readlines()

    # Limpiamos líneas vacías o con comentarios raros al inicio
    lineas_limpias = [l.strip() for l in lineas if l.strip()]
    texto_completo = " ".join(lineas_limpias)

    # Validamos si intentó pegar un JSON plano directamente
    if texto_completo.startswith("[") or texto_completo.startswith("{"):
        print("💡 Se detectó una estructura de datos pura. Convirtiendo a módulo JS válido...")
        try:
            # Intentamos limpiar caracteres sueltos al final si los hay
            contenido_js = f"const infoData = {texto_completo};\n\nexport default infoData;"
            
            with open(ruta_info, "w", encoding="utf-8") as f:
                f.write(contenido_js)
            print("✅ ¡Estructura envuelta en un módulo exportable con éxito!")
            return
        except Exception as e:
            print(f"No se pudo parsear directamente: {e}")

    # Si tiene texto mixto, forzamos una limpieza de caracteres de ruptura habituales
    print("🧹 Aplicando parches de sintaxis en puntos críticos...")
    nuevo_contenido = []
    for i, linea in enumerate(lineas, 1):
        # Parche para comillas rotas en cadenas de texto largas
        if "id" in linea and not ":" in linea:
            continue # Salta líneas corruptas que rompen el objeto
        nuevo_contenido.append(linea)

    with open(ruta_info, "w", encoding="utf-8") as f:
        f.writelines(nuevo_contenido)
        
    print("👍 Parches aplicados. Revisa VS Code.")

if __name__ == "__main__":
    reparar_archivo()