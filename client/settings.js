// settings.js – полная версия с новой вёрсткой настроек

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

        const hasPassword = !!user.password_hash;

        // Текущая громкость из AudioManager
        let musicVolumePercent = 60;
        let sfxVolumePercent = 70;
        if (typeof AudioManager !== 'undefined') {
            musicVolumePercent = Math.round(AudioManager.getMusicVolume() * 100);
            sfxVolumePercent = Math.round(AudioManager.getSfxVolume() * 100);
        }

        const content = document.getElementById('content');
        if (!content) return;
        content.innerHTML = `
            <div class="settings-container">
                <!-- Строка профиля: аватар + имя + карандаш -->
                <div class="settings-profile-row">
                    <img src="/assets/${user.avatar || 'cat_heroweb.png'}" class="settings-avatar">
                    <span class="settings-username">${escapeHtml(user.username || user.username || 'Игрок')}</span>
                    <button class="edit-username-btn" id="editusernameBtn"><i class="fas fa-pencil-alt"></i></button>
                </div>

                <!-- Музыка -->
                <div class="settings-volume-row">
                    <div class="volume-label">Музыка</div>
                    <div class="slider-container" id="musicSliderContainer">
                        <div class="slider-track">
                            <div class="slider-fill" id="musicFill" style="width: ${musicVolumePercent}%;"></div>
                            <div class="slider-thumb" id="musicThumb" style="left: ${musicVolumePercent}%;"></div>
                        </div>
                        <div class="slider-percent" id="musicPercent">${musicVolumePercent}%</div>
                    </div>
                </div>

                <!-- Звуки -->
                <div class="settings-volume-row">
                    <div class="volume-label">Звуки</div>
                    <div class="slider-container" id="sfxSliderContainer">
                        <div class="slider-track">
                            <div class="slider-fill" id="sfxFill" style="width: ${sfxVolumePercent}%;"></div>
                            <div class="slider-thumb" id="sfxThumb" style="left: ${sfxVolumePercent}%;"></div>
                        </div>
                        <div class="slider-percent" id="sfxPercent">${sfxVolumePercent}%</div>
                    </div>
                </div>

                <!-- Заголовок привязанных аккаунтов (тёмный, по центру) -->
                <div class="settings-connected-header">ПРИВЯЗАННЫЕ АККАУНТЫ</div>

                <!-- Список привязок -->
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
                    ${hasPassword ? `
                    <div class="connection-row">
                        <span>Пароль</span>
                        <span>••••••</span>
                        <button class="link-btn" data-action="change-password">Изменить</button>
                    </div>` : ''}
                </div>

                <div class="settings-logout">
                    <button class="logout-btn" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Выйти из аккаунта</button>
                </div>
            </div>
        `;

        // Инициализация ползунков
        function setupSlider(containerId, fillId, thumbId, percentId, isMusic) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const track = container.querySelector('.slider-track');
            const fill = document.getElementById(fillId);
            const thumb = document.getElementById(thumbId);
            const percentSpan = document.getElementById(percentId);
            
            let active = false;

            function updateFromX(clientX) {
                const rect = track.getBoundingClientRect();
                let percent = (clientX - rect.left) / rect.width;
                percent = Math.min(1, Math.max(0, percent));
                const step = 0.2;
                let stepped = Math.round(percent / step) * step;
                stepped = Math.min(1, Math.max(0, stepped));
                const percentValue = Math.round(stepped * 100);
                
                fill.style.width = percentValue + '%';
                thumb.style.left = percentValue + '%';
                percentSpan.innerText = percentValue + '%';
                
                if (isMusic) {
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.setMusicVolume(stepped);
                        updateSettings({ music_enabled: stepped > 0 });
                    }
                } else {
                    if (typeof AudioManager !== 'undefined') {
                        AudioManager.setSfxVolume(stepped);
                        updateSettings({ sound_enabled: stepped > 0 });
                    }
                }
            }

            function onMouseMove(e) {
                if (!active) return;
                updateFromX(e.clientX);
            }
            function onMouseUp() {
                active = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }
            track.addEventListener('mousedown', (e) => {
                active = true;
                updateFromX(e.clientX);
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            });
            track.addEventListener('touchstart', (e) => {
                active = true;
                const touch = e.touches[0];
                updateFromX(touch.clientX);
                document.addEventListener('touchmove', onTouchMove);
                document.addEventListener('touchend', onTouchEnd);
                e.preventDefault();
            });
            function onTouchMove(e) {
                if (!active) return;
                const touch = e.touches[0];
                updateFromX(touch.clientX);
            }
            function onTouchEnd() {
                active = false;
                document.removeEventListener('touchmove', onTouchMove);
                document.removeEventListener('touchend', onTouchEnd);
            }
        }

        setupSlider('musicSliderContainer', 'musicFill', 'musicThumb', 'musicPercent', true);
        setupSlider('sfxSliderContainer', 'sfxFill', 'sfxThumb', 'sfxPercent', false);

        // Обработчики
        const editusernameBtn = document.getElementById('editusernameBtn');
        if (editusernameBtn) {
            editusernameBtn.addEventListener('click', () => {
                showusernameEditModal(user.username || user.username || '');
            });
        }

        document.querySelectorAll('.link-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const provider = btn.dataset.provider;
                const action = btn.dataset.action;

                if (action === 'change-password') {
                    showChangePasswordModal();
                } else if (provider === 'telegram') {
                    linkTelegram();
                } else if (provider === 'google') {
                    linkGoogle();
                } else if (provider === 'vk') {
                    linkVK();
                } else if (provider === 'email') {
                    showToast('Привязка email в разработке', 1500);
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

function showusernameEditModal(currentusername) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Изменить никнейм';
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <input type="text" id="editusernameInput" class="auth-input" placeholder="Новый никнейм (англ. буквы и цифры, подчёркивание)" value="${escapeHtml(currentusername)}" maxlength="20">
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                <button class="modal-btn save-username-btn" style="background-color: #00aaff;">Сохранить</button>
                <button class="modal-btn cancel-username-btn">Отмена</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    const input = document.getElementById('editusernameInput');
    const saveBtn = modalBody.querySelector('.save-username-btn');
    const cancelBtn = modalBody.querySelector('.cancel-username-btn');
    const closeX = modal.querySelector('.close');
    const closeModal = () => modal.style.display = 'none';
    
    saveBtn.addEventListener('click', async () => {
        const newusername = input.value.trim();
        if (!newusername) {
            showToast('Введите никнейм', 1500);
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(newusername)) {
            showToast('Никнейм может содержать только английские буквы, цифры и подчёркивание', 1500);
            return;
        }
        const token = localStorage.getItem('sessionToken');
        const checkRes = await window.apiRequest(`/auth/check-username?username=${encodeURIComponent(newusername)}`, { method: 'GET' });
        const { available } = await checkRes.json();
        if (!available) {
            showToast('Никнейм уже занят', 1500);
            return;
        }
        const res = await window.apiRequest('/auth/update-settings', {
            method: 'POST',
            body: JSON.stringify({ token, username: newusername })
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

// ========== СМЕНА ПАРОЛЯ ==========
function showChangePasswordModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = 'Изменить пароль';
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <input type="password" id="oldPassword" class="auth-input" placeholder="Старый пароль">
            <input type="password" id="newPassword1" class="auth-input" placeholder="Новый пароль (мин. 6 символов)">
            <input type="password" id="newPassword2" class="auth-input" placeholder="Повторите новый пароль">
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                <button class="modal-btn" id="savePasswordBtn" style="background-color: #00aaff;">Сохранить</button>
                <button class="modal-btn cancel-password-btn">Отмена</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    const saveBtn = document.getElementById('savePasswordBtn');
    const cancelBtn = modalBody.querySelector('.cancel-password-btn');
    const closeX = modal.querySelector('.close');
    const closeModal = () => modal.style.display = 'none';

    saveBtn.addEventListener('click', async () => {
        const oldPwd = document.getElementById('oldPassword').value;
        const new1 = document.getElementById('newPassword1').value;
        const new2 = document.getElementById('newPassword2').value;
        if (!oldPwd || !new1 || !new2) {
            showToast('Заполните все поля', 1500);
            return;
        }
        if (new1.length < 6) {
            showToast('Новый пароль должен быть не менее 6 символов', 1500);
            return;
        }
        if (new1 !== new2) {
            showToast('Новые пароли не совпадают', 1500);
            return;
        }
        const token = localStorage.getItem('sessionToken');
        try {
            const res = await fetch(`${window.API_BASE}/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword: oldPwd, newPassword: new1 })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Пароль изменён', 1500);
                closeModal();
                renderSettings();
            } else {
                showToast('Ошибка: ' + (data.error || 'неизвестная'), 1500);
            }
        } catch (err) {
            console.error(err);
            showToast('Ошибка соединения', 1500);
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
    const redirectUri = encodeURIComponent('https://api.cat-fight.ru/auth/telegram/callback');
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
}

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
