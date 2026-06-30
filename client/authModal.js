// authModal.js – модальное окно входа с поддержкой i18n

let currentStep = 'method';
let tempSessionToken = null;
let tempUserId = null;
let authMode = 'login';

let googleLoginInProgress = false;
let telegramLoginInProgress = false;
let vkLoginInProgress = false;

// ======== ФУНКЦИЯ ДЛЯ ПЕРЕВОДОВ ========
function __(key, fallback) {
    if (window.i18next && typeof window.i18next.t === 'function') {
        return window.i18next.t(key);
    }
    return fallback || key;
}

function isWebView() {
    if (typeof window.Android !== 'undefined') return true;
    if (window.isAppWebView === true) return true;
    const ua = navigator.userAgent.toLowerCase();
    if (/wv/.test(ua)) return true;
    if (/(android|iphone|ipad)/.test(ua) && !/chrome/.test(ua)) return true;
    if (window.Telegram?.WebApp?.initData) return false;
    return false;
}

function getTelegramInitData() {
    if (window.Telegram?.WebApp?.initData) {
        return window.Telegram.WebApp.initData;
    }
    const urlParams = new URLSearchParams(window.location.search);
    let tgData = urlParams.get('tgWebAppData');
    if (tgData) {
        return decodeURIComponent(tgData);
    }
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const tgHashData = hashParams.get('tgWebAppData');
    if (tgHashData) {
        return decodeURIComponent(tgHashData);
    }
    return null;
}

if (!window.API_BASE) window.API_BASE = 'https://api.cat-fight.ru';

function closeAuthModal() {
    const modal = document.getElementById('roleModal');
    if (modal) {
        modal.classList.remove('auth-modal');
        modal.style.display = 'none';
        modal.removeAttribute('style');
        modal.className = 'modal';
        document.body.classList.remove('auth-modal-open');
        modal.offsetHeight;
    }
    const content = document.getElementById('modalContent');
    if (content) {
        content.removeAttribute('style');
    }
}

