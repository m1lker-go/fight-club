// app.js – основная логика приложения

let tg = window.Telegram.WebApp;
if (tg) {
    tg.expand();
    tg.ready();
}

const user = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
if (user) {
    window.playerName = user.username || user.first_name || 'Игрок';
} else {
    window.playerName = 'Игрок';
}
console.log('playerName:', window.playerName);

// Реферальный код из startapp (если есть)
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

let profileTab = 'bonuses';
let tradeTab = 'shop';
let ratingTab = 'rating';
let messagesList = [];
let unreadMessagesCount = 0;

// Глобальный базовый URL для API
window.API_BASE = 'https://api.cat-fight.ru';
window.BOT_USERNAME = 'CatFightingBot';
window.GOOGLE_CLIENT_ID = '777033220750-o667o0cfaa2tb9qnnaj95pph70mv20ob.apps.googleusercontent.com';

// ========== УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ЗАПРОСОВ ==========
// Автоматически добавляет user_id и tg_id в тело POST или в URL GET
window.apiRequest = async function(endpoint, options = {}) {
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
    
    if (userData && userData.id) {
        bodyObj.user_id = userData.id;
    }
    if (userData && userData.tg_id) {
        bodyObj.tg_id = userData.tg_id;
    }
    
    const fetchOptions = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    };
    
    if (method === 'GET') {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(bodyObj)) {
            if (value !== undefined && value !== null) {
                params.append(key, value);
            }
        }
        const separator = url.includes('?') ? '&' : '?';
        const finalUrl = url + separator + params.toString();
        return fetch(finalUrl, fetchOptions);
    } else {
        fetchOptions.body = JSON.stringify(bodyObj);
        return fetch(url, fetchOptions);
    }
};

// ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОВТОРНЫХ ЗАПРОСОВ (с использованием apiRequest) ==========
async function fetchWithRetry(url, options, retries = 3, timeout = 40000) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            // Используем apiRequest, если url относительный, иначе прямой fetch
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

// ========== АВТОМАТИЧЕСКИЙ ВХОД ЧЕРЕЗ TELEGRAM (ВНУТРИ WEBAPP) ==========
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
                sessionToken = data.sessionToken;
                if (data.need && typeof showusernameModal === 'function') {
                    showusernameModal(data.userId);
                    return true;
                } else {
                    await loadUserDataByToken(data.sessionToken);
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

// Загрузка данных пользователя по токену (использует apiRequest)
async function loadUserDataByToken(token) {
    try {
        console.log('loadUserDataByToken: fetching profile...');
        const res = await window.apiRequest('/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            console.log('Profile data received, user id:', data.user?.id);
            userData = data.user;
            userClasses = data.userClasses || [];
            inventory = data.inventory || [];
            BOT_USERNAME = data.bot_username || '';
            await loadAvatars();
            userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);
            recalculatePower();
            updateTopBar();
            showScreen('main');
            if (typeof loadMessagesSilent === 'function') loadMessagesSilent();
            updateMainMenuNewIcons();
            checkAdvent();
            hideSplashScreen();
            console.log('loadUserDataByToken: success');
            return true;
        } else {
            console.error('Profile fetch failed:', res.status);
        }
    } catch (e) {
        console.error('Load user data error:', e);
    }
    return false;
}

// ========== УПРАВЛЕНИЕ СЕССИЕЙ И АВТОРИЗАЦИЕЙ ==========
let sessionToken = localStorage.getItem('sessionToken');

