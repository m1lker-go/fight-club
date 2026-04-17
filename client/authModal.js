let currentStep = 'method';
let tempSessionToken = null;
let tempUserId = null;

let googleLoginInProgress = false;
let telegramLoginInProgress = false;
let vkLoginInProgress = false;

// ==========================================
// 1. ПРОВЕРКА РЕДИРЕКТА (Самое важное!)
// Запускается сразу при загрузке скрипта
// ==========================================
(async function handleRedirectCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const mode = urlParams.get('mode'); // Для Google
    
    // Если есть код авторизации (возврат от провайдера)
    if (code) {
        console.log('[Auth] Redirect detected. Code:', code ? 'Present' : 'None');
        
        // Очистка URL от параметров, чтобы при обновлении страницы не было повторного входа
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, cleanUrl);

        try {
            let response;
            
            // Обработка Telegram OIDC
            if (state && localStorage.getItem('telegram_oauth_state') === state) {
                localStorage.removeItem('telegram_oauth_state');
                console.log('[Auth] Processing Telegram OIDC...');
                response = await fetch(`${window.API_BASE}/auth/telegram/callback?code=${code}&state=${state}`);
            } 
            // Обработка Google
            else if (mode === 'google' || urlParams.get('scope')?.includes('googleapis')) {
                console.log('[Auth] Processing Google Callback...');
                // Передаем код на наш бэкенд для обмена на токен
                response = await fetch(`${window.API_BASE}/auth/google/callback?code=${code}`);
            }
            // Обработка VK
            else if (urlParams.get('vk_connect')) {
                 console.log('[Auth] Processing VK Callback...');
                 // Логика VK обрабатывается внутри loginWithVK через SDK, но если пришел код:
                 response = await fetch(`${window.API_BASE}/auth/vk/callback?code=${code}`);
            }

            if (response && response.ok) {
                const data = await response.json();
                if (data.success && data.sessionToken) {
                    console.log('[Auth] Redirect login successful');
                    localStorage.setItem('sessionToken', data.sessionToken);
                    
                    if (data.needusername) {
                        // Если нужно ввести ник, ждем загрузки UI и показываем модалку
                        setTimeout(() => {
                            if (typeof showusernameModal === 'function') {
                                showusernameModal(data.userId);
                            }
                        }, 500);
                    } else {
                        // Успешный вход - перезагрузка
                        location.reload();
                    }
                    return; // Выходим, чтобы не показывать меню входа
                }
            } else {
                console.error('[Auth] Redirect login failed', response ? await response.text() : 'No response');
            }
        } catch (err) {
            console.error('[Auth] Redirect error:', err);
        }
    }
})();

// ==========================================
// 2. ОСНОВНАЯ ФУНКЦИЯ ПОКАЗА МОДАЛКИ
// ==========================================
function showAuthModal() {
    // Если мы уже обработали редирект выше и вошли, модалку можно не показывать,
    // но оставляем логику на случай если токена нет.
    
    const modal = document.getElementById('roleModal');
    if (!modal) return;

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
                <button class="auth-btn email-btn" id="emailAuthBtn">
                    <i class="fas fa-envelope"></i> Войти по email
                </button>
            </div>
            <div class="auth-email-form" style="display:none;">
                <input type="email" id="authEmail" placeholder="Email" class="auth-input">
                <button class="auth-submit-btn" id="sendCodeBtn">Отправить код</button>
                <div id="codeSection" style="display:none;">
                    <input type="text" id="authCode" placeholder="Код из письма" class="auth-input">
                    <button class="auth-submit-btn" id="verifyCodeBtn">Подтвердить</button>
                </div>
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

    // Кнопка Telegram
    const isTelegramWebApp = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
    const telegramBtn = document.getElementById('telegramAuthBtn');
    if (telegramBtn) {
        if (isTelegramWebApp) {
            telegramBtn.style.display = 'none';
        } else {
            telegramBtn.addEventListener('click', loginWithTelegramOIDC);
        }
    }

    // Кнопка Google
    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', loginWithGoogle);
    }

    // Кнопка VK
    const vkBtn = document.getElementById('vkAuthBtn');
    if (vkBtn) {
        vkBtn.addEventListener('click', loginWithVK);
    }

    // Email логика
    document.getElementById('emailAuthBtn')?.addEventListener('click', () => {
        currentStep = 'email';
        document.querySelector('.auth-methods').style.display = 'none';
        document.querySelector('.auth-email-form').style.display = 'block';
    });
    document.getElementById('sendCodeBtn')?.addEventListener('click', sendEmailCode);
    document.getElementById('verifyCodeBtn')?.addEventListener('click', verifyEmailCode);
    document.getElementById('submitusername')?.addEventListener('click', submitusername);
}

// ==========================================
// 3. МЕТОДЫ АВТОРИЗАЦИИ
// ==========================================

// Telegram OIDC
function loginWithTelegramOIDC() {
    if (telegramLoginInProgress) return;
    telegramLoginInProgress = true;

    const clientId = '8215458077';
    // ИСПРАВЛЕНО: убран пробел в конце URL
    const redirectUri = encodeURIComponent('https://api.cat-fight.ru/auth/telegram/callback');
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('telegram_oauth_state', state);
    
    const url = `https://oauth.telegram.org/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile&state=${state}`;
    window.location.href = url;
}

