#!/usr/bin/env python3
# apply_favorites_refine.py
# Aplica cambios muy puntuales para:
#  - Que el navbar SOLO muestre el conteo automáticamente (sin renderizar productos).
#  - Que el corazón del navbar reciba clase visual cuando haya favoritos.
#  - Que el panel de favoritos se RENDERICE únicamente al hacer CLICK en el corazón del navbar.
# Modifica únicamente js/navbar-global.js y js/productos.js. NO crea backups ni toca otros ficheros.
# Ejecutar desde la raíz del repo: python3 apply_favorites_refine.py

import re
from pathlib import Path
import sys

ROOT = Path('.')
PRODUCTOS = ROOT / "js" / "productos.js"
NAVBAR = ROOT / "js" / "navbar-global.js"

def fail(msg):
    print("❌", msg)
    sys.exit(1)

def exists_or_fail(p: Path):
    if not p.exists():
        fail(f"No encontré {p}")
    return True

def patch_productos(path: Path):
    s = path.read_text(encoding='utf-8')

    # If dispatch already present near the favorites setItem, skip.
    if re.search(r"localStorage\.setItem\(\s*['\"]geekwave_favorites['\"]\s*,\s*JSON\.stringify\(\s*lista\s*\)\s*\)\s*;\s*window\.dispatchEvent\s*\(\s*new\s+CustomEvent\(\s*['\"]favoritesUpdated['\"]", s, re.M):
        print("productos.js: Ya contiene dispatch de 'favoritesUpdated' después del setItem -> no modifico.")
        return False

    # Locate the call to localStorage.setItem(...) that saves the favorites inside activarFavoritos click handler
    pattern = re.compile(
        r"(localStorage\.setItem\(\s*['\"]geekwave_favorites['\"]\s*,\s*JSON\.stringify\(\s*lista\s*\)\s*\)\s*;)",
        re.M
    )

    m = pattern.search(s)
    if not m:
        print("productos.js: No encontré la llamada esperada a localStorage.setItem('geekwave_favorites', JSON.stringify(lista)); -> no aplico cambios.")
        return False

    insertion = (
        "\n\n                    // [FIX] notificar al navbar/panel que los favoritos cambiaron\n"
        "                    // (solo actualiza el contador; el panel se renderiza al hacer click en el corazón del navbar)\n"
        "                    window.dispatchEvent(new CustomEvent('favoritesUpdated'));\n"
    )

    new_s = pattern.sub(r"\1" + insertion, s, count=1)

    if new_s == s:
        print("productos.js: Sustitución no produjo cambios (ya estaba aplicado?)")
        return False

    path.write_text(new_s, encoding='utf-8')
    print("productos.js: Parche aplicado (añadido dispatch de 'favoritesUpdated' después de setItem).")
    return True

