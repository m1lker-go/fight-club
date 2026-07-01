console.log('✅ settings.js loaded');

// ========== ЗАГЛУШКИ ==========
if (typeof escapeHtml === 'undefined') {
    window.escapeHtml = function(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    };
}

function generateCodeVerifier() {
    return Math.random().toString(36).substring(2, 15);
}
function generateCodeChallenge(verifier) {
    return verifier; // временно
}

// ======== ПЕРЕКЛЮЧАТЕЛЬ ЯЗЫКА ========
const SETTINGS_FLAG_URLS = {
    ru: 'https://flagcdn.com/24x18/ru.png',
    en: 'https://flagcdn.com/24x18/gb.png'
};
const SETTINGS_LANG_NAMES = {
    ru: 'Русский',
    en: 'English'
};


function setLanguage(lang) {
    if (window.i18next && typeof window.i18next.changeLanguage === 'function') {
        window.i18next.changeLanguage(lang);
        localStorage.setItem('i18nextLng', lang);
        if (typeof updateUIAfterLanguageChange === 'function') {
            updateUIAfterLanguageChange();
        } else {
            location.reload();
        }
    } else {
        localStorage.setItem('i18nextLng', lang);
        location.reload();
    }
}
window.setLanguage = setLanguage;

function renderLanguageSelector(currentLang) {
    const currentFlagUrl = SETTINGS_FLAG_URLS[currentLang] || SETTINGS_FLAG_URLS.ru;
    const currentName = SETTINGS_LANG_NAMES[currentLang] || currentLang;

    return `
        <div class="settings-language-row" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2f3542;">
            <div class="volume-label" style="font-weight: bold; color: #aaa;">${window.$t('settings:Язык', 'Язык')}</div>
            <div class="lang-switcher-wrapper-settings" style="position: relative; display: flex; align-items: center;">
                <button class="lang-toggle-btn-settings" id="langToggleBtnSettings" style="background: transparent; border: 1px solid #555; border-radius: 20px; padding: 4px 12px 4px 4px; color: white; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                    <div style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #1a1f2b;">
                        <img src="${currentFlagUrl}" alt="${currentLang}" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <span>${currentName}</span>
                    <i class="fas fa-chevron-down" style="font-size: 12px;"></i>
                </button>
                <div class="lang-dropdown-settings" id="langDropdownSettings" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 4px; background: #2a303c; border: 1px solid #555; border-radius: 8px; min-width: 140px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 100;">
                    <div class="lang-option-settings" data-lang="ru" style="padding: 8px 16px; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px; ${currentLang === 'ru' ? 'background: #3a4050;' : ''}">
                        <div style="width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #1a1f2b;">
                            <img src="${SETTINGS_FLAG_URLS.ru}" alt="ru" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        Русский
                    </div>
                    <div class="lang-option-settings" data-lang="en" style="padding: 8px 16px; color: white; cursor: pointer; display: flex; align-items: center; gap: 8px; ${currentLang === 'en' ? 'background: #3a4050;' : ''}">
                        <div style="width: 24px; height: 24px; border-radius: 50%; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #1a1f2b;">
                            <img src="${SETTINGS_FLAG_URLS.en}" alt="en" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        English
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initSettingsLanguageSwitcher() {
    const toggleBtn = document.getElementById('langToggleBtnSettings');
    const dropdown = document.getElementById('langDropdownSettings');
    if (!toggleBtn || !dropdown) return;

    toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    document.querySelectorAll('.lang-option-settings').forEach(opt => {
        opt.addEventListener('click', (e) => {
            const lang = opt.dataset.lang;
            setLanguage(lang);
            dropdown.style.display = 'none';
            updateSettingsLangButton(lang);
            renderSettings();
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.lang-switcher-wrapper-settings')) {
            dropdown.style.display = 'none';
        }
    });
}

function updateSettingsLangButton(lang) {
    const btn = document.getElementById('langToggleBtnSettings');
    if (!btn) return;
    const flagUrl = SETTINGS_FLAG_URLS[lang] || SETTINGS_FLAG_URLS.ru;
    const name = SETTINGS_LANG_NAMES[lang] || lang;
    const img = btn.querySelector('img');
    if (img) {
        img.src = flagUrl;
        img.alt = lang;
    }
    const textSpan = btn.querySelector('span:not(.fa)');
    if (textSpan) {
        textSpan.textContent = name;
    }
}

// ====== ОСТАЛЬНЫЕ ФУНКЦИИ ======
function getStorage() {
    return window.isVKMiniApp === true ? sessionStorage : localStorage;
}

function getSessionToken() {
    return getStorage().getItem('sessionToken');
}

function setSessionToken(token) {
    getStorage().setItem('sessionToken', token);
}

function removeSessionToken() {
    getStorage().removeItem('sessionToken');
}

function showConfirmModal(message, onConfirm, onCancel) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.innerText = window.$t('common:Подтверждение', 'Подтверждение');
    modalBody.innerHTML = `
        <div style="text-align:center;">
            <p>${escapeHtml(message)}</p>
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                <button class="btn confirm-yes" style="background-color: #00aaff;">${window.$t('common:Да', 'Да')}</button>
                <button class="btn confirm-no">${window.$t('common:Отмена', 'Отмена')}</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';

    const yesBtn = modalBody.querySelector('.confirm-yes');
    const noBtn = modalBody.querySelector('.confirm-no');
    const closeX = modal.querySelector('.close');

    function closeModal() {
        modal.style.display = 'none';
        if (onCancel && typeof onCancel === 'function') onCancel();
    }

    yesBtn.onclick = () => {
        modal.style.display = 'none';
        if (onConfirm && typeof onConfirm === 'function') onConfirm();
    };
    noBtn.onclick = closeModal;
    closeX.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target === modal) closeModal();
    };
}

