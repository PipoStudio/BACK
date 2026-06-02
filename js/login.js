// app.js COMPLETAMENTE ADAPTADO Y CORREGIDO PARA GEEKWAVE

// --- 1. CONFIGURACIN DE SUPABASE (REQUERIDO) ---
const SUPABASE_URL = 'https://kuvrszdgljonaxihmkzj.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_0dIRyTasJsycA3N6gx-VqQ_5Ua79uil'; 

const supabaseApp = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 

// --- 2. GESTIN DE LA UI (SPA) ---
const views = {
    login: document.getElementById('signin-card'),
    register: document.getElementById('signup-card'),
    checkEmail: document.getElementById('verify-card'),
    dashboard: document.getElementById('view-dashboard') 
};

const mainContainer = document.getElementById('main-container');

const signinForm = document.getElementById('signinForm');
const signupForm = document.getElementById('signupForm');
const verifyForm = document.getElementById('verifyForm');

const errorDisplay = document.getElementById('auth-error');

let currentRegisteringEmail = null;
let isVerifyingOTP = false; 

let isFromConfirmationLink = window.location.hash.includes('type=signup') || 
                              window.location.hash.includes('access_token=') || 
                              window.location.search.includes('code=');

// --- 3. FUNCIONES DE UTILIDAD (UI - SPA) ---
function showView(viewName) {
    Object.values(views).forEach(v => {
        if (v) v.classList.remove('active');
    });
    
    if (errorDisplay) errorDisplay.style.display = 'none';
    
    if (mainContainer) mainContainer.classList.remove('dashboard-mode');

    // Ocultar subttulo global si estamos en dashboard
    const subTitle = document.getElementById('global-subtitle');
    if (subTitle) {
        subTitle.style.display = (viewName === 'dashboard') ? 'none' : 'block';
    }

    setTimeout(() => {
        if (views[viewName]) {
            views[viewName].classList.add('active');
            if (viewName === 'dashboard' && mainContainer) {
                mainContainer.classList.add('dashboard-mode');
            }
        }
    }, 100); 
}



function showError(message) {
    console.error("Auth Error:", message);
    if (errorDisplay) {
        errorDisplay.innerText = message;
        errorDisplay.style.display = 'block';
        if (mainContainer) mainContainer.scrollTop = 0;
    } else {
        alert(message);
    }
}

function handleVerificationSuccess() {
    currentRegisteringEmail = null;
    isVerifyingOTP = false; 
    
    // EL CEREBRO DE REDIRECCIN: Busca si guardamos de dnde vena el usuario
    const returnUrl = localStorage.getItem('geekwave_redirect_url') || 'index.html';
    
    // Limpiamos la memoria para evitar que se quede pegada en el próximo inicio
    localStorage.removeItem('geekwave_redirect_url'); 
    
    // Enva al usuario exactamente de dnde vena (ej: pago.html) o al index por defecto
    window.location.href = returnUrl; 
}

// --- 4. INICIALIZACIN Y NAVEGACIN SPA ---
const toSignupBtn = document.getElementById('to-signup');
const toSigninBtn = document.getElementById('to-signin');

if (toSignupBtn) {
    toSignupBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        showView('register');
    });
}

if (toSigninBtn) {
    toSigninBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        showView('login');
    });
}

window.addEventListener('DOMContentLoaded', async () => {
    
    supabaseApp.auth.onAuthStateChange(async (event, session) => {
        console.log("Supabase Auth Event:", event, "Session:", session);

        if (event === 'INITIAL_SESSION' && session === null) return; 

        if (event === 'SIGNED_IN' && session) { 
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) userDisplay.innerText = session.user.email; 
            
            if (isFromConfirmationLink) { 
                isFromConfirmationLink = false; 
                handleVerificationSuccess(); 
                history.replaceState(null, null, window.location.pathname); 
            } else if (isVerifyingOTP) {
                return; 
            } else {
                // CAMBIO APLICADO: Solo mostramos la vista, sin rebotar al index
                showView('dashboard'); 
            }
        } 
        
        if (event === 'SIGNED_OUT') {
            showView('login'); 
        }
    });

   try {
        const { data: { session } } = await supabaseApp.auth.getSession();
        
        if (!session) {
            // Si NO hay sesin, mostramos el login normal
            if(window.location.hash.includes('error=') || window.location.search.includes('error=')) {
                showError("El enlace de confirmacin ha expirado o es invlido.");
            }
            showView('login'); 
        } else {
            // Si YA EST logueado al entrar a esta pgina desde el navbar, 
            // mostramos su panel de perfil en lugar de rebotarlo.
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) userDisplay.innerText = session.user.email; 
            
            showView('dashboard'); 
        }
    } catch (e) {
        console.error("Error al obtener sesin inicial:", e);
    }
});