async function checkAuth() {
    console.log('checkAuth: sessionToken =', sessionToken);
    if (sessionToken) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        try {
            const res = await window.apiRequest('/auth/profile', {
                headers: { 'Authorization': `Bearer ${sessionToken}` },
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                userData = data.user;
                userClasses = data.userClasses || [];
                inventory = data.inventory || [];
                BOT_USERNAME = data.bot_username || '';
                await loadAvatars();
                userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);
                recalculatePower();
                updateTopBar();
                showScreen('main');
                updateMainMenuNewIcons();
                checkAdvent();
                hideSplashScreen();
                console.log('checkAuth: user logged in via existing token');
                return true;
            } else {
                console.warn('checkAuth: token invalid, removing');
                localStorage.removeItem('sessionToken');
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
        if (autoLogged) {
            return true;
        }
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

async function checkAdvent() {
    if (!userData || !userData.tg_id) return;
    try {
        const res = await window.apiRequest(`/tasks/advent?tg_id=${userData.tg_id}&_=${Date.now()}`);
        const data = await res.json();
        if (data.nextAvailable !== null && data.nextAvailable !== undefined) {
            if (typeof showAdventCalendar === 'function') showAdventCalendar();
        }
    } catch (e) {
        console.error('Advent check error:', e);
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
        const response = await fetchWithRetry('/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, user_id: userData.id })
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
            if (window.updateTradeButtonIcon) window.updateTradeButtonIcon();
        }
    } catch (e) {
        console.error('Refresh error:', e);
    }
}

async function refreshTasksOnly() {
    if (!userData || !userData.id) return;
    try {
        const response = await fetchWithRetry('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ tg_id: userData.tg_id, user_id: userData.id })
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
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.screen === screen) item.classList.add('active');
    });

    const content = document.getElementById('content');
    content.innerHTML = '';

    switch (screen) {
        case 'main': renderMain(); break;
        case 'equip': renderEquip(); break;
        case 'trade': renderTrade(); break;
        case 'messages': renderMessages(); break;   
        case 'forge':
            if (typeof renderForge === 'function') {
                renderForge();
            } else {
                renderForgeFallback();
            }
            break;
        case 'tasks': renderTasks(); break;
        case 'rating': renderRating(); break;
        case 'profile': renderProfile(); break;
        case 'tower': 
            if (typeof loadTowerStatus === 'function') {
                loadTowerStatus();
            } else {
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
                content.innerHTML = '<p style="text-align:center; color:#aaa;">Настройки временно недоступны</p>';
            }
            break;
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
       const res = await window.apiRequest('/avatars');
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

// Инициализация меню и запуск
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


// Функции, которые будут переопределены в screens.js, объявляем глобально
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

// Обработка внешней авторизации (возврат из OAuth-потоков Google, VK, Telegram)
function handleExternalAuth() {
    const urlParams = new URLSearchParams(window.location.search);
    let handled = false;

    // ---- Google OAuth (вход) ----
    const googleAuth = urlParams.get('google_auth');
    if (googleAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        if (sessionToken) {
            localStorage.setItem('sessionToken', sessionToken);
            if (needusername && typeof showusernameModal === 'function') {
                showusernameModal(userId);
            } else {
                window.location.replace(window.location.pathname);
            }
        }
        handled = true;
    }

    // ---- Google OAuth (привязка) ----
    const googleLink = urlParams.get('google_link');
    if (googleLink === 'success') {
        if (typeof showToast === 'function') showToast('Google аккаунт привязан', 1500);
        if (currentScreen === 'settings' && typeof renderSettings === 'function') renderSettings();
        handled = true;
    }

    // ---- VK OAuth (вход) ----
    const vkAuth = urlParams.get('vk_auth');
    if (vkAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        if (sessionToken) {
            localStorage.setItem('sessionToken', sessionToken);
            if (needusername && typeof showusernameModal === 'function') {
                showusernameModal(userId);
            } else {
                window.location.replace(window.location.pathname);
            }
        }
        handled = true;
    }

    // ---- VK OAuth (привязка) ----
    const vkLink = urlParams.get('vk_link');
    if (vkLink === 'success') {
        if (typeof showToast === 'function') showToast('VK аккаунт привязан', 1500);
        if (currentScreen === 'settings' && typeof renderSettings === 'function') renderSettings();
        handled = true;
    }

    // ---- Telegram OAuth (вход) ----
    const telegramAuth = urlParams.get('telegram_auth');
    if (telegramAuth === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        if (sessionToken) {
            localStorage.setItem('sessionToken', sessionToken);
            if (needusername && typeof showusernameModal === 'function') {
                showusernameModal(userId);
            } else {
                window.location.replace(window.location.pathname);
            }
        }
        handled = true;
    }

    // ---- Telegram OAuth (привязка) ----
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

window.updateMessagesBadge = updateMessagesBadge;

// Вызов обработки внешней авторизации перед запуском приложения
handleExternalAuth();

// Запуск приложения
checkAuth();
