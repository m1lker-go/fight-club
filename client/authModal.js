// authModal.js – исправлен: Google и VK теперь правильно сохраняют токен и перезагружают страницу
// Устранена синтаксическая ошибка в конце файла.

let currentStep = 'method';
let tempSessionToken = null;
let tempUserId = null;
let authMode = 'login';

let googleLoginInProgress = false;
let telegramLoginInProgress = false;
let vkLoginInProgress = false;

function isWebView() {
    const ua = navigator.userAgent.toLowerCase();
    if (/wv/.test(ua)) return true;
    if (/(android|iphone|ipad)/.test(ua) && !/chrome/.test(ua)) return true;
    if (window.Telegram?.WebApp?.initData) return false;
    return false;
}

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

    const webView = isWebView();
    console.log('[AuthModal] WebView detected:', webView);

    // Telegram
    const telegramBtn = document.getElementById('telegramAuthBtn');
    if (telegramBtn) {
        telegramBtn.addEventListener('click', () => {
            if (window.Telegram?.WebApp?.initData && !webView) {
                autoLoginTelegram();
            } else {
                window.open('https://t.me/CatFightingBot?start=webview_login', '_blank');
                showToast('После авторизации в Telegram вернитесь в игру', 3000);
            }
        });
    }

    // VK
// VK
const vkBtn = document.getElementById('vkAuthBtn');
if (vkBtn) {
    vkBtn.addEventListener('click', async () => {
        if (webView) {
            // В VK Mini App используем VK Bridge
            try {
                const userInfo = await vkBridge.send('VKWebAppGetUserInfo');
                const authToken = await vkBridge.send('VKWebAppGetAuthToken', {
                    app_id: 54525890,  // ID вашего VK приложения
                    scope: ''
                });
                const res = await fetch(`${window.API_BASE}/auth/vk-lowcode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        access_token: authToken.access_token,
                        user_id: userInfo.id,
                        email: userInfo.email || null
                    })
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('sessionToken', data.sessionToken);
                    if (data.needusername && typeof showusernameModal === 'function') {
                        showusernameModal(data.userId);
                    } else {
                        window.location.reload();
                    }
                } else {
                    showToast(data.error || 'Ошибка входа через VK', 1500);
                }
            } catch (err) {
                console.error('VK Bridge auth error:', err);
                showToast('Не удалось авторизоваться. Проверьте, что вы залогинены в VK.', 1500);
            }
        } else {
            loginWithVK();  // обычный поток для браузера
        }
    });
}

    // Google
    document.getElementById('googleAuthBtn')?.addEventListener('click', () => {
        if (webView) {
            window.location.href = `${window.API_BASE}/auth/google-auth?mode=login`;
        } else {
            loginWithGoogle();
        }
    });

    // Остальное без изменений
    document.getElementById('loginCredentialsBtn')?.addEventListener('click', () => {
        document.querySelector('.auth-methods').style.display = 'none';
        document.querySelector('.auth-credentials-form').style.display = 'block';
        setAuthMode('login');
    });
    document.getElementById('toggleLogin')?.addEventListener('click', () => setAuthMode('login'));
    document.getElementById('toggleRegister')?.addEventListener('click', () => setAuthMode('register'));
    document.getElementById('credentialsSubmitBtn')?.addEventListener('click', handleCredentialsSubmit);
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showForgotPasswordModal();
    });
    setAuthMode('login');
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
            if (data.needusername && typeof showusernameModal === 'function') showusernameModal(data.userId);
            else location.reload();
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

function loginWithGoogle() {
    if (googleLoginInProgress) {
        showToast('Вход через Google уже выполняется', 1500);
        return;
    }
    googleLoginInProgress = true;
    setTimeout(() => {
        if (googleLoginInProgress) googleLoginInProgress = false;
    }, 30000);
    window.location.href = `${window.API_BASE}/auth/google-auth?mode=login`;
}

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
            if (window.VKIDSDK) loginWithVK();
            else {
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
                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('sessionToken', data.sessionToken);
                    console.log('[VK] Токен сохранён, перезагрузка...');
                    if (data.needusername && typeof showusernameModal === 'function') {
                        showusernameModal(data.userId);
                    } else {
                        window.location.href = '/';
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

        // Проверка доступности никнейма (публичный эндпоинт)
        const checkRes = await window.apiRequest(`/auth/check-username?username=${encodeURIComponent(username)}`, { method: 'GET' });
        const { available } = await checkRes.json();
        if (!available) {
            showToast('Никнейм уже занят', 1500);
            return;
        }

        // Обновление никнейма – защищённый эндпоинт (токен в заголовке)
        const res = await window.apiRequest('/user/update-settings', {
            method: 'POST',
            body: JSON.stringify({ username })
        });
        if (res.ok) {
            modal.style.display = 'none';
            location.reload();
        } else {
            const err = await res.json();
            showToast(err.error || 'Ошибка сохранения никнейма', 1500);
        }
    });
}

window.showAuthModal = showAuthModal;
window.showusernameModal = showusernameModal;
