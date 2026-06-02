import json
import os
import ast

ARCHIVO_INVENTARIO = 'json/inventario.json'

def evaluar_string_sucio(valor):
    """Detecta si un campo contiene un diccionario metido como string y lo extrae"""
    if isinstance(valor, str) and (valor.startswith('{') or valor.startswith('[')):
        try:
            return ast.literal_eval(valor)
        except Exception:
            return None
    return None

def reparar_inventario_mutado():
    if not os.path.exists(ARCHIVO_INVENTARIO):
        print(f"❌ No se encontró {ARCHIVO_INVENTARIO}")
        return

    with open(ARCHIVO_INVENTARIO, 'r', encoding='utf-8') as f:
        datos = json.load(f)

    productos_viejos = datos.get('productos', [])
    productos_limpios = []

    print(f"📦 Procesando y reparando enlaces a info.html...")

    for prod in productos_viejos:
        # Si el ID es normal (como el 49 o 50)
        if isinstance(prod.get('id'), (int, float)) or (isinstance(prod.get('id'), str) and not prod['id'].startswith('{')):
            # CAMBIO AQUÍ: Apuntar a info.html en lugar de producto.html
            prod['url'] = f"info.html?id={prod['id']}"
            productos_limpios.append(prod)
            continue

        # Extraer bloques mutados si quedara alguno
        p51_datos = evaluar_string_sucio(prod.get('id'))
        if p51_datos:
            p51_datos['id'] = 51
            p51_datos['url'] = "info.html?id=51"
            productos_limpios.append(p51_datos)

        p52_datos = evaluar_string_sucio(prod.get('nombre'))
        if p52_datos:
            p52_datos['id'] = 52
            p52_datos['url'] = "info.html?id=52"
            productos_limpios.append(p52_datos)

        p53_datos = prod.get('precio')
        if isinstance(p53_datos, dict) and p53_datos.get('id') == 53:
            p53_datos['url'] = "info.html?id=53"
            productos_limpios.append(p53_datos)

        p54_datos = prod.get('categoria')
        if isinstance(p54_datos, dict) and p54_datos.get('id') == 54:
            p54_datos['url'] = "info.html?id=54"
            productos_limpios.append(p54_datos)

        p55_datos = prod.get('preventa')
        if isinstance(p55_datos, dict) and p55_datos.get('id') == 55:
            p55_datos['categoria'] = "Preventas (Hardware Moderno para Retro)"
            p55_datos['preventa'] = True
            p55_datos['url'] = "info.html?id=55"
            productos_limpios.append(p55_datos)

    # Reconstruir el JSON
    json_final = {
        "categorias": {
            "preventas_hardware": "Preventas (Hardware Moderno para Retro)",
            "accesorios": "Accesorios"
        },
        "productos": productos_limpios
    }

    with open(ARCHIVO_INVENTARIO, 'w', encoding='utf-8') as f:
        json.dump(json_final, f, indent=4, ensure_ascii=False)

    print(f"\n🚀 ¡URLs corregidas con éxito!")
    print(f"🔗 Todos los productos ahora apuntan correctamente a: info.html?id=...")

if __name__ == "__main__":
    reparar_inventario_mutado()