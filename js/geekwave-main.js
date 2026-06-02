/**
 * GEEKWAVE MAIN - Lgica central de carrito y sincronizacin
 */

console.log("[Geekwave] Lgica de Carrito Conectada");

// --- 1. Sincronizacin de UI ---
function syncGeekwaveCart() {
    const cart = JSON.parse(localStorage.getItem('geekwave_cart')) || [];
    const saveBtn = document.getElementById('saveCartBtn');
    const itemsContainer = document.getElementById('cartItemsContainer');
    const checkoutBtn = document.querySelector('.cart-footer .btn-primary');

    // Renderizado de lista (si el contenedor existe)
    if (itemsContainer) {
        if (cart.length === 0) {
            itemsContainer.innerHTML = '<p style="text-align:center;">Tu carrito est vaco</p>';
        } else {
            itemsContainer.innerHTML = cart.map((item, index) => `
                <div class="cart-item">
                    <span>${item.name}</span>
                    <span>$${parseFloat(item.price || 0).toFixed(2)}</span>
                </div>
            `).join('');
        }
    }

    // Lgica de estados de botones (sin deformar el diseo)
    if (saveBtn) {
        saveBtn.disabled = (cart.length === 0);
        saveBtn.textContent = (cart.length === 0) ? 'No, gracias' : 'Guardar';
        cart.length === 0 ? saveBtn.classList.add('btn-disabled') : saveBtn.classList.remove('btn-disabled');
    }

    if (checkoutBtn) {
        // Solo cambiamos el texto, manteniendo la estructura original
        checkoutBtn.textContent = (cart.length === 0) ? 'Ir a comprar' : 'Ir a pagar';
        checkoutBtn.onclick = () => { window.location.href = (cart.length === 0) ? 'ofertas.html' : 'pago.html'; };
    }
}

// --- 2. Lgica de Agregar al Carrito ---
window.addToCart = (id, name, price) => {
    let cart = JSON.parse(localStorage.getItem('geekwave_cart')) || [];
    cart.push({ id, name, price: parseFloat(price) });
    localStorage.setItem('geekwave_cart', JSON.stringify(cart));
    
    console.log(` Producto ${name} agregado ($${price})`);
    syncGeekwaveCart();
};

// --- 3. Vinculacin de eventos a botones HTML ---
function bindCartEvents() {
    const botones = document.querySelectorAll('.btn-comprar');
    botones.forEach(btn => {
        // Usamos una funcin annima para evitar problemas con 'this'
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            const price = btn.getAttribute('data-price');
            window.addToCart(id, name, price);
        });
    });
}

// --- 4. Inicializacin (Escucha al cargador de componentes) ---
document.addEventListener('navbarLoaded', () => {
    console.log(" Geekwave Main: Navbar listo, sincronizando...");
    syncGeekwaveCart();
    bindCartEvents();
});

window.addEventListener('storage', syncGeekwaveCart);

// --- 5. Lgica de Juegos ---
async function registrarPartidaDiaria() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase.rpc('registrar_partida_y_actualizar_racha', { user_id_param: user.id });
    if (!error && data && data[0].enviar_correo_tipo !== 'NINGUNO') {
        notificarAEmail(user.email, data[0].enviar_correo_tipo);
    }
}