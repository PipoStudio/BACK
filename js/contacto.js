
/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    console.log("[Geekwave] Contacto listo");

    initializeContactPage();

});

/* =========================================================
   INIT
========================================================= */

function initializeContactPage() {

    initializeLucide();

    initializeLenis();

    initializeRevealAnimations();

    initializeForm();

    initializeHoverEffects();

}

/* =========================================================
   LUCIDE ICONS
========================================================= */

function initializeLucide() {

    if (window.lucide) {

        lucide.createIcons();

    }

}

/* =========================================================
   LENIS SMOOTH SCROLL
========================================================= */

function initializeLenis() {

    if (!window.Lenis) return;

    const lenis = new Lenis({
        duration: 1.2,
        smoothWheel: true,
        smoothTouch: false,
    });

    function raf(time) {

        lenis.raf(time);

        requestAnimationFrame(raf);

    }

    requestAnimationFrame(raf);

}

/* =========================================================
   REVEAL ANIMATIONS
========================================================= */

function initializeRevealAnimations() {

    const revealElements = document.querySelectorAll(`
        .contact-card,
        .contact-form-wrapper,
        .extra-card,
        .social-panel
    `);

    const observer = new IntersectionObserver(

        (entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.classList.add("revealed");

                }

            });

        },

        {
            threshold: 0.12,
        }

    );

    revealElements.forEach((element) => {

        observer.observe(element);

    });

}

/* =========================================================
   FORM
========================================================= */

function initializeForm() {

    const form = document.getElementById("contactForm");

    if (!form) return;

    form.addEventListener("submit", handleSubmit);

}

/* =========================================================
   HANDLE SUBMIT
========================================================= */

