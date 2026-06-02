const fs = require('fs');

// 1. HTML: Estructura con Navbar y Footer de Geekwave
const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analogue Pocket | Detalle de Ingeniera | Geekwave</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;700&family=Space+Grotesk:wght@400;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <link rel="stylesheet" href="https://unpkg.com/lenis@1.1.18/dist/lenis.css">
    <link rel="stylesheet" href="info.css">
</head>
<body>
    <!-- NAVBAR INTEGRAL GEEKWAVE -->
    <nav class="navbar navbar-glass">
        <div class="logo"><i data-lucide="circle"></i> GEEKWAVE</div>
        <div class="nav-links" id="navLinks">
            <a href="index.html">Home</a>
            <div class="nav-item-dropdown">
                <a href="#" id="productosBtn">Productos <i data-lucide="chevron-down" style="width: 14px; vertical-align: middle;"></i></a>
                <div class="mega-menu" id="productosMenu">
                    <div class="menu-container">
                        <div class="menu-col" id="col-categories"><span class="menu-label">Categoría</span><ul class="menu-list" id="list-categories"></ul></div>
                        <div class="menu-col hidden" id="col-subcategories"><span class="menu-label">Plataforma</span><ul class="menu-list" id="list-subcategories"></ul></div>
                        <div class="menu-col hidden" id="col-products"><span class="menu-label">Productos</span><ul class="menu-list" id="list-products"></ul></div>
                    </div>
                </div>
            </div>
            <a href="ofertas.html">Ofertas</a>
        </div>
        <div class="nav-icons">
            <div class="search-container" id="searchContainer">
                <input type="text" id="searchInput" class="searchInput" placeholder="Buscar...">
                <button class="icon-btn search-btn" id="searchBtn"><i data-lucide="search"></i></button>
                <div class="search-results" id="searchResults"></div>
            </div>
            <div class="cart-nav-container" style="position: relative;">
                <button class="icon-btn" id="cartBtn"><i data-lucide="shopping-bag"></i></button>
                <span class="cart-badge" id="cartBadge">0</span>
                <div class="cart-dropdown" id="cartDropdown">
                    <div class="cart-header"><h3>Tu Carrito</h3><button id="closeCartBtn"><i data-lucide="x"></i></button></div>
                    <div class="cart-items" id="cartItemsContainer"></div>
                    <div class="cart-footer"><button onclick="window.location.href='pago.html'" class="btn-primary" style="width: 100%;">IR A PAGAR</button></div>
                </div>
            </div>
        </div>
    </nav>

    <section class="product-page">
        <div class="gallery-thumbs" id="galleryThumbs"></div>
        <div class="main-image"><img id="mainProductImage" src="" alt="Analogue Pocket"></div>
        <div class="product-details">
            <div class="badge"><i class="fa-solid fa-microchip"></i> SISTEMA FPGA NATIVO</div>
            <h1>Analogue Pocket</h1>
            <p class="description" id="productDescription"></p>
            <div class="flavor-section">
                <h3>Selecciona el acabado del chasis:</h3>
                <div class="flavors" id="flavorContainer"></div>
            </div>
            <div class="purchase-box">
                <div class="plans">
                    <div class="plan active" data-plan="standard"><h4>BASE</h4><div class="price">$219.99</div></div>
                    <div class="plan" data-plan="bundle"><h4>BUNDLE</h4><div class="price">$299.99</div></div>
                </div>
                <button class="cart-btn" id="cartButton">AADIR AL CARRITO</button>
            </div>
        </div>
    </section>

    <!-- SECCIN DE SUGERENCIAS -->
    <section class="suggestions-container">
        <h2 class="suggestions-title">Productos Complementarios</h2>
        <div class="suggestions-grid">
            <div class="sugg-card">
                <div class="sugg-img">
                    <img src="https://res.cloudinary.com/dn8pns203/image/upload/v1777401927/geekwave_catalog/bjsbzsjfrnypgai8najy.webp">
                    <div class="sugg-overlay"><button class="sugg-btn-cart"><i data-lucide="cart-plus"></i></button></div>
                </div>
                <div class="sugg-content">
                    <span class="sugg-tag">Accesorio</span>
                    <h3>Analogue Dock</h3>
                    <p class="sugg-price">$99.99</p>
                    <a href="#" class="sugg-btn-more">VER DETALLES</a>
                </div>
            </div>
        </div>
    </section>

    <footer class="editorial-footer">
        <div class="footer-block">
            <div class="footer-col"><h2>GEEKWAVE.</h2><p>Restaurando la era dorada del gaming.[cite: 1]</p></div>
            <div class="footer-col"><span class="footer-label">Soporte</span><a href="mailto:support@geekwave.com">support@geekwave.com</a></div>
        </div>
    </footer>
    <script src="info.js"></script>
</body>
</html>`;

// --- 2. CSS: Integracin de Estilos de Geekwave ---
const cssContent = `
:root {
    --bg-main: #050505; --card-bg: #111111; --text-main: #ffffff;
    --text-muted: #888888; --accent: #00ff7f; --border: #222222;
    --radius: 28px; --font-heading: 'Space Grotesk', sans-serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--bg-main); color: var(--text-main); font-family: 'Manrope', sans-serif; overflow-x: hidden; }

/* Navbar Glass */
.navbar { position: fixed; top: 0; width: 100%; height: 60px; display: flex; justify-content: space-between; align-items: center; padding: 0 5%; background: rgba(5,5,5,0.8); backdrop-filter: blur(10px); z-index: 2000; border-bottom: 1px solid var(--border); }
.nav-links a { font-family: var(--font-heading); font-weight: 700; text-transform: uppercase; font-size: 0.8rem; margin-left: 2rem; color: var(--text-muted); text-decoration: none; }

/* Product Grid */
.product-page { display: grid; grid-template-columns: 80px 1.1fr 0.9fr; gap: 40px; padding: 100px 5% 40px; max-width: 1600px; margin: 0 auto; }
.main-image { background: #0a0a0a; border-radius: var(--radius); height: 75vh; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); overflow: hidden; }
.main-image img { height: 100%; width: auto; object-fit: contain; transform: scale(1.05); }

/* Suggestions[cite: 1] */
.suggestions-container { max-width: 1400px; margin: 100px auto; padding: 0 5%; }
.suggestions-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
.sugg-img { background: #ffffff; height: 250px; border-radius: 15px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.sugg-img img { max-height: 80%; mix-blend-mode: multiply; }
.sugg-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; }
.sugg-card:hover .sugg-overlay { opacity: 1; }
.sugg-btn-cart { width: 60px; height: 60px; background: var(--accent); border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.sugg-btn-more { display: block; width: 100%; text-align: center; border: 1px solid var(--border); padding: 12px; border-radius: 50px; text-decoration: none; color: white; font-weight: 800; margin-top: 15px; font-size: 0.8rem; }

/* Utilities */
.hidden { display: none; }
.cart-badge { background: var(--accent); color: black; padding: 2px 6px; border-radius: 50%; font-size: 0.7rem; position: absolute; top: -5px; right: -5px; }
`;

fs.writeFileSync('info.html', htmlContent);
fs.writeFileSync('info.css', cssContent);
console.log('Archivos info.html e info.css generados exitosamente.');