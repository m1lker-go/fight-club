// authModal.js
let currentStep = 'method';
let tempSessionToken = null;
let tempUserId = null;
let googleLoginInProgress = false;  // флаг для входа через Google
let telegramLoginInProgress = false; // флаг для входа через Telegram

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
            <div class="auth-nickname" style="display:none;">
                <input type="text" id="authNickname" placeholder="Придумайте никнейм (англ.)" maxlength="20" class="auth-input">
                <button class="auth-submit-btn" id="submitNickname">Продолжить</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    modal.style.position = 'fixed';
    modal.style.zIndex = '2000';
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.style.display = 'none';

    document.getElementById('telegramAuthBtn')?.addEventListener('click', loginWithTelegram);
    document.getElementById('googleAuthBtn')?.addEventListener('click', loginWithGoogle);
    document.getElementById('vkAuthBtn')?.addEventListener('click', loginWithVK);
    document.getElementById('emailAuthBtn')?.addEventListener('click', () => {
        currentStep = 'email';
        document.querySelector('.auth-methods').style.display = 'none';
        document.querySelector('.auth-email-form').style.display = 'block';
    });
    document.getElementById('sendCodeBtn')?.addEventListener('click', sendEmailCode);
    document.getElementById('verifyCodeBtn')?.addEventListener('click', verifyEmailCode);
    document.getElementById('submitNickname')?.addEventListener('click', submitNickname);
}

// Telegram OAuth через виджет
async function loginWithTelegram() {
    if (telegramLoginInProgress) {
        showToast('Вход через Telegram уже выполняется', 1500);
        return;
    }
    telegramLoginInProgress = true;
    const oauthUrl = `https://oauth.telegram.org/embed/CatFightingBot?origin=${encodeURIComponent(window.location.origin)}&size=large`;
    const popup = window.open(oauthUrl, 'TelegramAuth', 'width=600,height=600');
    if (!popup) {
        telegramLoginInProgress = false;
        showToast('Пожалуйста, разрешите всплывающие окна для этого сайта', 1500);
        return;
    }
    const handleTelegramMessage = async (event) => {
        if (event.origin !== 'https://oauth.telegram.org') return;
        const { initData } = event.data;
        if (initData) {
            popup.close();
            const res = await fetch(`${window.API_BASE}/auth/telegram-oauth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ initData })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('sessionToken', data.sessionToken);
                if (data.needNickname) {
                    showNicknameModal(data.userId);
                } else {
                    location.reload();
                }
            } else {
                showToast(data.error, 1500);
            }
            telegramLoginInProgress = false;
            window.removeEventListener('message', handleTelegramMessage);
        }
    };
    window.addEventListener('message', handleTelegramMessage);
    // Таймаут для сброса флага, если окно закрыто без авторизации
    setTimeout(() => {
        if (telegramLoginInProgress) {
            telegramLoginInProgress = false;
            window.removeEventListener('message', handleTelegramMessage);
            if (popup && !popup.closed) popup.close();
            showToast('Вход отменён или окно закрыто', 1500);
        }
    }, 120000);
}

// Google OAuth через popup (вход)
function loginWithGoogle() {
    if (googleLoginInProgress) {
        showToast('Вход через Google уже выполняется', 1500);
        return;
    }
    googleLoginInProgress = true;
    const width = 600, height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    const popup = window.open(`${window.API_BASE}/auth/google-auth?mode=login`, 'GoogleAuth', `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
        googleLoginInProgress = false;
        showToast('Пожалуйста, разрешите всплывающие окна', 1500);
        return;
    }
    const googleAuthHandler = async (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'googleAuthSuccess') {
            googleLoginInProgress = false;
            const { sessionToken, needNickname, userId } = event.data;
            localStorage.setItem('sessionToken', sessionToken);
            if (needNickname && typeof showNicknameModal === 'function') {
                showNicknameModal(userId);
            } else {
                location.reload();
            }
            window.removeEventListener('message', googleAuthHandler);
            if (popup) popup.close();
        }
        if (event.data && event.data.type === 'googleAuthError') {
            googleLoginInProgress = false;
            showToast('Ошибка входа: ' + event.data.error, 1500);
            window.removeEventListener('message', googleAuthHandler);
            if (popup) popup.close();
        }
    };
    window.addEventListener('message', googleAuthHandler);
    // Таймаут для сброса флага, если окно закрыто без авторизации
    setTimeout(() => {
        if (googleLoginInProgress) {
            googleLoginInProgress = false;
            window.removeEventListener('message', googleAuthHandler);
            if (popup && !popup.closed) popup.close();
            showToast('Вход отменён или окно закрыто', 1500);
        }
    }, 120000);
}

async function loginWithVK() {
    const isTelegramWebApp = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
    const authUrl = `${window.API_BASE}/auth/vk?mode=login`;
    if (isTelegramWebApp) {
        window.Telegram.WebApp.openLink(authUrl);
    } else {
        const width = 600, height = 700;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;
        const popup = window.open(authUrl, 'VKAuth', `width=${width},height=${height},left=${left},top=${top}`);
        window.addEventListener('message', async function vkHandler(event) {
            if (event.origin !== window.location.origin) return;
            if (event.data && event.data.type === 'vkAuthSuccess') {
                const { sessionToken, needNickname, userId } = event.data;
                localStorage.setItem('sessionToken', sessionToken);
                if (needNickname) showNicknameModal(userId);
                else location.reload();
                window.removeEventListener('message', vkHandler);
                if (popup) popup.close();
            }
        });
    }
}

async function sendEmailCode() {
    const email = document.getElementById('authEmail').value;
    if (!email) {
        showToast('Введите email', 1500);
        return;
    }
    const res = await fetch(`${window.API_BASE}/auth/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'email', email })
    });
    if (res.ok) {
        document.getElementById('codeSection').style.display = 'block';
        showToast('Код отправлен на почту', 1500);
    } else {
        const err = await res.json();
        showToast(err.error || 'Ошибка отправки кода', 1500);
    }
}

async function verifyEmailCode() {
    const email = document.getElementById('authEmail').value;
    const code = document.getElementById('authCode').value;
    const res = await fetch(`${window.API_BASE}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
    });
    const data = await res.json();
    if (data.success) {
        tempSessionToken = data.sessionToken;
        tempUserId = data.user.id;
        if (!data.user.nickname) {
            showNicknameStep();
        } else {
            localStorage.setItem('sessionToken', data.sessionToken);
            location.reload();
        }
    } else {
        showToast(data.error, 1500);
    }
}