function showLogoutConfirmModal(onConfirm) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = window.$t('settings:Выход из аккаунта', 'Выход из аккаунта');
    modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <div style="margin-bottom: 20px; font-size: 16px;">${window.$t('settings:Вы уверены, что хотите выйти?', 'Вы уверены, что хотите выйти?')}</div>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="modal-btn confirm-yes" style="background-color: #e74c3c; color: white;">${window.$t('settings:Выйти', 'Выйти')}</button>
                <button class="modal-btn confirm-no" style="background-color: #2f3542;">${window.$t('common:Отмена', 'Отмена')}</button>
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

function clearCacheAndReload() {
    const sessionToken = getSessionToken();
    getStorage().clear();
    if (sessionToken) setSessionToken(sessionToken);
    sessionStorage.clear();

    document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    if (window.indexedDB) {
        if (indexedDB.databases) {
            indexedDB.databases().then(dbs => {
                dbs.forEach(db => indexedDB.deleteDatabase(db.name));
            }).catch(e => console.warn('Ошибка очистки IndexedDB', e));
        } else {
            const knownDBs = ['cat_fight_db', 'keyval-store'];
            knownDBs.forEach(dbName => indexedDB.deleteDatabase(dbName));
        }
    }

    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        }).catch(e => console.warn('Cache API error:', e));
    }

    if (window.isVKMiniApp === true) {
        location.reload();
    } else {
        const url = new URL(window.location.href);
        url.searchParams.set('force', Date.now());
        window.location.replace(url.toString());
    }
}

