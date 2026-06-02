/**
 * SECURITY UTILITIES
 * Funciones de seguridad para prevenir XSS, sanitizacin y manejo seguro de datos
 */

// ==================== XSS PREVENTION ====================

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} text - Texto a escapar
 * @returns {string} Texto escapado
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Valida que una cadena sea un email vlido
 * @param {string} email - Email a validar
 * @returns {boolean}
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(String(email).toLowerCase());
}

/**
 * Valida que una cadena sea un telfono vlido (formato bsico)
 * @param {string} phone - Telfono a validar
 * @returns {boolean}
 */
function isValidPhone(phone) {
    // Acepta nmeros, espacios, guiones, + y parntesis
    const regex = /^[\d\s\-\+\(\)]{7,}$/;
    return regex.test(String(phone).trim());
}

/**
 * Valida que un nmero sea un monto vlido (USD)
 * @param {any} amount - Monto a validar
 * @returns {boolean}
 */
function isValidAmount(amount) {
    const num = parseFloat(amount);
    return !isNaN(num) && num > 0 && num < 999999;
}

/**
 * Valida que un monto coincida con el carrito
 * @param {number} submittedAmount - Monto enviado por el cliente
 * @param {array} cart - Carrito del localStorage
 * @returns {boolean}
 */
function validateCartAmount(submittedAmount, cart) {
    //  IMPORTANTE: Esta es una validacin FRONTAL.
    // El backend DEBE hacer la validacin real con los precios de la BD.
    if (!Array.isArray(cart)) return false;
    
    let total = 0;
    cart.forEach(item => {
        //  Estos precios son del localStorage (no confiables)
        // Solo para validacin bsica de formato
        total += (parseFloat(item.price) || 0) * (parseInt(item.qty) || 0);
    });
    
    return Math.abs(parseFloat(submittedAmount) - total) < 0.01;
}

// ==================== LOCALSTORAGE SECURITY ====================

/**
 * Guarda datos en localStorage de forma SEGURA
 *  SOLO para datos NO SENSIBLES: carrito, filtros, preferencias
 * NUNCA para: emails, telfonos, direcciones, datos personales
 * 
 * @param {string} key - Clave
 * @param {any} value - Valor (se convierte a JSON)
 * @param {number} ttlMinutes - Tiempo de vida en minutos (opcional)
 */
function safeLocalStorageSet(key, value, ttlMinutes = null) {
    try {
        const data = {
            value: value,
            timestamp: Date.now(),
            ttl: ttlMinutes ? ttlMinutes * 60 * 1000 : null
        };
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
}

/**
 * Lee datos de localStorage de forma SEGURA
 * Valida que no hayan expirado (si tienen TTL)
 * 
 * @param {string} key - Clave
 * @returns {any} Valor o null si expir/no existe
 */
function safeLocalStorageGet(key) {
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        
        const data = JSON.parse(item);
        
        // Validar TTL
        if (data.ttl && (Date.now() - data.timestamp) > data.ttl) {
            localStorage.removeItem(key);
            return null;
        }
        
        return data.value;
    } catch (e) {
        console.error('Error reading from localStorage:', e);
        return null;
    }
}

/**
 * Limpia localStorage de forma SEGURA
 * CRTICO: Llamar cuando el usuario cierra sesin o se va del sitio
 * 
 * @param {array} keysToKeep - Claves que NO se deben eliminar (ej: ['geekwave_cart'])
 */
function clearSensitiveData(keysToKeep = []) {
    const sensibleKeys = [
        'geekwave_user_billing',
        'geekwave_user_contact',
        'geekwave_user_email',
        'geekwave_user_phone',
        'user_data',
        'billing_address'
    ];
    
    sensibleKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
}

// ==================== SESSION MANAGEMENT ====================

/**
 * Indica si el usuario tiene una sesin activa
 * @returns {boolean}
 */
function isUserLoggedIn() {
    return localStorage.getItem('geekwave_logged_in') === 'true';
}

/**
 * Limpia la sesin del usuario
 * Se debe llamar en logout
 */
function clearUserSession() {
    clearSensitiveData(['geekwave_cart']); // Mantener el carrito
    localStorage.removeItem('geekwave_logged_in');
    sessionStorage.clear();
}

