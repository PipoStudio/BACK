# Geekwave | High-End Retro Tech

Plataforma e-commerce especializada en la venta de hardware retro (consolas, accesorios y juegos).

## Arquitectura del Proyecto
El proyecto sigue una estructura modular para facilitar el trabajo en equipo y evitar conflictos en Git.

### Estructura de Archivos
* `/css/`: Contiene los estilos. `styles.css` es el archivo base global. Cada sección (pago, productos) tiene su CSS específico.
* `/js/`: Lógica JavaScript modularizada.
    * `navbar-global.js`: Lógica del menú de navegación, carrito y buscador. **No eliminar.**
    * `geekwave-main.js`: Lógica de inicialización global. **No eliminar.**
    * `js/scripts-especificos/`: Scripts como `productos.js` o `checkout.js` que solo se cargan en páginas específicas.
* `/json/`: Base de datos local (`inventario.json`).
* `/functions/`: Netlify Functions para el backend (proceso de pago seguro).

## Cómo gestionar los Scripts (Reglas de Oro)
Para mantener el proyecto estable, sigue esta estructura al final de los archivos HTML:

1.  **Librerías externas:** Primero `lucide` y `lenis`.
2.  **Scripts Globales:** Siempre incluir `navbar-global.js` y `geekwave-main.js`.
3.  **Scripts Específicos:** Solo añadir el JS propio de la página (ej. `pago.js` en `pago.html`).

**Prohibido:** No incluir bloques de código `<script>...</script>` directamente dentro de los archivos HTML. Todo debe vivir en archivos `.js` externos.

## Flujo de Pago Seguro
El proyecto utiliza una función de backend (`process-payment.js`) para procesar pagos. 
* **Importante:** El frontend **nunca** debe calcular el precio final (`amount`). Solo envía el carrito (`items`) al backend, donde se calcula el costo real, los márgenes y las tarifas fijas. Esto evita la manipulación de precios desde el cliente.

## Configuración de Desarrollo
1.  Asegúrar de tener la estructura de carpetas `Geekwave/js/` y `Geekwave/json/` intacta.
2.  Al añadir una nueva página, crea un archivo `.js` independiente si requiere lógica nueva.
3.  Utiliza `npm install` dentro de la carpeta `/functions` si se necesita dependencias adicionales para el backend.