// ========== ГЛАВНАЯ ФУНКЦИЯ РЕНДЕРА НАСТРОЕК ==========
async function renderSettings() {
    console.log('🟢 renderSettings started');
    try {
        console.log('Token in sessionStorage:', sessionStorage.getItem('sessionToken'));
        console.log('Token in localStorage:', localStorage.getItem('sessionToken'));
        console.log('window.isVKMiniApp:', window.isVKMiniApp);
      
        const token = getSessionToken();
        if (!token) {
            if (typeof showToast === 'function') showToast(window.$t('settings:Сессия не найдена', 'Сессия не найдена'), 1500);
            if (typeof showScreen === 'function') showScreen('main');
            return;
        }

        console.log('🟢 Fetching profile...');
        const res = await window.apiRequest('/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        console.log('🟢 Profile loaded');
        const user = data.user;
        const connections = data.connections || [];

        const hasPassword = !!user.password_hash;
        console.log('🟢 Getting avatar filename...');
        const avatarFilename = typeof getAvatarFilenameById === 'function' 
            ? getAvatarFilenameById(user.avatar_id || 1) 
            : 'cat_heroweb.png';

        console.log('🟢 Getting volume settings...');
        let musicVolumePercent = 60;
        let sfxVolumePercent = 70;
        if (typeof AudioManager !== 'undefined') {
            musicVolumePercent = Math.round(AudioManager.getMusicVolume() * 100);
            sfxVolumePercent = Math.round(AudioManager.getSfxVolume() * 100);
        }

        const isVK = window.isVKMiniApp === true;
        const content = document.getElementById('content');
        if (!content) {
            console.error('❌ content element not found');
            return;
        }

        console.log('🟢 Building connections HTML...');
        let connectionsHtml = '';
        if (!isVK) {
            connectionsHtml = `
                <div class="settings-connected-header">${window.$t('settings:ПРИВЯЗАННЫЕ АККАУНТЫ', 'ПРИВЯЗАННЫЕ АККАУНТЫ')}</div>
                <div class="connections-list">
                    <div class="connection-row">
                        <span>Telegram</span>
                        <span>${user.tg_id ? window.$t('settings:Подключён', 'Подключён') : '—'}</span>
                        <button class="link-btn" data-provider="telegram">${user.tg_id ? window.$t('settings:Сменить', 'Сменить') : window.$t('settings:Привязать', 'Привязать')}</button>
                    </div>
                    <div class="connection-row">
                        <span>Google</span>
                        <span>${connections.find(c => c.provider === 'google')?.email || '—'}</span>
                        <button class="link-btn" data-provider="google">${connections.find(c => c.provider === 'google') ? window.$t('settings:Сменить', 'Сменить') : window.$t('settings:Привязать', 'Привязать')}</button>
                    </div>
                    <div class="connection-row">
                        <span>VK</span>
                        <span>${connections.find(c => c.provider === 'vk')?.email || '—'}</span>
                        <button class="link-btn" data-provider="vk">${connections.find(c => c.provider === 'vk') ? window.$t('settings:Сменить', 'Сменить') : window.$t('settings:Привязать', 'Привязать')}</button>
                    </div>
                    <div class="connection-row">
                        <span>Email</span>
                        <span>${user.email || '—'}</span>
                        <button class="link-btn" data-provider="email">${user.email ? window.$t('settings:Сменить', 'Сменить') : window.$t('settings:Привязать', 'Привязать')}</button>
                    </div>
                    ${hasPassword ? `
                    <div class="connection-row">
                        <span>${window.$t('settings:Пароль', 'Пароль')}</span>
                        <span>••••••</span>
                        <button class="link-btn" data-action="change-password">${window.$t('settings:Изменить', 'Изменить')}</button>
                    </div>` : ''}
                </div>
            `;
        } else {
            connectionsHtml = `
                <div class="settings-connected-header">${window.$t('settings:АККАУНТ VK', 'АККАУНТ VK')}</div>
                <div class="connections-list">
                    <div class="connection-row" style="justify-content: center;">
                        <span style="color: #aaa;">${window.$t('settings:Авторизация через VK ID', 'Авторизация через VK ID')}</span>
                    </div>
                    <div class="connection-row" style="justify-content: center;">
                        <span>${user.username || user.email || window.$t('settings:Пользователь VK', 'Пользователь VK')}</span>
                    </div>
                </div>
            `;
        }

        const isTelegramWebApp = !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData);
        const hideLogout = isVK || isTelegramWebApp;
        const hideEditName = isVK;

        const currentLang = localStorage.getItem('i18nextLng') || 'ru';
        console.log('🟢 Current language:', currentLang);

        console.log('🟢 Rendering main HTML...');
        content.innerHTML = `
            <div class="settings-container">
                <div class="settings-profile-row">
                    <img src="/assets/${avatarFilename}" class="settings-avatar">
                    <span class="settings-username">${escapeHtml(user.username || window.$t('common:Игрок', 'Игрок'))}${user.subscription_expiry && new Date(user.subscription_expiry) > new Date() ? ' <i class="fas fa-crown" style="color:#c0c0c0; font-size:20px; vertical-align:middle;"></i>' : ''}</span>
                    ${!hideEditName ? `<button class="edit-username-btn" id="editusernameBtn"><i class="fas fa-pencil-alt"></i></button>` : ''}
                </div>

                <div class="settings-volume-row">
                    <div class="volume-label">${window.$t('settings:Музыка', 'Музыка')}</div>
                    <div class="slider-container" id="musicSliderContainer">
                        <div class="slider-track">
                            <div class="slider-fill" id="musicFill" style="width: ${musicVolumePercent}%;"></div>
                            <div class="slider-thumb" id="musicThumb" style="left: ${musicVolumePercent}%;"></div>
                        </div>
                        <div class="slider-percent" id="musicPercent">${musicVolumePercent}%</div>
                    </div>
                </div>

                <div class="settings-volume-row">
                    <div class="volume-label">${window.$t('settings:Звуки', 'Звуки')}</div>
                    <div class="slider-container" id="sfxSliderContainer">
                        <div class="slider-track">
                            <div class="slider-fill" id="sfxFill" style="width: ${sfxVolumePercent}%;"></div>
                            <div class="slider-thumb" id="sfxThumb" style="left: ${sfxVolumePercent}%;"></div>
                        </div>
                        <div class="slider-percent" id="sfxPercent">${sfxVolumePercent}%</div>
                    </div>
                </div>

                <!-- Переключатель языка -->
                ${renderLanguageSelector(currentLang)}

                <!-- Кнопка Достижения -->
                <div class="settings-volume-row" id="achievementsRow" style="cursor: pointer;">
                    <div class="volume-label">${window.$t('settings:Достижения', 'Достижения')}</div>
                    <div style="flex: 1; text-align: right; color: #aaa;">
                        <i class="fas fa-chevron-right"></i>
                    </div>
                </div>

                ${connectionsHtml}

                <div style="display: flex; gap: 8px; margin-top: 12px;">
                    <button class="logout-btn" id="clearCacheBtn" style="flex: 1; background-color: #2ecc71; color: white; border-radius: 30px; padding: 12px 0; font-size: 16px; font-weight: bold; border: none; cursor: pointer;">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    ${!hideLogout ? `
                    <button class="logout-btn" id="logoutBtn" style="flex: 3; background-color: #e74c3c; color: white; border-radius: 30px; padding: 12px 0; font-size: 16px; font-weight: bold; border: none; cursor: pointer;">
                        <i class="fas fa-sign-out-alt"></i> ${window.$t('settings:Выйти', 'Выйти')}
                    </button>
                    ` : ''}
                </div>
            </div>
        `;

        console.log('🟢 Initializing language switcher...');
        initSettingsLanguageSwitcher();

        console.log('🟢 Setting up sliders...');
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

        if (!hideEditName) {
            const editusernameBtn = document.getElementById('editusernameBtn');
            if (editusernameBtn) {
                editusernameBtn.addEventListener('click', () => {
                    showusernameEditModal(user.username || '');
                });
            }
        }

        if (!isVK) {
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
                        showToast(window.$t('settings:Привязка email в разработке', 'Привязка email в разработке'), 1500);
                    } else {
                        showToast(window.$t('settings:Привязка {provider} в разработке', 'Привязка {provider} в разработке').replace('{provider}', provider), 1500);
                    }
                });
            });
        }

        const clearCacheBtn = document.getElementById('clearCacheBtn');
        if (clearCacheBtn) {
            clearCacheBtn.addEventListener('click', () => {
                showConfirmModal(
                    window.$t('settings:Это перезагрузит игру и очистит временные данные. Вы уверены?', 'Это перезагрузит игру и очистит временные данные. Вы уверены?'),
                    () => {
                        clearCacheAndReload();
                    }
                );
            });
        }

        if (!hideLogout) {
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => {
                    showLogoutConfirmModal(() => {
                        removeSessionToken();
                        localStorage.removeItem('telegram_link_state');
                        localStorage.removeItem('telegram_code_verifier');
                        sessionStorage.clear();
                        window.location.href = window.location.pathname;
                    });
                });
            }
        }

        const achievementsRow = document.getElementById('achievementsRow');
        if (achievementsRow) {
            achievementsRow.addEventListener('click', () => {
                showAchievementsPage();
            });
        }

        console.log('🟢 renderSettings completed successfully');
    } catch (err) {
        console.error('❌ Ошибка в renderSettings:', err);
        if (typeof showToast === 'function') {
            showToast(window.$t('settings:Ошибка загрузки настроек', 'Ошибка загрузки настроек') + err.message, 3000);
        } else {
            alert('Ошибка загрузки настроек: ' + err.message);
        }
        if (typeof showScreen === 'function') showScreen('main');
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
async function updateSettings(updates) {
    try {
        const res = await window.apiRequest('/user/update-settings', {
            method: 'POST',
            body: JSON.stringify(updates)
        });
        if (!res.ok) throw new Error('Failed to update');
        if (typeof showToast === 'function') showToast(window.$t('settings:Настройки сохранены', 'Настройки сохранены'), 1000);
    } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast(window.$t('settings:Ошибка сохранения', 'Ошибка сохранения'), 1500);
    }
}

