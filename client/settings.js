// settings.js (исправленный)

window.telegramLinkingInProgress = false;
let vkLinkingInProgress = false;
let googleLinkingInProgress = false;

function showLogoutConfirmModal(onConfirm) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Выход из аккаунта';
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div style="margin-bottom: 20px; font-size: 16px;">Вы уверены, что хотите выйти?</div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="modal-btn confirm-yes" style="background-color: #e74c3c; color: white;">Выйти</button>
                <button class="modal-btn confirm-no" style="background-color: #2f3542;">Отмена</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    const yesBtn = modalBody.querySelector('.confirm-yes');
    const noBtn = modalBody.querySelector('.confirm-no');
    const closeX = modal.querySelector('.close');
    const closeModal = () => modal.style.display = 'none';
    yesBtn.addEventListener('click', () => {
        closeModal();
        if (onConfirm) onConfirm();
    });
    noBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => {
        if (event.target === modal) closeModal();
    };
}

async function renderSettings() {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
        if (typeof showToast === 'function') showToast('Сессия не найдена', 1500);
        if (typeof showScreen === 'function') showScreen('main');
        return;
    }

    try {
        const res = await window.apiRequest('/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        const user = data.user;
        const connections = data.connections || [];

        const content = document.getElementById('content');
        if (!content) return;
        content.innerHTML = `
            <div class="settings-container">
                <div class="settings-header">
                    <img src="/assets/${user.avatar || 'cat_heroweb.png'}" class="settings-avatar">
                    <span class="settings-username">${escapeHtml(user.nickname || user.username || 'Игрок')}</span>
                </div>
                <div class="settings-row nickname-row">
                    <span>Никнейм</span>
                    <span class="nickname-value">${escapeHtml(user.nickname || user.username || 'Игрок')}</span>
                    <button class="edit-nickname-btn" id="editNicknameBtn"><i class="fas fa-pencil-alt"></i></button>
                </div>
                <div class="settings-row">
                    <span>Музыка</span>
                    <label class="switch">
                        <input type="checkbox" id="musicToggle" ${user.music_enabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                    <span>Звуки</span>
                    <label class="switch">
                        <input type="checkbox" id="soundToggle" ${user.sound_enabled ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
                <div class="settings-section">
                    <h3>Привязанные аккаунты</h3>
                    <div class="connections-list">
                        <div class="connection-row">
                            <span>Telegram</span>
                            <span>${user.tg_id ? 'Подключён' : '—'}</span>
                            <button class="link-btn" data-provider="telegram">${user.tg_id ? 'Сменить' : 'Привязать'}</button>
                        </div>
                        <div class="connection-row">
                            <span>Google</span>
                            <span>${connections.find(c => c.provider === 'google')?.email || '—'}</span>
                            <button class="link-btn" data-provider="google">${connections.find(c => c.provider === 'google') ? 'Сменить' : 'Привязать'}</button>
                        </div>
                        <div class="connection-row">
                            <span>VK</span>
                            <span>${connections.find(c => c.provider === 'vk')?.email || '—'}</span>
                            <button class="link-btn" data-provider="vk">${connections.find(c => c.provider === 'vk') ? 'Сменить' : 'Привязать'}</button>
                        </div>
                        <div class="connection-row">
                            <span>Email</span>
                            <span>${user.email || '—'}</span>
                            <button class="link-btn" data-provider="email">${user.email ? 'Сменить' : 'Привязать'}</button>
                        </div>
                    </div>
                </div>
                <div class="settings-logout">
                    <button class="logout-btn" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Выйти из аккаунта</button>
                </div>
            </div>
        `;

        const musicToggle = document.getElementById('musicToggle');
        if (musicToggle) {
            musicToggle.addEventListener('change', async (e) => {
                await updateSettings({ music_enabled: e.target.checked });
            });
        }
        const soundToggle = document.getElementById('soundToggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', async (e) => {
                await updateSettings({ sound_enabled: e.target.checked });
            });
        }

        const editNicknameBtn = document.getElementById('editNicknameBtn');
        if (editNicknameBtn) {
            editNicknameBtn.addEventListener('click', () => {
                showNicknameEditModal(user.nickname || user.username || '');
            });
        }

        document.querySelectorAll('.link-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const provider = btn.dataset.provider;
                if (provider === 'telegram') {
                    linkTelegram();
                } else if (provider === 'google') {
                    linkGoogle();
                } else if (provider === 'email') {
                    showToast('Привязка email в разработке', 1500);
                } else if (provider === 'vk') {
                    linkVK();
                } else {
                    showToast(`Привязка ${provider} в разработке`, 1500);
                }
            });
        });

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            const isTelegramWebApp = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
            if (isTelegramWebApp) {
                logoutBtn.style.display = 'none';
            } else {
                logoutBtn.addEventListener('click', () => {
                    showLogoutConfirmModal(() => {
                        localStorage.removeItem('sessionToken');
                        window.location.reload();
                    });
                });
            }
        }
    } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast('Ошибка загрузки настроек', 1500);
        if (typeof showScreen === 'function') showScreen('main');
    }
}

async function updateSettings(updates) {
    const token = localStorage.getItem('sessionToken');
    try {
        const res = await window.apiRequest('/auth/update-settings', {
            method: 'POST',
            body: JSON.stringify({ token, ...updates })
        });
        if (!res.ok) throw new Error('Failed to update');
        if (typeof showToast === 'function') showToast('Настройки сохранены', 1000);
    } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast('Ошибка сохранения', 1500);
    }
}

