// settings.js

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
        const res = await fetch(`${window.API_BASE}/auth/profile`, {
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
        const res = await fetch(`${window.API_BASE}/auth/update-settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, ...updates })
        });
        if (!res.ok) throw new Error('Failed to update');
        if (typeof showToast === 'function') showToast('Настройки сохранены', 1000);
    } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast('Ошибка сохранения', 1500);
    }
}

function linkTelegram() {
    if (window.telegramLinkingInProgress) {
        showToast('Привязка Telegram уже выполняется', 1500);
        return;
    }
    window.telegramLinkingInProgress = true;
    const oauthUrl = `https://oauth.telegram.org/embed/CatFightingBot?origin=${encodeURIComponent(window.location.origin)}&size=large`;
    const popup = window.open(oauthUrl, 'TelegramLink', 'width=600,height=600');

    if (!popup) {
        window.telegramLinkingInProgress = false;
        showToast('Пожалуйста, разрешите всплывающие окна для этого сайта', 1500);
        return;
    }

    const handleTelegramLink = async (event) => {
        if (event.origin !== 'https://oauth.telegram.org') return;
        const { initData } = event.data;
        if (initData) {
            popup.close();
            const token = localStorage.getItem('sessionToken');
            const res = await fetch(`${window.API_BASE}/auth/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ provider: 'telegram', initData })
            });
            const data = await res.json();
            window.telegramLinkingInProgress = false;
            if (data.success) {
                showToast('Telegram аккаунт привязан', 1500);
                renderSettings();
            } else {
                showToast('Ошибка: ' + data.error, 1500);
            }
            window.removeEventListener('message', handleTelegramLink);
        }
    };

    window.addEventListener('message', handleTelegramLink);
    const checkPopupClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkPopupClosed);
            window.telegramLinkingInProgress = false;
            window.removeEventListener('message', handleTelegramLink);
        }
    }, 1000);
}

function linkVK() {
    if (vkLinkingInProgress) {
        showToast('Привязка VK уже выполняется', 1500);
        return;
    }
    vkLinkingInProgress = true;

    if (!window.VKIDSDK) {
        showToast('Загрузка VK SDK...', 1000);
        setTimeout(() => {
            if (window.VKIDSDK) linkVK();
            else {
                vkLinkingInProgress = false;
                showToast('Ошибка загрузки VK SDK', 1500);
            }
        }, 500);
        return;
    }

    const VKID = window.VKIDSDK;
    VKID.Config.init({
        app: 54525890,
        redirectUrl: 'https://fight-club-api-4och.onrender.com/auth/vk/callback',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: 'email',
    });

    VKID.Auth.login()
        .then(async (response) => {
            const { code, device_id } = response;
            const token = localStorage.getItem('sessionToken');
            const res = await fetch(`${window.API_BASE}/auth/link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ provider: 'vk', code, device_id })
            });
            const data = await res.json();
            vkLinkingInProgress = false;
            if (data.success) {
                showToast('VK аккаунт привязан', 1500);
                renderSettings();
            } else {
                showToast('Ошибка: ' + data.error, 1500);
            }
        })
        .catch((error) => {
            console.error('VK link error:', error);
            vkLinkingInProgress = false;
            showToast('Ошибка привязки VK', 1500);
        });
}

function linkGoogle() {
    if (googleLinkingInProgress) {
        showToast('Привязка Google уже выполняется', 1500);
        return;
    }
    googleLinkingInProgress = true;
    const width = 600, height = 700;
    const left = (screen.width - width) / 2;
    const top = (screen.height - height) / 2;
    const token = localStorage.getItem('sessionToken');
    const popup = window.open(`${window.API_BASE}/auth/google-auth?mode=link&token=${encodeURIComponent(token)}`, 'GoogleLink', `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
        googleLinkingInProgress = false;
        showToast('Пожалуйста, разрешите всплывающие окна для этого сайта', 1500);
        return;
    }
    const googleLinkHandler = async (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'googleLinkSuccess') {
            googleLinkingInProgress = false;
            showToast('Google аккаунт привязан', 1500);
            renderSettings();
            window.removeEventListener('message', googleLinkHandler);
            if (popup) popup.close();
        }
        if (event.data && event.data.type === 'googleLinkError') {
            googleLinkingInProgress = false;
            showToast('Ошибка привязки: ' + event.data.error, 1500);
            window.removeEventListener('message', googleLinkHandler);
            if (popup) popup.close();
        }
    };
    window.addEventListener('message', googleLinkHandler);
    const checkClosed = setInterval(() => {
        if (popup.closed) {
            clearInterval(checkClosed);
            googleLinkingInProgress = false;
            window.removeEventListener('message', googleLinkHandler);
        }
    }, 1000);
}

window.renderSettings = renderSettings;
