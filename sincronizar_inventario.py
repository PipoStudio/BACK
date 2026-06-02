import json
import os
import re

# Configuración de rutas
ARCHIVO_INVENTARIO = 'json/inventario.json'

def generar_slug(texto):
    """Transforma el nombre del producto en un texto limpio para URLs"""
    texto = str(texto).lower()
    texto = re.sub(r'[^a-z0-9\s-]', '', texto)
    return re.sub(r'[\s-]+', '-', texto).strip('-')

def sincronizar_y_reparar_inventario():
    if not os.path.exists(ARCHIVO_INVENTARIO):
        print(f"❌ Error: No se encontró el archivo '{ARCHIVO_INVENTARIO}'.")
        return

    with open(ARCHIVO_INVENTARIO, 'r', encoding='utf-8') as f:
        try:
            datos = json.load(f)
        except json.JSONDecodeError:
            print("❌ Error: El archivo JSON tiene un formato inválido.")
            return

    # Extraer la lista de productos sin importar cómo esté envuelta
    if isinstance(datos, dict):
        productos = datos.get('productos', [])
    elif isinstance(datos, list):
        productos = datos
    else:
        print("❌ Error: Estructura de JSON no reconocida.")
        return

    print(f"🔍 Escaneando {len(productos)} productos en el inventario...")
    
    productos_procesados = []
    conteo_preventas = 0

    for idx, item in enumerate(productos):
        # SI EL ÍTEM ES UNA LISTA (Ej: ["ID", "Nombre", "Precio"...])
        if isinstance(item, list):
            nombre = item[1] if len(item) > 1 else f"Producto {idx}"
            id_prod = item[0] if len(item) > 0 else generar_slug(nombre)
            
            producto = {
                "id": str(id_prod),
                "nombre": str(nombre),
                "precio": item[2] if len(item) > 2 else 0,
                "categoria": item[3] if len(item) > 3 else "General",
                "preventa": item[4] if len(item) > 4 else False
            }
        elif isinstance(item, dict):
            producto = item
        else:
            continue

        nombre = producto.get('nombre', f"Producto {idx}")
        
        # Asegurar ID/Slug sin undefined
        if 'id' not in producto or not producto['id'] or producto['id'] == 'undefined':
            producto['id'] = generar_slug(nombre)
            
        slug = producto['id']

        # FORZAR REDIRECCIÓN CORRECTA
        producto['url'] = f"producto.html?id={slug}"

        # Buscar "preventas" con 's' en la categoría actual para mantener el match
        cat_actual = str(producto.get('categoria', '')).lower()
        
        es_preventa = producto.get('preventa') is True or 'preventas' in cat_actual or 'preventa' in cat_actual
        
        if es_preventa:
            # Clava el nombre exacto de tu categoría
            producto['categoria'] = "Preventas (Hardware Moderno para Retro)"
            producto['preventa'] = True
            conteo_preventas += 1
        else:
            if not producto.get('categoria'):
                producto['categoria'] = "General"

        productos_procesados.append(producto)

    # Reestructuración final corregida (¡Sintaxis limpia aquí!)
    json_final = {
        "categorias": {
            "preventas_hardware": "Preventas (Hardware Moderno para Retro)"
        },
        "productos": productos_procesados
    }

    with open(ARCHIVO_INVENTARIO, 'w', encoding='utf-8') as f:
        json.dump(json_final, f, indent=4, ensure_ascii=False)

    print("\n🚀 ¡Sincronización completada con éxito!")
    print(f"📦 Total productos procesados y normalizados: {len(productos_procesados)}")
    print(f"⏳ Productos asignados a Preventas: {conteo_preventas}")
    print(f"🔗 Redirecciones e IDs verificados.")

if __name__ == "__main__":
    sincronizar_y_reparar_inventario()