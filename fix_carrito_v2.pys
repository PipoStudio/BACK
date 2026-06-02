import re

# Leer archivo
with open('js/navbar-global.js', 'r', encoding='utf-8') as f:
    lineas = f.readlines()

# 1. BUSCAR LÍNEA DE "let inventario = [];"
encontrado = False
for i, linea in enumerate(lineas):
    if 'let inventario = []' in linea and 'let inventarioListo' not in linea:
        # Agregar la nueva línea DESPUÉS de inventario = []
        lineas.insert(i + 1, '    let inventarioListo = false; // 🔴 NUEVA: rastrear si inventario está listo\n')
        print(f"✅ Variable inventarioListo agregada en línea {i+1}")
        encontrado = True
        break

if not encontrado:
    print("❌ No se encontró 'let inventario = []'")
    exit(1)

# 2. BUSCAR Y PROTEGER renderCart()
contenido_text = ''.join(lineas)

if 'if (!inventarioListo)' not in contenido_text:
    # Buscar "function renderCart() {"
    patron = r"(function renderCart\(\) \{\s*\n)"
    reemplazo = r"\1        // 🔴 PROTECCIÓN: Si inventario no está listo, no renderizar\n        if (!inventarioListo) {\n            console.warn('⚠️ Inventario no cargado aún, saltando renderCart...');\n            return;\n        }\n\n"
    contenido_text = re.sub(patron, reemplazo, contenido_text, count=1)
    print("✅ renderCart() protegido")

# 3. PROTEGER el mapeo - BUSCAR const imgUrl = fullItem.imagen_principal;
patron_mapeo = r"(const fullItem = inventario\.find\(i => parseInt\(i\.id\) === parseInt\(item\.id\)\);)\n(\s+)(const imgUrl = fullItem\.imagen_principal;)"

if re.search(patron_mapeo, contenido_text):
    reemplazo_mapeo = r"\1\n\n\2// 🔴 PROTECCIÓN: validar que producto existe\n\2if (!fullItem) {\n\2    console.warn(`⚠️ Producto \${item.id} no encontrado`);\n\2    return '';\n\2}\n\n\2const imgUrl = fullItem.imagen_principal || 'https://placehold.co/400x400/png?text=No+Image';"
    contenido_text = re.sub(patron_mapeo, reemplazo_mapeo, contenido_text, count=1)
    print("✅ Validación de productos agregada")

# 4. MARCAR inventarioListo = true
patron_ready = r"(inventario = \(data && data\.productos\) \? data\.productos : data;)"
if re.search(patron_ready, contenido_text):
    reemplazo_ready = r"\1\n        \n        // 🔴 Marcar que inventario está listo\n        inventarioListo = true;"
    contenido_text = re.sub(patron_ready, reemplazo_ready, contenido_text, count=1)
    print("✅ inventarioListo = true agregado")

# 5. AGREGAR .catch() si no existe
if '.catch(error' not in contenido_text:
    # Buscar el final del fetch
    patron_catch = r"(\}\s*\);)\s*(\/\/ ===== LGICA DEL MEGA MEN =====)"
    reemplazo_catch = r".catch(error => {\n        console.error('❌ Error cargando inventario:', error);\n    });\n\n\2"
    contenido_text = re.sub(patron_catch, reemplazo_catch, contenido_text, count=1)
    print("✅ .catch() agregado al fetch")

# Guardar
with open('js/navbar-global.js', 'w', encoding='utf-8') as f:
    f.write(contenido_text)

print("\n✅ Archivo actualizado correctamente sin errores de sintaxis")