// =========================
// GEEKWAVE GLOBAL LOGIC
// =========================

window.INVENTARIO = [];

// Funcin nica para cargar inventario
async function cargarInventario() {
    try {
        const res = await fetch('json/inventario.json');
        window.INVENTARIO = await res.json();
        console.log("Inventario cargado", window.INVENTARIO);
    } catch (error) {
        console.error("Error cargando inventario:", error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Carga inicial
    await cargarInventario();

    // 2. BUSCADOR
    const searchInput = document.querySelector("#search");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const valor = e.target.value.toLowerCase();
            const resultados = window.INVENTARIO.filter(p =>
                p.nombre.toLowerCase().includes(valor)
            );
            console.log(" Resultados:", resultados);
        });
    }

    // 3. MEN PRODUCTOS
    const menuBtn = document.querySelector(".menu-productos");
    const menu = document.querySelector(".dropdown-productos");
    if (menuBtn) {
        menuBtn.addEventListener("click", () => {
            if (menu) menu.classList.toggle("active");
            console.log(" Catlogo:", window.INVENTARIO);
        });
    }

    // 4. USER PANEL
    const user = document.querySelector(".user-icon");
    const panel = document.querySelector(".user-panel");
    if (user && panel) {
        user.addEventListener("mouseenter", () => panel.style.display = "block");
        user.addEventListener("mouseleave", () => panel.style.display = "none");
    }

    // 5. LINKS EN CONSTRUCCIN (Correccin del 'or' por '||')
    document.querySelectorAll("a").forEach(link => {
        const href = link.getAttribute("href");
        if (href === "#" || href === "") {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                alert("Estamos trabajando en esta seccin ");
            });
        }
    });

    // 6. SLIDER TICKER
    const tracks = document.querySelectorAll('.slider-track');
    tracks.forEach(track => {
        const initialCards = Array.from(track.children);
        initialCards.forEach(card => track.appendChild(card.cloneNode(true)));

        const wrapper = track.parentElement;
        wrapper.addEventListener('scroll', () => {
            if (wrapper.scrollLeft >= track.scrollWidth / 2) wrapper.scrollLeft = 1;
            else if (wrapper.scrollLeft <= 0) wrapper.scrollLeft = track.scrollWidth / 2 - 1;
        });
    });

    // 7. FIX VISUAL
    document.body.style.visibility = "visible";
});