// ==================== FORM VALIDATION ====================

/**
 * Valida un formulario completo
 * @param {object} formData - Datos del formulario
 * @param {array} requiredFields - Campos requeridos
 * @returns {object} { isValid: boolean, errors: {} }
 */
function validateFormData(formData, requiredFields = []) {
    const errors = {};
    
    requiredFields.forEach(field => {
        const value = formData[field];
        
        if (!value || String(value).trim() === '') {
            errors[field] = `${field} es requerido`;
            return;
        }
        
        // Validacin especfica por tipo de campo
        if (field.includes('email')) {
            if (!isValidEmail(value)) {
                errors[field] = 'Email invlido';
            }
        } else if (field.includes('phone') || field.includes('telefono')) {
            if (!isValidPhone(value)) {
                errors[field] = 'Telfono invlido';
            }
        } else if (field.includes('amount') || field.includes('precio')) {
            if (!isValidAmount(value)) {
                errors[field] = 'Monto invlido';
            }
        }
    });
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors: errors
    };
}

/**
 * Sanitiza un objeto de datos para evitar XSS
 * @param {object} data - Datos a sanitizar
 * @returns {object} Datos sanitizados
 */
function sanitizeFormData(data) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
            // Escapar caracteres HTML
            sanitized[key] = escapeHtml(value.trim());
        } else if (typeof value === 'number') {
            sanitized[key] = value;
        } else if (typeof value === 'boolean') {
            sanitized[key] = value;
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

// ==================== API CALLS WITH SECURITY ====================

/**
 * Realiza un fetch POST seguro al backend
 * Incluye validacin y manejo de errores
 * 
 * @param {string} endpoint - URL del endpoint
 * @param {object} data - Datos a enviar
 * @param {object} options - Opciones adicionales
 * @returns {Promise}
 */
async function secureApiFetch(endpoint, data = {}, options = {}) {
    try {
        // Validar que el endpoint sea seguro (no contiene caracteres maliciosos)
        if (!/^[\w\/.?&=-]*$/.test(endpoint)) {
            throw new Error('Endpoint invlido');
        }
        
        // Sanitizar datos
        const sanitizedData = sanitizeFormData(data);
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...options.headers
            },
            body: JSON.stringify(sanitizedData),
            ...options
        });
        
        // Validar respuesta
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        // Validar que la respuesta sea JSON vlido
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Respuesta invlida del servidor');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Fetch Error:', error);
        throw error;
    }
}

// ==================== EVENT LISTENERS WITH SECURITY ====================

/**
 * Limpia datos sensibles cuando el usuario cierra la pestaa/navegador
 * Se ejecuta automticamente al cargar este script
 */
function setupSecurityCleanup() {
    // Limpiar al cerrar sesin
    window.addEventListener('beforeunload', () => {
        // NOTA: No limpiamos el carrito, pero s datos personales
        clearSensitiveData(['geekwave_cart']);
    });
    
    // Limpiar si la ventana pierde el foco por mucho tiempo
    let inactivityTimer;
    const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos
    
    window.addEventListener('focus', () => {
        clearTimeout(inactivityTimer);
    });
    
    window.addEventListener('blur', () => {
        inactivityTimer = setTimeout(() => {
            if (!isUserLoggedIn()) {
                clearSensitiveData(['geekwave_cart']);
            }
        }, INACTIVITY_TIMEOUT);
    });
}

// Ejecutar automticamente
setupSecurityCleanup();

/**
 * ADVERTENCIA IMPORTANTE:
 * ========================
 * Este archivo previene XSS y otros ataques COMUNES en el frontend.
 * 
 *  NUNCA CONFES SOLO EN LA VALIDACIN FRONTEND
 * 
 * EL BACKEND DEBE:
 * 1. Validar TODOS los datos nuevamente
 * 2. Verificar cantidades contra la base de datos
 * 3. Validar sesin/tokens
 * 4. Verificar permiso de usuario
 * 5. Usar HTTPS obligatorio
 * 6. Implementar rate limiting
 * 7. Registrar intentos sospechosos
 */
