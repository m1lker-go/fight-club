// authModal.js
let currentStep = 'method'; // 'method', 'email', 'nickname'
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
                <button class="auth-btn" data-method="telegram">Войти через Telegram</button>
                <button class="auth-btn" data-method="google">Войти через Google</button>
                <button class="auth-btn" data-method="vk">Войти через VK</button>
                <button class="auth-btn" data-method="email">Войти по email</button>
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
                <input type="text" id="authNickname" placeholder="Придумайте никнейм (англ.)">
                <button id="submitNickname">Продолжить</button>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    modal.style.position = 'fixed';
    modal.style.zIndex = '2000';
    // Запрещаем закрытие через крестик
    const closeBtn = modal.querySelector('.close');
    closeBtn.style.display = 'none';

    // Обработчики
    document.querySelectorAll('.auth-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const method = btn.dataset.method;
            if (method === 'telegram') {
                // Используем существующий initData
                const initData = window.Telegram.WebApp.initData;
                const res = await fetch('/auth/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ method: 'telegram', initData })
                });
                const data = await res.json();
                if (data.needNickname) {
                    tempSessionToken = data.sessionToken;
                    tempUserId = data.userId;
                    showNicknameStep();
                } else if (data.success) {
                    localStorage.setItem('sessionToken', data.sessionToken);
                    modal.style.display = 'none';
                    location.reload(); // перезагружаем игру
                }
            } else if (method === 'email') {
                currentStep = 'email';
                document.querySelector('.auth-methods').style.display = 'none';
                document.querySelector('.auth-email-form').style.display = 'block';
            }
        });
    });

    document.getElementById('sendCodeBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value;
        const res = await fetch('/auth/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ method: 'email', email })
        });
        if (res.ok) {
            document.getElementById('codeSection').style.display = 'block';
        } else {
            showToast('Ошибка отправки кода', 1500);
        }
    });

    document.getElementById('verifyCodeBtn')?.addEventListener('click', async () => {
        const email = document.getElementById('authEmail').value;
        const code = document.getElementById('authCode').value;
        const res = await fetch('/auth/verify-email', {
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
                modal.style.display = 'none';
                location.reload();
            }
        } else {
            showToast(data.error, 1500);
        }
    });
}

function showNicknameStep() {
    document.querySelector('.auth-methods').style.display = 'none';
    document.querySelector('.auth-email-form').style.display = 'none';
    const nicknameDiv = document.querySelector('.auth-nickname');
    nicknameDiv.style.display = 'block';
    document.getElementById('submitNickname').addEventListener('click', async () => {
        const nickname = document.getElementById('authNickname').value.trim();
        if (!nickname) return;
        // Проверка уникальности
        const check = await fetch(`/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
        const { available } = await check.json();
        if (!available) {
            showToast('Никнейм уже занят', 1500);
            return;
        }
        // Отправляем на сервер для финализации
        const res = await fetch('/auth/update-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: tempSessionToken, nickname })
        });
        if (res.ok) {
            localStorage.setItem('sessionToken', tempSessionToken);
            modal.style.display = 'none';
            location.reload();
        } else {
            showToast('Ошибка сохранения никнейма', 1500);
        }
    });
}

async function loginWithTelegram() {
    // Открываем окно Telegram OAuth
    const oauthUrl = `https://oauth.telegram.org/embed?bot_id=${BOT_ID}&origin=${encodeURIComponent(window.location.origin)}&size=large`;
    const popup = window.open(oauthUrl, 'TelegramAuth', 'width=600,height=600');
    // Слушаем сообщения от виджета (Telegram отправляет сообщение с initData)
    window.addEventListener('message', async (event) => {
        if (event.origin !== 'https://oauth.telegram.org') return;
        const { initData } = event.data;
        if (initData) {
            popup.close();
            // Отправляем initData на сервер
            const res = await fetch('/auth/telegram-oauth', {
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
        }
    });
}
