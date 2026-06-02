// =========================================================
// GEEKWAVE CHECKOUT
// pago.js
// =========================================================

console.log("[Geekwave] Checkout Inicializado");

// =========================================================
// SAFE STATE
// =========================================================

const State = {

    getCart() {

        try {

            return JSON.parse(
                localStorage.getItem(
                    "geekwave_cart"
                )
            ) || [];

        }

        catch (error) {

            console.error(
                "[State] Error leyendo carrito",
                error
            );

            return [];

        }

    },

    saveCart(cart) {

        try {

            localStorage.setItem(

                "geekwave_cart",

                JSON.stringify(cart)

            );

            // =============================================
            // EVENTO GLOBAL
            // =============================================

            window.dispatchEvent(
                new Event("cartUpdated")
            );

        }

        catch (error) {

            console.error(
                "[State] Error guardando carrito",
                error
            );

        }

    }

};

// =========================================================
// SAFE SUPABASE
// =========================================================

async function checkSupabaseSession() {

    try {

        console.log(
            "[Supabase] Verificando sesin..."
        );

        return true;

    }

    catch (error) {

        console.error(
            "[Supabase] Error:",
            error
        );

        return false;

    }

}

// =========================================================
// VARIABLES
// =========================================================

let inventario = [];

let currentPayment = "wompi";

let couponDiscount = 0;

let hasInteracted = false;

// =========================================================
// INIT
// =========================================================

document.addEventListener(

    "DOMContentLoaded",

    async () => {

        console.log(
            "[Checkout] DOM Ready"
        );

        initLucide();

        initLenis();

        initAccordion();

        initPaymentMethods();

        initContactMethods();

        initCoupon();

        initValidation();

        initSavedData();

        await loadInventory();

        renderCheckoutCart();

        validateCheckout();

    }

);

// =========================================================
// LUCIDE
// =========================================================

function initLucide() {

    try {

        if (window.lucide) {

            lucide.createIcons();

        }

    }

    catch (error) {

        console.error(
            "[Lucide] Error:",
            error
        );

    }

}

// =========================================================
// LENIS
// =========================================================

function initLenis() {

    try {

        if (typeof Lenis !== "undefined") {

            const lenis = new Lenis({

                duration: 1.3,

                smoothWheel: true,

                lerp: 0.08

            });

            function raf(time) {

                lenis.raf(time);

                requestAnimationFrame(raf);

            }

            requestAnimationFrame(raf);

        }

    }

    catch (error) {

        console.error(
            "[Lenis] Error:",
            error
        );

    }

}

// =========================================================
// INVENTARIO
// =========================================================

async function loadInventory() {

    try {

        const response =
            await fetch(
                "./json/inventario.json"
            );

        if (!response.ok) {

            throw new Error(
                "No se pudo cargar inventario"
            );

        }

        inventario =
            await response.json();

        console.log(

            "[Checkout] Inventario:",

            inventario.length

        );

    }

    catch (error) {

        console.error(
            "[Checkout] Error inventario:",
            error
        );

    }

}

// =========================================================
// ACCORDION
// =========================================================

function initAccordion() {

    const toggles =
        document.querySelectorAll(
            ".step-toggle"
        );

    toggles.forEach(toggle => {

        toggle.addEventListener(
            "click",
            () => {

                const target =
                    toggle.dataset.step;

                toggleAccordion(target);

            }
        );

    });

}

// =========================================================
// GLOBAL ACCORDION
// =========================================================

window.toggleAccordion = function(stepId) {

    console.log(
        "[Accordion]",
        stepId
    );

    const target =
        document.getElementById(stepId);

    if (!target) {

        console.error(
            "[Accordion] Step no encontrado:",
            stepId
        );

        return;

    }

    // =====================================================
    // VALIDAR SHIPPING
    // =====================================================

    if (

        stepId === "step-payment" &&
        !isShippingFormValid()

    ) {

        showToast(
            "Completa primero tus datos"
        );

        return;

    }

    // =====================================================
    // RESET
    // =====================================================

    document
        .querySelectorAll(".checkout-step")
        .forEach(step => {

            step.classList.remove("active");

        });

    // =====================================================
    // OPEN
    // =====================================================

    target.classList.add("active");

    validateCheckout();

};

