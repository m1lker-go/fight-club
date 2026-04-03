// settings.js
const GOOGLE_CLIENT_ID = '777033220750-06670cfa2tb9qnaj95pph70mv20ob.apps.googleusercontent.com';
const BOT_ID = '8215458077';

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

        // Обработчики привязки аккаунтов
        document.querySelectorAll('.link-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const provider = btn.dataset.provider;
                if (provider === 'telegram') {
                    linkTelegram();
                } else if (provider === 'google') {
                    linkGoogle();
                } else if (provider === 'email') {
                    showToast('Привязка email в разработке', 1500);
                } else {
                    showToast(`Привязка ${provider} в разработке`, 1500);
                }
            });
        });
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
    const oauthUrl = `https://oauth.telegram.org/embed?bot_id=${BOT_ID}&origin=${encodeURIComponent(window.location.origin)}&size=large`;
    const popup = window.open(oauthUrl, 'TelegramAuth', 'width=600,height=600');
    window.removeEventListener('message', handleTelegramLink);
    window.addEventListener('message', handleTelegramLink);
    async function handleTelegramLink(event) {
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
            if (data.success) {
                showToast('Telegram аккаунт привязан', 1500);
                renderSettings();
            } else {
                showToast('Ошибка: ' + data.error, 1500);
            }
            window.removeEventListener('message', handleTelegramLink);
        }
    }
}

function linkGoogle() {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: async (response) => {
                const idToken = response.credential;
                const token = localStorage.getItem('sessionToken');
                const res = await fetch(`${window.API_BASE}/auth/link`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
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
    document.head.appendChild(script);
}

window.renderSettings = renderSettings;
