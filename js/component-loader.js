/**
 * COMPONENT LOADER - Sistema dinmico de carga de componentes
 * ============================================================
 * Responsabilidad: Cargar Navbar y Footer mediante fetch + inyeccin en DOM
 * Sincronizacin: Dispara eventos personalizados para que otros scripts esperen
 */

class ComponentLoader {
    constructor() {
        this.componentsLoaded = {
            navbar: false,
            footer: false
        };
        this.loadTimeout = 5000; // timeout de 5 segundos
    }

    /**
     * Carga un componente HTML mediante fetch
     */
    async loadComponent(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Error ${response.status} cargando ${path}`);
            }
            return await response.text();
        } catch (error) {
            console.error(`Error cargando componente: ${path}`, error);
            return null;
        }
    }

    /**
     * Inyecta HTML en el DOM y renderiza iconos Lucide
     */
    injectComponent(containerId, html) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.warn(`Container no encontrado: ${containerId}`);
            return false;
        }
        
        if (html) {
            container.innerHTML = html;
            return true;
        }
        return false;
    }

    /**
     * Renderiza iconos Lucide (con retry si no est disponible)
     */
    renderLucideIcons(retries = 3) {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
            return true;
        } else if (retries > 0) {
            // Reintentar si lucide no est disponible an
            setTimeout(() => this.renderLucideIcons(retries - 1), 100);
            return false;
        }
        console.warn(' Lucide no disponible despus de intentos');
        return false;
    }

    /**
     * Dispara evento personalizado
     */
    dispatchComponentEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { 
            detail,
            bubbles: true,
            cancelable: true 
        });
        document.dispatchEvent(event);
        console.log(` Evento disparado: ${eventName}`);
    }

    /**
     * Mtodo principal: Carga todos los componentes
     */
    async loadAll() {
        console.log(' Iniciando carga de componentes...');

        // Cargar Navbar y Footer en paralelo
        const [navbarHtml, footerHtml] = await Promise.all([
            this.loadComponent('components/navbar.html'),
            this.loadComponent('components/footer.html')
        ]);

        // Inyectar Navbar
        if (navbarHtml) {
            this.injectComponent('nav-placeholder', navbarHtml);
            this.componentsLoaded.navbar = true;
            console.log(' Navbar inyectado');
        }

        // Inyectar Footer (si el contenedor existe)
        if (document.getElementById('footer-placeholder')) {
            if (footerHtml) {
                this.injectComponent('footer-placeholder', footerHtml);
                this.componentsLoaded.footer = true;
                console.log(' Footer inyectado');
            }
        }

        // Renderizar Lucide despus de inyectar
        this.renderLucideIcons();

        // Disparar evento de finalizacin
        this.dispatchComponentEvent('navbarLoaded', {
            navbar: this.componentsLoaded.navbar,
            footer: this.componentsLoaded.footer,
            timestamp: new Date().toISOString()
        });

        return this.componentsLoaded;
    }
}

// ===== INICIALIZACIN =====
// Se ejecuta en el momento adecuado del ciclo de vida del DOM
function initializeComponentLoader() {
    const loader = new ComponentLoader();

    // Ejecutar apenas sea posible (DOMContentLoaded o inmediatamente si ya pas)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => loader.loadAll());
    } else {
        loader.loadAll();
    }

    // Exponer para debugging
    window.__componentLoader = loader;
}

// Ejecutar
initializeComponentLoader();