// =========================================================
// PAYMENT METHODS
// =========================================================

function initPaymentMethods() {

    const methods =
        document.querySelectorAll(
            ".payment-method"
        );

    methods.forEach(method => {

        method.addEventListener(
            "click",
            () => {

                methods.forEach(m => {

                    m.classList.remove(
                        "active"
                    );

                });

                method.classList.add(
                    "active"
                );

                currentPayment =
                    method.dataset.payment;

                console.log(

                    "[Checkout] Mtodo:",

                    currentPayment

                );

                validateCheckout();

            }
        );

    });

}

// =========================================================
// CONTACT METHODS
// =========================================================

function initContactMethods() {

    const methods =
        document.querySelectorAll(
            ".contact-method"
        );

    methods.forEach(method => {

        method.addEventListener(
            "click",
            () => {

                methods.forEach(m => {

                    m.classList.remove(
                        "active"
                    );

                });

                method.classList.add(
                    "active"
                );

            }
        );

    });

}

// =========================================================
// CART
// =========================================================

function getCart() {

    return State.getCart();

}

function saveCart(cart) {

    State.saveCart(cart);

}

// =========================================================
// RENDER CART
// =========================================================

function renderCheckoutCart() {

    const container =
        document.getElementById(
            "checkout-products"
        );

    if (!container) return;

    const cart = getCart();

    // =====================================================
    // EMPTY
    // =====================================================

    if (cart.length === 0) {

        container.innerHTML = `

            <div class="checkout-empty">

                <h3>
                    Tu carrito est vaco
                </h3>

                <p>
                    Agrega productos antes de continuar.
                </p>

            </div>

        `;

        updateTotals(0);

        validateCheckout();

        return;

    }

    // =====================================================
    // PRODUCTS
    // =====================================================

    let subtotal = 0;

    container.innerHTML = cart.map(item => {

        const product =
            inventario.find(
                p =>
                    parseInt(p.id) ===
                    parseInt(item.id)
            );

        if (!product) return "";

        const quantity =
            item.qty || 1;

        const total =
            product.precio_usd * quantity;

        subtotal += total;

        return `

            <article class="checkout-product">

                <div class="checkout-product-image">

                    <img
                        src="${product.imagen}"
                        alt="${product.nombre}"
                    >

                </div>

                <div class="checkout-product-info">

                    <div class="checkout-product-top">

                        <h4>
                            ${product.nombre}
                        </h4>

                        <button
                            class="remove-product-btn"
                            onclick="removeFromCart(${item.id})"
                        >

                            <i data-lucide="x"></i>

                        </button>

                    </div>

                    <div class="checkout-product-bottom">

                        <div class="checkout-qty">

                            <button
                                onclick="changeQty(${item.id}, -1)"
                            >
                                -
                            </button>

                            <span>
                                ${quantity}
                            </span>

                            <button
                                onclick="changeQty(${item.id}, 1)"
                            >
                                +
                            </button>

                        </div>

                        <strong>
                            $${total.toFixed(2)}
                        </strong>

                    </div>

                </div>

            </article>

        `;

    }).join("");

    updateTotals(subtotal);

    initLucide();

    validateCheckout();

}


// =========================================================
// QTY
// =========================================================

window.changeQty = function(id, delta) {

    let cart = getCart();

    const item = cart.find(
        item =>
            parseInt(item.id) ===
            parseInt(id)
    );

    if (!item) return;

    item.qty += delta;

    if (item.qty <= 0) {

        cart = cart.filter(
            i =>
                parseInt(i.id) !==
                parseInt(id)
        );

    }

    saveCart(cart);

    renderCheckoutCart();

};