// Google OAuth
function loginWithGoogle() {
    if (googleLoginInProgress) {
        showToast('Вход через Google уже выполняется', 1500);
        return;
    }
    googleLoginInProgress = true;
    
    // Таймаут безопасности
    setTimeout(() => {
        if (googleLoginInProgress) {
            googleLoginInProgress = false;
            showToast('Вход через Google отменён (таймаут)', 1500);
        }
    }, 30000);

    // ИСПРАВЛЕНО: добавлен параметр mode=google для обработки на бэкенде
    window.location.href = `${window.API_BASE}/auth/google-auth?mode=login`;
}

// VK OAuth
async function loginWithVK() {
    if (vkLoginInProgress) {
        showToast('Вход через VK уже выполняется', 1500);
        return;
    }
    vkLoginInProgress = true;

    const timeoutId = setTimeout(() => {
        if (vkLoginInProgress) {
            vkLoginInProgress = false;
            showToast('Вход через VK отменён (таймаут)', 3000);
        }
    }, 120000);

    if (!window.VKIDSDK) {
        showToast('Загрузка VK SDK...', 1000);
        const script = document.createElement('script');
        script.src = "https://unpkg.com/@vkid/sdk@latest/dist/sdk.js"; // Или ваш путь
        script.onload = () => {
             if (window.VKIDSDK) loginWithVK();
             else {
                 clearTimeout(timeoutId);
                 vkLoginInProgress = false;
                 showToast('Ошибка загрузки VK SDK', 1500);
             }
        };
        document.head.appendChild(script);
        return;
    }

    const VKID = window.VKIDSDK;
    try {
        VKID.Config.init({
            app: 54525890,
            // ИСПРАВЛЕНО: убран пробел
            redirectUrl: 'https://api.cat-fight.ru/auth/vk/callback',
            responseMode: VKID.ConfigResponseMode.Callback,
            source: VKID.ConfigSource.LOWCODE,
            scope: 'email',
        });

        const response = await VKID.Auth.login();
        const { code, device_id } = response;
        
        const tokenData = await VKID.Auth.exchangeCode(code, device_id);
        const { access_token, user_id, email } = tokenData;
        
        const res = await fetch(`${window.API_BASE}/auth/vk-lowcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, user_id, email })
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
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
        clearTimeout(timeoutId);
        vkLoginInProgress = false;
        console.error('VK auth error:', err);
        showToast('Ошибка VK: ' + err.message, 1500);
    }
}

// Email методы
async function sendEmailCode() {
    const email = document.getElementById('authEmail').value;
    if (!email) {
        showToast('Введите email', 1500);
        return;
    }
    try {
        const res = await fetch(`${window.API_BASE}/auth/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'email', email })
        });
        if (res.ok) {
            document.getElementById('codeSection').style.display = 'block';
            showToast('Код отправлен', 1500);
        } else {
            const err = await res.json();
            showToast(err.error || 'Ошибка', 1500);
        }
    } catch (err) {
        showToast('Ошибка соединения', 1500);
    }
}

async function verifyEmailCode() {
    const email = document.getElementById('authEmail').value;
    const code = document.getElementById('authCode').value;
    if (!email || !code) {
        showToast('Введите email и код', 1500);
        return;
    }
    try {
        const res = await fetch(`${window.API_BASE}/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        const data = await res.json();
        if (data.success) {
            tempSessionToken = data.sessionToken;
            tempUserId = data.user.id;
            if (!data.user.username) {
                showusernameStep();
            } else {
                localStorage.setItem('sessionToken', data.sessionToken);
                location.reload();
            }
        } else {
            showToast(data.error, 1500);
        }
    } catch (err) {
        showToast('Ошибка соединения', 1500);
    }
}

function showusernameStep() {
    document.querySelector('.auth-methods').style.display = 'none';
    document.querySelector('.auth-email-form').style.display = 'none';
    document.querySelector('.auth-username').style.display = 'block';
}

async function submitusername() {
    const username = document.getElementById('authusername').value.trim();
    if (!username) return;
    try {
        const check = await fetch(`${window.API_BASE}/auth/check-username?username=${encodeURIComponent(username)}`);
        const { available } = await check.json();
        if (!available) {
            showToast('Ник занят', 1500);
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
            showToast(err.error || 'Ошибка', 1500);
        }
    } catch (err) {
        showToast('Ошибка', 1500);
    }
}

function showusernameModal(userId) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    modalTitle.innerText = 'Выберите никнейм';
    modalBody.innerHTML = `
        <div class="auth-username" style="display:block;">
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
                showToast('Ник занят', 1500);
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
                showToast(err.error || 'Ошибка', 1500);
            }
        } catch (err) {
            showToast('Ошибка', 1500);
        }
    });
}

// Экспорт функций
window.showAuthModal = showAuthModal;
window.showusernameModal = showusernameModal;
