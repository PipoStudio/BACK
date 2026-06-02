#!/usr/bin/env python3
# apply_checkout_fix.py
# Hace backup de js/pago.js y aplica parches para que el checkout lea geekwave_cart como fallback
# Ejecutar: python apply_checkout_fix.py

import re, shutil, sys, os

ROOT = os.getcwd()
PAGO_PATH = os.path.join(ROOT, 'js', 'pago.js')

if not os.path.isfile(PAGO_PATH):
    print("No encontré js/pago.js en:", PAGO_PATH)
    sys.exit(1)

# Backup
bak = PAGO_PATH + '.bak'
shutil.copyfile(PAGO_PATH, bak)
print("Backup creado en:", bak)

with open(PAGO_PATH, 'r', encoding='utf-8') as f:
    txt = f.read()

orig = txt

# 1) Reemplazar function getCart() { ... } por versión robusta
getcart_re = re.compile(r'function\s+getCart\s*\(\s*\)\s*\{\s*[\s\S]*?\}', re.MULTILINE)
getcart_new = """function getCart() {
    // Versión robusta: intenta State.getCart() y si no, fallback a localStorage 'geekwave_cart'
    try {
        if (typeof State !== 'undefined' && typeof State.getCart === 'function') {
            const fromState = State.getCart();
            if (Array.isArray(fromState) && fromState.length > 0) return fromState;
        }
    } catch (e) {
        console.warn('[Checkout] State.getCart() falló:', e);
    }

    try {
        const raw = localStorage.getItem('geekwave_cart');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.error('[Checkout] Error leyendo geekwave_cart de localStorage:', e);
    }

    return [];
}"""

if getcart_re.search(txt):
    txt = getcart_re.sub(getcart_new, txt, count=1)
    print("Reemplazada function getCart()")
else:
    # Si no existe, insertarla cerca del principio (después de 'let inventario = [];')
    m_inv = re.search(r'(let\s+inventario\s*=\s*\[\s*\]\s*;)', txt)
    if m_inv:
        insert_at = m_inv.end()
        txt = txt[:insert_at] + '\n\n' + getcart_new + '\n\n' + txt[insert_at:]
        print("Se insertó getCart() después de 'let inventario = [];'")
    else:
        print("No encontré 'function getCart()' ni 'let inventario = [];' - abortando")
        open(PAGO_PATH + '.bak2', 'w', encoding='utf-8').write(orig)
        sys.exit(1)

# 2) Insertar robustFindProduct si no existe (después de let inventario = [];)
robust_fn = """function robustFindProduct(itemId) {
    // Busca en inventario local primero, luego en window.inventarioGlobal si existe
    try {
        let product = (Array.isArray(inventario) ? inventario : []).find(p => String(p.id) === String(itemId));
        if (!product && typeof window !== 'undefined' && Array.isArray(window.inventarioGlobal)) {
            product = window.inventarioGlobal.find(p => String(p.id) === String(itemId));
        }
        return product || null;
    } catch (e) {
        console.error('[Checkout] robustFindProduct error:', e);
        return null;
    }
}"""

if 'function robustFindProduct' not in txt:
    m_inv = re.search(r'(let\s+inventario\s*=\s*\[\s*\]\s*;)', txt)
    if m_inv:
        insert_at = m_inv.end()
        txt = txt[:insert_at] + '\n\n' + robust_fn + '\n\n' + txt[insert_at:]
        print("Se insertó robustFindProduct() después de 'let inventario = [];'")
    else:
        # si no lo encontramos, agregar al inicio del archivo
        txt = robust_fn + '\n\n' + txt
        print("Se insertó robustFindProduct() al inicio del archivo")

# 3) Reemplazar assignment 'const product = inventario.find(...)' en renderCheckoutCart por robustFindProduct
# Buscamos el patrón amplio: const product = <anything>inventario.find(<anything>);
pattern_product_find = re.compile(
    r'(const\s+product\s*=\s*[\s\S]*?inventario\.find\s*\([\s\S]*?\)\s*;\s*\n\s*\n?)',
    re.MULTILINE
)

if pattern_product_find.search(txt):
    txt = pattern_product_find.sub("let product = robustFindProduct(item.id);\n\n", txt, count=0)
    print("Reemplazadas ocurrencias de inventario.find(...) por robustFindProduct(item.id)")
else:
    # Si no coincide, intentar un patrón más sencillo
    pattern2 = re.compile(r'const\s+product\s*=\s*inventario\.find\s*\([^;]+;\s*', re.MULTILINE)
    if pattern2.search(txt):
        txt = pattern2.sub("let product = robustFindProduct(item.id);\n", txt, count=0)
        print("Reemplazado con patrón alternativo")
    else:
        print("No encontré patrones 'inventario.find' para reemplazar. Revisa manualmente.")

# 4) Asegurarnos de que si no product, siga return "" (no tocamos esa línea)
# Guardar cambios
with open(PAGO_PATH, 'w', encoding='utf-8') as f:
    f.write(txt)

print("Parche aplicado. Archivo guardado:", PAGO_PATH)
print("Antes de continuar, revisa js/pago.js y confirma que las funciones insertadas están en el lugar correcto.")
print("Si algo se ve raro, restaura desde:", bak)