window.removeFromCart = function(id) {

    let cart = getCart();

    cart = cart.filter(
        item =>
            parseInt(item.id) !==
            parseInt(id)
    );

    saveCart(cart);

    renderCheckoutCart();

};

// =========================================================
// TOTALS
// =========================================================

function updateTotals(subtotal) {

    const discount =
        subtotal * couponDiscount;

    const finalTotal =
        subtotal - discount;

    const subtotalEl =
        document.getElementById(
            "checkout-subtotal"
        );

    const totalEl =
        document.getElementById(
            "checkout-total"
        );

    const discountRow =
        document.getElementById(
            "discount-row"
        );

    const discountAmount =
        document.getElementById(
            "discount-amount"
        );

    if (subtotalEl) {

        subtotalEl.textContent =
            `$${subtotal.toFixed(2)}`;

    }

    if (totalEl) {

        totalEl.textContent =
            `$${finalTotal.toFixed(2)}`;

    }

    if (discount > 0) {

        discountRow?.classList.add(
            "active"
        );

        if (discountAmount) {

            discountAmount.textContent =
                `-$${discount.toFixed(2)}`;

        }

    }

    else {

        discountRow?.classList.remove(
            "active"
        );

    }

    // =====================================================
    // BUTTON PRICE
    // =====================================================

    const payBtn =
        document.getElementById(
            "main-pay-btn"
        );

    if (payBtn) {

        const price =
            payBtn.querySelector(
                ".btn-price"
            );

        if (price) {

            price.textContent =
                `$${finalTotal.toFixed(2)}`;

        }

    }

}

// =========================================================
// VALIDATION HELPERS
// =========================================================

function isShippingFormValid() {

    const name =
        getValue("checkout-name").trim();

    const email =
        getValue("checkout-email").trim();

    const city =
        getValue("checkout-city").trim();

    const phone =
        getValue("checkout-phone").trim();

    const address =
        getValue("checkout-address").trim();

    return (

        name.length > 2 &&
        email.length > 2 &&
        city.length > 2 &&
        phone.length > 2 &&
        address.length > 2

    );

}

function isPaymentMethodSelected() {

    return (
        currentPayment &&
        currentPayment !== ""
    );

}

// =========================================================
// VALIDATION
// =========================================================

function initValidation() {

    const fields =
        document.querySelectorAll(
            ".checkout-input"
        );

    fields.forEach(field => {

        field.addEventListener(
            "input",
            () => {

                hasInteracted = true;

                validateField(field);

                validateCheckout();

            }
        );

        field.addEventListener(
            "blur",
            () => {

                validateField(field);

                validateCheckout();

            }
        );

    });

}

function validateField(field) {

    const value =
        field.value.trim();

    if (
        !hasInteracted &&
        value.length === 0
    ) {

        field.classList.remove("valid");
        field.classList.remove("invalid");

        return;

    }

    if (value.length > 2) {

        field.classList.add("valid");

        field.classList.remove("invalid");

    }

    else {

        field.classList.remove("valid");

        field.classList.add("invalid");

    }

}

// =========================================================
// CHECKOUT VALIDATION
// =========================================================

function validateCheckout() {

    const cart = getCart();

    const shippingValid =
        isShippingFormValid();

    const paymentSelected =
        isPaymentMethodSelected();

    const hasProducts =
        cart.length > 0;

    const canPay =

        shippingValid &&
        paymentSelected &&
        hasProducts;

    console.log({

        shippingValid,
        paymentSelected,
        hasProducts,
        canPay

    });

    // =====================================================
    // CONTINUE BUTTON
    // =====================================================

    const continueBtn =
        document.querySelector(
            ".continue-btn"
        );

    if (continueBtn) {

        continueBtn.disabled =
            !shippingValid;

        continueBtn.classList.toggle(
            "ready",
            shippingValid
        );

    }

    // =====================================================
    // PAY BUTTON
    // =====================================================

    const payBtn =
        document.getElementById(
            "main-pay-btn"
        );

    if (!payBtn) return;

    payBtn.disabled = !canPay;

    payBtn.classList.toggle(
        "ready",
        canPay
    );

    const btnText =
        payBtn.querySelector(
            ".btn-text"
        );

    if (btnText) {

        btnText.textContent = canPay

            ? (
                currentPayment === "paypal"
                    ? "Continuar con PayPal"
                    : "Proceder al pago"
            )

            : "Completa tus datos";

    }

}