async function autoLoginTelegram(initData) {
    if (!initData) return false;
    const API_URL = window.API_BASE || 'https://api.cat-fight.ru';
    try {
        const response = await fetch(`${API_URL}/auth/telegram-auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData })
        });
        const data = await response.json();
        if (data.sessionToken) {
            const storage = window.isVKMiniApp ? sessionStorage : localStorage;
            storage.setItem('sessionToken', data.sessionToken);
            if (typeof window.loadUserDataByToken === 'function') {
                await window.loadUserDataByToken(data.sessionToken);
            }
            closeAuthModal();
            if (typeof window.showScreen === 'function') {
                window.showScreen('main');
            }
            return true;
        } else {
            console.error('Telegram autoLogin error:', data.error);
        }
    } catch (err) {
        console.error('Telegram autoLogin exception:', err);
    }
    return false;
}

// ======== ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА С ФЛАГОМ В КРУГЕ ========

const FLAG_URLS = {
    ru: 'https://flagcdn.com/24x18/ru.png',
    en: 'https://flagcdn.com/24x18/gb.png'
};
const LANG_NAMES = {
    ru: 'Русский',
    en: 'English'
};

function renderLanguageSwitcher() {
    const currentLang = localStorage.getItem('i18nextLng') || 'ru';
    const currentFlagUrl = FLAG_URLS[currentLang] || FLAG_URLS.ru;
    const currentName = LANG_NAMES[currentLang] || currentLang;

    return `
        <div class="lang-switcher-wrapper" style="position: absolute; top: 10px; right: 10px; z-index: 10;">
            <button class="lang-toggle-btn" id="langToggleBtn" style="background: transparent; border: 1px solid #555; border-radius: 20px; padding: 4px 12px 4px 4px; color: white; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                <div style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #1a1f2b;">
                    <img src="${currentFlagUrl}" alt="${currentLang}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <span>${currentName}</span>
                <i class="fas fa-chevron-down" style="font-size: 12px;"></i>
            </button>
            <div class="lang-dropdown" id="langDropdown" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 4px; background: #2a303c; border: 1px solid #555; border-radius: 8px; min-width: 140px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                <div class="lang-option" data-lang="ru" style="padding: 8px 16px; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px; ${currentLang === 'ru' ? 'background: #3a4050;' : ''}">
                    <div style="width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #1a1f2b;">
                        <img src="${FLAG_URLS.ru}" alt="ru" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    Русский
                </div>
                <div class="lang-option" data-lang="en" style="padding: 8px 16px; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px; ${currentLang === 'en' ? 'background: #3a4050;' : ''}">
                    <div style="width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #1a1f2b;">
                        <img src="${FLAG_URLS.en}" alt="en" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    English
                </div>
            </div>
        </div>
    `;
}

function updateLangToggleButton(lang) {
    const btn = document.getElementById('langToggleBtn');
    if (!btn) return;
    const flagUrl = FLAG_URLS[lang] || FLAG_URLS.ru;
    const name = LANG_NAMES[lang] || lang;
    const img = btn.querySelector('img');
    if (img) {
        img.src = flagUrl;
        img.alt = lang;
    }
    const textSpan = btn.querySelector('span:not(.fa)');
    if (textSpan) {
        textSpan.textContent = name;
    }
}

function initLanguageSwitcher() {
    const toggleBtn = document.getElementById('langToggleBtn');
    const dropdown = document.getElementById('langDropdown');
    if (!toggleBtn || !dropdown) return;

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    document.querySelectorAll('.lang-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const lang = opt.dataset.lang;
            if (typeof window.setLanguage === 'function') {
                window.setLanguage(lang);
            } else {
                localStorage.setItem('i18nextLng', lang);
                location.reload();
            }
            dropdown.style.display = 'none';
            updateLangToggleButton(lang);
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-switcher-wrapper')) {
            dropdown.style.display = 'none';
        }
    });
}

// ======== ПОКАЗ МОДАЛЬНОГО ОКНА ========
function showAuthModal() {
    const initData = getTelegramInitData();
    if (initData) {
        autoLoginTelegram(initData).catch(console.error);
        return;
    }

    if (window.isVKMiniApp === true) {
        console.log('[AuthModal] VK Mini App: skipping modal');
        return;
    }

    const modal = document.getElementById('roleModal');
    modal.classList.add('auth-modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerHTML = `
        <span>${__('auth:login_title', 'Вход в игру')}</span>
        ${renderLanguageSwitcher()}
    `;
    modalTitle.style.position = 'relative';
    modalTitle.style.display = 'flex';
    modalTitle.style.alignItems = 'center';
    modalTitle.style.justifyContent = 'space-between';
    modalTitle.style.width = '100%';

    const authMethodsHtml = `
        <div class="auth-methods">
            <button class="auth-btn telegram-btn" id="telegramAuthBtn">
                <i class="fab fa-telegram-plane"></i> ${__('auth:login_telegram', 'Войти через Telegram')}
            </button>
            <button class="auth-btn google-btn" id="googleAuthBtn">
                <i class="fab fa-google"></i> ${__('auth:login_google', 'Войти через Google')}
            </button>
            <button class="auth-btn vk-btn" id="vkAuthBtn">
                <i class="fab fa-vk"></i> ${__('auth:login_vk', 'Войти через VK')}
            </button>
            <button class="auth-btn credentials-btn" id="loginCredentialsBtn">
                <i class="fas fa-key"></i> ${__('auth:login_credentials', 'Войти по логину и паролю')}
            </button>
        </div>
    `;

    modalBody.innerHTML = `
        <div class="auth-container">
            ${authMethodsHtml}
            <div class="auth-credentials-form" style="display:none; margin-top: 10px;">
                <div class="auth-toggle-group">
                    <button class="auth-toggle-btn top" id="toggleLogin">${__('auth:login', 'Вход')}</button>
                    <button class="auth-toggle-btn bottom" id="toggleRegister">${__('auth:register', 'Регистрация')}</button>
                </div>
                <input type="email" id="credentialsEmail" placeholder="${__('auth:email', 'Email')}" class="auth-input">
                <input type="password" id="credentialsPassword" placeholder="${__('auth:password', 'Пароль')}" class="auth-input">
                <button class="auth-submit-btn" id="credentialsSubmitBtn">${__('auth:continue', 'Продолжить')}</button>
                <div style="text-align:center; margin-top:5px;">
                    <a href="#" id="forgotPasswordLink" style="color:#00aaff; font-size:14px;">${__('auth:forgot_password', 'Забыли пароль?')}</a>
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

    initLanguageSwitcher();

    const webView = isWebView();
    console.log('[AuthModal] WebView detected:', webView);

    const telegramBtn = document.getElementById('telegramAuthBtn');
    if (telegramBtn) {
        telegramBtn.addEventListener('click', () => {
            if (window.Telegram?.WebApp?.initData && !webView) {
                autoLoginTelegram();
            } else {
                window.open('https://t.me/CatFightingBot?start=webview_login', '_blank');
                showToast(__('auth:telegram_after_login', 'После авторизации в Telegram вернитесь в игру'), 3000);
            }
        });
    }

    const vkBtn = document.getElementById('vkAuthBtn');
    if (vkBtn) {
        vkBtn.addEventListener('click', () => {
            console.log('[VK] Браузерный режим, low‑code OAuth');
            loginWithVK();
        });
    }

    const googleBtn = document.getElementById('googleAuthBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            if (webView) {
                window.location.href = `${window.API_BASE}/auth/google-auth?mode=login`;
            } else {
                loginWithGoogle();
            }
        });
    }

    const credBtn = document.getElementById('loginCredentialsBtn');
    if (credBtn) {
        credBtn.addEventListener('click', () => {
            document.querySelector('.auth-methods').style.display = 'none';
            document.querySelector('.auth-credentials-form').style.display = 'block';
            setAuthMode('login');
        });
    }

    const toggleLogin = document.getElementById('toggleLogin');
    const toggleRegister = document.getElementById('toggleRegister');
    if (toggleLogin) toggleLogin.addEventListener('click', () => setAuthMode('login'));
    if (toggleRegister) toggleRegister.addEventListener('click', () => setAuthMode('register'));

    const submitBtn = document.getElementById('credentialsSubmitBtn');
    if (submitBtn) submitBtn.addEventListener('click', handleCredentialsSubmit);

    const forgotLink = document.getElementById('forgotPasswordLink');
    if (forgotLink) forgotLink.addEventListener('click', (e) => {
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
    submitBtn.textContent = mode === 'login' ? __('auth:login', 'Войти') : __('auth:register', 'Зарегистрироваться');
}

async function handleCredentialsSubmit() {
    const email = document.getElementById('credentialsEmail').value.trim();
    const password = document.getElementById('credentialsPassword').value;
    const errorDiv = document.getElementById('authError');
    errorDiv.style.display = 'none';
    if (!email || !password) {
        errorDiv.textContent = __('auth:fill_email_password', 'Заполните email и пароль');
        errorDiv.style.display = 'block';
        return;
    }
    if (password.length < 6) {
        errorDiv.textContent = __('auth:password_min_length', 'Пароль должен быть не менее 6 символов');
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
                if (typeof window.loadUserDataByToken === 'function') {
                    await window.loadUserDataByToken(data.sessionToken);
                }
                closeAuthModal();
                if (typeof window.showScreen === 'function') window.showScreen('main');
            }
        } else {
            errorDiv.textContent = data.error || __('auth:error', 'Ошибка');
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        console.error(err);
        errorDiv.textContent = __('auth:connection_error', 'Ошибка соединения');
        errorDiv.style.display = 'block';
    }
}

function showForgotPasswordModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = __('auth:forgot_password_title', 'Восстановление пароля');
    modalBody.innerHTML = `
        <div style="text-align:center;">
            <p style="color:#aaa;">${__('auth:forgot_password_instruction', 'Введите email, указанный при регистрации')}</p>
            <input type="email" id="forgotEmail" class="auth-input" placeholder="${__('auth:email', 'Email')}">
            <button class="auth-submit-btn" id="sendResetBtn">${__('auth:send_instructions', 'Отправить инструкцию')}</button>
            <div id="forgotMsg" style="margin-top:10px; display:none;"></div>
        </div>
    `;
    modal.style.display = 'flex';
    document.getElementById('sendResetBtn').addEventListener('click', async () => {
        const email = document.getElementById('forgotEmail').value.trim();
        const msg = document.getElementById('forgotMsg');
        if (!email) {
            msg.textContent = __('auth:enter_email', 'Введите email');
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
            msg.textContent = data.message || (data.error || __('auth:instructions_sent', 'Инструкция отправлена'));
            msg.style.display = 'block';
        } catch (err) {
            console.error(err);
            msg.textContent = __('auth:connection_error', 'Ошибка соединения');
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
        showToast(__('auth:google_login_in_progress', 'Вход через Google уже выполняется'), 1500);
        return;
    }
    googleLoginInProgress = true;
    setTimeout(() => {
        if (googleLoginInProgress) googleLoginInProgress = false;
    }, 30000);
    window.location.href = `${window.API_BASE}/auth/google-auth?mode=login`;
}

function loadVKIDSDK() {
    return new Promise((resolve, reject) => {
        if (window.VKIDSDK) {
            resolve(window.VKIDSDK);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js';
        script.onload = () => {
            if (window.VKIDSDK) {
                resolve(window.VKIDSDK);
            } else {
                reject(new Error('VKIDSDK not found'));
            }
        };
        script.onerror = () => reject(new Error('Failed to load VKID SDK'));
        document.head.appendChild(script);
    });
}

async function loginWithVK() {
    if (vkLoginInProgress) {
        showToast(__('auth:vk_login_in_progress', 'Вход через VK уже выполняется'), 1500);
        return;
    }
    vkLoginInProgress = true;
    const timeoutId = setTimeout(() => {
        if (vkLoginInProgress) {
            vkLoginInProgress = false;
            showToast(__('auth:vk_login_timeout', 'Вход через VK отменён (таймаут). Попробуйте ещё раз.'), 3000);
        }
    }, 30000);

    try {
        const VKID = await loadVKIDSDK();
        console.log('[VK] SDK загружен, инициализация...');
        VKID.Config.init({
            app: 54525890,
            redirectUrl: 'https://cat-fight.ru/auth/vk/callback',
            responseMode: VKID.ConfigResponseMode.Callback,
            source: VKID.ConfigSource.LOWCODE,
            scope: 'email',
        });
        const response = await VKID.Auth.login();
        clearTimeout(timeoutId);
        const { code, device_id } = response;
        const tokenData = await VKID.Auth.exchangeCode(code, device_id);
        const { access_token, user_id, email } = tokenData;
        const res = await fetch(`${window.API_BASE}/auth/vk-lowcode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ access_token, user_id, email })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('sessionToken', data.sessionToken);
            console.log('[VK] Токен сохранён, загрузка данных...');
            if (data.needusername && typeof showusernameModal === 'function') {
                showusernameModal(data.userId);
            } else {
                if (typeof window.loadUserDataByToken === 'function') {
                    await window.loadUserDataByToken(data.sessionToken);
                }
                closeAuthModal();
                if (typeof window.showScreen === 'function') window.showScreen('main');
            }
        } else {
            showToast(data.error || __('auth:vk_login_error', 'Ошибка входа через VK'), 1500);
        }
    } catch (err) {
        console.error('[VK] Ошибка:', err);
        showToast(__('auth:vk_auth_error', 'Ошибка авторизации VK: ') + (err.message || __('common:unknown', 'неизвестная')), 1500);
    } finally {
        vkLoginInProgress = false;
    }
}

function showusernameModal(userId) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = __('auth:choose_nickname', 'Выберите никнейм');
    modalBody.innerHTML = `
        <div class="auth-username">
            <input type="text" id="usernameInput" placeholder="${__('auth:english_letters_digits', 'Английские буквы и цифры')}" maxlength="20" class="auth-input">
            <button class="auth-submit-btn" id="saveusernameBtn">${__('auth:save', 'Сохранить')}</button>
        </div>
    `;
    modal.style.display = 'flex';
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.style.display = 'none';

    document.getElementById('saveusernameBtn').addEventListener('click', async () => {
        const username = document.getElementById('usernameInput').value.trim();
        if (!username) return;

        const checkRes = await window.apiRequest(`/auth/check-username?username=${encodeURIComponent(username)}`, { method: 'GET' });
        const { available } = await checkRes.json();
        if (!available) {
            showToast(__('auth:nickname_taken', 'Никнейм уже занят'), 1500);
            return;
        }

        const res = await window.apiRequest('/user/update-settings', {
            method: 'POST',
            body: JSON.stringify({ username })
        });
        if (res.ok) {
            modal.style.display = 'none';
            if (typeof window.loadUserDataByToken === 'function') {
                await window.loadUserDataByToken(localStorage.getItem('sessionToken'));
            }
            if (typeof window.showScreen === 'function') window.showScreen('main');
            else location.reload();
        } else {
            const err = await res.json();
            showToast(err.error || __('auth:nickname_save_error', 'Ошибка сохранения никнейма'), 1500);
        }
    });
}

window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.showusernameModal = showusernameModal;
