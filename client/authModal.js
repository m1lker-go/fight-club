// authModal.js
let currentStep = 'method';
let tempSessionToken = null;
let tempUserId = null;

function showAuthModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Вход в игру';
    modalBody.innerHTML = `
        <div class="auth-container">
            <div class="auth-methods">
                <button class="auth-btn" id="telegramAuthBtn">Войти через Telegram</button>
                <button class="auth-btn" id="googleAuthBtn">Войти через Google</button>
                <button class="auth-btn" id="vkAuthBtn">Войти через VK</button>
                <button class="auth-btn" id="emailAuthBtn">Войти по email</button>
            </div>
            <div class="auth-email-form" style="display:none;">
                <input type="email" id="authEmail" placeholder="Email">
                <button id="sendCodeBtn">Отправить код</button>
                <div id="codeSection" style="display:none;">
                    <input type="text" id="authCode" placeholder="Код из письма">
                    <button id="verifyCodeBtn">Подтвердить</button>
                </div>
            </div>
            <div class="auth-nickname" style="display:none;">
                <input type="text" id="authNickname" placeholder="Придумайте никнейм (англ.)" maxlength="20">
                <button id="submitNickname">Продолжить</button>
            </div>
        </div>
    `;
    modal.style.display = 'block';
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
    const oauthUrl = `https://oauth.telegram.org/embed/CatFightingBot?origin=${encodeURIComponent(window.location.origin)}&size=large`;
    const popup = window.open(oauthUrl, 'TelegramAuth', 'width=600,height=600');
    if (!popup) {
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
            window.removeEventListener('message', handleTelegramMessage);
        }
    };
    window.addEventListener('message', handleTelegramMessage);
    const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkPopupClosed);
            window.removeEventListener('message', handleTelegramMessage);
        }
    }, 1000);
}

// Google OAuth One Tap
function loginWithGoogle() {
    const width = 600, height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    const popup = window.open(`${window.API_BASE}/auth/google-auth?mode=login`, 'GoogleAuth', `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
        showToast('Пожалуйста, разрешите всплывающие окна для этого сайта', 1500);
        return;
    }
    window.addEventListener('message', async function googleAuthHandler(event) {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'googleAuthSuccess') {
            const { sessionToken, needNickname, userId } = event.data;
            localStorage.setItem('sessionToken', sessionToken);
            if (needNickname) showNicknameModal(userId);
            else location.reload();
            window.removeEventListener('message', googleAuthHandler);
            if (popup) popup.close();
        }
        if (event.data && event.data.type === 'googleAuthError') {
            showToast('Ошибка входа через Google: ' + event.data.error, 1500);
            window.removeEventListener('message', googleAuthHandler);
            if (popup) popup.close();
        }
    });
    // Таймер на случай закрытия окна без авторизации
    const checkClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', googleAuthHandler);
        }
    }, 1000);
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
            <input type="text" id="nicknameInput" placeholder="Английские буквы и цифры" maxlength="20">
            <button id="saveNicknameBtn">Сохранить</button>
        </div>
    `;
    modal.style.display = 'block';
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