// =========================================================
// SAVED DATA
// =========================================================

function initSavedData() {

    const data = JSON.parse(
        localStorage.getItem(
            "USER_KEY"
        )
    );

    if (!data) return;

    setValue(
        "checkout-name",
        data.name
    );

    setValue(
        "checkout-email",
        data.email
    );

    setValue(
        "checkout-city",
        data.city
    );

    setValue(
        "checkout-address",
        data.address
    );

    setValue(
        "checkout-phone",
        data.phone
    );

    const remember =
        document.getElementById(
            "remember-data"
        );

    if (remember) {

        remember.checked = true;

    }

    setTimeout(() => {

        document
            .querySelectorAll(
                ".checkout-input"
            )
            .forEach(field => {

                validateField(field);

            });

        validateCheckout();

    }, 100);

}

function saveUserData() {

    const remember =
        document.getElementById(
            "remember-data"
        );

    if (
        !remember ||
        !remember.checked
    ) return;

    const data = {

        name:
            getValue("checkout-name"),

        email:
            getValue("checkout-email"),

        city:
            getValue("checkout-city"),

        address:
            getValue("checkout-address"),

        phone:
            getValue("checkout-phone")

    };

    localStorage.setItem(

        "USER_KEY",

        JSON.stringify(data)

    );

}

// =========================================================
// HELPERS
// =========================================================

function getValue(id) {

    const el =
        document.getElementById(id);

    return el ? el.value : "";

}

function setValue(id, value) {

    const el =
        document.getElementById(id);

    if (el && value) {

        el.value = value;

    }

}

// =========================================================
// COUPONS
// =========================================================

function initCoupon() {

    const btn =
        document.getElementById(
            "apply-coupon-btn"
        );

    if (!btn) return;

    btn.addEventListener(
        "click",
        applyCoupon
    );

}

function applyCoupon() {

    const input =
        document.getElementById(
            "coupon-input"
        );

    if (!input) return;

    const code =
        input.value
            .trim()
            .toUpperCase();

    if (code === "GEEK10") {

        couponDiscount = 0.10;

        showToast(
            "Cupn aplicado: 10% OFF"
        );

    }

    else if (code === "WELCOME") {

        couponDiscount = 0.05;

        showToast(
            "Cupn aplicado: 5% OFF"
        );

    }

    else {

        couponDiscount = 0;

        showToast(
            "Cupn invlido"
        );

    }

    renderCheckoutCart();

}