function showNicknameStep() {
    document.querySelector('.auth-methods').style.display = 'none';
    document.querySelector('.auth-email-form').style.display = 'none';
    const nicknameDiv = document.querySelector('.auth-nickname');
    nicknameDiv.style.display = 'block';
}

async function submitNickname() {
    const nickname = document.getElementById('authNickname').value.trim();
    if (!nickname) return;
    const check = await fetch(`${window.API_BASE}/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
    const { available } = await check.json();
    if (!available) {
        showToast('Никнейм уже занят', 1500);
        return;
    }
    const res = await fetch(`${window.API_BASE}/auth/update-settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tempSessionToken, nickname })
    });
    if (res.ok) {
        localStorage.setItem('sessionToken', tempSessionToken);
        location.reload();
    } else {
        showToast('Ошибка сохранения никнейма', 1500);
    }
}

function showNicknameModal(userId) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Выберите никнейм';
    modalBody.innerHTML = `
        <div class="auth-nickname">
            <input type="text" id="nicknameInput" placeholder="Английские буквы и цифры" maxlength="20" class="auth-input">
            <button class="auth-submit-btn" id="saveNicknameBtn">Сохранить</button>
        </div>
    `;
    modal.style.display = 'flex';
    const closeBtn = modal.querySelector('.close');
    if (closeBtn) closeBtn.style.display = 'none';
    document.getElementById('saveNicknameBtn').addEventListener('click', async () => {
        const nickname = document.getElementById('nicknameInput').value.trim();
        if (!nickname) return;
        const check = await fetch(`${window.API_BASE}/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
        const { available } = await check.json();
        if (!available) {
            showToast('Никнейм уже занят', 1500);
            return;
        }
        const token = localStorage.getItem('sessionToken');
        const res = await fetch(`${window.API_BASE}/auth/update-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, nickname })
        });
        if (res.ok) {
            modal.style.display = 'none';
            location.reload();
        } else {
            showToast('Ошибка сохранения никнейма', 1500);
        }
    });
}

window.showAuthModal = showAuthModal;
window.showNicknameModal = showNicknameModal;
