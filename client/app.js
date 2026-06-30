// app.js – основная логика приложения с поддержкой i18n

// ========== ГЛОБАЛЬНАЯ ФУНКЦИЯ ДЛЯ ПЕРЕВОДОВ ==========
const __ = window.__ || function(key, fallback) {
    if (window.i18next && typeof window.i18next.t === 'function') {
        return window.i18next.t(key);
    }
    return fallback || key;
};

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
    window.playerName = user.username || user.first_name || __('common:player', 'Игрок');
} else {
    window.playerName = __('common:player', 'Игрок');
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

// ========== ЕДИНАЯ ФУНКЦИЯ ДЛЯ ПОЛУЧЕНИЯ МОСКОВСКОЙ ДАТЫ ==========
window.getMoscowDate = function() {
    const now = new Date();
    const msk = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    return msk.toISOString().split('T')[0];
};

// ========== УНИВЕРСАЛЬНОЕ ПОЛУЧЕНИЕ ПАРАМЕТРОВ VK (search или hash) ==========
function getVKLaunchParams() {
    const searchParams = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of searchParams.entries()) {
        result[key] = value;
    }
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
    const params = getVKLaunchParams();
    if (params.vk_user_id && params.sign) return true;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('vk')) return true;
    if (window.location.search.includes('vk_access_token_settings')) return true;
    if (window.self !== window.top && document.referrer.includes('vk.com')) return true;
    return false;
})();

// ========== ОПРЕДЕЛЕНИЕ TELEGRAM WEB APP (НАДЁЖНОЕ) ==========
window.isTelegramWebApp = false;

function detectTelegramWebApp() {
    if (window.isTelegramWebApp) return true;
    const hasTelegramWebApp = typeof window.Telegram !== 'undefined' && 
                              window.Telegram.WebApp && 
                              window.Telegram.WebApp.initData;
    const ua = navigator.userAgent.toLowerCase();
    const isTelegram = hasTelegramWebApp || ua.includes('telegram');
    if (isTelegram) {
        window.isTelegramWebApp = true;
        console.log('[App] Telegram Web App detected');
        document.body.classList.add('telegram-webapp');
        return true;
    }
    return false;
}

detectTelegramWebApp();
setTimeout(detectTelegramWebApp, 500);

