#!/usr/bin/env python3
# apply_favorites_fix_from_diagnostic.py
# Aplica cambios mínimos y seguros para arreglar el sistema de favoritos:
#  - Inserta dispatch tras actualizar localStorage en js/productos.js
#  - Hace que navbar solo actualice el badge en favoritesUpdated (no render)
#  - Añade click handler en #favoritesBtn para renderFavorites() bajo demanda
#  - Añade listener 'storage' que sincroniza únicamente el badge
# No crea backups. Ejecutar desde la raíz del repo.

import re
from pathlib import Path
import sys

ROOT = Path('.')
PRODUCTOS = ROOT / 'js' / 'productos.js'
NAVBAR = ROOT / 'js' / 'navbar-global.js'

def read(path):
    return path.read_text(encoding='utf-8')

def write(path, txt):
    path.write_text(txt, encoding='utf-8')

def ensure_file(path):
    if not path.exists():
        print(f"❌ No encontré {path}")
        sys.exit(1)

def patch_productos():
    ensure_file(PRODUCTOS)
    txt = read(PRODUCTOS)

    # pattern: the setItem line for geekwave_favorites (allow spaces and double/single quotes)
    pat = re.compile(r"(localStorage\.setItem\(\s*['\"]geekwave_favorites['\"]\s*,\s*JSON\.stringify\(\s*lista\s*\)\s*\)\s*;)", re.M)

    m = pat.search(txt)
    if not m:
        print("productos.js: No encontré la llamada a setItem('geekwave_favorites', JSON.stringify(lista)); - sin cambios.")
        return False

    # check if dispatch already exists right after
    after = txt[m.end(): m.end()+200]
    if "favoritesUpdated" in after and "dispatchEvent" in after:
        print("productos.js: dispatch de 'favoritesUpdated' ya presente -> no duplico.")
        return False

    insertion = (
        "\n\n                    // [FIX] notify navbar/panel that favorites changed\n"
        "                    window.dispatchEvent(new CustomEvent('favoritesUpdated'));\n"
    )

    new_txt = txt[:m.end()] + insertion + txt[m.end():]
    write(PRODUCTOS, new_txt)
    print("productos.js: insertado dispatch('favoritesUpdated') después de setItem.")
    return True

