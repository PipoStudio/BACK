/* =========================================================
   GEEKWAVE SUPPORT PAGE
   ========================================================= */

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    console.log("[Geekwave] Soporte listo");

    initializeSupportPage();

});

/* =========================================================
   INIT
========================================================= */

function initializeSupportPage() {

    initializeLucide();

    initializeLenis();

    initializeFAQ();

    initializeRevealAnimations();

    initializeHoverGlow();

    initializeSearch();

    initializeFakeLiveSupport();

}

/* =========================================================
   LUCIDE
========================================================= */

function initializeLucide() {

    if (window.lucide) {

        lucide.createIcons();

    }

}

/* =========================================================
   LENIS
========================================================= */

function initializeLenis() {

    if (!window.Lenis) return;

    const lenis = new Lenis({

        duration: 1.15,

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
   FAQ
========================================================= */

function initializeFAQ() {

    const faqQuestions =
        document.querySelectorAll(".faq-question");

    faqQuestions.forEach((question) => {

        question.addEventListener(
            "click",
            handleFAQToggle
        );

    });

}

/* =========================================================
   FAQ TOGGLE
========================================================= */

function handleFAQToggle(e) {

    const currentItem =
        e.currentTarget.closest(".faq-item");

    const isActive =
        currentItem.classList.contains("active");

    /*
        Cerrar todos
    */

    document
        .querySelectorAll(".faq-item")
        .forEach((item) => {

            item.classList.remove("active");

        });

    /*
        Abrir actual
    */

    if (!isActive) {

        currentItem.classList.add("active");

    }

}

/* =========================================================
   REVEAL ANIMATIONS
========================================================= */

function initializeRevealAnimations() {

    const revealElements =
        document.querySelectorAll(`
            .quick-card,
            .support-panel
        `);

    const observer =
        new IntersectionObserver(

            (entries) => {

                entries.forEach((entry) => {

                    if (
                        entry.isIntersecting
                    ) {

                        entry.target.classList.add(
                            "revealed"
                        );

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
   HOVER GLOW
========================================================= */

function initializeHoverGlow() {

    const interactiveCards =
        document.querySelectorAll(`
            .quick-card,
            .support-panel,
            .support-contact-item
        `);

    interactiveCards.forEach((card) => {

        card.addEventListener(
            "mousemove",
            updateGlowPosition
        );

        card.addEventListener(
            "mouseleave",
            resetGlowPosition
        );

    });

}

/* =========================================================
   UPDATE GLOW
========================================================= */

function updateGlowPosition(e) {

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

function resetGlowPosition(e) {

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
   SEARCH INPUT
========================================================= */

function initializeSearch() {

    const searchInput =
        document.querySelector(
            ".support-search input"
        );

    if (!searchInput) return;

    searchInput.addEventListener(
        "focus",
        handleSearchFocus
    );

    searchInput.addEventListener(
        "keydown",
        handleSearchEnter
    );

}

/* =========================================================
   SEARCH FOCUS
========================================================= */

function handleSearchFocus() {

    showNotification(
        "Próximamente: búsqueda inteligente de soporte.",
        "info"
    );

}

/* =========================================================
   SEARCH ENTER
========================================================= */

function handleSearchEnter(e) {

    if (e.key !== "Enter") return;

    e.preventDefault();

    showNotification(
        "La bsqueda avanzada estar disponible pronto.",
        "info"
    );

}

/* =========================================================
   FAKE LIVE SUPPORT
========================================================= */

function initializeFakeLiveSupport() {

    const supportItems =
        document.querySelectorAll(
            ".support-contact-item"
        );

    supportItems.forEach((item) => {

        item.addEventListener(
            "click",
            handleSupportAction
        );

    });

}

/* =========================================================
   SUPPORT ACTION
========================================================= */

function handleSupportAction(e) {

    e.preventDefault();

    const title =
        e.currentTarget.querySelector("h4")
        ?.textContent;

    showNotification(
        `${title} próximamente disponible.`,
        "success"
    );

}

/* =========================================================
   NOTIFICATIONS
========================================================= */

function showNotification(
    message,
    type = "success"
) {

    const existing =
        document.querySelector(
            ".gw-support-notification"
        );

    if (existing) {

        existing.remove();

    }

    const notification =
        document.createElement("div");

    notification.className = `
        gw-support-notification
        ${type}
    `;

    notification.innerHTML = `

        <div class="gw-support-notification-content">

            <div class="gw-support-dot"></div>

            <span>
                ${message}
            </span>

        </div>

    `;

    document.body.appendChild(
        notification
    );

    setTimeout(() => {

        notification.classList.add(
            "visible"
        );

    }, 40);

    setTimeout(() => {

        notification.classList.remove(
            "visible"
        );

        setTimeout(() => {

            notification.remove();

        }, 400);

    }, 4000);

}

/* =========================================================
   DYNAMIC STYLES
========================================================= */

const supportDynamicStyles =
    document.createElement("style");

supportDynamicStyles.innerHTML = `

/* =====================================================
   REVEAL
===================================================== */

.quick-card,
.support-panel {

    opacity: 0;

    transform:
        translateY(40px);

    transition:
        opacity 0.8s ease,
        transform 0.8s ease;

}

.quick-card.revealed,
.support-panel.revealed {

    opacity: 1;

    transform:
        translateY(0);

}

/* =====================================================
   NOTIFICATION
===================================================== */

.gw-support-notification {

    position: fixed;

    top: 110px;
    right: 30px;

    z-index: 999999;

    min-width: 320px;

    padding:
        1rem
        1.2rem;

    border-radius: 22px;

    background:
        rgba(15,15,15,0.96);

    backdrop-filter: blur(18px);

    border:
        1px solid rgba(255,255,255,0.08);

    transform:
        translateY(-20px);

    opacity: 0;

    transition:
        opacity 0.4s ease,
        transform 0.4s ease;

    box-shadow:
        0 10px 40px rgba(0,0,0,0.35);

}

.gw-support-notification.visible {

    opacity: 1;

    transform:
        translateY(0);

}

.gw-support-notification-content {

    display: flex;
    align-items: center;

    gap: 14px;

}

.gw-support-dot {

    width: 10px;
    height: 10px;

    border-radius: 50%;

    background: #ffffff;

    flex-shrink: 0;

}

.gw-support-notification span {

    color: #fff;

    font-size: 0.95rem;

    line-height: 1.5;

}

/* =====================================================
   TYPES
===================================================== */

.gw-support-notification.info {

    border-color:
        rgba(255,255,255,0.12);

}

.gw-support-notification.success {

    border-color:
        rgba(255,255,255,0.14);

}

.gw-support-notification.error {

    border-color:
        rgba(255,80,80,0.25);

}

.gw-support-notification.error
.gw-support-dot {

    background: #ff4d4d;

}

/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 768px) {

    .gw-support-notification {

        top: 90px;

        right: 16px;
        left: 16px;

        min-width: unset;

    }

}

`;

document.head.appendChild(
    supportDynamicStyles
);