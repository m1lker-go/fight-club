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

// ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ПОВТОРНЫХ ЗАПРОСОВ ==========
async function fetchWithRetry(url, options, retries = 3, timeout = 40000) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            const response = await fetch(url, { ...options, signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response;
        } catch (err) {
            console.warn(`Attempt ${i+1}/${retries} failed:`, err.message);
            if (i === retries - 1) throw err;
            // Ждём перед следующей попыткой (экспоненциальная задержка)
            await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
        }
    }
}

function addExpToCurrentClass(expGain) {
    const classData = getCurrentClassData();
    if (!classData) return false;

    const oldSkillPoints = classData.skill_points || 0;
    classData.exp += expGain;
    const expNeeded = (level) => Math.floor(80 * Math.pow(level, 1.5));
    let leveledUp = false;

    while (classData.exp >= expNeeded(classData.level)) {
        classData.exp -= expNeeded(classData.level);
        classData.level++;
        let pointsToAdd = 1;
        if (classData.level <= 14) {
            pointsToAdd = 3;
        } else {
            pointsToAdd = 5;
        }
        classData.skill_points = (classData.skill_points || 0) + pointsToAdd;
        leveledUp = true;
    }

    const stats = calculateClassStats(userData.current_class, classData, inventory, userData.subclass);
    currentPower = calculatePower(userData.current_class, stats.final, classData.level);
    updateTopBar();

    if (leveledUp) {
        window.lastSkillPointsGained = classData.skill_points - oldSkillPoints;
    }

    return leveledUp;
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

async function init() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд таймаут запроса

    // Показываем ошибку через 10 секунд, если данные ещё не пришли
    const errorTimer = setTimeout(() => {
        if (!userData) {
            showErrorSplash();
        }
    }, 10000);

    try {
        const response = await fetchWithRetry('https://fight-club-api-4och.onrender.com/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                initData: tg.initData,
                referral_code: referralCode 
            })
        }, 3, 40000); // 3 попытки, таймаут 40 секунд

        clearTimeout(timeoutId);
        clearTimeout(errorTimer);

        const data = await response.json();
        if (data.user) {
            userData = data.user;
            userClasses = data.classes || [];
            inventory = data.inventory || [];
            BOT_USERNAME = data.bot_username || '';

            await loadAvatars();
            userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);

            updateTopBar();
            showScreen('main');
            updateMainMenuNewIcons(); 
            checkAdvent();

            fetch(`https://fight-club-api-4och.onrender.com/tasks/daily/list?tg_id=${userData.tg_id}&_=${Date.now()}`).catch(err => console.error('Failed to refresh daily', err));

            hideSplashScreen();
        } else {
            alert('Ошибка авторизации');
            showErrorSplash();
        }
    } catch (e) {
        clearTimeout(timeoutId);
        clearTimeout(errorTimer);
        console.error('Init error:', e);
        showErrorSplash();
    }
}

async function checkAdvent() {
    try {
        const res = await fetch(`https://fight-club-api-4och.onrender.com/tasks/advent?tg_id=${userData.tg_id}&_=${Date.now()}`);
        const data = await res.json();
        if (data.nextAvailable !== null && data.nextAvailable !== undefined) {
            showAdventCalendar();
        }
    } catch (e) {
        console.error('Advent check error', e);
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
    if (!userData || !userData.tg_id) return;
    try {
        const response = await fetchWithRetry('https://fight-club-api-4och.onrender.com/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id })
        }, 2, 20000); // 2 попытки, таймаут 20 секунд
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
        }
    } catch (e) {
        console.error('Refresh error:', e);
    }
}

function updateTopBar() {
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
        const res = await fetch('https://fight-club-api-4och.onrender.com/avatars');
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

// Функции, которые будут переопределены в screens.js, объявляем глобально
window.renderMain = renderMain;
window.renderEquip = renderEquip;
window.renderTrade = renderTrade;
window.renderMarket = renderMarket;
window.renderRating = renderRating;
window.renderProfile = renderProfile;
window.renderTasks = renderTasks; // уже есть из task-up.js, но оставляем
window.renderSkins = renderSkins;
window.renderSkills = renderSkills;
window.renderProfileBonuses = renderProfileBonuses;

init();
