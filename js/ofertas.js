/* =========================================================
   GEEKWAVE OFFERS PAGE
   ========================================================= */

/* =========================================================
   DOM READY
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    console.log("[Geekwave] Ofertas listo");

    initializeOffersPage();

});

/* =========================================================
   INIT
========================================================= */

function initializeOffersPage() {

    initializeLucide();

    initializeLenis();

    initializeRevealAnimations();

    initializeHoverGlow();

    initializeOfferButtons();

    initializeNewsletter();

    initializeHeroButtons();

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
   REVEAL ANIMATIONS
========================================================= */

function initializeRevealAnimations() {

    const revealElements =
        document.querySelectorAll(`
            .strip-card,
            .offer-card,
            .newsletter-card,
            .floating-offer-card
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

    const cards =
        document.querySelectorAll(`
            .strip-card,
            .offer-card,
            .newsletter-card
        `);

    cards.forEach((card) => {

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
        "50%"
    );

    card.style.setProperty(
        "--mouse-y",
        "50%"
    );

}

/* =========================================================
   OFFER BUTTONS
========================================================= */

function initializeOfferButtons() {

    const buttons =
        document.querySelectorAll(
            ".offer-btn"
        );

    buttons.forEach((button) => {

        button.addEventListener(
            "click",
            handleAddToCart
        );

    });

}

/* =========================================================
   ADD TO CART
========================================================= */

function handleAddToCart(e) {

    const button =
        e.currentTarget;

    const card =
        button.closest(".offer-card");

    if (!card) return;

    const productName =
        card.querySelector("h3")
        ?.textContent
        ?.trim();

    const productPrice =
        card.querySelector(".price-group strong")
        ?.textContent
        ?.trim();

    animateButton(button);

    updateNavbarCart();

    showNotification(
        `${productName} aadido al carrito`,
        "success"
    );

    console.log({

        product: productName,

        price: productPrice,

        quantity: 1,

    });

}

/* =========================================================
   BUTTON ANIMATION
========================================================= */

function animateButton(button) {

    button.classList.add(
        "loading"
    );

    const icon =
        button.querySelector("svg");

    if (icon) {

        icon.style.transform =
            "rotate(90deg) scale(1.2)";

    }

    setTimeout(() => {

        button.classList.remove(
            "loading"
        );

        if (icon) {

            icon.style.transform =
                "";

        }

    }, 700);

}

/* =========================================================
   NAVBAR CART
========================================================= */

function updateNavbarCart() {

    /*
        Busca posibles elementos del carrito
        compatibles con tu navbar global.
    */

    const possibleCartCounters =
        document.querySelectorAll(`
            .cart-count,
            .cart-counter,
            .nav-cart-count,
            .navbar-cart-count,
            [data-cart-count]
        `);

    possibleCartCounters.forEach((counter) => {

        const current =
            parseInt(
                counter.textContent
            ) || 0;

        counter.textContent =
            current + 1;

    });

}

/* =========================================================
   NEWSLETTER
========================================================= */

function initializeNewsletter() {

    const form =
        document.querySelector(
            ".newsletter-form"
        );

    if (!form) return;

    form.addEventListener(
        "submit",
        handleNewsletterSubmit
    );

}

/* =========================================================
   NEWSLETTER SUBMIT
========================================================= */

function handleNewsletterSubmit(e) {

    e.preventDefault();

    const input =
        e.currentTarget.querySelector(
            "input"
        );

    const email =
        input.value.trim();

    if (!email) {

        showNotification(
            "Ingresa un correo vlido.",
            "error"
        );

        return;

    }

    showNotification(
        "Te has suscrito correctamente.",
        "success"
    );

    input.value = "";

}

/* =========================================================
   HERO BUTTONS
========================================================= */

function initializeHeroButtons() {

    const heroButtons =
        document.querySelectorAll(
            ".hero-btn"
        );

    heroButtons.forEach((button) => {

        button.addEventListener(
            "mouseenter",
            handleHeroHover
        );

    });

}

/* =========================================================
   HERO HOVER
========================================================= */

function handleHeroHover(e) {

    const button =
        e.currentTarget;

    button.animate(

        [

            {
                transform:
                    "translateY(0px)"
            },

            {
                transform:
                    "translateY(-4px)"
            },

            {
                transform:
                    "translateY(0px)"
            }

        ],

        {

            duration: 500,

            easing: "ease",

        }

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
            ".gw-offer-notification"
        );

    if (existing) {

        existing.remove();

    }

    const notification =
        document.createElement("div");

    notification.className = `
        gw-offer-notification
        ${type}
    `;

    notification.innerHTML = `

        <div class="gw-offer-notification-content">

            <div class="gw-offer-dot"></div>

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

    }, 3500);

}

/* =========================================================
   DYNAMIC STYLES
========================================================= */

const offerDynamicStyles =
    document.createElement("style");

offerDynamicStyles.innerHTML = `

/* =====================================================
   REVEAL
===================================================== */

.strip-card,
.offer-card,
.newsletter-card,
.floating-offer-card {

    opacity: 0;

    transform:
        translateY(40px);

    transition:
        opacity 0.8s ease,
        transform 0.8s ease;

}

.strip-card.revealed,
.offer-card.revealed,
.newsletter-card.revealed,
.floating-offer-card.revealed {

    opacity: 1;

    transform:
        translateY(0);

}

/* =====================================================
   BUTTON
===================================================== */

.offer-btn.loading {

    transform:
        scale(0.92);

}

/* =====================================================
   NOTIFICATION
===================================================== */

.gw-offer-notification {

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

.gw-offer-notification.visible {

    opacity: 1;

    transform:
        translateY(0);

}

.gw-offer-notification-content {

    display: flex;
    align-items: center;

    gap: 14px;

}

.gw-offer-dot {

    width: 10px;
    height: 10px;

    border-radius: 50%;

    background: #ffffff;

    flex-shrink: 0;

}

.gw-offer-notification span {

    color: #fff;

    font-size: 0.95rem;

    line-height: 1.5;

}

/* =====================================================
   TYPES
===================================================== */

.gw-offer-notification.error {

    border-color:
        rgba(255,80,80,0.25);

}

.gw-offer-notification.error
.gw-offer-dot {

    background: #ff4d4d;

}

/* =====================================================
   MOBILE
===================================================== */

@media (max-width: 768px) {

    .gw-offer-notification {

        top: 90px;

        right: 16px;
        left: 16px;

        min-width: unset;

    }

}

`;

document.head.appendChild(
    offerDynamicStyles
);