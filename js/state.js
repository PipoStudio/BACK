// js/state.js
export const State = {
    getCart() {
        return JSON.parse(localStorage.getItem('geekwave_cart') || '[]');
    },

    saveCart(cart) {
        localStorage.setItem('geekwave_cart', JSON.stringify(cart));
        // Disparamos un evento global para que la UI se entere del cambio
        window.dispatchEvent(new CustomEvent('geekwave:cartUpdated', { detail: cart }));
    },

    addToCart(product) {
        const cart = this.getCart();
        cart.push(product);
        this.saveCart(cart);
    }
};