let currentStep = 'method';
let tempSessionToken = null;
let tempUserId = null;

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
                <button class="auth-btn credentials-btn" id="credentialsAuthBtn">
                    <i class="fas fa-key"></i> Войти по логину и паролю
                </button>
            </div>
            <div class="auth-credentials-form" style="display:none;">
                <input type="email" id="credentialsEmail" placeholder="Email" class="auth-input">
                <input type="password" id="credentialsPassword" placeholder="Пароль" class="auth-input">
                <button class="auth-submit-btn" id="credentialsLoginBtn">Войти</button>
                <button class="auth-submit-btn" id="credentialsRegisterBtn">Зарегистрироваться</button>
                <p style="text-align:center; margin-top:10px;">
                    <a href="#" id="forgotPasswordLink" style="color:#00aaff; font-size:14px;">Забыли пароль?</a>
                </p>
            </div>
            <div class="auth-username" style="display:none;">
                <input type="text" id="authusername" placeholder="Придумайте никнейм (англ.)" maxlength="20" class="auth-input">
                <button class="auth-submit-btn" id="submitusername">Продолжить</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.zIndex = '2000';
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.style.display = 'none';

    // Определяем, открыто ли приложение внутри Telegram WebApp
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
    
    // Обработчик для кнопки "Войти по логину и паролю"
    document.getElementById('credentialsAuthBtn')?.addEventListener('click', () => {
        document.querySelector('.auth-methods').style.display = 'none';
        document.querySelector('.auth-credentials-form').style.display = 'block';
    });

    // Вход по паролю
    document.getElementById('credentialsLoginBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('credentialsEmail').value.trim();
        const password = document.getElementById('credentialsPassword').value;
        if (!email || !password) {
            showToast('Введите email и пароль', 1500);
            return;
        }
        try {
            const res = await fetch(`${window.API_BASE}/auth/login`, {
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
                showToast(data.error || 'Ошибка входа', 1500);
            }
        } catch (err) {
            console.error(err);
            showToast('Ошибка соединения', 1500);
        }
    });

    // Регистрация
    document.getElementById('credentialsRegisterBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('credentialsEmail').value.trim();
        const password = document.getElementById('credentialsPassword').value;
        if (!email || !password) {
            showToast('Введите email и пароль', 1500);
            return;
        }
        if (password.length < 6) {
            showToast('Пароль минимум 6 символов', 1500);
            return;
        }
        try {
            const res = await fetch(`${window.API_BASE}/auth/register`, {
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
                showToast(data.error || 'Ошибка регистрации', 1500);
            }
        } catch (err) {
            console.error(err);
            showToast('Ошибка соединения', 1500);
        }
    });

    // Забыли пароль
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        const email = document.getElementById('credentialsEmail').value.trim();
        if (!email) {
            showToast('Введите email для восстановления', 1500);
            return;
        }
        fetch(`${window.API_BASE}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        })
        .then(r => r.json())
        .then(d => {
            if (d.success) {
                showToast('Инструкция отправлена на почту', 2000);
            } else {
                showToast(d.error || 'Ошибка', 1500);
            }
        })
        .catch(e => {
            console.error(e);
            showToast('Ошибка соединения', 1500);
        });
    });

    document.getElementById('submitusername')?.addEventListener('click', submitusername);
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
