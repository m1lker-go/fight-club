// settings.js
async function renderSettings() {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
        showToast('Сессия не найдена', 1500);
        showScreen('main');
        return;
    }

    try {
        const res = await fetch('/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        const user = data.user;
        const connections = data.connections || [];

        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="settings-container">
                <div class="settings-header">
                    <img src="/assets/${user.avatar || 'cat_heroweb.png'}" class="settings-avatar">
                    <span class="settings-username">${user.nickname || user.username || 'Игрок'}</span>
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
                            ${!user.tg_id ? '<button class="link-btn" data-provider="telegram">Привязать</button>' : ''}
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
                            ${!user.email ? '<button class="link-btn" data-provider="email">Привязать</button>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Обработчики тумблеров
        document.getElementById('musicToggle').addEventListener('change', async (e) => {
            await updateSettings({ music_enabled: e.target.checked });
        });
        document.getElementById('soundToggle').addEventListener('change', async (e) => {
            await updateSettings({ sound_enabled: e.target.checked });
        });

        // Обработчики привязки аккаунтов (заглушки)
        document.querySelectorAll('.link-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const provider = btn.dataset.provider;
                showToast(`Привязка ${provider} в разработке`, 1500);
                // Здесь будет вызов OAuth
            });
        });
    } catch (err) {
        console.error(err);
        showToast('Ошибка загрузки настроек', 1500);
        showScreen('main');
    }
}

async function updateSettings(updates) {
    const token = localStorage.getItem('sessionToken');
    try {
        const res = await fetch('/auth/update-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, ...updates })
        });
        if (!res.ok) throw new Error('Failed to update');
        showToast('Настройки сохранены', 1000);
    } catch (err) {
        console.error(err);
        showToast('Ошибка сохранения', 1500);
    }
}

window.renderSettings = renderSettings;
