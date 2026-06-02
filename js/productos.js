/**
 * Geekwave - productos.js
 * Genera automáticamente el catálogo desde json/inventario.json
 */

document.addEventListener("DOMContentLoaded", async () => {

    const container = document.getElementById("catalogo-container");

    if (!container) {
        console.error("No existe #catalogo-container");
        return;
    }

    try {

       console.log("Cargando inventario...");

        const response = await fetch("./json/inventario.json");

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Extraemos de forma segura el array de productos si viene estructurado, 
        // de lo contrario usamos la data directamente por compatibilidad.
        const inventario = (data && data.productos) ? data.productos : data;
        
        // Guardamos los productos en el objeto global tal como lo tenías
        window.inventarioGlobal = inventario;

        console.log(
            `Inventario cargado: ${inventario.length} productos`
        );

        generarCatalogo(inventario);

    } catch (error) {

        console.error(
            "Error cargando inventario:",
            error
        );

        container.innerHTML = `
            <div class="catalog-error">
                <h2>No fue posible cargar el catálogo.</h2>
                <p>${error.message}</p>
            </div>
        `;
    }
});

function generarCatalogo(productos) {

    const container =
        document.getElementById("catalogo-container");

    container.innerHTML = "";

    const categorias = {};

    productos.forEach(producto => {

        const categoria =
            producto.categoria || "Otros";

        if (!categorias[categoria]) {
            categorias[categoria] = [];
        }

        categorias[categoria].push(producto);

    });

    Object.entries(categorias).forEach(

        ([categoria, items]) => {

            const section =
                document.createElement("section");

            section.className =
                "platform-section";

            section.innerHTML = `

                <div class="platform-header">

                    <h2 class="platform-title">
                        ${categoria}
                    </h2>

                    <span class="platform-count">
                        ${items.length} productos
                    </span>

                </div>

                <div class="products-grid">

                    ${items
                        .map(producto => crearCard(producto))
                        .join("")}

                </div>

            `;

            container.appendChild(section);

        }

    );

    activarObserver();

    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    activarFavoritos();
}


function activarFavoritos() {

    const favoritos =
        JSON.parse(
            localStorage.getItem(
                "geekwave_favorites"
            )
        ) || [];

    document
        .querySelectorAll(".favorite-btn")
        .forEach(btn => {

            const id =
                String(btn.dataset.id);

            if (
                favoritos.includes(id)
            ) {

                btn.classList.add(
                    "active"
                );

            }

            btn.addEventListener(
                "click",
                e => {

                    e.preventDefault();
                    e.stopPropagation();

                    let lista =
                        JSON.parse(
                            localStorage.getItem(
                                "geekwave_favorites"
                            )
                        ) || [];

                    const index =
                        lista.indexOf(id);

                    if (index > -1) {

                        lista.splice(
                            index,
                            1
                        );

                        btn.classList.remove(
                            "active"
                        );

                    } else {

                        lista.push(id);

                        btn.classList.add(
                            "active"
                        );

                    }

                    console.log(
                        "Favoritos:",
                        lista
                    );

                    localStorage.setItem(
                        "geekwave_favorites",
                        JSON.stringify(lista)
                    );

                    // [FIX] notify navbar/panel that favorites changed
                    window.dispatchEvent(new CustomEvent('favoritesUpdated'));


                }
            );

        });

}


function crearCard(producto) {

    const imagen =

        producto.imagen_principal ||

        producto.imagenes?.[0] ||

        "https://placehold.co/600x800/png?text=Geekwave";

    const descripcion =

        producto.descripcion_tecnica

            ? producto.descripcion_tecnica.substring(0, 120)

            : "Sin descripción.";

return `

    <article
        class="product-card"
        data-id="${producto.id}"
    >

        <button
            class="favorite-btn"
            data-id="${producto.id}"
            aria-label="Favorito"
        >
            <i data-lucide="heart"></i>
        </button>

            <div class="card-img-wrapper">

                <img
                    src="${imagen}"
                    alt="${producto.nombre}"
                    class="product-img"
                    loading="lazy"
                    onerror="this.src='https://placehold.co/600x800/png?text=Geekwave'"
                >

            </div>

            <div class="card-body">

                <div class="card-meta">

                    <span class="stock-badge">
                        ${producto.subcategoria || ""}
                    </span>

                    <span class="price-tag">
                        $${producto.precio_usd}
                    </span>

                </div>

                <h4 class="card-title">
                    ${producto.nombre}
                </h4>

                <p class="card-desc">
                    ${descripcion}
                </p>

                <div class="card-actions-row">

                    <a
                        href="info.html?id=${producto.id}"
                        class="btn-outline"
                    >
                        Ver detalles
                    </a>
<button
    class="add-cart-btn"
    onclick="agregarProducto(${producto.id})"
>
    <i data-lucide="shopping-bag"></i>
</button>
                       
                    </button>

                </div>

            </div>

        </article>

    `;
}


function activarObserver() {

    const observer =
        new IntersectionObserver(

            (entries) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add(
                            "visible"
                        );

                    }

                });

            },

            {
                threshold: 0.1
            }

        );

    document
        .querySelectorAll(".platform-section")
        .forEach(section => {

            observer.observe(section);

        });

}


/**
 * Compatibilidad temporal
 * para evitar errores si todavía
 * no has conectado el carrito.
 */
function agregarProducto(id) {

    if (!window.inventarioGlobal) return;

    const producto =
        window.inventarioGlobal.find(
            p => parseInt(p.id) === parseInt(id)
        );

    if (!producto) return;

    if (typeof window.addToCart === "function") {

        window.addToCart(
            producto.id,
            producto.nombre,
            1
        );

        console.log(
            "Producto agregado:",
            producto.nombre
        );

    }

}