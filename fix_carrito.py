import re

# Leer el archivo actual
with open('js/navbar-global.js', 'r', encoding='utf-8') as f:
    contenido = f.read()

# 1️⃣ AGREGAR VARIABLE inventarioListo después de "let inventario = [];"
patron1 = r"(let inventario = \[\];)"
reemplazo1 = r"\1\n    let inventarioListo = false; // 🔴 NUEVA VARIABLE: rastrear si el inventario está cargado"
contenido = re.sub(patron1, reemplazo1, contenido, count=1)

# 2️⃣ PROTEGER renderCart() - agregar validación al inicio
patron2 = r"(function renderCart\(\) \{)"
reemplazo2 = r"\1\n        // 🔴 PROTECCIÓN: Si el inventario no está listo, no renderizar\n        if (!inventarioListo) {\n            console.warn('⚠️ Inventario no cargado aún, saltando renderCart...');\n            return;\n        }"
contenido = re.sub(patron2, reemplazo2, contenido, count=1)

# 3️⃣ PROTEGER el mapeo del carrito - validar que producto existe
patron3 = r"(const fullItem = inventario\.find\(i => parseInt\(i\.id\) === parseInt\(item\.id\)\);)\n(\s+)const imgUrl = fullItem\.imagen_principal;"
reemplazo3 = r"\1\n\2\n\2// 🔴 PROTECCIÓN: Si el producto no existe, saltarlo\n\2if (!fullItem) {\n\2    console.warn(`⚠️ Producto ${item.id} no encontrado en inventario`);\n\2    return '';\n\2}\n\2\n\2const imgUrl = fullItem.imagen_principal || 'https://placehold.co/400x400/png?text=No+Image';"
contenido = re.sub(patron3, reemplazo3, contenido, count=1)

# 4️⃣ MARCAR inventarioListo = true después de cargar el JSON
patron4 = r"(inventario = \(data && data\.productos\) \? data\.productos : data;)"
reemplazo4 = r"\1\n        \n        // 🔴 NUEVA LÍNEA: Marcar que el inventario está listo\n        inventarioListo = true;"
contenido = re.sub(patron4, reemplazo4, contenido, count=1)

# 5️⃣ AGREGAR .catch() al fetch si no existe
if ".catch(error =>" not in contenido:
    patron5 = r"(if \(typeof renderCart === 'function'\) \{[\s\S]*?\}\s*\}\s*\);)"
    reemplazo5 = r"\1\n    .catch(error => {\n        console.error('❌ Error cargando inventario:', error);\n    });"
    contenido = re.sub(patron5, reemplazo5, contenido, count=1)

# Guardar el archivo actualizado
with open('js/navbar-global.js', 'w', encoding='utf-8') as f:
    f.write(contenido)

print("✅ Fix inyectado correctamente en js/navbar-global.js")
print("📍 Cambios aplicados:")
print("   1. Variable inventarioListo agregada")
print("   2. renderCart() protegido")
print("   3. Validación de productos en mapeo")
print("   4. inventarioListo = true después del fetch")
print("   5. .catch() agregado al fetch")