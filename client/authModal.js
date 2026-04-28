let currentStep = 'method';
let tempSessionToken = null;
let tempUserId = null;
let authMode = 'login'; // 'login' или 'register'

let googleLoginInProgress = false;
let telegramLoginInProgress = false;
let vkLoginInProgress = false;

function showAuthModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Вход в игру';
    modalBody.innerHTML = `
        <div class="auth-container">
            <div class="auth-methods">
                <button class="auth-btn telegram-btn" id="telegramAuthBtn">
                    <i class="fab fa-telegram-plane"></i> Войти через Telegram
                </button>
                <button class="auth-btn google-btn" id="googleAuthBtn">
                    <i class="fab fa-google"></i> Войти через Google
                </button>
                <button class="auth-btn vk-btn" id="vkAuthBtn">
                    <i class="fab fa-vk"></i> Войти через VK
                </button>
                <button class="auth-btn credentials-btn" id="loginCredentialsBtn">
                    <i class="fas fa-key"></i> Войти по логину и паролю
                </button>
            </div>
            <div class="auth-credentials-form" style="display:none; margin-top: 10px;">
                <div class="auth-toggle-group">
                    <button class="auth-toggle-btn top" id="toggleLogin">Вход</button>
                    <button class="auth-toggle-btn bottom" id="toggleRegister">Регистрация</button>
                </div>
                <input type="email" id="credentialsEmail" placeholder="Email" class="auth-input">
                <input type="password" id="credentialsPassword" placeholder="Пароль" class="auth-input">
                <button class="auth-submit-btn" id="credentialsSubmitBtn">Продолжить</button>
                <div style="text-align:center; margin-top:5px;">
                    <a href="#" id="forgotPasswordLink" style="color:#00aaff; font-size:14px;">Забыли пароль?</a>
                </div>
                <div id="authError" style="color:#e74c3c; margin-top:10px; display:none;"></div>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.zIndex = '2000';
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.style.display = 'none';

    // Telegram (как было)
    const isTelegramWebApp = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
    const telegramBtn = document.getElementById('telegramAuthBtn');
    if (telegramBtn) {
        if (isTelegramWebApp) {
            telegramBtn.style.display = 'none';
        } else {
            telegramBtn.addEventListener('click', () => {
                window.open('https://t.me/CatFightingBot', '_blank');
            });
        }
    }

    document.getElementById('googleAuthBtn')?.addEventListener('click', loginWithGoogle);
    document.getElementById('vkAuthBtn')?.addEventListener('click', loginWithVK);

    // Открываем форму логина/регистрации
    document.getElementById('loginCredentialsBtn')?.addEventListener('click', () => {
        document.querySelector('.auth-methods').style.display = 'none';
        document.querySelector('.auth-credentials-form').style.display = 'block';
        setAuthMode('login');
    });

    // Переключение режима
    document.getElementById('toggleLogin')?.addEventListener('click', () => setAuthMode('login'));
    document.getElementById('toggleRegister')?.addEventListener('click', () => setAuthMode('register'));

    // Отправка формы
    document.getElementById('credentialsSubmitBtn')?.addEventListener('click', handleCredentialsSubmit);

    // Забыли пароль
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordModal();
    });

    setAuthMode('login'); // начальный режим
}

function setAuthMode(mode) {
    authMode = mode;
    const loginBtn = document.getElementById('toggleLogin');
    const registerBtn = document.getElementById('toggleRegister');
    const submitBtn = document.getElementById('credentialsSubmitBtn');
    if (!loginBtn || !registerBtn || !submitBtn) return;

    loginBtn.classList.toggle('active', mode === 'login');
    registerBtn.classList.toggle('active', mode === 'register');
    submitBtn.textContent = mode === 'login' ? 'Войти' : 'Зарегистрироваться';
}

async function handleCredentialsSubmit() {
    const email = document.getElementById('credentialsEmail').value.trim();
    const password = document.getElementById('credentialsPassword').value;
    const errorDiv = document.getElementById('authError');
    errorDiv.style.display = 'none';

    if (!email || !password) {
        errorDiv.textContent = 'Заполните email и пароль';
        errorDiv.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errorDiv.textContent = 'Пароль должен быть не менее 6 символов';
        errorDiv.style.display = 'block';
        return;
    }

    const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
    try {
        const res = await fetch(`${window.API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('sessionToken', data.sessionToken);
            if (data.needusername && typeof showusernameModal === 'function') {
                showusernameModal(data.userId);
            } else {
                location.reload();
            }
        } else {
            errorDiv.textContent = data.error || 'Ошибка';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        errorDiv.textContent = 'Ошибка соединения';
        errorDiv.style.display = 'block';
    }
}

function showForgotPasswordModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Восстановление пароля';
    modalBody.innerHTML = `
        <div style="text-align:center;">
            <p style="color:#aaa;">Введите email, указанный при регистрации</p>
            <input type="email" id="forgotEmail" class="auth-input" placeholder="Email">
            <button class="auth-submit-btn" id="sendResetBtn">Отправить инструкцию</button>
            <div id="forgotMsg" style="margin-top:10px; display:none;"></div>
        </div>
    `;
    modal.style.display = 'flex';
    document.getElementById('sendResetBtn').addEventListener('click', async () => {
        const email = document.getElementById('forgotEmail').value.trim();
        const msg = document.getElementById('forgotMsg');
        if (!email) {
            msg.textContent = 'Введите email';
            msg.style.display = 'block';
            return;
        }
        try {
            const res = await fetch(`${window.API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            msg.textContent = data.message || (data.error || 'Инструкция отправлена');
            msg.style.display = 'block';
        } catch (err) {
            console.error(err);
            msg.textContent = 'Ошибка соединения';
            msg.style.display = 'block';
        }
    });
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.style.display = 'block';
    closeBtn?.addEventListener('click', () => modal.style.display = 'none');
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}

// ========== TELEGRAM OAuth через OpenID Connect (полностью рабочий) ==========
function loginWithTelegramOIDC() {
    if (telegramLoginInProgress) {
        showToast('Вход через Telegram уже выполняется', 1500);
        return;
    }
    telegramLoginInProgress = true;

    const clientId = '8215458077';
    const redirectUri = encodeURIComponent('https://api.cat-fight.ru/auth/telegram/callback');
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('telegram_oauth_state', state);
    const url = `https://oauth.telegram.org/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile&state=${state}`;
    window.location.href = url;
}


function generateCodeVerifier() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// ========== GOOGLE OAuth через редирект ==========
function loginWithGoogle() {
    if (googleLoginInProgress) {
        showToast('Вход через Google уже выполняется', 1500);
        return;
    }
    googleLoginInProgress = true;
    setTimeout(() => {
        if (googleLoginInProgress) {
            googleLoginInProgress = false;
            showToast('Вход через Google отменён (таймаут)', 1500);
        }
    }, 30000);
    window.location.href = `${window.API_BASE}/auth/google-auth?mode=login`;
}

// ========== VK OAuth через Low-code SDK (исправленный) ==========
async function loginWithVK() {
    if (vkLoginInProgress) {
        showToast('Вход через VK уже выполняется', 1500);
        return;
    }
    vkLoginInProgress = true;

    const timeoutId = setTimeout(() => {
        if (vkLoginInProgress) {
            vkLoginInProgress = false;
            showToast('Вход через VK отменён (таймаут). Попробуйте ещё раз.', 3000);
        }
    }, 120000);

    if (!window.VKIDSDK) {
        showToast('Загрузка VK SDK...', 1000);
        setTimeout(() => {
            if (window.VKIDSDK) {
                loginWithVK();
            } else {
                clearTimeout(timeoutId);
                vkLoginInProgress = false;
                showToast('Ошибка загрузки VK SDK', 1500);
            }
        }, 500);
        return;
    }

    const VKID = window.VKIDSDK;
    VKID.Config.init({
        app: 54525890,
        redirectUrl: 'https://api.cat-fight.ru/auth/vk/callback',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: 'email',
    });

    VKID.Auth.login()
        .then(async (response) => {
            clearTimeout(timeoutId);
            const { code, device_id } = response;
            try {
                const tokenData = await VKID.Auth.exchangeCode(code, device_id);
                const { access_token, user_id, email } = tokenData;
                
                const res = await fetch(`${window.API_BASE}/auth/vk-lowcode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ access_token, user_id, email })
                });
                if (!res.ok) {
                    const errorText = await res.text();
                    throw new Error(`HTTP ${res.status}: ${errorText}`);
                }
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('sessionToken', data.sessionToken);
                    if (data.needusername && typeof showusernameModal === 'function') {
                        showusernameModal(data.userId);
                    } else {
                        location.reload();
                    }
                } else {
                    showToast(data.error || 'Ошибка входа через VK', 1500);
                }
            } catch (err) {
                console.error('VK auth error:', err);
                showToast('Ошибка авторизации VK: ' + (err.message || 'неизвестная'), 1500);
            } finally {
                vkLoginInProgress = false;
            }
        })
        .catch((error) => {
            clearTimeout(timeoutId);
            vkLoginInProgress = false;
            console.error('VK login error:', error);
            showToast('Ошибка авторизации VK: ' + (error.message || 'неизвестная'), 1500);
        });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
async function submitusername() {
    const username = document.getElementById('authusername').value.trim();
    if (!username) return;
    try {
        const check = await fetch(`${window.API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`);
        const { available } = await check.json();
        if (!available) {
            showToast('Никнейм уже занят', 1500);
            return;
        }
        const res = await fetch(`${window.API_BASE}/auth/update-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tempSessionToken, username })
        });
        if (res.ok) {
            localStorage.setItem('sessionToken', tempSessionToken);
            location.reload();
        } else {
            const err = await res.json();
            showToast(err.error || 'Ошибка сохранения никнейма', 1500);
        }
    } catch (err) {
        console.error(err);
        showToast('Ошибка соединения', 1500);
    }
}

function showusernameModal(userId) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Выберите никнейм';
    modalBody.innerHTML = `
        <div class="auth-username">
            <input type="text" id="usernameInput" placeholder="Английские буквы и цифры" maxlength="20" class="auth-input">
            <button class="auth-submit-btn" id="saveusernameBtn">Сохранить</button>
        </div>
    `;
    modal.style.display = 'flex';
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.style.display = 'none';
    document.getElementById('saveusernameBtn').addEventListener('click', async () => {
        const username = document.getElementById('usernameInput').value.trim();
        if (!username) return;
        try {
            const check = await fetch(`${window.API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`);
            const { available } = await check.json();
            if (!available) {
                showToast('Никнейм уже занят', 1500);
                return;
            }
            const token = localStorage.getItem('sessionToken');
            const res = await fetch(`${window.API_BASE}/auth/update-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, username })
            });
            if (res.ok) {
                modal.style.display = 'none';
                location.reload();
            } else {
                const err = await res.json();
                showToast(err.error || 'Ошибка сохранения никнейма', 1500);
            }
        } catch (err) {
            console.error(err);
            showToast('Ошибка соединения', 1500);
        }
    });
}

window.showAuthModal = showAuthModal;
window.showusernameModal = showusernameModal;