if (window.isVKMiniApp) {
    console.log('[App] VK Mini App detected, applying styles');
    document.body.classList.add('vk-mini-app');
    console.log('[VK] VK Mini App detected, custom buttons will be added');
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
            
            // Обновление имени из VK
            console.log('[VK] DEBUG: window.isVKMiniApp =', window.isVKMiniApp);
            console.log('[VK] DEBUG: typeof vkBridge =', typeof vkBridge);
            console.log('[VK] DEBUG: userData =', userData);
            console.log('[VK] DEBUG: username =', userData?.username);
            console.log('[VK] DEBUG: startsWith user_?', userData?.username?.startsWith('user_'));
            
            if (window.isVKMiniApp && typeof vkBridge !== 'undefined' && userData && userData.username && userData.username.startsWith('user_')) {
                console.log('[VK] DEBUG: Condition passed, trying to update username');
                try {
                    const userInfo = await vkBridge.send('VKWebAppGetUserInfo');
                    const fullName = `${userInfo.first_name} ${userInfo.last_name}`.trim();
                    console.log('[VK] DEBUG: fullName from VK =', fullName);
                    if (fullName) {
                        const updRes = await window.apiRequest('/user/update-username', {
                            method: 'POST',
                            body: JSON.stringify({ username: fullName })
                        });
                        const updData = await updRes.json();
                        console.log('[VK] DEBUG: update response =', updData);
                        if (updRes.ok) {
                            userData.username = fullName;
                            updateTopBar();
                            console.log('[VK] Username updated to', fullName);
                        } else {
                            console.error('[VK] Failed to update username:', updData.error);
                        }
                    } else {
                        console.warn('[VK] fullName is empty');
                    }
                } catch (err) {
                    console.error('[VK] Could not update username', err);
                }
            } else {
                console.log('[VK] DEBUG: Condition failed, skip username update');
            }
            
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

// ========== Универсальный apiRequest с Bearer-токеном ==========
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
    if (!window.isTelegramWebApp) return false;
    let initData = null;
    if (window.Telegram && window.Telegram.WebApp) {
        initData = window.Telegram.WebApp.initData;
    }
    if (!initData) {
        console.warn('No initData for Telegram');
        return false;
    }
    console.log('Auto login via Telegram initData...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(`${window.API_BASE}/auth/telegram-auto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                initData: initData,
                referral_code: referralCode
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.sessionToken) {
                localStorage.setItem('sessionToken', data.sessionToken);
                if (data.needusername && typeof showusernameModal === 'function') {
                    showusernameModal(data.userId);
                    return true;
                } else {
                    await loadUserDataByToken(data.sessionToken);
                    if (typeof initIronSourceAds === 'function' && userData && userData.id) {
                        initIronSourceAds(userData.id);
                    }
                }
                return true;
            } else {
                console.error('Auto login failed:', data.error);
            }
        } else {
            console.error('Auto login HTTP error:', response.status);
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

                if (typeof checkFounderAchievement === 'function') {
                    checkFounderAchievement();
                }

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
    detectTelegramWebApp();

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

                if (typeof checkFounderAchievement === 'function') {
                    checkFounderAchievement();
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

    // Telegram Web App – автологин
    if (window.isTelegramWebApp) {
        console.log('checkAuth: trying auto login via Telegram');
        const autoLogged = await autoLoginTelegram();
        if (autoLogged) return true;
    }

    // Если не удалось – показываем модалку
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
                <h1 class="splash-title">${__('common:connection_error', 'Ошибка соединения')}</h1>
                <p class="splash-subtitle">${__('common:server_connection_failed', 'Не удалось подключиться к серверу.')}</p>
                <p style="font-size:14px; margin-bottom:20px;">${__('common:try_again_or_retry', 'Попробуйте позже или нажмите "Повторить"')}</p>
                <button class="btn" id="retryBtn" style="margin-top: 10px;">${__('common:retry', 'Повторить')}</button>
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

            if (currentScreen === 'profile' && typeof profileTab !== 'undefined' && profileTab === 'upgrade') {
                const profileContent = document.getElementById('profileContent');
                if (profileContent && typeof renderSkills === 'function') {
                    renderSkills(profileContent);
                }
            }
            if (currentScreen === 'main') {
                const classData = getCurrentClassData();
                const levelSpan = document.querySelector('.level-display');
                const expSpan = document.querySelector('.exp-display');
                if (levelSpan && expSpan && classData) {
                    const nextExp = Math.floor(80 * Math.pow(classData.level, 1.5));
                    levelSpan.innerText = classData.level;
                    expSpan.innerText = `${classData.exp}/${nextExp}`;
                    const expBarFill = document.querySelector('.exp-bar-fill');
                    if (expBarFill) {
                        const percent = (classData.exp / nextExp) * 100;
                        expBarFill.style.width = `${percent}%`;
                    }
                }
            }
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

    if (screen === 'tasks' && typeof renderTasks === 'undefined') {
        const script = document.createElement('script');
        script.src = '/js/task-up.js';
        script.onload = () => {
            if (typeof renderTasks === 'function') {
                renderTasks();
            } else {
                console.error('renderTasks still not defined after load');
                content.innerHTML = `<p style="color:#aaa;">${__('tasks:load_error', 'Ошибка загрузки заданий. Попробуйте позже.')}</p>`;
            }
        };
        script.onerror = () => {
            console.error('Failed to load task-up.js');
            content.innerHTML = `<p style="color:#aaa;">${__('tasks:load_error_connection', 'Не удалось загрузить задания. Проверьте соединение.')}</p>`;
        };
        document.head.appendChild(script);
        return;
    }

    if (screen === 'tournament' && typeof renderTournament === 'undefined') {
        const script = document.createElement('script');
        script.src = '/js/tournament.js';
        script.onload = () => {
            if (typeof renderTournament === 'function') {
                renderTournament();
            } else {
                console.error('renderTournament still not defined after load');
                content.innerHTML = `<p style="color:#aaa;">${__('tournament:load_error', 'Ошибка загрузки турнира. Попробуйте позже.')}</p>`;
            }
        };
        script.onerror = () => {
            console.error('Failed to load tournament.js');
            content.innerHTML = `<p style="color:#aaa;">${__('tournament:load_error_connection', 'Не удалось загрузить турнир. Проверьте соединение.')}</p>`;
        };
        document.head.appendChild(script);
        return;
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
            if (typeof renderSettings === 'function') {
                renderSettings();
            } else {
                content.innerHTML = `<p style="text-align:center; color:#aaa;">${__('settings:temporarily_unavailable', 'Настройки временно недоступны')}</p>`;
            }
            break;
        case 'market': renderMarket(); break;
        case 'fortune': renderFortune(); break;
        case 'alchemy': renderAlchemy(); break;
        case 'tournament':
            renderTournament();
            break;
        case 'clans':
            if (typeof renderClans === 'function') {
                renderClans();
            } else {
                content.innerHTML = `<p style="color:#aaa;">${__('clans:module_not_loaded', 'Ошибка: модуль кланов не загружен')}</p>`;
            }
            break;
        default: renderMain();
    }

    if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
}

function renderForgeFallback() {
    const content = document.getElementById('content');
    content.innerHTML = `<p style="text-align:center; color:#aaa;">${__('forge:temporarily_unavailable', 'Кузница временно недоступна')}</p>`;
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

// ========== Обработка внешней авторизации ==========
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
                if (modal) {
                    if (typeof window.closeAuthModal === 'function') {
                        window.closeAuthModal();
                    } else {
                        modal.style.display = 'none';
                    }
                }
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

    const googleAuth = urlParams.get('google_auth');
    if (googleAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        handleOAuthSuccess(sessionToken, needusername, userId);
        handled = true;
    }

    const vkAuth = urlParams.get('vk_auth');
    if (vkAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        handleOAuthSuccess(sessionToken, needusername, userId);
        handled = true;
    }

    const telegramAuth = urlParams.get('telegram_auth');
    if (telegramAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        handleOAuthSuccess(sessionToken, needusername, userId);
        handled = true;
    }

    const googleLink = urlParams.get('google_link');
    if (googleLink === 'success') {
        if (typeof showToast === 'function') showToast(__('common:google_account_linked', 'Google аккаунт привязан'), 1500);
        if (currentScreen === 'settings' && typeof renderSettings === 'function') renderSettings();
        handled = true;
    }
    const vkLink = urlParams.get('vk_link');
    if (vkLink === 'success') {
        if (typeof showToast === 'function') showToast(__('common:vk_account_linked', 'VK аккаунт привязан'), 1500);
        if (currentScreen === 'settings' && typeof renderSettings === 'function') renderSettings();
        handled = true;
    }
    const telegramLink = urlParams.get('telegram_link');
    if (telegramLink === 'success') {
        if (typeof showToast === 'function') showToast(__('common:telegram_account_linked', 'Telegram аккаунт привязан'), 1500);
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

// ========== ДЕБАГ-КНОПКА ДЛЯ ID 1 И 2 ==========
(function() {
    let debugButtonAdded = false;

    function addDebugButton() {
        if (debugButtonAdded) return;
        if (!userData || (userData.id !== 1 && userData.id !== 2)) return;
        debugButtonAdded = true;

        const logs = [];
        const maxLogs = 200;

        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        function addLog(type, args) {
            const message = args.map(arg => {
                if (typeof arg === 'object') return JSON.stringify(arg);
                return String(arg);
            }).join(' ');
            logs.unshift(`[${new Date().toLocaleTimeString()}] [${type}] ${message}`);
            if (logs.length > maxLogs) logs.pop();
        }

        console.log = function(...args) { addLog('LOG', args); originalLog.apply(console, args); };
        console.error = function(...args) { addLog('ERROR', args); originalError.apply(console, args); };
        console.warn = function(...args) { addLog('WARN', args); originalWarn.apply(console, args); };

        window.addEventListener('error', function(e) {
            addLog('ERROR', [e.message, 'at', e.filename, 'line', e.lineno]);
        });

        const btn = document.createElement('div');
        btn.innerHTML = '<i class="fas fa-cog"></i>';
        btn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: #00aaff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 9999;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            opacity: 0.7;
            transition: opacity 0.2s;
        `;
        btn.onmouseenter = () => btn.style.opacity = '1';
        btn.onmouseleave = () => btn.style.opacity = '0.7';

        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 10%;
            left: 5%;
            width: 90%;
            height: 80%;
            background: #1a1f2b;
            border: 2px solid #00aaff;
            border-radius: 12px;
            z-index: 10000;
            display: none;
            flex-direction: column;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        `;
        modal.innerHTML = `
            <div style="padding: 10px; background: #2a303c; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: white; font-weight: bold;">${__('debug:title', '📋 Логи отладки')}</span>
                <button id="closeDebugBtn" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">✕</button>
            </div>
            <textarea id="debugLogs" readonly style="flex: 1; background: #232833; color: #ddd; border: none; padding: 10px; font-family: monospace; font-size: 12px; resize: none;"></textarea>
            <div style="padding: 10px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="copyLogsBtn" style="background: #2f3542; border: none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer;">${__('debug:copy', 'Копировать')}</button>
                <button id="clearLogsBtn" style="background: #2f3542; border: none; padding: 6px 12px; border-radius: 6px; color: white; cursor: pointer;">${__('debug:clear', 'Очистить')}</button>
            </div>
        `;
        document.body.appendChild(btn);
        document.body.appendChild(modal);

        function updateModal() {
            const textarea = document.getElementById('debugLogs');
            if (textarea) textarea.value = logs.join('\n');
        }

        btn.addEventListener('click', () => {
            updateModal();
            modal.style.display = 'flex';
        });
        document.getElementById('closeDebugBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
        document.getElementById('copyLogsBtn').addEventListener('click', () => {
            const textarea = document.getElementById('debugLogs');
            textarea.select();
            document.execCommand('copy');
            if (typeof showToast === 'function') showToast(__('debug:copied', 'Логи скопированы'), 1500);
        });
        document.getElementById('clearLogsBtn').addEventListener('click', () => {
            logs.length = 0;
            updateModal();
            if (typeof showToast === 'function') showToast(__('debug:cleared', 'Логи очищены'), 1500);
        });
    }

    let checkInterval = setInterval(() => {
        if (typeof userData !== 'undefined' && userData && userData.id) {
            clearInterval(checkInterval);
            addDebugButton();
        }
    }, 500);
})();