// --- 5. LGICA DE FORMULARIOS (FLUJOS DE AUTH) ---

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const formData = new FormData(signupForm);
        const username = formData.get('username') ? formData.get('username').trim().toLowerCase() : ''; 
        const email = formData.get('email') ? formData.get('email').trim() : ''; 
        const password = formData.get('password');

        if (!username || !email || !password) return showError("Rellena todos los campos."); 
        if (username.length < 3) return showError("El nombre de usuario debe tener al menos 3 caracteres.");

        const submitBtn = signupForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerText : '';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="loader" style="width:15px; height:15px; border-width:2px; margin:0 auto;"></div>';
            }

            console.log("Intentando registrar a:", email, "con username:", username);

            //  1. REGISTRO OFICIAL DIRECTO
            const response = await supabaseApp.auth.signUp({ 
                email,
                password,
                options: {
                    data: {
                        username: username 
                    }
                }
            });

            // ESTO NOS DIR QU EST RESPONDIENDO SUPABASE REALMENTE
            console.log("Respuesta cruda de Supabase:", response);

            const { data, error } = response;
            if (error) throw error; 

            //  2. GESTIN DE RESPUESTA
            
            // CASO A: Detecta si el correo ya existe
            if (data?.user?.identities && data.user.identities.length === 0) {
                showView('login'); 
                showError("Este correo ya est registrado. Inicia sesin para acceder.");
                return;
            }

            if (data?.session) { 
                handleVerificationSuccess(); 
            } else { 
                currentRegisteringEmail = email; 
                
                const sentEmailSpan = document.getElementById('sent-email-span');
                if (sentEmailSpan) sentEmailSpan.innerText = email; 

                if (verifyForm) {
                    const otpInput = verifyForm.querySelector('input[name="otp"]');
                    if (otpInput) otpInput.value = ''; 
                }

                showView('checkEmail'); 
            }
} catch (error) {
            console.error("Error capturado en el catch:", error);
            
            const errorMsg = error?.message || "";
            
            //  CEREBRO AMIGABLE: Traducimos errores tcnicos a lenguaje de usuario
            // Este bloque atrapa tanto el error de email duplicado como el de nombre de usuario tomado
            if (errorMsg.includes("already registered") || errorMsg.includes("already exists")) {
                showView('login'); 
                showError("Este correo ya est registrado. Inicia sesin para acceder.");
            } 
            else if (errorMsg.includes("Database error saving new user") || errorMsg.includes("unique constraint")) {
                // Aqu capturamos el error tcnico de la base de datos y lo hacemos legible
                showError("Ups! Ese nombre de usuario ya est en uso. Prueba con otro.");
            } 
            else {
                showError("No pudimos crear tu cuenta ahora mismo. Por favor, intenta de nuevo en unos segundos.");
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }
    });
}

if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const formData = new FormData(verifyForm);
        const code = formData.get('otp') ? formData.get('otp').trim() : '';
        const otpError = document.getElementById('otp-error'); 

        if (!currentRegisteringEmail) return showError("Fallo en el flujo: email no encontrado en memoria.");
        
        if (!code || code.length !== 6) {
            const msg = "Ingresa los 6 dgitos.";
            if (otpError) {
                otpError.innerText = msg;
                otpError.style.display = 'block';
            } else {
                showError(msg); 
            }
            return;
        }

        const btn = verifyForm.querySelector('button[type="submit"]');
        const originalBtnText = btn ? btn.innerText : '';

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<div class="loader" style="width:15px; height:15px; border-width:2px; margin:0 auto;"></div> Verificando...';
            }

            isVerifyingOTP = true;

            const { data, error } = await supabaseApp.auth.verifyOtp({
                email: currentRegisteringEmail,
                token: code,
                type: 'signup'
            });

            if (error) throw error;

            handleVerificationSuccess();

        } catch (error) {
            isVerifyingOTP = false;
            const msg = "Cdigo incorrecto: " + error.message;
            
            if (otpError) {
                otpError.innerText = msg;
                otpError.style.display = 'block';
            } else {
                showError(msg);
            }
            
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnText;
            }
        }
    });
}

if (signinForm) {
    signinForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const formData = new FormData(signinForm);
        const email = formData.get('email') ? formData.get('email').trim() : '';
        const password = formData.get('password');

        if (!email || !password) return showError("Rellena todos los campos.");

        const submitBtn = signinForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn ? submitBtn.innerText : '';

        try {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<div class="loader" style="width:15px; height:15px; border-width:2px; margin:0 auto;"></div> Entrando...';
            }

            const { error } = await supabaseApp.auth.signInWithPassword({ email, password });
            
            if (error) {
                if (error.message.includes("Invalid login credentials")) {
                    throw new Error("Correo o contrasea incorrectos. Ya tienes cuenta?"); 
                }
                throw error;
            }

            // CAMBIO APLICADO: EJECUTA LA REDIRECCIN INTELIGENTE AQU TRAS LOGIN MANUAL EXITOSO
            handleVerificationSuccess();

        } catch (error) {
            showError(error.message);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }
    });
}

const logoutBtn = document.getElementById('btn-logout');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabaseApp.auth.signOut();
    });
}

// Validar usuario mientras escribe (opcional, para ser pro)
const usernameInput = document.querySelector('input[name="username"]');
if (usernameInput) {
    usernameInput.addEventListener('blur', async (e) => {
        const username = e.target.value.trim().toLowerCase();
        if (username.length < 3) return;

        // Consultamos a Supabase si el usuario existe
        const { data } = await supabaseApp
            .from('profiles') // Asegrate que tu tabla se llame 'profiles'
            .select('username')
            .eq('username', username)
            .single();

        if (data) {
            showError("Ese nombre de usuario ya est tomado.");
        }
    });
}