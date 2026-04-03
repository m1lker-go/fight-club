function renderSettings() {
    const content = document.getElementById('content');
    const token = localStorage.getItem('sessionToken');
    if (!token) return showAuthModal();
    fetch('/auth/profile', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => {
            const user = data.user;
            const connections = data.connections;
            content.innerHTML = `
                <div class="settings-container">
                    <div class="settings-header">
                        <img src="/assets/${user.avatar || 'cat_heroweb.png'}" class="settings-avatar">
                        <span class="settings-username">${user.nickname || user.username}</span>
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
                        <!-- Аналогично VK и email -->
                    </div>
                </div>
            `;
            // Обработчики тумблеров
            document.getElementById('musicToggle').addEventListener('change', (e) => updateSettings('music_enabled', e.target.checked));
            document.getElementById('soundToggle').addEventListener('change', (e) => updateSettings('sound_enabled', e.target.checked));
            // Привязка аккаунтов
            document.querySelectorAll('.link-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const provider = btn.dataset.provider;
                    if (provider === 'telegram') {
                        // Показываем инструкцию: "Нажмите на кнопку в Telegram"
                    } else if (provider === 'google') {
                        // Открываем OAuth2 окно
                    }
                });
            });
        });
}

function updateSettings(key, value) {
    const token = localStorage.getItem('sessionToken');
    fetch('/auth/update-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, [key]: value })
    });
}
