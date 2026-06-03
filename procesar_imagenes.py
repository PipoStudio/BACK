import os
import json
import cloudinary
import cloudinary.uploader
from PIL import Image

# 1. Configuración de Cloudinary
cloudinary.config( 
  cloud_name = "djeljniac", 
  api_key = "499869344326849", 
  api_secret = "2vdQEQYQvlUV4ZENBeGqdW3LTiA" 
)

# 2. Configuración de rutas
ruta_raiz = r"E:\FFFFFF\RESPALDO\Geekwave\CATALOGO"
resultado_json = {}

def procesar_y_subir():
    for nombre_carpeta in os.listdir(ruta_raiz):
        ruta_carpeta = os.path.join(ruta_raiz, nombre_carpeta)
        
        # Solo procesar directorios
        if os.path.isdir(ruta_carpeta):
            resultado_json[nombre_carpeta] = []
            
            for archivo in os.listdir(ruta_carpeta):
                if archivo.lower().endswith(('.png', '.jpg', '.jpeg')):
                    ruta_completa = os.path.join(ruta_carpeta, archivo)
                    
                    # Comprimir y convertir a WebP en memoria (sin crear archivos temporales)
                    img = Image.open(ruta_completa)
                    # Convertir a RGB (necesario si la imagen original es RGBA)
                    if img.mode in ("RGBA", "P"):
                        img = img.convert("RGB")
                    
                    # Guardar temporalmente como webp para subir
                    temp_webp = "temp_image.webp"
                    img.save(temp_webp, "WEBP", quality=80)
                    
                    # Subir a Cloudinary
                    try:
                        response = cloudinary.uploader.upload(
                            temp_webp,
                            folder=f"geekwave_catalog/{nombre_carpeta}",
                            format="webp"
                        )
                        url = response['secure_url']
                        resultado_json[nombre_carpeta].append(url)
                        print(f"Subido: {archivo} -> {url}")
                    except Exception as e:
                        print(f"Error subiendo {archivo}: {e}")
                    
                    # Limpiar archivo temporal
                    if os.path.exists(temp_webp):
                        os.remove(temp_webp)

    # 3. Guardar el resultado en un archivo JSON
    with open('urls_imagenes.json', 'w', encoding='utf-8') as f:
        json.dump(resultado_json, f, indent=4, ensure_ascii=False)
    
    print("\nProceso finalizado. Revisa el archivo 'urls_imagenes.json'")

if __name__ == "__main__":
    procesar_y_subir()