function showNicknameEditModal(currentNickname) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Изменить никнейм';
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <input type="text" id="editNicknameInput" class="auth-input" placeholder="Новый никнейм (англ. буквы и цифры, подчёркивание)" value="${escapeHtml(currentNickname)}" maxlength="20">
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                <button class="modal-btn save-nickname-btn" style="background-color: #00aaff;">Сохранить</button>
                <button class="modal-btn cancel-nickname-btn">Отмена</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    const input = document.getElementById('editNicknameInput');
    const saveBtn = modalBody.querySelector('.save-nickname-btn');
    const cancelBtn = modalBody.querySelector('.cancel-nickname-btn');
    const closeX = modal.querySelector('.close');
    const closeModal = () => modal.style.display = 'none';
    
    saveBtn.addEventListener('click', async () => {
        const newNickname = input.value.trim();
        if (!newNickname) {
            showToast('Введите никнейм', 1500);
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(newNickname)) {
            showToast('Никнейм может содержать только английские буквы, цифры и подчёркивание', 1500);
            return;
        }
        const token = localStorage.getItem('sessionToken');
        const checkRes = await window.apiRequest(`/auth/check-nickname?nickname=${encodeURIComponent(newNickname)}`, { method: 'GET' });
        const { available } = await checkRes.json();
        if (!available) {
            showToast('Никнейм уже занят', 1500);
            return;
        }
        const res = await window.apiRequest('/auth/update-settings', {
            method: 'POST',
            body: JSON.stringify({ token, nickname: newNickname })
        });
        if (res.ok) {
            showToast('Никнейм изменён', 1500);
            closeModal();
            renderSettings();
            if (currentScreen === 'main') renderMain();
        } else {
            const err = await res.json();
            showToast('Ошибка: ' + (err.error || 'неизвестная'), 1500);
        }
    });
    cancelBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => {
        if (event.target === modal) closeModal();
    };
}

function linkTelegram() {
    if (window.telegramLinkingInProgress) {
        showToast('Привязка Telegram уже выполняется', 1500);
        return;
    }
    window.telegramLinkingInProgress = true;

    const clientId = '8215458077';
    const redirectUri = encodeURIComponent('https://cat-fight.ru/auth/telegram/callback');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const stateObj = {
        mode: 'link',
        token: localStorage.getItem('sessionToken'),
        verifier: codeVerifier,
        random: Math.random().toString(36).substring(2)
    };
    const state = encodeURIComponent(JSON.stringify(stateObj));
    localStorage.setItem('telegram_link_state', stateObj.random);
    localStorage.setItem('telegram_code_verifier', codeVerifier);
    
    const url = `https://oauth.telegram.org/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    window.location.href = url;
}


function linkVK() {
    if (vkLinkingInProgress) {
        showToast('Привязка VK уже выполняется', 1500);
        return;
    }
    vkLinkingInProgress = true;

    const timeoutId = setTimeout(() => {
        if (vkLinkingInProgress) {
            vkLinkingInProgress = false;
            showToast('Привязка VK не удалась (таймаут). Попробуйте ещё раз.', 3000);
        }
    }, 120000);

    if (!window.VKIDSDK) {
        showToast('Загрузка VK SDK...', 1000);
        setTimeout(() => {
            if (window.VKIDSDK) {
                linkVK();
            } else {
                clearTimeout(timeoutId);
                vkLinkingInProgress = false;
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
                
                const token = localStorage.getItem('sessionToken');
                const res = await window.apiRequest('/auth/link', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        provider: 'vk',
                        access_token: access_token,
                        user_id: user_id,
                        email: email
                    })
                });
                const data = await res.json();
                vkLinkingInProgress = false;
                if (data.success) {
                    showToast('VK аккаунт привязан', 1500);
                    renderSettings();
                } else {
                    showToast('Ошибка: ' + data.error, 1500);
                }
            } catch (err) {
                console.error('VK exchange error:', err);
                showToast('Ошибка обмена токена', 1500);
                vkLinkingInProgress = false;
            }
        })
        .catch((error) => {
            clearTimeout(timeoutId);
            vkLinkingInProgress = false;
            console.error('VK login error:', error);
            showToast('Ошибка авторизации VK: ' + (error.message || 'неизвестная'), 1500);
        });
} // ← ЗАКРЫВАЮЩАЯ СКОБКА ДЛЯ linkVK

function linkGoogle() {
    if (googleLinkingInProgress) {
        showToast('Привязка Google уже выполняется', 1500);
        return;
    }
    googleLinkingInProgress = true;
    
    const timeoutId = setTimeout(() => {
        if (googleLinkingInProgress) {
            googleLinkingInProgress = false;
            showToast('Привязка Google не удалась (таймаут). Попробуйте ещё раз.', 3000);
        }
    }, 30000);

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
        google.accounts.id.initialize({
            client_id: window.GOOGLE_CLIENT_ID,
            callback: async (response) => {
                clearTimeout(timeoutId);
                googleLinkingInProgress = false;
                const idToken = response.credential;
                const token = localStorage.getItem('sessionToken');
                const res = await window.apiRequest('/auth/link', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ provider: 'google', idToken })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Google аккаунт привязан', 1500);
                    renderSettings();
                } else {
                    showToast('Ошибка: ' + data.error, 1500);
                }
            }
        });
        google.accounts.id.prompt();
    };
    script.onerror = () => {
        clearTimeout(timeoutId);
        googleLinkingInProgress = false;
        showToast('Ошибка загрузки Google API. Проверьте соединение.', 1500);
    };
    document.head.appendChild(script);
}

window.renderSettings = renderSettings;