function showusernameEditModal(currentusername) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = window.$t('settings:Изменить никнейм', 'Изменить никнейм');
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <input type="text" id="editusernameInput" class="auth-input" placeholder="${window.$t('settings:Новый никнейм (англ. буквы и цифры, подчёркивание)', 'Новый никнейм (англ. буквы и цифры, подчёркивание)')}" value="${escapeHtml(currentusername)}" maxlength="20">
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                <button class="modal-btn save-username-btn" style="background-color: #00aaff;">${window.$t('common:Сохранить', 'Сохранить')}</button>
                <button class="modal-btn cancel-username-btn">${window.$t('common:Отмена', 'Отмена')}</button>
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
            showToast(window.$t('settings:Введите никнейм', 'Введите никнейм'), 1500);
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(newusername)) {
            showToast(window.$t('settings:Никнейм может содержать только английские буквы, цифры и подчёркивание', 'Никнейм может содержать только английские буквы, цифры и подчёркивание'), 1500);
            return;
        }
        const checkRes = await window.apiRequest(`/auth/check-username?username=${encodeURIComponent(newusername)}`, { method: 'GET' });
        const { available } = await checkRes.json();
        if (!available) {
            showToast(window.$t('settings:Никнейм уже занят', 'Никнейм уже занят'), 1500);
            return;
        }
        const res = await window.apiRequest('/user/update-settings', {
            method: 'POST',
            body: JSON.stringify({ username: newusername })
        });
        if (res.ok) {
            showToast(window.$t('settings:Никнейм изменён', 'Никнейм изменён'), 1500);
            closeModal();
            renderSettings();
            if (currentScreen === 'main') renderMain();
        } else {
            const err = await res.json();
            showToast(window.$t('settings:Ошибка сохранения никнейма', 'Ошибка сохранения никнейма') + (err.error || window.$t('common:неизвестная', 'неизвестная')), 1500);
        }
    });
    cancelBtn.addEventListener('click', closeModal);
    closeX.addEventListener('click', closeModal);
    window.onclick = (event) => {
        if (event.target === modal) closeModal();
    };
}