def patch_navbar():
    ensure_file(NAVBAR)
    txt = read(NAVBAR)
    new_txt = txt

    # 1) Update updateFavoritesBadge to also toggle 'active' class on favoritesBtn
    # We'll locate the function body roughly and inject active class add/remove.
    # Simple approach: find btn.classList.add("has-favorites") and inject btn.classList.add('active');
    if "btn.classList.add(\n                \"has-favorites\"\n            );" in new_txt or "btn.classList.add(\n                \"has-favorites\"\n            );" in new_txt:
        new_txt = new_txt.replace(
            "btn.classList.add(\n                \"has-favorites\"\n            );",
            "btn.classList.add(\n                \"has-favorites\"\n            );\n\n                // [FIX] visualizar corazón activo (rojo) cuando hay favoritos\n                btn.classList.add('active');"
        )
        print("navbar-global.js: agregado btn.classList.add('active') en rama has-favorites (si existía).")
    else:
        # try a one-line variant
        new_txt = re.sub(r"btn\.classList\.add\(\s*['\"]has-favorites['\"]\s*\)\s*;",
                         "btn.classList.add('has-favorites');\n\n                // [FIX] visualizar corazón activo (rojo) cuando hay favoritos\n                btn.classList.add('active');",
                         new_txt, count=1)

    # ensure removal branch removes 'active'
    if "btn.classList.remove(\n                \"has-favorites\"\n            );" in new_txt and "btn.classList.remove('active')" not in new_txt:
        new_txt = new_txt.replace(
            "btn.classList.remove(\n                \"has-favorites\"\n            );",
            "btn.classList.remove(\n                \"has-favorites\"\n            );\n\n                // [FIX] limpiar visual 'active' si no hay favoritos\n                btn.classList.remove('active');"
        )
        print("navbar-global.js: agregado btn.classList.remove('active') en rama remove has-favorites (si existía).")

    # 2) Modify favoritesUpdated listener to ONLY call updateFavoritesBadge (not renderFavorites)
    # Find occurrence of window.addEventListener("favoritesUpdated", ... )
    listener_pattern = re.compile(
        r"window\.addEventListener\(\s*['\"]favoritesUpdated['\"]\s*,\s*\(\s*\)\s*=>\s*\{\s*([\s\S]*?)\}\s*\)\s*;",
        re.M
    )
    m = listener_pattern.search(new_txt)
    if m:
        body = m.group(1)
        if "renderFavorites" in body:
            replacement = "window.addEventListener('favoritesUpdated', () => {\n\n            // [FIX] Sólo actualizar contador/visual del navbar. No renderizar el panel aquí.\n            updateFavoritesBadge();\n\n        });"
            new_txt = listener_pattern.sub(replacement, new_txt, count=1)
            print("navbar-global.js: modificado listener 'favoritesUpdated' para NO llamar renderFavorites.")
        else:
            print("navbar-global.js: listener 'favoritesUpdated' existe pero no llama renderFavorites -> no cambio en listener.")
    else:
        # fallback: attempt to replace simpler variant
        if '"favoritesUpdated"' in new_txt and 'renderFavorites();' in new_txt:
            new_txt = new_txt.replace("updateFavoritesBadge();\n            renderFavorites();", "updateFavoritesBadge();\n            // [FIX] NO renderizar automáticamente el panel aquí.")
            print("navbar-global.js: reemplazo alternativo aplicado para evitar renderFavorites en favoritesUpdated.")
        else:
            print("navbar-global.js: no encontré listener exacto 'favoritesUpdated' para modificar (no se aplicó cambio directo).")

    # 3) Add click handler on #favoritesBtn to renderFavorites() on demand (idempotent)
    if "Renderizar panel de favoritos SOLO al hacer click" not in new_txt and "favBtn.addEventListener('click'" not in new_txt:
        # find insertion point after updateFavoritesBadge(); call or before console.log final
        marker = "updateFavoritesBadge();"
        pos = new_txt.find(marker)
        if pos == -1:
            # fallback: before final console.log
            marker2 = "console.log(' Navbar completamente inicializado y listo');"
            pos2 = new_txt.find(marker2)
            insert_pos = pos2 if pos2 != -1 else len(new_txt)
        else:
            insert_pos = pos + len(marker)

        click_handler = (
            "\n\n    // [FIX] Renderizar panel de favoritos SOLO al hacer click en el corazón del navbar\n"
            "    (function(){\n"
            "        const favBtn = document.getElementById('favoritesBtn');\n"
            "        if (!favBtn) return;\n"
            "        favBtn.addEventListener('click', function(e){\n"
            "            e.preventDefault();\n"
            "            try {\n"
            "                if (typeof renderFavorites === 'function') renderFavorites();\n"
            "                // actualizar apariencia del botón localmente\n"
            "                const favs = JSON.parse(localStorage.getItem('geekwave_favorites')) || [];\n"
            "                if (favs.length > 0) favBtn.classList.add('active'); else favBtn.classList.remove('active');\n"
            "            } catch (err) { console.error('Error al renderizar favoritos al click:', err); }\n"
            "        });\n"
            "    })();\n"
        )

        new_txt = new_txt[:insert_pos] + click_handler + new_txt[insert_pos:]
        print("navbar-global.js: añadido click handler en #favoritesBtn para renderFavorites on-demand.")
    else:
        print("navbar-global.js: click handler en #favoritesBtn ya existe -> no duplico.")

    # 4) Add storage listener to sync badge across tabs (idempotent)
    if "Sincronizar conteo de favoritos entre pestañas" not in new_txt and "e.key === 'geekwave_favorites'" not in new_txt:
        marker2 = "console.log(' Navbar completamente inicializado y listo');"
        pos2 = new_txt.find(marker2)
        insert_pos2 = pos2 if pos2 != -1 else len(new_txt)
        storage_code = (
            "\n\n    // [FIX] Sincronizar conteo de favoritos entre pestañas (solo actualiza el badge)\n"
            "    window.addEventListener('storage', function(e) {\n"
            "        if (e.key === 'geekwave_favorites') {\n"
            "            try {\n"
            "                updateFavoritesBadge();\n"
            "            } catch (err) { console.error('Favorites storage sync error', err); }\n"
            "        }\n"
            "    });\n"
        )
        new_txt = new_txt[:insert_pos2] + storage_code + new_txt[insert_pos2:]
        print("navbar-global.js: añadido listener 'storage' para sincronizar badge entre pestañas.")
    else:
        print("navbar-global.js: listener 'storage' para favorites ya presente -> no duplico.")

    if new_txt == txt:
        print("navbar-global.js: No se hicieron cambios (todo indicado ya estaba aplicado).")
        return False

    write(NAVBAR, new_txt)
    print("navbar-global.js: cambios aplicados.")
    return True

def main():
    changed = False
    try:
        c1 = patch_productos()
        c2 = patch_navbar()
        changed = bool(c1) or bool(c2)
    except Exception as e:
        print("❌ Error aplicando parches:", e)
        sys.exit(2)

    if not changed:
        print("⚠️  No se aplicaron cambios (todo puede estar ya corregido).")
    else:
        print("✅ Parche aplicado. Verifica en el navegador:")
        print("  - Al marcar/desmarcar un favorito en la parrilla: el contador del navbar debe actualizarse inmediatamente.")
        print("  - El corazón del navbar debe recibir la clase 'active' cuando haya >0 favoritos.")
        print("  - El panel de favoritos NO se renderiza automáticamente con cada toggle en la parrilla; solo se renderiza al hacer click en el corazón del navbar.")
    return 0

if __name__ == '__main__':
    sys.exit(main())