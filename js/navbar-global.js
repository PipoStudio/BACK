/**
 * NAVBAR GLOBAL - Lgica centralizada del navbar
 * =============================================
 * Espera al evento 'navbarLoaded' del component-loader
 * para activar todos los event listeners
 */

// ===== ESPERAR A QUE EL NAVBAR SE INYECTE =====
document.addEventListener('navbarLoaded', initializeNavbarLogic, { once: true });

// Fallback: Si navbarLoaded no se dispara en 3 segundos, inicializar de todas formas
setTimeout(() => {
    if (!window.__navbarInitialized) {
        console.warn(' navbarLoaded no se dispar, inicializando por fallback...');
        initializeNavbarLogic();
    }
}, 3000);

/**
* FUNCIN PRINCIPAL: Inicializa toda la lgica del navbar
 */
function initializeNavbarLogic() {
    if (window.__navbarInitialized) return; // Evitar ejecucin duplicada
    window.__navbarInitialized = true;

    console.log(' Inicializando lgica del navbar...');

    // ===== INICIALIZACIN DE DEPENDENCIAS GLOBALES =====
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    if (typeof Lenis !== 'undefined') {
        const lenis = new Lenis({
            autoRaf: true,
            duration: 1.8,
            lerp: 0.08,
            smoothWheel: true,
        });
    }
 
    // ===== VARIABLES GLOBALES DEL NAVBAR =====
    let inventario = [];
    let inventarioListo = false; // 🔴 NUEVA: rastrear si inventario está listo
    let currentFocus = -1;

    // Referencias a elementos del DOM
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const productosBtn = document.getElementById('productosBtn');
    const productosMenu = document.getElementById('productosMenu');
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');
    const searchContainer = document.getElementById('searchContainer');
    const navLinks = document.getElementById('navLinks');
    const searchResults = document.getElementById('searchResults');
    const filterBtn = document.getElementById('filterBtn');
    const filterPanel = document.getElementById('filterPanel');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');

    const cartBtn = document.getElementById('cartBtn');
    const cartDropdown = document.getElementById('cartDropdown');
    const closeCartBtn = document.getElementById('closeCartBtn');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const toastMsg = document.getElementById('toastMsg');
    const saveCartBtn = document.getElementById('saveCartBtn');

    // ===== SCROLL TO TOP =====
    if (scrollTopBtn) {
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // ===== SISTEMA DE NOTIFICACIONES =====
    function updateCartBadge() {
        const cart = JSON.parse(localStorage.getItem('geekwave_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

        const badgeC = document.getElementById('cartBadge');
        const badgeU = document.getElementById('userBadge');
        const tooltipU = document.getElementById('userTooltip');

        // Verificar si el usuario est logueado
        const isLoggedIn = localStorage.getItem('sb-kuvrszdgljonaxihmkzj-auth-token') !== null;

        // 1. Semforo del Carrito
        if (badgeC) {
            if (totalItems > 0) {
                badgeC.textContent = totalItems;
                badgeC.classList.add('show');
            } else {
                badgeC.classList.remove('show');
            }
        }

        // 2. Semforo del Usuario
        if (badgeU) {
            if (isLoggedIn) {
                badgeU.className = 'user-badge show green';
                if (tooltipU) tooltipU.classList.remove('active');
            } else if (!isLoggedIn && totalItems > 0) {
                badgeU.className = 'user-badge show red';
                if (tooltipU) tooltipU.classList.add('active');
            } else {
                badgeU.className = 'user-badge';
                badgeU.classList.remove('show');
                if (tooltipU) tooltipU.classList.remove('active');
            }
        }
    }

    updateCartBadge();
    window.addEventListener('pageshow', updateCartBadge);
    window.addEventListener('focus', updateCartBadge);

    function showToast() {
        if (toastMsg) {
            toastMsg.classList.add('show');
            setTimeout(() => toastMsg.classList.remove('show'), 2000);
        }
    }

    // ===== FUNCIONES GLOBALES DEL CARRITO =====
   window.addToCart = function (id, nombre, qty) {
    let cart = JSON.parse(localStorage.getItem('geekwave_cart')) || [];
    let existingItem = cart.find(item => parseInt(item.id) === parseInt(id));
    if (existingItem) {
        existingItem.qty += parseInt(qty);
    } else {
        cart.push({ id: id, nombre: nombre, qty: parseInt(qty) });
    }
    // A linha mgica: salva E avisa ao pago.js que algo mudou
    localStorage.setItem('geekwave_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated')); 
    
    updateCartBadge();
    if (cartDropdown && cartDropdown.classList.contains('show')) renderCart();
};

window.changeCartQty = function (id, delta) {
    let cart = JSON.parse(localStorage.getItem('geekwave_cart')) || [];
    let item = cart.find(i => parseInt(i.id) === parseInt(id));
    if (item) {
        item.qty += delta;
        if (item.qty < 1) item.qty = 1;
    }
    localStorage.setItem('geekwave_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    updateCartBadge();
    renderCart();
};

window.removeFromCart = function (id) {
    let cart = JSON.parse(localStorage.getItem('geekwave_cart')) || [];
    cart = cart.filter(i => parseInt(i.id) !== parseInt(id));
    localStorage.setItem('geekwave_cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));
    updateCartBadge();
    renderCart();
    showToast();
};

    function renderCart() {
        // 🔴 PROTECCIÓN: Si inventario no está listo, no renderizar
        if (!inventarioListo) {
            console.warn('⚠️ Inventario no cargado aún, saltando renderCart...');
            return;
        }

        let cart = JSON.parse(localStorage.getItem('geekwave_cart')) || [];
        const checkoutBtn = document.querySelector('.cart-footer .btn-primary');
        const saveBtn = document.getElementById('saveCartBtn');

        if (cart.length === 0) {
            if (cartItemsContainer) {
                cartItemsContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 40px 20px; font-size: 0.9rem;">
                    <i data-lucide="shopping-cart" style="width: 40px; height: 40px; margin-bottom: 15px; opacity: 0.2;"></i>
                    <br>Tu carrito est vacío.
                </div>`;
            }
            if (checkoutBtn) {
                checkoutBtn.textContent = 'Ir a comprar';
                checkoutBtn.onclick = () => (window.location.href = 'ofertas.html');
                checkoutBtn.classList.remove('btn-disabled');
            }
            if (saveBtn) {
                saveBtn.textContent = 'No, gracias';
                saveBtn.classList.add('btn-disabled');
            }
        } else {
            if (cartItemsContainer) {
                cartItemsContainer.innerHTML = cart
                    .map(item => {
                        const fullItem = inventario.find(i => parseInt(i.id) === parseInt(item.id));

                     // 🔴 PROTECCIÓN: validar que producto existe
                     if (!fullItem) {
                         console.warn(`⚠️ Producto \${item.id} no encontrado`);
                         return '';
                     }

                     const imgUrl = fullItem.imagen_principal || 'https://placehold.co/400x400/png?text=No+Image';
                        return `
                    <div class="cart-item">
                        <img src="${imgUrl}" alt="${item.nombre}" class="cart-item-img">
                        <div class="cart-item-details">
                            <div class="cart-item-title" title="${item.nombre}">${item.nombre}</div>
                            <div class="cart-item-actions">
                                <div class="qty-control">
                                    <button class="qty-btn minus" onclick="event.preventDefault(); event.stopPropagation(); changeCartQty(${item.id}, -1)">-</button>
                                    <span class="qty-num">${item.qty}</span>
                                    <button class="qty-btn plus" onclick="event.preventDefault(); event.stopPropagation(); changeCartQty(${item.id}, 1)">+</button>
                                </div>
                                <button class="trash-btn" onclick="event.preventDefault(); event.stopPropagation(); removeFromCart(${item.id})" title="Eliminar">
                                    <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                                </button>
                            </div>
                        </div>
                    </div>`;
                    })
                    .join('');
            }
            if (checkoutBtn) {
                checkoutBtn.textContent = 'Ir a pagar';
                checkoutBtn.onclick = () => (window.location.href = 'pago.html');
                checkoutBtn.classList.remove('btn-disabled');
            }
            if (saveBtn) {
                saveBtn.textContent = 'Guardar';
                saveBtn.classList.remove('btn-disabled');
            }
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ===== EVENT LISTENERS DEL CARRITO =====
    if (cartBtn) {
        cartBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            closeSearch();
            if (productosMenu) productosMenu.classList.remove('active');
            cartDropdown.classList.toggle('show');
            if (cartDropdown.classList.contains('show')) renderCart();
        });
    }

    if (closeCartBtn) {
        closeCartBtn.addEventListener('click', e => {
            e.stopPropagation();
            cartDropdown.classList.remove('show');
        });
    }

    if (saveCartBtn) {
        saveCartBtn.addEventListener('click', e => {
            e.stopPropagation();
            cartDropdown.classList.remove('show');
        });
    }

    // ===== CARGA DE INVENTARIO =====
   // ===== CARGA DE INVENTARIO CORREGIDO =====
// ===== CARGA DE INVENTARIO =====
// ===== CARGA DE INVENTARIO CORREGIDO =====
fetch('json/inventario.json')
    .then(response => response.json())
    .then(data => {
        // Si el JSON viene con la nueva estructura, extraemos .productos.
        // Si por alguna razón fuera el formato viejo, dejamos 'data' directamente.
        inventario = (data && data.productos) ? data.productos : data;

        // 🔴 Marcar que inventario está listo
        inventarioListo = true;

        // Exponer inventario globalmente para que otros módulos lo encuentren
        window.inventarioGlobal = inventario;

        console.log('📦 Inventario cargado correctamente:', Array.isArray(inventario) ? inventario.length : 0, 'productos');

        // Re-render del carrito ahora que ya tenemos inventario (si existe la función)
        if (typeof renderCart === 'function') {
            try {
                renderCart();
            } catch (e) {
                console.warn('renderCart falló tras cargar inventario:', e);
            }
        }
    })
    .catch(error => {
        console.error('❌ Error cargando inventario:', error);
    });

// ===== LGICA DEL MEGA MEN =====
    let currentMenuCol = 0;
    let currentMenuIdx = [0, 0, 0];

    if (productosBtn) {
        productosBtn.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = productosMenu && productosMenu.classList.contains('active');
            if (!isOpen) {
                closeSearch();
                if (cartDropdown) cartDropdown.classList.remove('show');
                if (productosMenu) productosMenu.classList.add('active');
                currentMenuCol = 0;
                currentMenuIdx = [0, 0, 0];
                renderCategories();
            } else {
                if (productosMenu) productosMenu.classList.remove('active');
            }
        });
    }

    if (productosMenu) {
        productosMenu.addEventListener('click', e => {
            e.stopPropagation();
        });
    }

    window.updateMenuFocus = function (col, idx) {
        currentMenuCol = col;
        currentMenuIdx[col] = idx;
        highlightMenu();
    };

    function highlightMenu() {
        document.querySelectorAll('.menu-list .menu-item').forEach(el => el.classList.remove('highlight'));
        let lists = ['list-categories', 'list-subcategories', 'list-products'];
        let activeList = document.getElementById(lists[currentMenuCol]);
        if (!activeList) return;

        let items = activeList.querySelectorAll('.menu-item');
        if (items.length === 0) return;

        if (currentMenuIdx[currentMenuCol] >= items.length) currentMenuIdx[currentMenuCol] = items.length - 1;
        if (currentMenuIdx[currentMenuCol] < 0) currentMenuIdx[currentMenuCol] = 0;

        let activeItem = items[currentMenuIdx[currentMenuCol]];
        if (activeItem) {
            activeItem.classList.add('highlight');
            activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
function renderCategories() {
    const list = document.getElementById('list-categories');
    if (!list) return;
    list.onwheel = e => e.stopPropagation();

    // 1. Limpiamos espacios y eliminamos valores nulos o vacíos del JSON
    const categoriasLimpias = inventario
        .filter(item => item.categoria && item.categoria.trim() !== '')
        .map(item => item.categoria.trim());

    // 2. Extraemos valores únicos
    const categories = [...new Set(categoriasLimpias)];

    // 3. Forzamos la existencia exacta de Preventas si el JSON no la trae correctamente
    if (!categories.includes("Preventas COLECCIONISTAS")) {
        categories.push("Preventas COLECCIONISTAS");
    }

    list.innerHTML = `
        <li class="menu-item ver-todo"
            onclick="window.location.href='productos.html'"
            onmouseenter="updateMenuFocus(0, 0)">
            Ver todo
        </li>
        ${categories
            .map(
                (cat, idx) => `
            <li class="menu-item"
                onclick="selectCategory('${cat}', this)"
                onmouseenter="updateMenuFocus(0, ${idx + 1})">
                ${cat}
                <i data-lucide="chevron-right"></i>
            </li>
        `
            )
            .join('')}
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    highlightMenu();
}

    window.selectCategory = function (cat, element) {
        document.querySelectorAll('#list-categories .menu-item').forEach(i => i.classList.remove('selected'));
        if (element) element.classList.add('selected');

        const subList = document.getElementById('list-subcategories');
        if (!subList) return;
        subList.onwheel = e => e.stopPropagation();

        const subCats = [...new Set(inventario.filter(i => i.categoria === cat).map(i => i.subcategoria))];
        subList.innerHTML = subCats
            .map(
                (sub, idx) => `
            <li class="menu-item" onclick="selectSubCategory('${cat}', '${sub}', this)" onmouseenter="updateMenuFocus(1, ${idx})">
                ${sub || 'General'} <i data-lucide="chevron-right"></i>
            </li>
        `
            )
            .join('');

        const colSub = document.getElementById('col-subcategories');
        const colProd = document.getElementById('col-products');
        if (colSub) colSub.classList.remove('hidden');
        if (colProd) colProd.classList.add('hidden');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();

        currentMenuCol = 1;
        currentMenuIdx[1] = 0;
        highlightMenu();
    };

    window.selectSubCategory = function (cat, sub, element) {
        document.querySelectorAll('#list-subcategories .menu-item').forEach(i => i.classList.remove('selected'));
        if (element) element.classList.add('selected');

        const prodList = document.getElementById('list-products');
        if (!prodList) return;
        prodList.onwheel = e => e.stopPropagation();

        const prods = inventario.filter(i => i.categoria === cat && i.subcategoria === sub);
        prodList.innerHTML = prods
            .map(
                (p, idx) => `
            <li class="menu-item" style="font-size: 1rem;" onclick="window.location.href='info.html?id=${p.id}'" onmouseenter="updateMenuFocus(2, ${idx})">
                <a href="info.html?id=${p.id}" onclick="event.preventDefault()">${p.nombre}</a>
            </li>
        `
            )
            .join('');

        const colProd = document.getElementById('col-products');
        if (colProd) colProd.classList.remove('hidden');

        currentMenuCol = 2;
        currentMenuIdx[2] = 0;
        highlightMenu();
    };

    document.addEventListener('keydown', e => {
        if (productosMenu && productosMenu.classList.contains('active')) {
            let lists = ['list-categories', 'list-subcategories', 'list-products'];
            let activeList = document.getElementById(lists[currentMenuCol]);
            if (!activeList) return;
            let items = activeList.querySelectorAll('.menu-item');

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentMenuIdx[currentMenuCol]++;
                highlightMenu();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentMenuIdx[currentMenuCol]--;
                highlightMenu();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (
                    currentMenuCol < 2 &&
                    !document.getElementById(['col-categories', 'col-subcategories', 'col-products'][currentMenuCol + 1])
                        .classList.contains('hidden')
                ) {
                    currentMenuCol++;
                    highlightMenu();
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (currentMenuCol > 0) {
                    currentMenuCol--;
                    highlightMenu();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (items[currentMenuIdx[currentMenuCol]]) {
                    items[currentMenuIdx[currentMenuCol]].click();
                }
            }
        }
    });

    // ===== FILTROS DE BSQUEDA =====
    const filterCategory = document.getElementById('filterCategory');
    const filterPrice = document.getElementById('filterPrice');
    const filterSort = document.getElementById('filterSort');

    const savedFilters = JSON.parse(localStorage.getItem('geekwave_filters')) || {
        category: 'Todo',
        price: 'all',
        sort: 'relevance',
    };
    if (filterCategory) filterCategory.value = savedFilters.category;
    if (filterPrice) filterPrice.value = savedFilters.price;
    if (filterSort) filterSort.value = savedFilters.sort;

    if (filterBtn) {
        filterBtn.addEventListener('click', e => {
            e.stopPropagation();
            if (searchResults) searchResults.classList.remove('active');
            if (filterPanel) filterPanel.classList.toggle('show');
            filterBtn.classList.toggle('active');
        });
    }

    if (filterPanel) {
        filterPanel.addEventListener('click', e => {
            e.stopPropagation();
        });
    }

    if (applyFiltersBtn) {
        applyFiltersBtn.addEventListener('click', () => {
            localStorage.setItem(
                'geekwave_filters',
                JSON.stringify({
                    category: filterCategory.value,
                    price: filterPrice.value,
                    sort: filterSort.value,
                })
            );
            if (filterPanel) filterPanel.classList.remove('show');
            filterBtn.classList.remove('active');
            if (searchInput && searchInput.value.trim() !== '') {
                searchInput.dispatchEvent(new Event('input'));
            } else {
                showRecentSearches();
            }
            if (searchInput) searchInput.focus();
        });
    }

    // ===== BSQUEDAS RECIENTES =====
    function getRecentSearches() {
        const stored = localStorage.getItem('recentSearches');
        return stored ? JSON.parse(stored) : [];
    }

    function saveRecentSearch(term) {
        if (!term) return;
        let recents = getRecentSearches();
        recents = recents.filter(item => item !== term);
        recents.unshift(term);
        recents = recents.slice(0, 3);
        localStorage.setItem('recentSearches', JSON.stringify(recents));
    }

    function removeRecentSearch(term) {
        let recents = getRecentSearches();
        recents = recents.filter(item => item !== term);
        localStorage.setItem('recentSearches', JSON.stringify(recents));
        showRecentSearches();
    }

    function showRecentSearches() {
        if (!searchResults) return;
        const recents = getRecentSearches();
        if (recents.length === 0) {
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            return;
        }
        searchResults.innerHTML = '<div class="recent-header">Bsquedas recientes</div>';
        recents.forEach(term => {
            searchResults.insertAdjacentHTML(
                'beforeend',
                `
                <div class="recent-item">
                    <span class="recent-link">${term}</span>
                    <span class="remove-recent" data-term="${term}">&times;</span>
                </div>
            `
            );
        });
        searchResults.classList.add('active');

        document.querySelectorAll('.recent-link').forEach(link => {
            link.addEventListener('click', () => {
                const term = link.innerText;
                const productoEncontrado = inventario.find(item => item.nombre === term);

                if (productoEncontrado) {
                    window.location.href = `info.html?id=${productoEncontrado.id}`;
                } else {
                    if (searchInput) {
                        searchInput.value = term;
                        searchInput.dispatchEvent(new Event('input'));
                    }
                }
            });
        });

        document.querySelectorAll('.remove-recent').forEach(x => {
            x.addEventListener('click', e => {
                e.stopPropagation();
                removeRecentSearch(x.getAttribute('data-term'));
                if (searchInput) searchInput.focus();
            });
        });
    }

    // ===== BUSCADOR =====
    if (searchBtn) {
        searchBtn.addEventListener('click', e => {
            e.stopPropagation();
            const isActive = searchContainer && searchContainer.classList.contains('active');
            if (!isActive) {
                if (searchContainer) searchContainer.classList.add('active');
                if (navLinks) navLinks.classList.add('hidden');
                if (productosMenu) productosMenu.classList.remove('active');
                if (cartDropdown) cartDropdown.classList.remove('show');
                if (filterPanel) filterPanel.classList.remove('show');
                if (filterBtn) filterBtn.classList.remove('active');
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                }
                showRecentSearches();
            } else if (searchInput && searchInput.value === '') {
                closeSearch();
            }
        });
    }

    if (searchInput) {
        searchInput.addEventListener('click', e => e.stopPropagation());

        searchInput.addEventListener('focus', () => {
            if (filterPanel && filterPanel.classList.contains('show')) {
                filterPanel.classList.remove('show');
                if (filterBtn) filterBtn.classList.remove('active');
                if (searchInput.value === '') showRecentSearches();
            }
        });

        searchInput.addEventListener('input', e => {
            const query = e.target.value.toLowerCase().trim();
            if (searchResults) searchResults.innerHTML = '';
            currentFocus = -1;

            if (query.length === 0) {
                showRecentSearches();
                return;
            }

            if (searchResults) searchResults.classList.add('active');

            let matches = inventario.filter(item => {
                const textToSearch = (item.nombre + ' ' + item.descripcion_tecnica + ' ' + (item.subcategoria || '')).toLowerCase();
                return textToSearch.includes(query);
            });

            if (filterCategory && filterCategory.value !== 'Todo')
                matches = matches.filter(item => item.categoria && item.categoria.includes(filterCategory.value));
            if (filterPrice) {
                if (filterPrice.value === 'under50') matches = matches.filter(item => item.precio_usd < 50);
                else if (filterPrice.value === '50to150') matches = matches.filter(item => item.precio_usd >= 50 && item.precio_usd <= 150);
                else if (filterPrice.value === 'over150') matches = matches.filter(item => item.precio_usd > 150);
            }

            if (filterSort) {
                if (filterSort.value === 'az') matches.sort((a, b) => a.nombre.localeCompare(b.nombre));
                else if (filterSort.value === 'priceAsc') matches.sort((a, b) => a.precio_usd - b.precio_usd);
                else if (filterSort.value === 'priceDesc') matches.sort((a, b) => b.precio_usd - a.precio_usd);
                else if (filterSort.value === 'newest') matches.sort((a, b) => (b.ao || 0) - (a.ao || 0));
                else {
                    matches.sort((a, b) => {
                        let indexA = a.nombre.toLowerCase().indexOf(query);
                        let indexB = b.nombre.toLowerCase().indexOf(query);
                        if (indexA === -1) indexA = 999;
                        if (indexB === -1) indexB = 999;
                        return indexA - indexB;
                    });
                }
            }

            if (matches.length > 0) {
                matches.slice(0, 6).forEach(item => {
             const imgUrl = item.imagen_principal;
                    const safeName = item.nombre.replace(/'/g, "&#39;");

const resultHtml = `
<a href="info.html?id=${item.id}" class="result-item" data-name="${safeName}">
    <img src="${imgUrl}" alt="${safeName}" class="result-img">

    <div class="result-info">
        <span class="result-title">
            ${item.nombre}
            <span style="color:#00ff7f; font-size:0.85em; margin-left:8px;">
                $${item.precio_usd.toFixed(2)}
            </span>
        </span>
        <span class="result-desc">${item.descripcion_tecnica}</span>
    </div>

    <div class="result-actions">
        <div class="qty-control" onclick="event.preventDefault(); event.stopPropagation();">
            <button class="qty-btn minus"
                onclick="let el=this.nextElementSibling; el.textContent=Math.max(1,parseInt(el.textContent)-1);">-</button>

            <span class="qty-num">1</span>

            <button class="qty-btn plus"
                onclick="let el=this.previousElementSibling; el.textContent=parseInt(el.textContent)+1;">+</button>
        </div>

        <button class="add-cart-btn"
            title="Agregar al carrito"
            onclick="event.preventDefault(); event.stopPropagation(); window.addToCart(${item.id}, '${safeName}', 1)">
            <i data-lucide="shopping-cart"></i>
        </button>
    </div>
</a>
`;
                    if (searchResults) searchResults.insertAdjacentHTML('beforeend', resultHtml);
                });
                if (typeof lucide !== 'undefined') lucide.createIcons();
                document.querySelectorAll('.result-item').forEach(item => {
                    item.addEventListener('click', () => saveRecentSearch(item.getAttribute('data-name')));
                });
            } else {
                if (searchResults) searchResults.innerHTML = '<div class="no-results">No se encontraron productos. Verifica tus filtros.</div>';
            }
        });

        searchInput.addEventListener('keydown', e => {
            let items = (searchResults || {}).querySelectorAll?.('.result-item, .recent-item') || [];
            if (items.length === 0) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                currentFocus++;
                addActive(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                currentFocus--;
                addActive(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (currentFocus > -1 && items[currentFocus]) {
                    if (items[currentFocus].classList.contains('result-item')) {
                        saveRecentSearch(items[currentFocus].getAttribute('data-name'));
                        items[currentFocus].click();
                    } else if (items[currentFocus].classList.contains('recent-item')) {
                        const recentLink = items[currentFocus].querySelector('.recent-link');
                        if (recentLink) recentLink.click();
                    }
                }
            }
        });
    }

    function addActive(items) {
        if (!items || items.length === 0) return;
        removeActive(items);
        if (currentFocus >= items.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = items.length - 1;
        items[currentFocus].classList.add('highlight');
        items[currentFocus].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function removeActive(items) {
        items.forEach(item => item.classList.remove('highlight'));
    }

    // ===== DETECTORES DE CLIC AFUERA =====
    document.addEventListener('click', e => {
        if (searchContainer && !searchContainer.contains(e.target)) closeSearch();
        if (productosMenu && productosBtn && !productosBtn.contains(e.target) && !productosMenu.contains(e.target))
            productosMenu.classList.remove('active');
        if (cartDropdown && cartBtn && !cartBtn.contains(e.target) && !cartDropdown.contains(e.target))
            cartDropdown.classList.remove('show');
    });

    function closeSearch() {
        if (searchContainer) searchContainer.classList.remove('active');
        if (searchResults) searchResults.classList.remove('active');
        if (navLinks) navLinks.classList.remove('hidden');
        if (filterPanel) filterPanel.classList.remove('show');
        if (filterBtn) filterBtn.classList.remove('active');
        if (searchInput) searchInput.value = '';
        currentFocus = -1;
    }

 // ===== MARCAR ENLACE ACTIVO DINÁMICAMENTE =====
    const currentPath = window.location.pathname;
    const allNavLinks = document.querySelectorAll('.nav-links > a, .nav-item-dropdown > a');

    allNavLinks.forEach(link => {
        link.classList.remove('active'); // Limpiamos todos primero
        const href = link.getAttribute('href');
        
        if (!href || href === '#') return;

        // Marcamos el correcto según la URL
        if (currentPath.endsWith(href) || (currentPath.endsWith('/') && href === 'index.html')) {
            link.classList.add('active');
        }
    });

    // Caso especial para mantener "Productos" marcado si estás viendo productos
    if (currentPath.includes('productos.html') || currentPath.includes('info.html') || currentPath.includes('info.html')) {
        const btnMenuProductos = document.getElementById('productosBtn');
        if (btnMenuProductos) {
            btnMenuProductos.classList.add('active');
        }
    }

    

    // ==========================================
    // FAVORITOS
    // ==========================================

    function updateFavoritesBadge() {

        const favorites =
            JSON.parse(
                localStorage.getItem(
                    "geekwave_favorites"
                )
            ) || [];

        const btn =
            document.getElementById(
                "favoritesBtn"
            );

        const badge =
            document.getElementById(
                "favoritesBadge"
            );

        if (!btn) return;

        if (favorites.length > 0) {

            btn.classList.add(
                "has-favorites"
            );

                // [FIX] visualizar corazón activo (rojo) cuando hay favoritos
                btn.classList.add('active');

            if (badge) {

                badge.textContent =
                    favorites.length;

                badge.classList.add(
                    "show"
                );
            }

        } else {

            btn.classList.remove(
                "has-favorites"
            );

                // [FIX] limpiar visual 'active' si no hay favoritos
                btn.classList.remove('active');

            if (badge) {

                badge.classList.remove(
                    "show"
                );
            }
        }
    }

    function renderFavorites() {

        const favoritos =
            JSON.parse(
                localStorage.getItem(
                    "geekwave_favorites"
                )
            ) || [];

        const container =
            document.getElementById(
                "favoritesContainer"
            );

        if (!container) return;

        const productos =
            inventario.filter(
                p =>
                    favoritos.includes(
                        String(p.id)
                    )
            );

        if (productos.length === 0) {

            container.innerHTML = `
                <div class="favorites-empty">
                    No tienes favoritos aún
                </div>
            `;

            return;
        }

        container.innerHTML =
            productos.map(prod => `

                <a
                    href="info.html?id=${prod.id}"
                    class="favorite-item"
                >

                    <img
                        src="${prod.imagen_principal}"
                    >

                    <div>

                        <h4>${prod.nombre}</h4>

                        <span>
                            $${prod.precio_usd}
                        </span>

                    </div>

                </a>

            `).join("");
    }

    window.addEventListener('favoritesUpdated', () => {
        // [FIX] Sólo actualizar contador/visual del navbar. No renderizar el panel aquí.
        updateFavoritesBadge();
    });

    // [FIX] Renderizar panel de favoritos SOLO al hacer click en el corazón del navbar
    (function(){
        const favBtn = document.getElementById('favoritesBtn');
        if (!favBtn) return;
        favBtn.addEventListener('click', function(e){
            e.preventDefault();
            try {
                if (typeof renderFavorites === 'function') renderFavorites();
                // actualizar apariencia del botón localmente
                const favs = JSON.parse(localStorage.getItem('geekwave_favorites')) || [];
                if (favs.length > 0) favBtn.classList.add('active'); else favBtn.classList.remove('active');
            } catch (err) { console.error('Error al renderizar favoritos al click:', err); }
        });
    })();

    updateFavoritesBadge();



    

    // [FIX] Sincronizar conteo de favoritos entre pestañas (solo actualiza el badge)
    window.addEventListener('storage', function(e) {
        if (e.key === 'geekwave_favorites') {
            try {
                updateFavoritesBadge();
            } catch (err) { console.error('Favorites storage sync error', err); }
        }
    });
console.log(' Navbar completamente inicializado y listo');
}