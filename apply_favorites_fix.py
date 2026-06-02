#!/usr/bin/env python3
# apply_favorites_fix.py
# Aplica cambios mínimos para sincronizar favoritos (navbar <-> botones) sin crear backups.
# Ejecutar desde la raíz del repositorio: python3 apply_favorites_fix.py

import re
from pathlib import Path
import sys

ROOT = Path('.')
PRODUCTOS = ROOT / "js" / "productos.js"
NAVBAR = ROOT / "js" / "navbar-global.js"

def file_exists(path):
    if not path.exists():
        print(f"❌ No encontré {path}")
        return False
    return True

def patch_productos(path: Path):
    text = path.read_text(encoding='utf-8')
    # Si ya existe una dispatch/CustomEvent para favoritesUpdated, no hacemos nada.
    if "favoritesUpdated" in text and "dispatchEvent" in text:
        # comprobación más estricta:
        if re.search(r"dispatchEvent\s*\(\s*new\s+CustomEvent\(\s*['\"]favoritesUpdated['\"]", text):
            print("productos.js: Ya existe dispatch de 'favoritesUpdated' -> salto (no duplico).")
            return False

    # Buscamos la última aparición de localStorage.setItem(...) con geekwave_favorites dentro de la función
    # (esto captura la línea final que termina con ); para poder insertar justo después).
    pattern = re.compile(
        r"(localStorage\.setItem\(\s*['\"]geekwave_favorites['\"]\s*,\s*JSON\.stringify\(\s*lista\s*\)\s*\)\s*;)",
        re.M
    )

    m = pattern.search(text)
    if not m:
        print("productos.js: No encontré la llamada a localStorage.setItem('geekwave_favorites', JSON.stringify(lista)); -- no aplico cambios.")
        return False

    insertion = (
        "\n\n" +
        "                    // [FIX] notificar actualización de favoritos a navbar/panel\n" +
        "                    window.dispatchEvent(new CustomEvent('favoritesUpdated'));\n"
    )

    new_text = pattern.sub(r"\1" + insertion, text, count=1)
    if new_text == text:
        print("productos.js: No se realizaron cambios (igual contenido).")
        return False

    path.write_text(new_text, encoding='utf-8')
    print("productos.js: Parche aplicado correctamente (añadido dispatch de 'favoritesUpdated').")
    return True

def patch_navbar(path: Path):
    text = path.read_text(encoding='utf-8')

    # Si ya existe listener 'storage' que inspeccione 'geekwave_favorites' no duplicamos
    if re.search(r"addEventListener\s*\(\s*['\"]storage['\"]\s*,[\s\S]{0,200}e\.key\s*===\s*['\"]geekwave_favorites['\"]", text):
        print("navbar-global.js: Ya existe listener 'storage' para 'geekwave_favorites' -> salto (no duplico).")
        return False

    # Buscamos un lugar seguro donde insertar: justo después de la llamada updateFavoritesBadge();
    # preferimos insertar dentro del mismo bloque de FAVORITOS.
    marker = "updateFavoritesBadge();"
    idx = text.find(marker)
    if idx == -1:
        # Intento alternativa: buscar la sección FAVORITOS y colocar después del bloque de listeners.
        fav_section = re.search(r"//\s*FAVORITOS[\s\S]{0,800}updateFavoritesBadge\(\);", text)
        if not fav_section:
            print("navbar-global.js: No encontré un punto seguro para insertar (no se encontró updateFavoritesBadge()) -- no aplico cambios.")
            return False
        idx = fav_section.end()
        insert_pos = idx
        # create insertion below
        insertion = "\n\n    // [FIX] sincronizar favoritos entre pestañas\n    window.addEventListener('storage', function(e) {\n        if (e.key === 'geekwave_favorites') {\n            try {\n                updateFavoritesBadge();\n                if (typeof renderFavorites === 'function') renderFavorites();\n            } catch (err) { console.error('Favorites sync error', err); }\n        }\n    });\n"
        new_text = text[:insert_pos] + insertion + text[insert_pos:]
        path.write_text(new_text, encoding='utf-8')
        print("navbar-global.js: Parche aplicado (listener 'storage' insertado).")
        return True

    # insert after first occurrence of marker
    insertion = (
        "\n\n    // [FIX] sincronizar favoritos entre pestañas\n"
        "    window.addEventListener('storage', function(e) {\n"
        "        if (e.key === 'geekwave_favorites') {\n"
        "            try {\n"
        "                updateFavoritesBadge();\n"
        "                if (typeof renderFavorites === 'function') renderFavorites();\n"
        "            } catch (err) { console.error('Favorites sync error', err); }\n"
        "        }\n"
        "    });\n"
    )

    # Evitamos duplicar si ya pusimos algo parecido
    if "sincronizar favoritos entre pestañas" in text:
        print("navbar-global.js: Parece ya haber una marca de parche, salto para evitar duplicados.")
        return False

    new_text = text.replace(marker, marker + insertion, 1)
    if new_text == text:
        print("navbar-global.js: No se realizaron cambios (igual contenido).")
        return False

    path.write_text(new_text, encoding='utf-8')
    print("navbar-global.js: Parche aplicado correctamente (listener 'storage' añadido).")
    return True

def main():
    ok1 = file_exists(PRODUCTOS)
    ok2 = file_exists(NAVBAR)
    if not (ok1 and ok2):
        sys.exit(1)

    changed = False
    try:
        c1 = patch_productos(PRODUCTOS)
        c2 = patch_navbar(NAVBAR)
        changed = c1 or c2
    except Exception as e:
        print("❌ Error aplicando parches:", e)
        sys.exit(2)

    if not changed:
        print("⚠️  No se aplicaron cambios (quizá ya estaban presentes).")
    else:
        print("✅ Cambios aplicados. Revisa los archivos modificados y prueba en el navegador.")
        print("Sugerencia: abre la consola y prueba marcar/desmarcar favoritos y verificar que el badge del navbar se actualiza sin recargar.")
    return 0

if __name__ == "__main__":
    sys.exit(main())