// =========================================================
// PAYMENT
// =========================================================
window.processPayment = async function() {

    console.log("[Checkout] processPayment");

    const button = document.getElementById("main-pay-btn");
    if (!button) return;

    // =====================================================
    // VALIDACIN
    // =====================================================
    const cart = getCart();
    const shippingValid = isShippingFormValid();
    const paymentSelected = isPaymentMethodSelected();
    const hasProducts = cart.length > 0;
    const canPay = shippingValid && paymentSelected && hasProducts;

    if (!canPay) {
        showToast("Completa todos los campos");
        validateCheckout();
        return;
    }

    // =====================================================
    // EVITAR DOBLE CLICK
    // =====================================================
    if (button.classList.contains("loading")) return;

    // =====================================================
    // LOADING UI
    // =====================================================
    button.classList.add("loading");
    button.style.pointerEvents = "none";
    saveUserData();
    showOverlay();

    try {
        // =================================================
        // SESSION
        // =================================================
        await checkSupabaseSession();

        // =================================================
        // DELAY UX
        // =================================================
        await fakePaymentDelay();

        // =================================================
        // PAYPAL
        // =================================================
        if (currentPayment === "paypal") {
            console.log("[Checkout] Redirect PayPal");
            hideOverlay();
            button.classList.remove("loading");
            button.style.pointerEvents = "";

            setTimeout(() => {
                window.location.href = "https://www.paypal.com";
            }, 300);
        }

        // =================================================
        // WOMPI (INTEGRACIN DINMICA)
        // =================================================
        else {
            console.log("[Checkout] Iniciando Wompi API");

            const email = getValue("checkout-email"); // Usando tu helper existente
            const totalText = document.getElementById("checkout-total").textContent;
            const amount = parseFloat(totalText.replace('$', '').replace(',', ''));

            const res = await fetch('/.netlify/functions/process-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, amount })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Error en pasarela Wompi");
            }

            if (data.urlPagoWompi) {
                console.log("[Checkout] Redirigiendo a Wompi:", data.urlPagoWompi);
                window.location.href = data.urlPagoWompi;
                // No ocultamos el overlay aqu para evitar parpadeos visuales antes del cambio de pgina
            } else {
                throw new Error("No se recibi URL de pago");
            }
        }
    } 
    catch (error) {
        console.error("[Checkout] Error:", error);
        hideOverlay();
        button.classList.remove("loading");
        button.style.pointerEvents = "";
        validateCheckout();
        showToast("Error procesando pago: " + error.message);
    }
};

// =========================================================
// FAKE DELAY
// =========================================================

function fakePaymentDelay() {

    return new Promise(resolve => {

        setTimeout(resolve, 1800);

    });

}

// =========================================================
// OVERLAY
// =========================================================

function showOverlay() {

    const overlay =
        document.getElementById(
            "payment-overlay"
        );

    if (!overlay) return;

    overlay.classList.add(
        "active"
    );

    overlay.style.pointerEvents =
        "auto";

}

function hideOverlay() {

    const overlay =
        document.getElementById(
            "payment-overlay"
        );

    if (!overlay) return;

    overlay.classList.remove(
        "active"
    );

    overlay.style.pointerEvents =
        "none";

}

// =========================================================
// TOAST
// =========================================================

function showToast(message) {

    let toast =
        document.querySelector(
            ".geekwave-toast"
        );

    if (!toast) {

        toast =
            document.createElement("div");

        toast.className =
            "geekwave-toast";

        document.body.appendChild(
            toast
        );

    }

    toast.textContent = message;

    toast.classList.add("show");

    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3000);

}

// =========================================================
// CART EVENTS
// =========================================================

window.addEventListener(

    "cartUpdated",

    () => {

        console.log(
            "[Checkout] Cart Updated"
        );

        renderCheckoutCart();

    }

);

window.addEventListener(

    "storage",

    (e) => {

        if (
            e.key === "geekwave_cart"
        ) {

            renderCheckoutCart();

        }

    }

);

// =========================================================
// EXTRA STYLES
// =========================================================

const style =
document.createElement("style");

style.innerHTML = `

.geekwave-toast {

    position: fixed;

    bottom: 30px;
    right: 30px;

    z-index: 999999;

    padding: 1rem 1.4rem;

    border-radius: 18px;

    background: #00ff7f;

    color: black;

    font-weight: 800;

    opacity: 0;

    transform: translateY(20px);

    transition: all .35s ease;

}

.geekwave-toast.show {

    opacity: 1;

    transform: translateY(0);

}

.main-pay-btn.loading {

    opacity: .7;

    transform: scale(.98);

}

`;

document.head.appendChild(style);

// =========================================================
// READY
// =========================================================

console.log(
    "[Checkout] pago.js listo"
);