function handleSubmit(e) {

    e.preventDefault();

    const form = e.target;

    const submitBtn = form.querySelector(".submit-btn");

    const formData = new FormData(form);

    const payload = {

        nombre: formData.get("nombre"),

        email: formData.get("email"),

        motivo: formData.get("motivo"),

        mensaje: formData.get("mensaje"),

    };

    console.log("[Geekwave Contact Form]", payload);

    /* =====================================================
       VALIDACIN SIMPLE
    ===================================================== */

    if (
        !payload.nombre ||
        !payload.email ||
        !payload.mensaje
    ) {

        showNotification(
            "Por favor completa todos los campos requeridos.",
            "error"
        );

        return;

    }

    /* =====================================================
       LOADING STATE
    ===================================================== */

    submitBtn.classList.add("loading");

    submitBtn.innerHTML = `
        <span>ENVIANDO...</span>
    `;

    /* =====================================================
       SIMULACIN ENVO
       (Aqu conectar Bkend/API)
    ===================================================== */

    setTimeout(() => {

        submitBtn.classList.remove("loading");

        submitBtn.classList.add("success");

        submitBtn.innerHTML = `
            <i data-lucide="check"></i>
            <span>MENSAJE ENVIADO</span>
        `;

        lucide.createIcons();

        showNotification(
            "Tu mensaje fue enviado correctamente.",
            "success"
        );

        form.reset();

        setTimeout(() => {

            submitBtn.classList.remove("success");

            submitBtn.innerHTML = `
                <span>ENVIAR MENSAJE</span>
                <i data-lucide="arrow-up-right"></i>
            `;

            lucide.createIcons();

        }, 3000);

    }, 1800);

}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function showNotification(message, type = "success") {

    const existing =
        document.querySelector(".gw-notification");

    if (existing) {

        existing.remove();

    }

    const notification =
        document.createElement("div");

    notification.className = `
        gw-notification
        ${type}
    `;

    notification.innerHTML = `
        <div class="gw-notification-content">

            <div class="gw-notification-dot"></div>

            <span>
                ${message}
            </span>

        </div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {

        notification.classList.add("visible");

    }, 50);

    setTimeout(() => {

        notification.classList.remove("visible");

        setTimeout(() => {

            notification.remove();

        }, 400);

    }, 4200);

}

/* =========================================================
   HOVER EFFECTS
========================================================= */

function initializeHoverEffects() {

    const cards = document.querySelectorAll(`
        .contact-card,
        .extra-card,
        .social-link
    `);

    cards.forEach((card) => {

        card.addEventListener(
            "mousemove",
            handleCardGlow
        );

        card.addEventListener(
            "mouseleave",
            resetCardGlow
        );

    });

}

/* =========================================================
   CARD GLOW
========================================================= */

function handleCardGlow(e) {

    const card = e.currentTarget;

    const rect =
        card.getBoundingClientRect();

    const x =
        e.clientX - rect.left;

    const y =
        e.clientY - rect.top;

    card.style.setProperty(
        "--mouse-x",
        `${x}px`
    );

    card.style.setProperty(
        "--mouse-y",
        `${y}px`
    );

}

/* =========================================================
   RESET GLOW
========================================================= */

function resetCardGlow(e) {

    const card = e.currentTarget;

    card.style.setProperty(
        "--mouse-x",
        `50%`
    );

    card.style.setProperty(
        "--mouse-y",
        `50%`
    );

}

/* =========================================================
   DYNAMIC GLOW STYLE
========================================================= */

const dynamicGlowStyle =
    document.createElement("style");

dynamicGlowStyle.innerHTML = `

/* =====================================================
   REVEAL
===================================================== */

.contact-card,
.contact-form-wrapper,
.extra-card,
.social-panel {
    opacity: 0;
    transform: translateY(40px);

    transition:
        opacity 0.8s ease,
        transform 0.8s ease;
}

.contact-card.revealed,
.contact-form-wrapper.revealed,
.extra-card.revealed,
.social-panel.revealed {
    opacity: 1;
    transform: translateY(0);
}

/* =====================================================
   INTERACTIVE GLOW
===================================================== */

.contact-card::before,
.extra-card::before,
.social-link::before {

    content: "";

    position: absolute;

    inset: 0;

    border-radius: inherit;

    background:
        radial-gradient(
            500px circle at var(--mouse-x) var(--mouse-y),
            rgba(255,255,255,0.08),
            transparent 40%
        );

    opacity: 0;

    transition: opacity 0.3s ease;

    pointer-events: none;

}

.contact-card:hover::before,
.extra-card:hover::before,
.social-link:hover::before {

    opacity: 1;

}

/* =====================================================
   NOTIFICATION
===================================================== */

.gw-notification {

    position: fixed;

    top: 110px;
    right: 30px;

    z-index: 999999;

    background:
        rgba(15,15,15,0.95);

    backdrop-filter: blur(20px);

    border:
        1px solid rgba(255,255,255,0.08);

    border-radius: 22px;

    padding:
        1rem
        1.2rem;

    min-width: 320px;

    transform:
        translateY(-20px);

    opacity: 0;

    transition:
        opacity 0.4s ease,
        transform 0.4s ease;

    box-shadow:
        0 10px 40px rgba(0,0,0,0.35);

}

.gw-notification.visible {

    opacity: 1;

    transform:
        translateY(0);

}

.gw-notification-content {

    display: flex;
    align-items: center;

    gap: 14px;

}

.gw-notification-dot {

    width: 10px;
    height: 10px;

    border-radius: 50%;

    background: #ffffff;

    flex-shrink: 0;

}

.gw-notification span {

    color: #fff;

    font-size: 0.95rem;

    line-height: 1.5;

}

/* Error */

.gw-notification.error {

    border-color:
        rgba(255,80,80,0.25);

}

.gw-notification.error
.gw-notification-dot {

    background: #ff4b4b;

}

/* Success */

.gw-notification.success {

    border-color:
        rgba(255,255,255,0.12);

}

/* =====================================================
   BUTTON STATES
===================================================== */

.submit-btn.loading {

    opacity: 0.8;

    pointer-events: none;

}

.submit-btn.success {

    background: #ffffff;
    color: #000000;

}

/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 768px) {

    .gw-notification {

        top: 90px;

        right: 16px;
        left: 16px;

        min-width: unset;

    }

}

`;

document.head.appendChild(
    dynamicGlowStyle
);