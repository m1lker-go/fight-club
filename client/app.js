// app.js – основная логика приложения (исправлено: VK Mini App авторизация через параметры запуска и sessionStorage)

let tg = null;
let user = null;

if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    tg.expand();
    tg.ready();
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        user = tg.initDataUnsafe.user;
    }
}

if (user) {
    window.playerName = user.username || user.first_name || 'Игрок';
} else {
    window.playerName = 'Игрок';
}
console.log('playerName:', window.playerName);

let referralCode = null;
if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
    referralCode = tg.initDataUnsafe.start_param;
    console.log('Referral code from start_param:', referralCode);
}

let userData = null;
let userClasses = [];
let inventory = [];
let currentScreen = 'main';
let currentPower = 0;
let BOT_USERNAME = '';
let avatarsList = null;
let lastBattleLog = null;
let sessionToken = null;

window.API_BASE = 'https://api.cat-fight.ru';
window.BOT_USERNAME = 'CatFightingBot';
window.GOOGLE_CLIENT_ID = '777033220750-o667o0cfaa2tb9qnnaj95pph70mv20ob.apps.googleusercontent.com';

// ========== УНИВЕРСАЛЬНОЕ ПОЛУЧЕНИЕ ПАРАМЕТРОВ VK (search или hash) ==========
function getVKLaunchParams() {
    // Извлекаем параметры из search
    const searchParams = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of searchParams.entries()) {
        result[key] = value;
    }
    // Дополняем параметрами из hash
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        for (const [key, value] of hashParams.entries()) {
            result[key] = value;
        }
    }
    console.log('[VK] getVKLaunchParams result:', result);
    return result;
}
// ========== ОПРЕДЕЛЕНИЕ ОКРУЖЕНИЯ VK MINI APP ==========
window.isVKMiniApp = (function() {
    if (typeof window.vkBridge === 'undefined') return false;
    // Проверяем наличие параметров VK
    const params = getVKLaunchParams();
    if (params.vk_user_id && params.sign) return true;
    // Альтернативные признаки
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('vk')) return true;
    if (window.location.search.includes('vk_access_token_settings')) return true;
    if (window.self !== window.top && document.referrer.includes('vk.com')) return true;
    return false;
})();

if (window.isVKMiniApp) {
    console.log('[App] VK Mini App detected, applying horizontal CSS');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // link.href = '/css/vk-horizontal.css';
    document.head.appendChild(link);
} else {
    console.log('[App] Not VK Mini App, default vertical mode');
}

