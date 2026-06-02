document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // ELEMENTOS
    // =====================================

    const overlay = document.getElementById("welcome-modal-overlay");
    const modal = document.getElementById("welcome-modal");

    const closeBtn = document.getElementById("close-modal");

    const guestContent = document.getElementById("guest-content");
    const loggedContent = document.getElementById("logged-content");

    const noShowGuest = document.getElementById("no-show-again");
    const noShowLogged = document.getElementById("no-show-again-logged");

    const form = document.getElementById("newsletter-form");
    const subscribeBtn = document.getElementById("subscribe-btn");

    const slides = document.querySelectorAll(".slide");
    const dots = document.querySelectorAll(".modal-dot");

    // =====================================
    // CONFIG
    // =====================================

    const STORAGE_DISABLED = "geekwave_modal_disabled";
    const STORAGE_MINIMIZED = "geekwave_modal_minimized";

    // =====================================
    // LOGIN DETECTION
    // =====================================

   const isLogged =
    localStorage.getItem(
        "sb-kuvrszdgljonaxihmkzj-auth-token"
    ) !== null;

const minimizedView =
    document.getElementById(
        "modal-minimized-view"
    );

if (isLogged) {

    minimizedView.innerHTML = `
        <div class="minimized-content">
            <span class="minimized-label">
                BENEFICIOS DISPONIBLES
            </span>
            <strong>
                Ver mis ofertas
            </strong>
        </div>
    `;

}
else {

    minimizedView.innerHTML = `
        <div class="minimized-content">
            <span class="minimized-label">
                ACCESO PRIORITARIO
            </span>
            <strong>
                Descubre Geekwave
            </strong>
        </div>
    `;
}

    // =====================================
    // CAMBIAR VISTA SEGÚN LOGIN
    // =====================================

    if (isLogged) {

        guestContent.classList.add("hidden");
        loggedContent.classList.remove("hidden");

    } else {

        guestContent.classList.remove("hidden");
        loggedContent.classList.add("hidden");
    }

    // =====================================
    // ESTADO INICIAL
    // =====================================

    const modalDisabled =
        localStorage.getItem(STORAGE_DISABLED);

    const modalMinimized =
        localStorage.getItem(STORAGE_MINIMIZED);

    if (modalDisabled === "true") {
        return;
    }

    overlay.classList.remove("hidden");

    if (modalMinimized === "true") {
        setModalState(true);
    } else {
        setModalState(false);
    }

    // =====================================
    // FUNCIÓN ESTADO
    // =====================================
function setModalState(minimized) {

    const minimizedView =
        document.getElementById(
            "modal-minimized-view"
        );

    if (minimized) {

        modal.classList.add("minimized");

        overlay.classList.add(
            "minimized-overlay"
        );

        minimizedView.classList.remove(
            "hidden"
        );

        localStorage.setItem(
            STORAGE_MINIMIZED,
            "true"
        );

    }
    else {

        modal.classList.remove("minimized");

        overlay.classList.remove(
            "minimized-overlay"
        );

        minimizedView.classList.add(
            "hidden"
        );

        localStorage.setItem(
            STORAGE_MINIMIZED,
            "false"
        );
    }
}

    // =====================================
    // CERRAR / MINIMIZAR
    // =====================================

    closeBtn.addEventListener("click", (e) => {

        e.stopPropagation();

        const shouldDisable =
            (noShowGuest && noShowGuest.checked) ||
            (noShowLogged && noShowLogged.checked);

        // Cerrar para siempre

        if (shouldDisable) {

            localStorage.setItem(
                STORAGE_DISABLED,
                "true"
            );

            overlay.classList.add("hidden");

            return;
        }

        // Si ya estaba minimizado
        // entonces cerrar completamente

        if (
            modal.classList.contains(
                "minimized"
            )
        ) {

            overlay.classList.add("hidden");

            return;
        }

        // Minimizar

        setModalState(true);
    });

    // =====================================
    // EXPANDIR
    // =====================================

    modal.addEventListener("click", (e) => {

        if (
            modal.classList.contains(
                "minimized"
            )
        ) {

            if (
                !closeBtn.contains(
                    e.target
                )
            ) {

                setModalState(false);
            }
        }
    });

    // =====================================
    // FORMULARIO
    // =====================================

    if (form) {

        form.addEventListener(
            "submit",
            async (e) => {

                e.preventDefault();

                subscribeBtn.classList.add(
                    "loading"
                );

                subscribeBtn.disabled = true;

                // Simulación API

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            1800
                        )
                );

                subscribeBtn.classList.remove(
                    "loading"
                );

                subscribeBtn.classList.add(
                    "success"
                );

                subscribeBtn.textContent =
                    "¡Suscrito!";

                localStorage.setItem(
                    STORAGE_DISABLED,
                    "true"
                );

                setTimeout(() => {

                    overlay.classList.add(
                        "hidden"
                    );

                }, 1200);
            }
        );
    }

    // =====================================
    // SLIDER
    // =====================================

    let currentSlide = 0;

    function showSlide(index) {

        slides.forEach(slide => {
            slide.classList.remove(
                "active"
            );
        });

        dots.forEach(dot => {
            dot.classList.remove(
                "active"
            );
        });

        slides[index].classList.add(
            "active"
        );

        dots[index].classList.add(
            "active"
        );
    }

    function nextSlide() {

        currentSlide++;

        if (
            currentSlide >= slides.length
        ) {
            currentSlide = 0;
        }

        showSlide(currentSlide);
    }

    showSlide(currentSlide);

    setInterval(nextSlide, 5000);

});


    // =====================================
    // VER MIS OFERTAS PARA USUARIOOS LOGEADOS
    // =====================================


