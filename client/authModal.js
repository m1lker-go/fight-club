// authModal.js
let currentStep = 'method';
let tempSessionToken = null;
let tempUserId = null;

// Telegram Bot ID (число)
const BOT_ID = '8215458077';

// Google Client ID (реальный, полученный из Google Cloud Console)
const GOOGLE_CLIENT_ID = '777033220750-06670cfa2tb9qnaj95pph70mv20ob.apps.googleusercontent.com';

// VK App ID (для будущей интеграции)
const VK_APP_ID = '54523677';

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

// Telegram OAuth
async function loginWithTelegram() {
    const oauthUrl = `https://oauth.telegram.org/embed?bot_id=${BOT_ID}&origin=${encodeURIComponent(window.location.origin)}&size=large`;
    const popup = window.open(oauthUrl, 'TelegramAuth', 'width=600,height=600');
    
    window.removeEventListener('message', handleTelegramMessage);
    window.addEventListener('message', handleTelegramMessage);
    
    async function handleTelegramMessage(event) {
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
    }
}

// Google OAuth
function loginWithGoogle() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response) => {
                const idToken = response.credential;
                const res = await fetch(`${window.API_BASE}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken })
                });
                const data = await res.json();
                if (data.success) {
                    localStorage.setItem('sessionToken', data.sessionToken);
                    if (data.needNickname) {
                        showNicknameModal(data.user.id);
                    } else {
                        location.reload();
                    }
                } else {
                    showToast(data.error, 1500);
                }
            }
        });
        google.accounts.id.prompt();
    };
    document.head.appendChild(script);
}

// VK OAuth (заглушка, в разработке)
async function loginWithVK() {
    showToast('Вход через VK в разработке', 1500);
}

// Отправка кода на email
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

// Подтверждение email с кодом
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