// ========== VK MINI APP АВТОРИЗАЦИЯ ЧЕРЕЗ ПАРАМЕТРЫ ЗАПУСКА ==========
async function autoLoginVKLaunch() {
    const launchParams = getVKLaunchParams();
    console.log('[VK] autoLoginVKLaunch params:', launchParams);
    if (!launchParams.vk_user_id || !launchParams.sign) {
        console.log('[VK] Missing launch params, skipping autoLoginVKLaunch');
        return false;
    }
    try {
        const response = await fetch(`${window.API_BASE}/auth/vk-launch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(launchParams)
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const data = await response.json();
        if (data.success && data.sessionToken) {
            sessionStorage.setItem('sessionToken', data.sessionToken);
            await loadUserDataByToken(data.sessionToken);
            
      // --- ОБНОВЛЕНИЕ ИМЕНИ ИЗ VK (с задержкой и проверкой) ---
if (window.isVKMiniApp && typeof vkBridge !== 'undefined') {
    // Даём время на полную загрузку userData
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[VK] userData after load:', userData);
    
    if (userData && userData.username && userData.username.startsWith('user_')) {
        try {
            const userInfo = await vkBridge.send('VKWebAppGetUserInfo');
            const fullName = `${userInfo.first_name} ${userInfo.last_name}`.trim();
            console.log('[VK] Received from VK:', fullName);
            if (fullName) {
                const updRes = await window.apiRequest('/user/update-username', {
                    method: 'POST',
                    body: JSON.stringify({ username: fullName })
                });
                if (updRes.ok) {
                    userData.username = fullName;
                    updateTopBar();
                    console.log('[VK] Username updated to', fullName);
                } else {
                    const errData = await updRes.json();
                    console.error('[VK] Update username error:', errData);
                }
            }
        } catch (err) {
            console.error('[VK] Could not update username', err);
        }
    } else {
        console.log('[VK] Username not updated (already set or not user_ format):', userData?.username);
    }
}
            // ---------------------------------------------------------
            
            if (data.needusername && typeof showusernameModal === 'function') {
                showusernameModal(data.userId);
            } else {
                const modal = document.getElementById('roleModal');
                if (modal) modal.style.display = 'none';
                showScreen('main');
            }
            return true;
        } else {
            console.error('[VK] auth error:', data.error);
        }
    } catch (err) {
        console.error('[VK] autoLoginVKLaunch error:', err);
    }
    showErrorSplash();
    return false;
}

if (window.isVKMiniApp && typeof vkBridge !== 'undefined') {
    vkBridge.send('VKWebAppInit', {})
        .then(() => {
            console.log('[VK Bridge] init OK');
            const params = getVKLaunchParams();
            console.log('[VK] params full:', JSON.stringify(params));
            console.log('[VK] vk_user_id:', params.vk_user_id, 'sign:', params.sign);
            if (!params.vk_user_id || !params.sign) {
                console.warn('[VK] No launch params, fallback to normal auth');
                checkAuth();
                return;
            }
            if (!sessionStorage.getItem('sessionToken')) {
                autoLoginVKLaunch().catch(console.error);
            } else {
                loadUserDataByToken(sessionStorage.getItem('sessionToken')).catch(console.error);
            }
        })
        .catch(e => console.error('[VK Bridge] init error:', e));
}

// ========== Универсальный apiRequest с Bearer-токеном (условное хранилище) ==========
window.apiRequest = async function(endpoint, options = {}) {
    console.log('[apiRequest]', endpoint, options);
    const url = endpoint.startsWith('http') ? endpoint : window.API_BASE + endpoint;
    const method = options.method || 'GET';
    
    let bodyObj = {};
    if (options.body) {
        if (typeof options.body === 'object') {
            bodyObj = options.body;
        } else {
            try {
                bodyObj = JSON.parse(options.body);
            } catch(e) {
                bodyObj = {};
            }
        }
    }
    
    const fetchOptions = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    };
    
    // Определяем хранилище токена
    const storage = window.isVKMiniApp ? sessionStorage : localStorage;
    const token = storage.getItem('sessionToken');
    if (token && !endpoint.startsWith('/auth') && !endpoint.includes('/auth/')) {
        fetchOptions.headers['Authorization'] = `Bearer ${token}`;
    }
    
    let finalUrl;
    if (method === 'GET') {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(bodyObj)) {
            if (value !== undefined && value !== null) {
                params.append(key, value);
            }
        }
        params.append('_t', Date.now());
        const separator = url.includes('?') ? '&' : '?';
        finalUrl = url + separator + params.toString();
    } else {
        fetchOptions.body = JSON.stringify(bodyObj);
        finalUrl = url;
    }
    
    console.log('[apiRequest] finalUrl:', finalUrl);
    console.log('[apiRequest] fetchOptions:', fetchOptions);
    
    try {
        const response = await fetch(finalUrl, fetchOptions);
        console.log('[apiRequest] response status:', response.status);
        const responseText = await response.text();
        console.log('[apiRequest] response body:', responseText);
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { error: 'Invalid JSON response', raw: responseText };
        }
        return {
            ok: response.ok,
            status: response.status,
            json: async () => data,
            text: async () => responseText
        };
    } catch (err) {
        console.error('[apiRequest] fetch error:', err);
        throw err;
    }
};

async function fetchWithRetry(url, options, retries = 3, timeout = 40000) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            let response;
            if (url.startsWith(window.API_BASE) || url.startsWith('/')) {
                response = await window.apiRequest(url, { ...options, signal: controller.signal });
            } else {
                response = await fetch(url, { ...options, signal: controller.signal });
            }
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        } catch (err) {
            console.warn(`Attempt ${i+1}/${retries} failed:`, err.message);
            if (i === retries - 1) throw err;
            await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
        }
    }
}

function loadAudioManager() {
    if (typeof AudioManager !== 'undefined') return;
    const script = document.createElement('script');
    script.src = '/js/audioManager.js';
    script.onload = () => {
        if (typeof AudioManager !== 'undefined') {
            AudioManager.onScreenChange();
        }
    };
    document.head.appendChild(script);
}

async function autoLoginTelegram() {
    if (!tg || !tg.initData) return false;
    console.log('Auto login via Telegram initData...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${window.API_BASE}/auth/telegram-auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initData: tg.initData,
                referral_code: referralCode
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.sessionToken) {
                localStorage.setItem('sessionToken', data.sessionToken);
                if (data.need && typeof showusernameModal === 'function') {
                    showusernameModal(data.userId);
                    return true;
                } else {
                    await loadUserDataByToken(data.sessionToken);
                    if (typeof initIronSourceAds === 'function' && userData && userData.id) {
                        initIronSourceAds(userData.id);
                    }
                }
                return true;
            }
        } else {
            console.error('Auto login failed:', await response.text());
        }
    } catch (e) {
        clearTimeout(timeoutId);
        console.error('Auto login error:', e);
    }
    return false;
}

async function loadUserDataByToken(token, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`loadUserDataByToken: попытка ${i+1}...`);
            const res = await window.apiRequest('/player/profile', { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                console.log('[loadUserDataByToken] Данные получены:', data.user?.id, 'classes:', data.userClasses?.length);
                userData = data.user;
                userClasses = data.classes || [];
                inventory = data.inventory || [];
                BOT_USERNAME = data.bot_username || '';
                await loadAvatars();
                userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);
                recalculatePower();
                updateTopBar();

                if (currentScreen === 'main') {
                    renderMain();
                } else {
                    showScreen('main');
                }

                if (window.AnimationManager && typeof AnimationManager.preloadAllAnimations === 'function') {
                    AnimationManager.preloadAllAnimations().catch(e => console.warn('Предзагрузка анимаций:', e));
                }
                if (typeof loadMessagesSilent === 'function') loadMessagesSilent();
                updateMainMenuNewIcons();
                checkAdvent();
                hideSplashScreen();
                if (typeof window.updateTradeBadges === 'function') {
                    window.updateTradeBadges();
                }
                if (typeof initIronSourceAds === 'function' && userData && userData.id) {
                    initIronSourceAds(userData.id);
                }

                setTimeout(() => {
                    recalculatePower();
                    updateTopBar();
                    if (currentScreen === 'main') {
                        renderMain();
                    }
                }, 100);

                console.log('loadUserDataByToken: success');
                return true;
            } else {
                console.error(`Profile fetch failed: ${res.status}`);
                if (res.status === 401) {
                    const storage = window.isVKMiniApp ? sessionStorage : localStorage;
                    storage.removeItem('sessionToken');
                    return false;
                }
            }
        } catch (e) {
            console.error('Load user data error:', e);
        }
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000));
    }
    return false;
}

// Инициализация sessionToken в зависимости от окружения
if (window.isVKMiniApp) {
    sessionToken = sessionStorage.getItem('sessionToken');
} else {
    sessionToken = localStorage.getItem('sessionToken');
}

async function checkAuth() {
    console.log('checkAuth: sessionToken =', sessionToken);
    const storage = window.isVKMiniApp ? sessionStorage : localStorage;
    if (sessionToken) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const res = await window.apiRequest('/player/profile', { method: 'GET', signal: controller.signal });
            clearTimeout(timeoutId);
            if (res.ok) {
                const data = await res.json();
                userData = data.user;
                userClasses = data.classes || [];
                inventory = data.inventory || [];
                BOT_USERNAME = data.bot_username || '';
                await loadAvatars();
                userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);
                recalculatePower();
                updateTopBar();
                showScreen('main');
                if (window.AnimationManager && typeof AnimationManager.preloadAllAnimations === 'function') {
                    AnimationManager.preloadAllAnimations().catch(e => console.warn('Предзагрузка анимаций:', e));
                }
                updateMainMenuNewIcons();
                checkAdvent();
                hideSplashScreen();
                if (typeof window.updateTradeBadges === 'function') {
                    window.updateTradeBadges();
                }
                if (typeof initIronSourceAds === 'function' && userData && userData.id) {
                    initIronSourceAds(userData.id);
                }
                console.log('checkAuth: user logged in via existing token');
                return true;
            } else {
                console.warn('checkAuth: token invalid, removing');
                storage.removeItem('sessionToken');
                sessionToken = null;
            }
        } catch (e) {
            clearTimeout(timeoutId);
            console.error('Auth check error:', e);
            showErrorSplash();
            return false;
        }
    }

    const isTelegramWebApp = !!(tg && tg.initData);
    if (isTelegramWebApp) {
        console.log('checkAuth: trying auto login via Telegram');
        const autoLogged = await autoLoginTelegram();
        if (autoLogged) return true;
    }

    hideSplashScreen();
    if (typeof showAuthModal === 'function') {
        showAuthModal();
    } else {
        console.error('showAuthModal not defined');
        showErrorSplash();
    }
    return false;
}

function hideSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => {
            splash.style.display = 'none';
        }, 500);
    }
}

function showErrorSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.remove('hidden');
        splash.style.display = 'flex';
        splash.innerHTML = `
            <div class="splash-content">
                <h1 class="splash-title">Ошибка соединения</h1>
                <p class="splash-subtitle">Не удалось подключиться к серверу.</p>
                <p style="font-size:14px; margin-bottom:20px;">Попробуйте позже или нажмите "Повторить"</p>
                <button class="btn" id="retryBtn" style="margin-top: 10px;">Повторить</button>
            </div>
        `;
        const retryBtn = document.getElementById('retryBtn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                location.reload();
            });
        }
    }
}

let adventCheckLock = false;

async function checkAdvent() {
    if (adventCheckLock) return;
    if (!userData || !userData.id) return;
    adventCheckLock = true;
    try {
        const res = await window.apiRequest(`/tasks/advent?_=${Date.now()}`, { method: 'GET' });
        if (!res.ok) return;
        const data = await res.json();
        if (data.nextAvailable !== null && data.nextAvailable !== undefined) {
            if (typeof showAdventModal !== 'function') {
                await new Promise((resolve, reject) => {
                    const start = Date.now();
                    const id = setInterval(() => {
                        if (typeof showAdventModal === 'function') {
                            clearInterval(id);
                            resolve();
                        } else if (Date.now() - start > 5000) {
                            clearInterval(id);
                            reject(new Error('showAdventModal not loaded'));
                        }
                    }, 100);
                });
            }
            if (typeof showAdventModal === 'function') {
                showAdventModal(data);
            }
        }
    } catch (e) {
        console.error('[checkAdvent] error:', e);
    } finally {
        adventCheckLock = false;
    }
}

function getAdventReward(day, daysInMonth) {
    const coinExpBase = [50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 100, 100, 120, 120, 150, 150, 200, 200, 250, 250, 300, 300, 400, 400, 500, 500];
    
    if (day === 7) return { type: 'item', rarity: 'common' };
    if (day === 14) return { type: 'item', rarity: 'uncommon' };
    if (day === 22) return { type: 'item', rarity: 'epic' };
    if (day === daysInMonth && (daysInMonth === 30 || daysInMonth === 31)) {
        return { type: 'item', rarity: 'legendary' };
    }
    const index = day - 1;
    if (index < coinExpBase.length) {
        if (day % 2 === 1) return { type: 'coins', amount: coinExpBase[index] };
        else return { type: 'exp', amount: coinExpBase[index] };
    } else {
        const higher = [300, 300, 400, 400, 500, 500];
        let idx = index - coinExpBase.length;
        if (idx < higher.length) {
            if (day % 2 === 1) return { type: 'coins', amount: higher[idx] };
            else return { type: 'exp', amount: higher[idx] };
        }
    }
    return { type: 'coins', amount: 100 };
}

async function refreshData() {
    if (!userData || !userData.id) {
        console.warn('refreshData: userData or id missing');
        return;
    }
    try {
        const response = await fetchWithRetry('/user/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, 2, 20000);
        const data = await response.json();
        if (data.user) {
            userData = data.user;
            userClasses = data.classes || [];
            inventory = data.inventory || [];
            BOT_USERNAME = data.bot_username || '';

            await loadAvatars();
            userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);

            recalculatePower();
            showScreen(currentScreen);
            if (currentScreen === 'trade' && window.updateShopTabIcon) {
                window.updateShopTabIcon();
            }
            if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
            if (window.refreshTasksData) window.refreshTasksData();
            if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
        }
    } catch (e) {
        console.error('Refresh error:', e);
    }
}

async function refreshTasksOnly() {
    if (!userData || !userData.id) return;
    try {
        const response = await fetchWithRetry('/user/refresh', {
            method: 'POST',
            body: JSON.stringify({})
        });
        const data = await response.json();
        if (data.user) {
            userData = data.user;
            userClasses = data.classes || [];
            inventory = data.inventory || [];
            if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
            if (currentScreen === 'tasks' && typeof renderTasks === 'function') {
                renderTasks();
            }
        }
    } catch (e) {
        console.error('Refresh tasks error:', e);
    }
}

function updateTopBar() {
    if (!userData) return;
    document.getElementById('coinCount').innerText = userData.coins;
    document.getElementById('diamondCount').innerText = userData.diamonds || 0;
    document.getElementById('rating').innerText = userData.rating;
    document.getElementById('energy').innerText = userData.energy;
    document.getElementById('power').innerText = currentPower;
}

function showScreen(screen) {
    currentScreen = screen;
    window.currentScreen = screen;
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screen) item.classList.add('active');
    });

    const content = document.getElementById('content');
    content.innerHTML = '';

    if (typeof AudioManager !== 'undefined' && AudioManager.onScreenChange) {
        AudioManager.onScreenChange();
    }

    if (screen === 'profile' && userData && userData.id) {
        window.apiRequest('/tasks/daily/update/profile', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                if (data.success && typeof refreshTasksData === 'function') {
                    refreshTasksData();
                }
            })
            .catch(e => console.warn('Не удалось обновить задание профиля:', e));
    }

    switch (screen) {
        case 'main':
            renderMain();
            updateTradeBadges();
            break;
        case 'equip': renderEquip(); break;
        case 'trade': renderTrade(); break;
        case 'messages': renderMessages(); break;
        case 'forge':
            if (typeof renderForge === 'function') renderForge();
            else renderForgeFallback();
            break;
        case 'tasks':
            renderTasks();
            if (typeof loadDailyTasks === 'function') loadDailyTasks();
            break;
        case 'rating': renderRating(); break;
        case 'profile': renderProfile(); break;
        case 'tower':
            if (typeof loadTowerStatus === 'function') loadTowerStatus();
            else {
                const script = document.createElement('script');
                script.src = 'js/tower.js?v=1';
                script.onload = () => loadTowerStatus();
                document.head.appendChild(script);
            }
            break;
        case 'settings':
            if (typeof renderSettings === 'function') renderSettings();
            else content.innerHTML = '<p style="text-align:center; color:#aaa;">Настройки временно недоступны</p>';
            break;
        case 'market': renderMarket(); break;
        case 'fortune': renderFortune(); break;
        case 'alchemy': renderAlchemy(); break;
        default: renderMain();
    }

    if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
}

function renderForgeFallback() {
    const content = document.getElementById('content');
    content.innerHTML = '<p style="text-align:center; color:#aaa;">Кузница временно недоступна</p>';
}

async function loadAvatars() {
    if (avatarsList) return avatarsList;
    try {
        const res = await window.apiRequest('/avatars', { method: 'GET' });
        if (!res.ok) throw new Error('Failed to fetch avatars');
        avatarsList = await res.json();
        return avatarsList;
    } catch (e) {
        console.error('Error loading avatars:', e);
        return [];
    }
}

function getAvatarFilenameById(id) {
    if (!avatarsList) return 'cat_heroweb.png';
    const avatar = avatarsList.find(a => a.id === id);
    return avatar ? avatar.filename : 'cat_heroweb.png';
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

function updateMessagesBadge() {
    console.log('updateMessagesBadge called, unreadMessagesCount =', unreadMessagesCount);
    const mainMailBtn = document.getElementById('mailBtn');
    const hasNew = unreadMessagesCount > 0;
    console.log('mainMailBtn:', mainMailBtn, 'hasNew:', hasNew);
    
    if (!mainMailBtn) return;
    
    let existingIcon = mainMailBtn.querySelector('.messages-new-icon');
    if (hasNew && !existingIcon) {
        const icon = document.createElement('img');
        icon.src = '/assets/icons/icon-new.png';
        icon.className = 'messages-new-icon';
        icon.style.position = 'absolute';
        icon.style.top = '3px';
        icon.style.right = '3px';
        icon.style.width = '16px';
        icon.style.height = '16px';
        icon.style.pointerEvents = 'none';
        mainMailBtn.style.position = 'relative';
        mainMailBtn.appendChild(icon);
        console.log('Иконка добавлена');
    } else if (!hasNew && existingIcon) {
        existingIcon.remove();
        console.log('Иконка удалена');
    }
}

window.renderMain = renderMain;
window.renderEquip = renderEquip;
window.renderTrade = renderTrade;
window.renderMarket = renderMarket;
window.renderRating = renderRating;
window.renderProfile = renderProfile;
window.renderTasks = renderTasks;
window.renderSkins = renderSkins;
window.renderSkills = renderSkills;
window.renderProfileBonuses = renderProfileBonuses;
window.renderFortune = renderFortune;
window.renderAlchemy = renderAlchemy;

// ========== Обработка внешней авторизации (Google/VK/Telegram) без перезагрузки ==========
function handleExternalAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    let handled = false;

    async function handleOAuthSuccess(sessionToken, needusername, userId) {
        if (!sessionToken) {
            console.error('[OAuth] No sessionToken');
            return false;
        }
        localStorage.setItem('sessionToken', sessionToken);
        if (needusername && typeof showusernameModal === 'function') {
            showusernameModal(userId);
        } else {
            const loaded = await loadUserDataByToken(sessionToken);
            if (loaded) {
                const modal = document.getElementById('roleModal');
                if (modal) modal.style.display = 'none';
                showScreen('main');
                setTimeout(() => {
                    if (currentScreen === 'main') {
                        renderMain();
                    }
                }, 100);
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                console.error('[OAuth] Failed to load user data, reloading...');
                window.location.reload();
            }
        }
        return true;
    }

    // Google OAuth
    const googleAuth = urlParams.get('google_auth');
    if (googleAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        handleOAuthSuccess(sessionToken, needusername, userId);
        handled = true;
    }

    // VK OAuth (браузерный, не для мини-аппа)
    const vkAuth = urlParams.get('vk_auth');
    if (vkAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        handleOAuthSuccess(sessionToken, needusername, userId);
        handled = true;
    }

    // Telegram OAuth
    const telegramAuth = urlParams.get('telegram_auth');
    if (telegramAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        handleOAuthSuccess(sessionToken, needusername, userId);
        handled = true;
    }

    // Привязка аккаунтов (опционально)
    const googleLink = urlParams.get('google_link');
    if (googleLink === 'success') {
        if (typeof showToast === 'function') showToast('Google аккаунт привязан', 1500);
        if (currentScreen === 'settings' && typeof renderSettings === 'function') renderSettings();
        handled = true;
    }
    const vkLink = urlParams.get('vk_link');
    if (vkLink === 'success') {
        if (typeof showToast === 'function') showToast('VK аккаунт привязан', 1500);
        if (currentScreen === 'settings' && typeof renderSettings === 'function') renderSettings();
        handled = true;
    }
    const telegramLink = urlParams.get('telegram_link');
    if (telegramLink === 'success') {
        if (typeof showToast === 'function') showToast('Telegram аккаунт привязан', 1500);
        if (window.telegramLinkingInProgress) window.telegramLinkingInProgress = false;
        if (currentScreen === 'settings' && typeof renderSettings === 'function') renderSettings();
        handled = true;
    }

    if (handled && window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    return handled;
}

window.loadUserDataByToken = loadUserDataByToken;
window.showScreen = showScreen;
window.updateMessagesBadge = updateMessagesBadge;

handleExternalAuth();

checkAuth();
loadAudioManager();

const unlockHandler = () => {
    if (window.AudioManager && typeof AudioManager.unlockAudio === 'function') {
        window.AudioManager.unlockAudio();
    }
    document.removeEventListener('click', unlockHandler);
    document.removeEventListener('touchstart', unlockHandler);
};
document.addEventListener('click', unlockHandler);
document.addEventListener('touchstart', unlockHandler);