def patch_navbar(path: Path):
    s = path.read_text(encoding='utf-8')

    # 1) Ensure updateFavoritesBadge adds a visual class (active) to the favoritesBtn when count > 0
    # We'll add 'active' in the same branch where it adds 'has-favorites'.
    if re.search(r"updateFavoritesBadge\(\)[\s\S]*btn\.classList\.add\(\s*['\"]active['\"]\s*\)", s):
        added_active = True
    else:
        added_active = False

    # Replace the btn.classList.add('has-favorites') occurrence to add also 'active'
    s_mod = s
    if not added_active:
        s_mod, n = re.subn(
            r"btn\.classList\.add\s*\(\s*['\"]has-favorites['\"]\s*\)\s*;",
            "btn.classList.add('has-favorites');\n\n                // [FIX] marcar visual del corazón del navbar cuando hay favoritos\n                btn.classList.add('active');",
            s_mod,
            count=1
        )
        if n > 0:
            print("navbar-global.js: updateFavoritesBadge -> añadida clase 'active' cuando hay favoritos.")
        else:
            print("navbar-global.js: No modifiqué updateFavoritesBadge para añadir 'active' (patrón no encontrado).")

    # Also ensure removal branch removes 'active'
    if "btn.classList.remove('has-favorites')" in s_mod and "btn.classList.remove('active')" not in s_mod:
        s_mod = s_mod.replace(
            "btn.classList.remove(\n                \"has-favorites\"\n            );",
            "btn.classList.remove(\n                \"has-favorites\"\n            );\n\n            // [FIX] limpiar visual 'active' si no hay favoritos\n            btn.classList.remove('active');"
        )

    # 2) Replace the favoritesUpdated listener so it ONLY updates the badge (no renderFavorites)
    # Identify listener block that calls both updateFavoritesBadge() and renderFavorites()
    fav_listener_pattern = re.compile(
        r"window\.addEventListener\s*\(\s*['\"]favoritesUpdated['\"]\s*,\s*\(\s*\)\s*=>\s*\{\s*([\s\S]*?)\}\s*\)\s*;",
        re.M
    )

    m = fav_listener_pattern.search(s_mod)
    if m:
        body = m.group(1)
        if "renderFavorites" in body:
            new_body = "updateFavoritesBadge();\n            // [FIX] NO renderizar automáticamente el panel aquí (evita deformación). El panel se renderizará al hacer click en el corazón del navbar."
            s_mod = fav_listener_pattern.sub(
                "window.addEventListener('favoritesUpdated', () => {\n            " + new_body + "\n        });",
                s_mod,
                count=1
            )
            print("navbar-global.js: Modificado listener 'favoritesUpdated' para NO llamar renderFavorites automáticamente.")
        else:
            print("navbar-global.js: Listener 'favoritesUpdated' ya no llama renderFavorites -> no modifico esa parte.")
    else:
        # Fallback: try to find a simpler variant that matches earlier pattern
        if "favoritesUpdated" in s_mod and "renderFavorites" in s_mod:
            s_mod = s_mod.replace("updateFavoritesBadge();\n            renderFavorites();", "updateFavoritesBadge();\n            // [FIX] NO renderizar automáticamente el panel aquí.")
            print("navbar-global.js: Hice un reemplazo alternativo para evitar renderFavorites en favoritesUpdated.")
        else:
            print("navbar-global.js: No encontré listener 'favoritesUpdated' exacto; procedo a seguir con otras inserciones.")

    # 3) Insert click handler on the navbar heart to render the panel ONLY when clicked.
    # Avoid duplicating if similar handler already exists.
    if re.search(r"document\.getElementById\(\s*['\"]favoritesBtn['\"]\s*\)\s*\.addEventListener\s*\(\s*['\"]click['\"]", s_mod):
        print("navbar-global.js: Ya existe un click listener en #favoritesBtn -> no añado otro.")
        click_added = False
    else:
        # Find a safe insertion point: after updateFavoritesBadge(); occurrence (first)
        insert_after = "updateFavoritesBadge();"
        pos = s_mod.find(insert_after)
        if pos == -1:
            # fallback: append near end before console.log
            marker = "console.log(' Navbar completamente inicializado y listo');"
            pos = s_mod.find(marker)
            if pos == -1:
                pos = len(s_mod)
            insert_pos = pos
        else:
            insert_pos = pos + len(insert_after)

        click_handler = (
            "\n\n    // [FIX] Renderizar el panel de favoritos SOLO al hacer click en el corazón del navbar\n"
            "    (function(){\n"
            "        const favBtn = document.getElementById('favoritesBtn');\n"
            "        if (!favBtn) return;\n"
            "        favBtn.addEventListener('click', function(e){\n"
            "            e.preventDefault();\n"
            "            try {\n"
            "                // Renderizamos el contenido del panel en el momento del click\n"
            "                if (typeof renderFavorites === 'function') renderFavorites();\n"
            "                // Actualizamos la apariencia local del botón según el conteo\n"
            "                const favs = JSON.parse(localStorage.getItem('geekwave_favorites')) || [];\n"
            "                if (favs.length > 0) {\n"
            "                    favBtn.classList.add('active');\n" 
            "                } else {\n"
            "                    favBtn.classList.remove('active');\n"
            "                }\n"
            "            } catch (err) { console.error('Error al renderizar favoritos al click:', err); }\n"
            "        });\n"
            "    })();\n"
        )

        s_mod = s_mod[:insert_pos] + click_handler + s_mod[insert_pos:]
        click_added = True
        print("navbar-global.js: Añadido click handler en #favoritesBtn para renderFavorites on-demand.")

    # 4) Ensure there's a storage listener to sync badge across tabs (only updates badge & not render)
    if re.search(r"addEventListener\s*\(\s*['\"]storage['\"]\s*,\s*function\s*\(\s*e\s*\)", s_mod):
        print("navbar-global.js: Ya existe listener 'storage' -> asumo sincronización presente.")
        storage_added = False
    else:
        # insert near end of favorites block (after our click handler insertion)
        insertion_storage = (
            "\n\n    // [FIX] Sincronizar conteo de favoritos entre pestañas (solo actualiza badge)\n"
            "    window.addEventListener('storage', function(e) {\n"
            "        if (e.key === 'geekwave_favorites') {\n"
            "            try {\n"
            "                updateFavoritesBadge();\n"
            "                // No renderizamos el panel automáticamente para evitar deformaciones\n"
            "            } catch (err) { console.error('Favorites storage sync error', err); }\n"
            "        }\n"
            "    });\n"
        )
        # place near the end before the console.log if possible
        marker = "console.log(' Navbar completamente inicializado y listo');"
        pos = s_mod.find(marker)
        if pos == -1:
            s_mod = s_mod + insertion_storage
        else:
            s_mod = s_mod[:pos] + insertion_storage + s_mod[pos:]
        storage_added = True
        print("navbar-global.js: Añadido listener 'storage' para sincronizar badge entre pestañas.")

    if s_mod == s:
        print("navbar-global.js: No se realizaron cambios (quizá ya estaban aplicados).")
        return False

    path.write_text(s_mod, encoding='utf-8')
    print("navbar-global.js: Parche aplicado con éxito.")
    return True

def main():
    exists_or_fail(PRODUCTOS)
    exists_or_fail(NAVBAR)

    changed = False
    try:
        c1 = patch_productos(PRODUCTOS)
        c2 = patch_navbar(NAVBAR)
        changed = bool(c1) or bool(c2)
    except Exception as e:
        fail(f"Error aplicando parches: {e}")

    if not changed:
        print("⚠️  No se aplicaron cambios (todo puede estar ya corregido).")
    else:
        print("✅ Parche aplicado. Prueba lo siguiente:")
        print("  - Haz click en el corazón de un producto: el contador del navbar debe actualizarse y el corazón del navbar debe recibir clase 'active'.")
        print("  - Haz click en el corazón del navbar: ahora se ejecutará renderFavorites() y mostrará el contenido del panel solo al hacer click.")
    return 0

if __name__ == "__main__":
    sys.exit(main())