function showChangePasswordModal() {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    modalTitle.innerText = window.$t('settings:Изменить пароль', 'Изменить пароль');
    modalBody.innerHTML = `
        <div style="text-align: center;">
            <input type="password" id="oldPassword" class="auth-input" placeholder="${window.$t('settings:Старый пароль', 'Старый пароль')}">
            <input type="password" id="newPassword1" class="auth-input" placeholder="${window.$t('settings:Новый пароль (мин. 6 символов)', 'Новый пароль (мин. 6 символов)')}">
            <input type="password" id="newPassword2" class="auth-input" placeholder="${window.$t('settings:Повторите новый пароль', 'Повторите новый пароль')}">
            <div style="display: flex; gap: 12px; justify-content: center; margin-top: 20px;">
                <button class="modal-btn" id="savePasswordBtn" style="background-color: #00aaff;">${window.$t('common:Сохранить', 'Сохранить')}</button>
                <button class="modal-btn cancel-password-btn">${window.$t('common:Отмена', 'Отмена')}</button>
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
            showToast(window.$t('settings:Заполните все поля', 'Заполните все поля'), 1500);
            return;
        }
        if (new1.length < 6) {
            showToast(window.$t('settings:Новый пароль должен быть не менее 6 символов', 'Новый пароль должен быть не менее 6 символов'), 1500);
            return;
        }
        if (new1 !== new2) {
            showToast(window.$t('settings:Новые пароли не совпадают', 'Новые пароли не совпадают'), 1500);
            return;
        }
        const token = getSessionToken();
        try {
            const res = await fetch(`${window.API_BASE}/user/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword: oldPwd, newPassword: new1 })
            });
            const data = await res.json();
            if (data.success) {
                showToast(window.$t('settings:Пароль изменён', 'Пароль изменён'), 1500);
                closeModal();
                renderSettings();
            } else {
                showToast(window.$t('settings:Ошибка смены пароля', 'Ошибка смены пароля') + (data.error || window.$t('common:неизвестная', 'неизвестная')), 1500);
            }
        } catch (err) {
            console.error(err);
            showToast(window.$t('common:Ошибка соединения', 'Ошибка соединения'), 1500);
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
        showToast(window.$t('settings:Привязка Telegram уже выполняется', 'Привязка Telegram уже выполняется'), 1500);
        return;
    }
    window.telegramLinkingInProgress = true;

    const clientId = '8215458077';
    const redirectUri = encodeURIComponent('https://api.cat-fight.ru/auth/telegram/callback');
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const stateObj = {
        mode: 'link',
        token: getSessionToken(),
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
        showToast(window.$t('settings:Привязка VK уже выполняется', 'Привязка VK уже выполняется'), 1500);
        return;
    }
    vkLinkingInProgress = true;

    const timeoutId = setTimeout(() => {
        if (vkLinkingInProgress) {
            vkLinkingInProgress = false;
            showToast(window.$t('settings:Привязка VK не удалась (таймаут). Попробуйте ещё раз.', 'Привязка VK не удалась (таймаут). Попробуйте ещё раз.'), 3000);
        }
    }, 120000);

    if (!window.VKIDSDK) {
        showToast(window.$t('settings:Загрузка VK SDK...', 'Загрузка VK SDK...'), 1000);
        setTimeout(() => {
            if (window.VKIDSDK) {
                linkVK();
            } else {
                clearTimeout(timeoutId);
                vkLinkingInProgress = false;
                showToast(window.$t('settings:Ошибка загрузки VK SDK', 'Ошибка загрузки VK SDK'), 1500);
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
                
                const res = await window.apiRequest('/user/link', {
                    method: 'POST',
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
                    showToast(window.$t('common:VK аккаунт привязан', 'VK аккаунт привязан'), 1500);
                    renderSettings();
                } else {
                    showToast(window.$t('settings:Ошибка авторизации VK: ', 'Ошибка авторизации VK: ') + data.error, 1500);
                }
            } catch (err) {
                console.error('VK exchange error:', err);
                showToast(window.$t('settings:Ошибка обмена токена', 'Ошибка обмена токена'), 1500);
                vkLinkingInProgress = false;
            }
        })
        .catch((error) => {
            clearTimeout(timeoutId);
            vkLinkingInProgress = false;
            console.error('VK login error:', error);
            showToast(window.$t('settings:Ошибка авторизации VK: ', 'Ошибка авторизации VK: ') + (error.message || window.$t('common:неизвестная', 'неизвестная')), 1500);
        });
}

function linkGoogle() {
    if (googleLinkingInProgress) {
        showToast(window.$t('settings:Привязка Google уже выполняется', 'Привязка Google уже выполняется'), 1500);
        return;
    }
    googleLinkingInProgress = true;
    
    const timeoutId = setTimeout(() => {
        if (googleLinkingInProgress) {
            googleLinkingInProgress = false;
            showToast(window.$t('settings:Привязка Google не удалась (таймаут). Попробуйте ещё раз.', 'Привязка Google не удалась (таймаут). Попробуйте ещё раз.'), 3000);
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
                const res = await window.apiRequest('/user/link', {
                    method: 'POST',
                    body: JSON.stringify({ provider: 'google', idToken })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(window.$t('common:Google аккаунт привязан', 'Google аккаунт привязан'), 1500);
                    renderSettings();
                } else {
                    showToast(window.$t('settings:Ошибка привязки Google', 'Ошибка привязки Google') + data.error, 1500);
                }
            }
        });
        google.accounts.id.prompt();
    };
    script.onerror = () => {
        clearTimeout(timeoutId);
        googleLinkingInProgress = false;
        showToast(window.$t('settings:Ошибка загрузки Google API. Проверьте соединение.', 'Ошибка загрузки Google API. Проверьте соединение.'), 1500);
    };
    document.head.appendChild(script);
}

// ========== СТРАНИЦА ДОСТИЖЕНИЙ ==========
async function showAchievementsPage() {
    const content = document.getElementById('content');
    if (!content) return;

    content.innerHTML = `
        <div class="settings-container">
            <div style="margin-bottom: 16px;">
                <button id="backToSettingsBtn" class="btn" style="background-color: #2f3542; color: #aaa;">
                    <i class="fas fa-arrow-left"></i> ${window.$t('settings:Назад в настройки', 'Назад в настройки')}
                </button>
            </div>
            <div id="achievementsContainer"></div>
        </div>
    `;

    const achievementsContainer = document.getElementById('achievementsContainer');
    if (achievementsContainer && typeof renderAchievements === 'function') {
        await renderAchievements(achievementsContainer);
    } else {
        achievementsContainer.innerHTML = `<p style="color:#aaa;">${window.$t('settings:Ошибка загрузки достижений', 'Ошибка загрузки достижений')}</p>`;
    }

    const backBtn = document.getElementById('backToSettingsBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            renderSettings();
        });
    }
}

window.renderSettings = renderSettings;
