let tg = window.Telegram.WebApp;
if (tg) {
    tg.expand();
}

let userData = null;
let userClasses = [];
let inventory = [];
let currentScreen = 'main';
let currentPower = 0;
let BOT_USERNAME = '';
let avatarsList = null;

// Для вкладок в профиле
let profileTab = 'bonuses';

// Для вкладок в торговле
let tradeTab = 'shop';

let ratingTab = 'rating'; // 'rating' или 'power'

// ===== УПРАВЛЕНИЕ ЭКРАНОМ ЗАГРУЗКИ =====
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
        splash.innerHTML = `
            <div class="splash-content">
                <h1 class="splash-title">Ошибка соединения</h1>
                <p class="splash-subtitle">Не удалось подключиться к серверу.</p>
                <p style="font-size:14px; margin-bottom:20px;">Попробуйте позже или нажмите "Повторить"</p>
                <button class="btn" onclick="location.reload()" style="margin-top: 10px;">Повторить</button>
            </div>
        `;
    }
}

// Инициализация с таймаутом
async function init() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд

    try {
        const response = await fetch('https://fight-club-api-4och.onrender.com/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

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
            checkAdvent();

            fetch(`https://fight-club-api-4och.onrender.com/tasks/daily/list?tg_id=${userData.tg_id}&_=${Date.now()}`).catch(err => console.error('Failed to refresh daily', err));

            // Скрываем заставку после успешной загрузки
            hideSplashScreen();
        } else {
            alert('Ошибка авторизации');
            showErrorSplash();
        }
    } catch (e) {
        clearTimeout(timeoutId);
        console.error('Init error:', e);
        if (e.name === 'AbortError') {
            alert('Сервер не отвечает. Попробуйте позже.');
        } else {
            alert('Ошибка соединения с сервером');
        }
        showErrorSplash();
    }
}

// Функция адвента
async function checkAdvent() {
    try {
        const res = await fetch(`https://fight-club-api-4och.onrender.com/tasks/advent?tg_id=${userData.tg_id}`);
        const data = await res.json();
        const { currentDay, mask } = data;
        for (let day = 1; day <= currentDay; day++) {
            if (!(mask & (1 << (day-1)))) {
                showAdventCalendar();
                return;
            }
        }
    } catch (e) {
        console.error('Advent check error', e);
    }
}

// Функция для определения награды по дню
function getAdventReward(day, daysInMonth) {
    const coinExpBase = [50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 100, 100, 120, 120, 150, 150, 200, 200, 250, 250, 300, 300, 400, 400, 500, 500];
    
    // Особые дни с предметами
    if (day === 7) return { type: 'item', rarity: 'common' };
    if (day === 14) return { type: 'item', rarity: 'uncommon' };
    if (day === 22) return { type: 'item', rarity: 'epic' };
    
    // Последний день месяца — легендарный предмет
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

// Функция обновления данных с сервера
async function refreshData() {
    if (!userData || !userData.tg_id) return;
    try {
        const response = await fetch('https://fight-club-api-4och.onrender.com/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id })
        });
        const data = await response.json();
        if (data.user) {
            userData = data.user;
            userClasses = data.classes || [];
            inventory = data.inventory || [];
            BOT_USERNAME = data.bot_username || '';

            await loadAvatars();
            userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);

            recalculatePower(); // пересчёт силы
            showScreen(currentScreen);
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
        default: renderMain();
    }
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

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================
function getCurrentClassData() {
    if (!userData || !userData.current_class) {
        return { level: 1, skill_points: 0, hp_points:0, atk_points:0, def_points:0, res_points:0, spd_points:0, crit_points:0, crit_dmg_points:0, dodge_points:0, acc_points:0, mana_points:0 };
    }
    return userClasses.find(c => c.class === userData.current_class) || { 
        level: 1, skill_points: 0, 
        hp_points: 0, atk_points: 0, def_points: 0, res_points: 0, 
        spd_points: 0, crit_points: 0, crit_dmg_points: 0, 
        dodge_points: 0, acc_points: 0, mana_points: 0 
    };
}

function calculateClassStats(className, classData, inventory, subclass) {
    const base = baseStats[className] || baseStats.warrior;

    let baseStatsWithSkills = {
        hp: base.hp + (classData.hp_points || 0) * 2,
        atk: base.atk + (classData.atk_points || 0),
        def: base.def + (classData.def_points || 0),
        agi: base.agi + (classData.dodge_points || 0),
        int: base.int + (classData.int_points || 0),
        spd: base.spd + (classData.spd_points || 0),
        crit: base.crit + (classData.crit_points || 0),
        critDmg: 1.5 + ((classData.crit_dmg_points || 0) / 100),
        vamp: base.vamp + (classData.vamp_points || 0),
        reflect: base.reflect + (classData.reflect_points || 0)
    };

    let gearBonuses = {
        hp: 0, atk: 0, def: 0, agi: 0, int: 0, spd: 0, crit: 0, critDmg: 0, vamp: 0, reflect: 0
    };

    const equippedItems = inventory.filter(item => item.equipped && item.owner_class === className);
    equippedItems.forEach(item => {
        gearBonuses.hp += item.hp_bonus || 0;
        gearBonuses.atk += item.atk_bonus || 0;
        gearBonuses.def += item.def_bonus || 0;
        gearBonuses.agi += item.agi_bonus || 0;
        gearBonuses.int += item.int_bonus || 0;
        gearBonuses.spd += item.spd_bonus || 0;
        gearBonuses.crit += item.crit_bonus || 0;
        gearBonuses.critDmg += (item.crit_dmg_bonus || 0) / 100;
        gearBonuses.vamp += item.vamp_bonus || 0;
        gearBonuses.reflect += item.reflect_bonus || 0;
    });

    let final = {
        hp: baseStatsWithSkills.hp + gearBonuses.hp,
        atk: baseStatsWithSkills.atk + gearBonuses.atk,
        def: baseStatsWithSkills.def + gearBonuses.def,
        agi: baseStatsWithSkills.agi + gearBonuses.agi,
        int: baseStatsWithSkills.int + gearBonuses.int,
        spd: baseStatsWithSkills.spd + gearBonuses.spd,
        crit: baseStatsWithSkills.crit + gearBonuses.crit,
        critDmg: baseStatsWithSkills.critDmg + gearBonuses.critDmg,
        vamp: baseStatsWithSkills.vamp + gearBonuses.vamp,
        reflect: baseStatsWithSkills.reflect + gearBonuses.reflect
    };

    // Классовые особенности (добавляются к final)
    let classBonus = { hp: 0, atk: 0, def: 0, agi: 0, int: 0, spd: 0, crit: 0, critDmg: 0, vamp: 0, reflect: 0 };

    if (className === 'warrior') {
        const bonusHp = Math.floor(final.def / 5) * 3;
        classBonus.hp = bonusHp;
        final.hp += bonusHp;
    }

    if (className === 'assassin') {
        const bonusSpd = Math.floor(final.agi / 5);
        classBonus.spd = bonusSpd;
        final.spd += bonusSpd;
    }

    if (className === 'mage') {
        const bonusAgi = Math.floor(final.int / 5); // +1 ловкости за 5 интеллекта
        classBonus.agi = bonusAgi;
        final.agi += bonusAgi;
    }

    final.def = Math.min(100, final.def);
    final.agi = Math.min(100, final.agi);
    final.crit = Math.min(100, final.crit);

    final.hp = Math.round(final.hp);
    final.atk = Math.round(final.atk);
    final.spd = Math.round(final.spd);
    final.def = Math.round(final.def * 10) / 10;
    final.agi = Math.round(final.agi * 10) / 10;
    final.int = Math.round(final.int * 10) / 10;
    final.crit = Math.round(final.crit * 10) / 10;
    final.critDmg = Math.round(final.critDmg * 100) / 100;
    final.vamp = Math.round(final.vamp * 10) / 10;
    final.reflect = Math.round(final.reflect * 10) / 10;

    return { base: baseStatsWithSkills, gear: gearBonuses, classBonus, final };
}

// Функция расчёта силы (с учётом уровня)
function calculatePower(className, finalStats, level) {
    const coeff = importance[className] || importance.warrior;
    let power = 0;
    power += finalStats.hp * coeff.hp;
    power += finalStats.atk * coeff.atk * 2;
    power += finalStats.def * coeff.def * 2;
    power += finalStats.agi * coeff.agi * 2;
    power += finalStats.int * coeff.int * 2;
    power += finalStats.spd * coeff.spd * 2;
    power += finalStats.crit * coeff.crit * 3;
    power += (finalStats.critDmg - 1.5) * 100 * coeff.critDmg;
    power += finalStats.vamp * coeff.vamp * 3;
    power += finalStats.reflect * coeff.reflect * 2;
    // Бонус за уровень: +10 за каждый уровень
    power += level * 10;
    return Math.round(power);
}

// Функция переподсчёта силы
function recalculatePower() {
    const classData = getCurrentClassData();
    const stats = calculateClassStats(userData.current_class, classData, inventory, userData.subclass);
    currentPower = calculatePower(userData.current_class, stats.final, classData.level);
    updateTopBar();
}

function getClassNameRu(cls) {
    if (cls === 'warrior') return 'Воин';
    if (cls === 'assassin') return 'Ассасин';
    return 'Маг';
}

function showRoleInfoModal(className) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    const classNameRu = className === 'warrior' ? 'Воин' : (className === 'assassin' ? 'Ассасин' : 'Маг');
    modalTitle.innerText = `Класс ${classNameRu}`;

    // Описание классовой особенности
    let classFeatureHtml = '';
    if (className === 'warrior') {
        classFeatureHtml = `
            <div class="role-card" style="border-left-color: #f39c12;">
                <h3>Особенность класса</h3>
                <p><strong>Стойкость:</strong> за каждые 5 единиц защиты получает +3 к максимальному здоровью.</p>
            </div>
        `;
    } else if (className === 'assassin') {
        classFeatureHtml = `
            <div class="role-card" style="border-left-color: #f39c12;">
                <h3>Особенность класса</h3>
                <p><strong>Стремительность:</strong> за каждые 5 единиц ловкости получает +1 к скорости.</p>
            </div>
        `;
    } else if (className === 'mage') {
        classFeatureHtml = `
            <div class="role-card" style="border-left-color: #f39c12;">
                <h3>Особенность класса</h3>
                <p><strong>Магическая мощь:</strong> за каждые 5 единиц интеллекта получает +1 к ловкости и +2 к регенерации маны за ход.</p>
            </div>
        `;
    }

    const subclasses = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    }[className] || [];

    let rolesHtml = '';
    subclasses.forEach(sc => {
        const desc = roleDescriptions[sc];
        if (desc) {
            rolesHtml += `
                <div class="role-card">
                    <h3>${desc.name}</h3>
                    <p><span class="passive">Пассивный:</span> ${desc.passive}</p>
                    <p><span class="active">Активный:</span> ${desc.active}</p>
                </div>
            `;
        }
    });

    modalBody.innerHTML = classFeatureHtml + rolesHtml;

    modal.style.display = 'block';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    };
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

function showChestResult(item) {
    const modal = document.getElementById('chestResultModal');
    const body = document.getElementById('chestResultBody');

    const stats = [];
    if (item.atk_bonus) stats.push(`АТК+${item.atk_bonus}`);
    if (item.def_bonus) stats.push(`ЗАЩ+${item.def_bonus}`);
    if (item.hp_bonus) stats.push(`ЗДОР+${item.hp_bonus}`);
    if (item.spd_bonus) stats.push(`СКОР+${item.spd_bonus}`);
    if (item.crit_bonus) stats.push(`КРИТ+${item.crit_bonus}%`);
    if (item.crit_dmg_bonus) stats.push(`КР.УРОН+${item.crit_dmg_bonus}%`);
    if (item.agi_bonus) stats.push(`ЛОВ+${item.agi_bonus}%`);
    if (item.int_bonus) stats.push(`ИНТ+${item.int_bonus}%`);
    if (item.vamp_bonus) stats.push(`ВАМП+${item.vamp_bonus}%`);
    if (item.reflect_bonus) stats.push(`ОТР+${item.reflect_bonus}%`);

    const classFolderMap = {
        warrior: 'tank',
        assassin: 'assassin',
        mage: 'mage'
    };
    const typeFileMap = {
        armor: 'armor',
        boots: 'boots',
        helmet: 'helmet',
        weapon: 'weapon',
        accessory: 'ring',
        gloves: 'bracer'
    };

    let iconPath = '';
    if (item.owner_class && item.type) {
        const folder = classFolderMap[item.owner_class];
        const fileType = typeFileMap[item.type];
        if (folder && fileType) {
            iconPath = `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
        }
    }
    const iconHtml = iconPath ? `<img src="${iconPath}" alt="item" style="width:80px; height:80px; object-fit: contain;">` : `<div style="font-size: 64px;">📦</div>`;

    let classDisplay = '';
    if (item.owner_class) {
        classDisplay = item.owner_class === 'warrior' ? 'Воин' : (item.owner_class === 'assassin' ? 'Ассасин' : 'Маг');
    } else {
        classDisplay = 'Неизвестный класс';
    }

    body.innerHTML = `
        <div style="text-align: center;">
            <div style="margin-bottom: 10px;">${iconHtml}</div>
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">${translateSkinName(item.name)}</div>
            <div class="item-rarity rarity-${item.rarity}" style="margin-bottom: 5px;">${rarityTranslations[item.rarity] || item.rarity}</div>
            <div style="color: #aaa; font-size: 14px; margin-bottom: 5px;">Класс: ${classDisplay}</div>
            <div style="color: #aaa; font-size: 14px;">${stats.join(' • ')}</div>
        </div>
    `;

    modal.style.display = 'block';
}

function showLevelUpModal(className) {
    const modal = document.getElementById('levelUpModal');
    const body = document.getElementById('levelUpBody');
    const classNameRu = getClassNameRu(className);
    body.innerHTML = `<p style="text-align:center;">Ваш ${classNameRu} достиг нового уровня!<br>Вам доступны 3 очка навыков!</p>`;

    modal.style.display = 'block';

    const upgradeBtn = document.getElementById('levelUpUpgradeBtn');
    const laterBtn = document.getElementById('levelUpLaterBtn');

    // Удаляем старые обработчики, чтобы не дублировались
    const newUpgrade = upgradeBtn.cloneNode(true);
    const newLater = laterBtn.cloneNode(true);
    upgradeBtn.parentNode.replaceChild(newUpgrade, upgradeBtn);
    laterBtn.parentNode.replaceChild(newLater, laterBtn);

    newUpgrade.addEventListener('click', () => {
        modal.style.display = 'none';
        // Разблокируем меню, так как мы покидаем бой
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        profileTab = 'upgrade';
        showScreen('profile');
    });

    newLater.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

function renderItemColumn(item, isEquipped) {
    if (!item) {
        return `
            <div style="text-align: center;">
                <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #2f3542; border-radius: 8px;"></div>
                <div style="margin: 10px 0;">— пусто —</div>
                <button class="btn equip-compare-btn" style="margin-top: 10px;" data-action="${isEquipped ? 'old' : 'new'}">⬆️ Надеть</button>
            </div>
        `;
    }

    const stats = [];
    if (item.atk_bonus) stats.push(`АТК+${item.atk_bonus}`);
    if (item.def_bonus) stats.push(`ЗАЩ+${item.def_bonus}`);
    if (item.hp_bonus) stats.push(`ЗДОР+${item.hp_bonus}`);
    if (item.spd_bonus) stats.push(`СКОР+${item.spd_bonus}`);
    if (item.crit_bonus) stats.push(`КРИТ+${item.crit_bonus}%`);
    if (item.crit_dmg_bonus) stats.push(`КР.УРОН+${item.crit_dmg_bonus}%`);
    if (item.agi_bonus) stats.push(`ЛОВ+${item.agi_bonus}%`);
    if (item.int_bonus) stats.push(`ИНТ+${item.int_bonus}%`);
    if (item.vamp_bonus) stats.push(`ВАМП+${item.vamp_bonus}%`);
    if (item.reflect_bonus) stats.push(`ОТР+${item.reflect_bonus}%`);

    const rarityClass = `rarity-${item.rarity}`;
    const classFolderMap = {
        warrior: 'tank',
        assassin: 'assassin',
        mage: 'mage'
    };
    const typeFileMap = {
        armor: 'armor',
        boots: 'boots',
        helmet: 'helmet',
        weapon: 'weapon',
        accessory: 'ring',
        gloves: 'bracer'
    };
    const folder = classFolderMap[item.owner_class];
    const fileType = typeFileMap[item.type];
    const iconPath = folder && fileType ? `/assets/equip/${folder}/${folder}-${fileType}-001.png` : '';

    return `
        <div style="text-align: center;">
            <div style="width: 80px; height: 80px; margin: 0 auto;">
                <img src="${iconPath}" style="width:100%; height:100%; object-fit: contain;">
            </div>
            <div style="font-weight: bold; margin-top: 5px;">${translateSkinName(item.name)}</div>
            <div class="${rarityClass}" style="margin: 5px 0;">${rarityTranslations[item.rarity] || item.rarity}</div>
            <div style="font-size: 12px; color: #aaa;">${stats.join(' • ')}</div>
            <button class="btn equip-compare-btn" style="margin-top: 10px;" data-action="${isEquipped ? 'old' : 'new'}">⬆️ Надеть</button>
        </div>
    `;
}

function showEquipCompareModal(oldItem, newItem) {
    const modal = document.getElementById('equipCompareModal');
    const body = document.getElementById('equipCompareBody');
    const closeBtn = modal.querySelector('.close');

    body.innerHTML = `
        <div id="oldItemColumn" style="flex: 1;">${renderItemColumn(oldItem, true)}</div>
        <div id="newItemColumn" style="flex: 1;">${renderItemColumn(newItem, false)}</div>
    `;

    modal.style.display = 'block';

    const oldBtn = body.querySelector('#oldItemColumn .equip-compare-btn');
    const newBtn = body.querySelector('#newItemColumn .equip-compare-btn');

    if (oldBtn) {
        oldBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (newBtn) {
        newBtn.addEventListener('click', async () => {
            const currentClass = document.querySelector('.class-btn.active').dataset.class;
            const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tg_id: userData.tg_id, 
                    item_id: newItem.id,
                    target_class: currentClass
                })
            });
            if (res.ok) {
                await refreshData();
                if (currentScreen === 'equip') renderEquip();
            } else {
                const err = await res.json();
                alert('Ошибка: ' + err.error);
            }
            modal.style.display = 'none';
        });
    }

    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => {
        if (event.target === modal) modal.style.display = 'none';
    };
}

// ==================== ГЛАВНЫЙ ЭКРАН ====================
function renderMain() {
    const classData = getCurrentClassData();
    const currentClass = userData.current_class;
    const level = classData.level;
    const exp = classData.exp;
    const nextExp = Math.floor(80 * Math.pow(level, 1.5));
    const expPercent = nextExp > 0 ? (exp / nextExp) * 100 : 0;

    const stats = calculateClassStats(currentClass, classData, inventory, userData.subclass);
    currentPower = calculatePower(currentClass, stats.final, classData.level);
    updateTopBar();

    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: stretch; padding: 20px;">
            <!-- Левая колонка -->
            <div style="flex: 1;"></div>
            <!-- Центр с аватаром -->
            <div style="flex: 0 0 auto; text-align: center;">
                <div class="hero-avatar" id="avatarClick" style="position: relative; width: 120px; height: 180px; cursor: pointer; margin: 0 auto;">
                    <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white; text-align: center; font-weight: bold; padding: 4px 0; font-size: 14px; pointer-events: none; z-index: 1;">ПРОФИЛЬ</div>
                </div>
                <h2 style="margin-top: 10px;">${userData.username || 'Игрок'}</h2>
            </div>
            <!-- Правая колонка с круглыми кнопками -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 10px; align-items: center;">
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div class="round-button" data-screen="equip" style="width: 50px; height: 50px;">
                        <i class="fas fa-tshirt" style="font-size: 20px;"></i>
                    </div>
                    <span style="font-size: 10px; margin-top: 4px;">Снаряжение</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div class="round-button" data-screen="trade" style="width: 50px; height: 50px;">
                        <i class="fas fa-store" style="font-size: 20px;"></i>
                    </div>
                    <span style="font-size: 10px; margin-top: 4px;">Торговля</span>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div class="round-button" data-screen="forge" style="width: 50px; height: 50px;">
                        <i class="fas fa-hammer" style="font-size: 20px;"></i>
                    </div>
                    <span style="font-size: 10px; margin-top: 4px;">Кузница</span>
                </div>
            </div>
        </div>

        <!-- Информация об уровне -->
        <div style="margin: 20px 20px 0 20px;">
            <div style="display: flex; justify-content: space-between; font-size: 14px;">
                <span>Уровень ${level}</span>
                <span>${exp}/${nextExp} опыта</span>
            </div>
            <div style="background-color: #2f3542; height: 10px; border-radius: 5px; margin-top: 5px;">
                <div style="background-color: #00aaff; width: ${expPercent}%; height: 100%; border-radius: 5px;"></div>
            </div>
        </div>

        <!-- Выбор класса и роли -->
        <div style="margin: 20px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
                <div style="width: 70px; text-align: left; font-weight: bold;">Класс</div>
                <div class="class-selector" style="flex: 1; margin-left: 10px;">
                    <button class="class-btn ${currentClass === 'warrior' ? 'active' : ''}" data-class="warrior">Воин</button>
                    <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin">Ассасин</button>
                    <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage">Маг</button>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <div style="width: 70px; text-align: left; font-weight: bold;">Роль</div>
                <select id="subclassSelect" style="flex: 1; margin-left: 10px; background-color: #2f3542; color: white; border: 1px solid #00aaff; border-radius: 20px; padding: 8px 12px;"></select>
                <i class="fas fa-circle-question" id="roleInfoBtn" style="color: #00aaff; font-size: 24px; margin-left: 10px; cursor: pointer;"></i>
            </div>
        </div>

        <!-- Кнопка боя -->
        <button class="btn" id="fightBtn" style="margin: 0 20px 20px 20px; width: calc(100% - 40px);">Начать бой</button>
    `;

    const subclassSelect = document.getElementById('subclassSelect');
    function updateSubclasses(className) {
        const subclasses = {
            warrior: ['guardian', 'berserker', 'knight'],
            assassin: ['assassin', 'venom_blade', 'blood_hunter'],
            mage: ['pyromancer', 'cryomancer', 'illusionist']
        };
        const options = subclasses[className] || [];
        subclassSelect.innerHTML = options.map(sc => {
            const selected = (userData.subclass === sc) ? 'selected' : '';
            const displayName = roleDescriptions[sc]?.name || sc;
            return `<option value="${sc}" ${selected}>${displayName}</option>`;
        }).join('');
    }
    updateSubclasses(currentClass);

    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.target.dataset.class;
            if (newClass === currentClass) return;
            const res = await fetch('https://fight-club-api-4och.onrender.com/player/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
            });
            if (res.ok) {
                userData.current_class = newClass;
                const firstSubclass = {
                    warrior: 'guardian',
                    assassin: 'assassin',
                    mage: 'pyromancer'
                }[newClass];
                userData.subclass = firstSubclass;
                await fetch('https://fight-club-api-4och.onrender.com/player/subclass', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tg_id: userData.tg_id, subclass: firstSubclass })
                });
                await refreshData();
            }
        });
    });

    subclassSelect.addEventListener('change', async (e) => {
        const newSubclass = e.target.value;
        const res = await fetch('https://fight-club-api-4och.onrender.com/player/subclass', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, subclass: newSubclass })
        });
        if (res.ok) {
            userData.subclass = newSubclass;
            await refreshData();
        }
    });

    document.getElementById('fightBtn').addEventListener('click', () => startBattle());
    document.getElementById('roleInfoBtn').addEventListener('click', () => showRoleInfoModal(currentClass));
    document.getElementById('avatarClick').addEventListener('click', () => showScreen('profile'));

    document.querySelectorAll('.round-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const screen = btn.dataset.screen;
            if (screen) showScreen(screen);
        });
    });
}

// ==================== ЭКИПИРОВКА ====================
function renderEquip() {
    let selectedClass = localStorage.getItem('equipSelectedClass');
    if (!selectedClass || !['warrior', 'assassin', 'mage'].includes(selectedClass)) {
        selectedClass = userData.current_class;
    }

    const classFolderMap = {
        warrior: 'tank',
        assassin: 'assassin',
        mage: 'mage'
    };
    const typeFileMap = {
        armor: 'armor',
        boots: 'boots',
        helmet: 'helmet',
        weapon: 'weapon',
        accessory: 'ring',
        gloves: 'bracer'
    };

    function getItemIconPath(item) {
        if (!item) return '';
        const folder = classFolderMap[item.owner_class];
        const fileType = typeFileMap[item.type];
        if (!folder || !fileType) return '';
        return `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
    }

    function renderInventoryForClass(className) {
        const classItems = inventory.filter(item => 
            item.owner_class === className && 
            (!item.class_restriction || item.class_restriction === 'any' || item.class_restriction === className)
        );
        const equipped = classItems.filter(item => item.equipped);
        const unequipped = classItems.filter(item => !item.equipped && !item.for_sale && !item.in_forge);

        const slotConfig = {
            left: [
                { type: 'helmet', icon: '/assets/helmet.png' },
                { type: 'armor', icon: '/assets/armor.png' },
                { type: 'gloves', icon: '/assets/arm.png' }
            ],
            right: [
                { type: 'weapon', icon: '/assets/weapon.png' },
                { type: 'boots', icon: '/assets/leg.png' },
                { type: 'accessory', icon: '/assets/ring.png' }
            ]
        };

        let html = `
            <div class="equip-layout">
                <div class="class-selector">
                    <button class="class-btn ${className === 'warrior' ? 'active' : ''}" data-class="warrior">Воин</button>
                    <button class="class-btn ${className === 'assassin' ? 'active' : ''}" data-class="assassin">Ассасин</button>
                    <button class="class-btn ${className === 'mage' ? 'active' : ''}" data-class="mage">Маг</button>
                </div>
                <div class="equip-main">
                    <div class="equip-column">
        `;

        slotConfig.left.forEach(slot => {
            const item = equipped.find(i => i.type === slot.type);
            const icon = item ? getItemIconPath(item) : slot.icon;
            html += `
                <div class="equip-slot" data-slot="${slot.type}" data-item-id="${item ? item.id : ''}">
                    <div class="slot-icon" style="background-image: url('${icon}');"></div>
                </div>
            `;
        });

        html += `</div>
                <div class="hero-center">
                    <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                </div>
                <div class="equip-column">
        `;

        slotConfig.right.forEach(slot => {
            const item = equipped.find(i => i.type === slot.type);
            const icon = item ? getItemIconPath(item) : slot.icon;
            html += `
                <div class="equip-slot" data-slot="${slot.type}" data-item-id="${item ? item.id : ''}">
                    <div class="slot-icon" style="background-image: url('${icon}');"></div>
                </div>
            `;
        });

        html += `</div>
                </div>
                <h3>Рюкзак</h3>
                <div class="inventory-container">
                    <div class="inventory-grid">
        `;

        unequipped.forEach(item => {
            const rarityClass = `rarity-${item.rarity}`;
            const stats = [];
            if (item.atk_bonus) stats.push(`АТК+${item.atk_bonus}`);
            if (item.def_bonus) stats.push(`ЗАЩ+${item.def_bonus}`);
            if (item.hp_bonus) stats.push(`ЗДОР+${item.hp_bonus}`);
            if (item.spd_bonus) stats.push(`СКОР+${item.spd_bonus}`);
            if (item.crit_bonus) stats.push(`КРИТ+${item.crit_bonus}%`);
            if (item.crit_dmg_bonus) stats.push(`КР.УРОН+${item.crit_dmg_bonus}%`);
            if (item.agi_bonus) stats.push(`ЛОВ+${item.agi_bonus}%`);
            if (item.int_bonus) stats.push(`ИНТ+${item.int_bonus}%`);
            if (item.vamp_bonus) stats.push(`ВАМП+${item.vamp_bonus}%`);
            if (item.reflect_bonus) stats.push(`ОТР+${item.reflect_bonus}%`);

            const saleTag = item.for_sale ? '<span class="sale-tag">(На продаже)</span>' : '';
            const forgeTag = item.in_forge ? '<span class="forge-tag" style="color:#f39c12;">(В кузнице)</span>' : '';
            const itemIcon = getItemIconPath(item) || '';

            html += `
                <div class="inventory-item ${rarityClass}" data-item-id="${item.id}" data-for-sale="${item.for_sale}" data-in-forge="${item.in_forge}">
                    <div class="item-icon" style="background-image: url('${itemIcon}'); background-size: cover; background-position: center;"></div>
                    <div class="item-content">
                        <div class="item-name">${itemNameTranslations[item.name] || item.name}</div>
                        <div class="item-stats">${stats.join(' • ')}</div>
                        <div class="item-rarity">${rarityTranslations[item.rarity] || item.rarity}</div>
                        ${saleTag}
                        ${forgeTag}
                        <div class="item-actions" style="display: none;"></div>
                    </div>
                </div>
            `;
        });

        html += `</div></div></div>`;
        document.getElementById('content').innerHTML = html;

        document.querySelectorAll('.class-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newClass = e.target.dataset.class;
                localStorage.setItem('equipSelectedClass', newClass);
                renderInventoryForClass(newClass);
            });
        });

        document.querySelectorAll('.equip-slot').forEach(slot => {
            slot.addEventListener('click', async (e) => {
                const itemId = slot.dataset.itemId;
                if (!itemId) return;
                if (confirm('Снять этот предмет?')) {
                    try {
                        const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/unequip', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
                        });
                        if (res.ok) {
                            await refreshData();
                            if (currentScreen === 'equip') renderEquip();
                        } else {
                            alert('Ошибка при снятии');
                        }
                    } catch (e) {
                        alert('Сеть недоступна');
                    }
                }
            });
        });

        document.querySelectorAll('.inventory-item').forEach(itemDiv => {
            itemDiv.addEventListener('click', (e) => {
                if (e.target.classList.contains('action-btn')) return;

                const itemId = itemDiv.dataset.itemId;
                const forSale = itemDiv.dataset.forSale === 'true';
                const inForge = itemDiv.dataset.inForge === 'true';
                const actionsDiv = itemDiv.querySelector('.item-actions');

                document.querySelectorAll('.inventory-item .item-actions').forEach(div => {
                    if (div !== actionsDiv) div.style.display = 'none';
                });

                if (actionsDiv.style.display === 'flex') {
                    actionsDiv.style.display = 'none';
                } else {
                    if (forSale || inForge) {
                        if (forSale) {
                            actionsDiv.innerHTML = `
                                <button class="action-btn unsell-btn" data-item-id="${itemId}">Не продавать</button>
                                <button class="action-btn cancel-btn">Отмена</button>
                            `;
                        } else if (inForge) {
                            actionsDiv.innerHTML = `
                                <button class="action-btn remove-forge-btn" data-item-id="${itemId}">Вернуть из кузницы</button>
                                <button class="action-btn cancel-btn">Отмена</button>
                            `;
                        }
                    } else {
                        actionsDiv.innerHTML = `
                            <button class="action-btn equip-btn" data-item-id="${itemId}">Надеть</button>
                            <button class="action-btn sell-btn" data-item-id="${itemId}">Продать</button>
                        `;
                    }
                    actionsDiv.style.display = 'flex';

                    if (forSale) {
                        actionsDiv.querySelector('.unsell-btn').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/unsell', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
                            });
                            if (res.ok) {
                                await refreshData();
                            } else {
                                alert('Ошибка при снятии с продажи');
                            }
                        });
                        actionsDiv.querySelector('.cancel-btn').addEventListener('click', (e) => {
                            e.stopPropagation();
                            actionsDiv.style.display = 'none';
                        });
                    } else if (inForge) {
                        actionsDiv.querySelector('.remove-forge-btn').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const res = await fetch('https://fight-club-api-4och.onrender.com/forge/remove', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
                            });
                            if (res.ok) {
                                await refreshData();
                            } else {
                                alert('Ошибка при возврате из кузницы');
                            }
                        });
                        actionsDiv.querySelector('.cancel-btn').addEventListener('click', (e) => {
                            e.stopPropagation();
                            actionsDiv.style.display = 'none';
                        });
                    } else {
                        actionsDiv.querySelector('.equip-btn').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const currentClass = document.querySelector('.class-btn.active').dataset.class;
                            const item = inventory.find(i => i.id == itemId);
                            if (!item) return;
                            const equippedInSlot = classItems.find(i => i.equipped && i.type === item.type);
                            if (equippedInSlot) {
                                showEquipCompareModal(equippedInSlot, item);
                            } else {
                                const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/equip', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        tg_id: userData.tg_id, 
                                        item_id: itemId,
                                        target_class: currentClass
                                    })
                                });
                                if (res.ok) {
                                    await refreshData();
                                    if (currentScreen === 'equip') renderEquip();
                                } else {
                                    const err = await res.json();
                                    alert('Ошибка: ' + err.error);
                                }
                            }
                        });

                        actionsDiv.querySelector('.sell-btn').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const currentClass = document.querySelector('.class-btn.active').dataset.class;
                            const item = inventory.find(i => i.id == itemId);
                            if (!item) return;
                            if (item.owner_class !== currentClass) {
                                alert('Этот предмет не принадлежит текущему классу!');
                                return;
                            }
                            const price = prompt('Введите цену продажи в монетах:');
                            if (price && !isNaN(price) && parseInt(price) > 0) {
                                const res = await fetch('https://fight-club-api-4och.onrender.com/inventory/sell', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        tg_id: userData.tg_id, 
                                        item_id: itemId, 
                                        price: parseInt(price) 
                                    })
                                });
                                const data = await res.json();
                                if (data.success) {
                                    alert('Предмет выставлен на маркет');
                                    await refreshData();
                                } else {
                                    alert('Ошибка: ' + data.error);
                                }
                            }
                        });
                    }
                }
            });
        });
    }

    renderInventoryForClass(selectedClass);
}

// ==================== ТОРГОВЛЯ ====================
function renderTrade() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="margin-top: 10px;"></div>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button class="btn ${tradeTab === 'shop' ? 'active' : ''}" id="tradeShopBtn" style="flex:1;">МАГАЗИН</button>
            <button class="btn ${tradeTab === 'market' ? 'active' : ''}" id="tradeMarketBtn" style="flex:1;">МАРКЕТ</button>
        </div>
        <div id="tradeContent"></div>
    `;

    const tradeContent = document.getElementById('tradeContent');

    document.getElementById('tradeShopBtn').addEventListener('click', () => {
        tradeTab = 'shop';
        renderTrade();
    });

    document.getElementById('tradeMarketBtn').addEventListener('click', () => {
        tradeTab = 'market';
        renderTrade();
    });

    if (tradeTab === 'shop') {
        renderShop(tradeContent);
    } else {
        renderMarket(tradeContent);
    }
}

function renderShop(target = null) {
    const container = target || document.getElementById('content');
    container.innerHTML = `
        <div class="chest-list">
            <div class="chest-card">
                <div class="chest-icon">
                    <img src="/assets/common-chess.png" alt="Обычный сундук">
                </div>
                <div class="chest-info">
                    <div class="chest-name">Обычный сундук</div>
                    <div class="chest-desc">Первый в день бесплатно, далее 50 монет</div>
                </div>
                <button class="chest-btn" data-chest="common">
                    <span class="chest-price" id="commonChestPrice">?</span>
                    <i class="fas fa-coins" style="color: white;"></i>
                </button>
            </div>
            <div class="chest-card">
                <div class="chest-icon">
                    <img src="/assets/uncommon-chess.png" alt="Необычный сундук">
                </div>
                <div class="chest-info">
                    <div class="chest-name">Необычный сундук</div>
                    <div class="chest-desc">25% обычный, 65% необычный, 10% редкий</div>
                </div>
                <button class="chest-btn" data-chest="uncommon">
                    <span class="chest-price">250</span>
                    <i class="fas fa-coins" style="color: white;"></i>
                </button>
            </div>
            <div class="chest-card">
                <div class="chest-icon">
                    <img src="/assets/rare-chess.png" alt="Редкий сундук">
                </div>
                <div class="chest-info">
                    <div class="chest-name">Редкий сундук</div>
                    <div class="chest-desc">Шанс получения редкого снаряжения 70%</div>
                </div>
                <button class="chest-btn" data-chest="rare">
                    <span class="chest-price">800</span>
                    <i class="fas fa-coins" style="color: white;"></i>
                </button>
            </div>
            <div class="chest-card">
                <div class="chest-icon">
                    <img src="/assets/epic-chess.png" alt="Эпический сундук">
                </div>
                <div class="chest-info">
                    <div class="chest-name">Эпический сундук</div>
                    <div class="chest-desc">Шанс получения эпического снаряжения 70%</div>
                </div>
                <button class="chest-btn" data-chest="epic">
                    <span class="chest-price">1800</span>
                    <i class="fas fa-coins" style="color: white;"></i>
                </button>
            </div>
            <div class="chest-card">
                <div class="chest-icon">
                    <img src="/assets/leg-chess.png" alt="Легендарный сундук">
                </div>
                <div class="chest-info">
                    <div class="chest-name">Легендарный сундук</div>
                    <div class="chest-desc">Шанс получения легендарного снаряжения 70%</div>
                </div>
                <button class="chest-btn" data-chest="legendary">
                    <span class="chest-price">3500</span>
                    <i class="fas fa-coins" style="color: white;"></i>
                </button>
            </div>
        </div>
    `;

    async function updateCommonChestPrice() {
        try {
            const tgId = Number(userData.tg_id);
            const res = await fetch(`https://fight-club-api-4och.onrender.com/player/freechest?tg_id=${tgId}`);
            const data = await res.json();
            const priceSpan = container.querySelector('[data-chest="common"] .chest-price');
            const coinIcon = container.querySelector('[data-chest="common"] i');

            if (data.freeAvailable) {
                priceSpan.innerText = 'FREE';
                coinIcon.style.display = 'none';
            } else {
                priceSpan.innerText = '100';
                coinIcon.style.display = 'inline-block';
            }
        } catch (e) {
            console.error('Failed to fetch free chest status', e);
        }
    }

    updateCommonChestPrice();

    container.querySelectorAll('.chest-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const chest = btn.dataset.chest;
            const res = await fetch('https://fight-club-api-4och.onrender.com/shop/buychest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, chestType: chest })
            });
            const data = await res.json();
            if (data.item) {
                showChestResult(data.item);
                await refreshData();
                if (chest === 'common') updateCommonChestPrice();

                fetch('https://fight-club-api-4och.onrender.com/tasks/daily/update/chest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tg_id: userData.tg_id, item_rarity: data.item.rarity })
                }).catch(err => console.error('Failed to update chest task', err));
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

async function renderMarket(target = null) {
    const container = target || document.getElementById('content');
    container.innerHTML = `
        <div class="filters">
            <select id="classFilter">
                <option value="any">Любой класс</option>
                <option value="warrior">Воин</option>
                <option value="assassin">Ассасин</option>
                <option value="mage">Маг</option>
            </select>
            <select id="rarityFilter">
                <option value="any">Любая редкость</option>
                <option value="common">Обычное</option>
                <option value="uncommon">Необычное</option>
                <option value="rare">Редкое</option>
                <option value="epic">Эпическое</option>
                <option value="legendary">Легендарное</option>
            </select>
        </div>
        <div style="margin: 10px 0;">
            <select id="statFilterSelect" style="width:100%; background-color: #2f3542; color: white; border: 1px solid #00aaff; border-radius: 20px; padding: 8px 12px;">
                <option value="any">Любая характеристика</option>
                <option value="atk_bonus">АТК</option>
                <option value="def_bonus">ЗАЩ</option>
                <option value="hp_bonus">ЗДОР</option>
                <option value="spd_bonus">СКОР</option>
                <option value="crit_bonus">КРИТ</option>
                <option value="crit_dmg_bonus">КР.УРОН</option>
                <option value="agi_bonus">ЛОВ</option>
                <option value="int_bonus">ИНТ</option>
                <option value="vamp_bonus">ВАМП</option>
                <option value="reflect_bonus">ОТР</option>
            </select>
        </div>
        <button class="btn" id="applyFilters" style="width:100%; margin-bottom:15px;">Применить</button>
        <div class="market-container">
            <div id="marketItems" class="market-grid"></div>
        </div>
    `;

    const statSelect = container.querySelector('#statFilterSelect');
    container.querySelector('#applyFilters').addEventListener('click', () => {
        loadMarketItems(statSelect.value, container);
    });

    await loadMarketItems(statSelect.value, container);
}

async function loadMarketItems(statFilter = 'any', container) {
    const classFilter = container.querySelector('#classFilter').value;
    const rarityFilter = container.querySelector('#rarityFilter').value;
    const params = new URLSearchParams({ class: classFilter, rarity: rarityFilter });
    if (statFilter !== 'any') {
        params.append('stat', statFilter);
    }
    const res = await fetch('https://fight-club-api-4och.onrender.com/market?' + params);
    const items = await res.json();

    const marketItemsDiv = container.querySelector('#marketItems');
    marketItemsDiv.innerHTML = '';

    if (!Array.isArray(items)) {
        console.error('Market returned non-array:', items);
        marketItemsDiv.innerHTML = '<p style="color:#aaa;">Ошибка загрузки маркета</p>';
        return;
    }

    const classFolderMap = {
        warrior: 'tank',
        assassin: 'assassin',
        mage: 'mage'
    };
    const typeFileMap = {
        armor: 'armor',
        boots: 'boots',
        helmet: 'helmet',
        weapon: 'weapon',
        accessory: 'ring',
        gloves: 'bracer'
    };

    function getItemIconPath(item) {
        if (!item) return '';
        const folder = classFolderMap[item.owner_class];
        const fileType = typeFileMap[item.type];
        if (!folder || !fileType) return '';
        return `/assets/equip/${folder}/${folder}-${fileType}-001.png`;
    }

    items.forEach(item => {
        const stats = [];
        if (item.atk_bonus) stats.push(`АТК+${item.atk_bonus}`);
        if (item.def_bonus) stats.push(`ЗАЩ+${item.def_bonus}`);
        if (item.hp_bonus) stats.push(`ЗДОР+${item.hp_bonus}`);
        if (item.spd_bonus) stats.push(`СКОР+${item.spd_bonus}`);
        if (item.crit_bonus) stats.push(`КРИТ+${item.crit_bonus}%`);
        if (item.crit_dmg_bonus) stats.push(`КР.УРОН+${item.crit_dmg_bonus}%`);
        if (item.agi_bonus) stats.push(`ЛОВ+${item.agi_bonus}%`);
        if (item.int_bonus) stats.push(`ИНТ+${item.int_bonus}%`);
        if (item.vamp_bonus) stats.push(`ВАМП+${item.vamp_bonus}%`);
        if (item.reflect_bonus) stats.push(`ОТР+${item.reflect_bonus}%`);

        const rarityClass = `rarity-${item.rarity}`;
        const iconPath = getItemIconPath(item);
        const isOwn = item.seller_id === userData.id;

        const itemDiv = document.createElement('div');
        itemDiv.className = `market-item ${rarityClass}`;
        itemDiv.dataset.itemId = item.id;

        let actionButtonHtml = '';
        if (isOwn) {
            actionButtonHtml = `
                <div style="display: flex; gap: 5px; margin-top: 5px;">
                    <button class="btn edit-price-btn" style="flex:1; padding: 5px; font-size: 11px;">✏️ Цена</button>
                    <button class="btn remove-from-market-btn" style="flex:1; padding: 5px; font-size: 11px;">❌ Убрать</button>
                </div>
            `;
        } else {
            actionButtonHtml = `<button class="buy-btn" data-item-id="${item.id}">Купить</button>`;
        }

        itemDiv.innerHTML = `
            <div class="item-icon" style="background-image: url('${iconPath}'); background-size: cover; background-position: center;"></div>
            <div class="item-content">
                <div class="item-name">${itemNameTranslations[item.name] || item.name}</div>
                <div class="item-stats">${stats.join(' • ')}</div>
                <div class="item-rarity">${rarityTranslations[item.rarity] || item.rarity}</div>
                <div class="item-price">${item.price} <i class="fas fa-coins" style="color: gold;"></i></div>
                ${actionButtonHtml}
            </div>
        `;

        marketItemsDiv.appendChild(itemDiv);
    });

    container.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.itemId;
            if (!confirm('Подтвердите покупку')) return;
            const res = await fetch('https://fight-club-api-4och.onrender.com/market/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
            });
            const data = await res.json();
            if (data.success) {
                alert('Покупка успешна!');
                await refreshData();
                loadMarketItems(statFilter, container);
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });

    container.querySelectorAll('.edit-price-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemDiv = btn.closest('.market-item');
            const itemId = itemDiv.dataset.itemId;
            const currentPrice = itemDiv.querySelector('.item-price').innerText.split(' ')[0];
            const newPrice = prompt('Введите новую цену в монетах:', currentPrice);
            if (!newPrice || isNaN(newPrice) || parseInt(newPrice) <= 0) return;
            const res = await fetch('https://fight-club-api-4och.onrender.com/market/update-price', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId, new_price: parseInt(newPrice) })
            });
            const data = await res.json();
            if (data.success) {
                alert('Цена изменена');
                await refreshData();
                loadMarketItems(statFilter, container);
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });

    container.querySelectorAll('.remove-from-market-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemDiv = btn.closest('.market-item');
            const itemId = itemDiv.dataset.itemId;
            if (!confirm('Снять предмет с продажи?')) return;
            const res = await fetch('https://fight-club-api-4och.onrender.com/market/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
            });
            const data = await res.json();
            if (data.success) {
                alert('Предмет снят с продажи');
                await refreshData();
                loadMarketItems(statFilter, container);
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

// ==================== АДВЕНТ-КАЛЕНДАРЬ И ЗАДАНИЯ ====================
function renderAdventCalendarInContainer(data, container) {
    const { currentDay, daysInMonth, mask } = data;
    let firstUnclaimed = null;
    for (let d = 1; d <= currentDay; d++) {
        if (!(mask & (1 << (d-1)))) {
            firstUnclaimed = d;
            break;
        }
    }

    let html = '<div class="advent-grid">';
    for (let day = 1; day <= daysInMonth; day++) {
        const claimed = mask & (1 << (day-1));
        const available = (day === firstUnclaimed);
        let className = 'advent-day';
        if (claimed) className += ' claimed';
        else if (available) className += ' available';
        else className += ' locked';

        const reward = getAdventReward(day, daysInMonth);
        let iconHtml = '';
        if (reward.type === 'coins') {
            iconHtml = '<i class="fas fa-coins" style="color: gold;"></i>';
        } else if (reward.type === 'exp') {
            iconHtml = '<span style="font-weight:bold; color:#00aaff;">EXP</span>';
        } else if (reward.type === 'item') {
            let color = '#aaa';
            if (reward.rarity === 'uncommon') color = '#2ecc71';
            else if (reward.rarity === 'rare') color = '#2e86de';
            else if (reward.rarity === 'epic') color = '#9b59b6';
            else if (reward.rarity === 'legendary') color = '#f1c40f';
            iconHtml = `<i class="fas fa-tshirt" style="color: ${color};"></i>`;
        }

        html += `<div class="${className}" data-day="${day}">
            <div>${day}</div>
            <div style="font-size: 12px;">${iconHtml}</div>
        </div>`;
    }
    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.advent-day.available').forEach(div => {
        div.addEventListener('click', () => claimAdventDay(parseInt(div.dataset.day), daysInMonth));
    });
}

function renderReferral() {
    const referralDiv = document.createElement('div');
    referralDiv.className = 'task-card referral-card';
    referralDiv.style.display = 'flex';
    referralDiv.style.alignItems = 'center';
    referralDiv.style.justifyContent = 'space-between';
    referralDiv.style.width = '100%';
    referralDiv.style.marginBottom = '12px';
    referralDiv.style.padding = '12px';
    referralDiv.style.boxSizing = 'border-box';

    const referralLink = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code || 'ref'}`;

    referralDiv.innerHTML = `
        <div style="flex: 2; min-width: 0;">
            <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Пригласить друга</div>
            <div style="font-size: 11px; color: #aaa; margin-top: 2px;">Пригласи друга и получи 100 монет</div>
        </div>
        <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px;">
            <span style="font-weight: bold; color: white; font-size: 14px;">100 <i class="fas fa-coins" style="color:white;"></i></span>
        </div>
        <div style="flex: 0 0 100px; display: flex; gap: 5px; justify-content: flex-end;">
            <button class="btn referral-copy-btn" style="padding: 8px 12px; font-size: 12px; width: 45px;" title="Копировать ссылку"><i class="fas fa-copy"></i></button>
            <button class="btn referral-share-btn" style="padding: 8px 12px; font-size: 12px; width: 45px;" title="Поделиться"><i class="fas fa-share-alt"></i></button>
        </div>
    `;

    referralDiv.querySelector('.referral-copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(referralLink).then(() => {
            alert('Ссылка скопирована!');
        }).catch(() => {
            alert('Ошибка копирования');
        });
    });

    referralDiv.querySelector('.referral-share-btn').addEventListener('click', () => {
        if (window.Telegram?.WebApp?.openTelegramLink) {
            window.Telegram.WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}`);
        } else {
            navigator.clipboard.writeText(referralLink).then(() => {
                alert('Ссылка скопирована! Вы можете отправить её другу.');
            });
        }
    });

    return referralDiv;
}

function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="tasks-container">
            <div class="task-card" style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin-bottom: 12px; padding: 12px; box-sizing: border-box;">
                <div style="flex: 2; min-width: 0;">
                    <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Адвент-календарь</div>
                    <div style="font-size: 11px; color: #aaa; margin-top: 2px;">Ежедневные подарки каждый день декабря</div>
                </div>
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 8px; margin: 0 10px;">
                    <i class="fas fa-coins" style="color: white; font-size: 16px;"></i>
                    <span style="font-size: 12px; color: white;">EXP</span>
                    <i class="fas fa-tshirt" style="color: white; font-size: 16px;"></i>
                </div>
                <div style="flex: 0 0 100px; text-align: right;">
                    <button class="btn" id="showAdventBtn" style="padding: 8px 12px; font-size: 12px; width: 100%;">ПОСМОТРЕТЬ</button>
                </div>
            </div>
            <div id="referralPlaceholder"></div>
            <h3 style="text-align:center; margin:10px 0; font-size: 16px;">Ежедневные задания</h3>
            <div id="tasksList"></div>
        </div>
    `;

    const referralPlaceholder = document.getElementById('referralPlaceholder');
    if (referralPlaceholder) {
        referralPlaceholder.appendChild(renderReferral());
    }

    document.getElementById('showAdventBtn').addEventListener('click', () => {
        fetch(`https://fight-club-api-4och.onrender.com/tasks/advent?tg_id=${userData.tg_id}`)
            .then(res => res.json())
            .then(data => showAdventCalendar(data))
            .catch(err => {
                console.error('Error loading advent:', err);
                alert('Ошибка загрузки календаря');
            });
    });

    loadDailyTasks();
}

async function loadDailyTasks() {
    try {
        const res = await fetch(`https://fight-club-api-4och.onrender.com/tasks/daily/list?tg_id=${userData.tg_id}&_=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const tasksData = await res.json();
        if (!Array.isArray(tasksData)) {
            console.error('Ответ не является массивом:', tasksData);
            return;
        }
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';

        tasksData.forEach(task => {
            if (task.completed) return;

            const clampedProgress = Math.min(task.progress, task.target_value);
            const progressPercent = (clampedProgress / task.target_value) * 100;
            const rewardText = task.reward_type === 'coins' 
                ? `${task.reward_amount} <i class="fas fa-coins" style="color:white;"></i>` 
                : `${task.reward_amount} EXP`;

            const translated = dailyTaskTranslations[task.name] || {};
            const displayName = translated.name || task.name;
            const displayDesc = translated.description || task.description;

            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.style.display = 'flex';
            taskCard.style.alignItems = 'center';
            taskCard.style.justifyContent = 'space-between';
            taskCard.style.width = '100%';
            taskCard.style.marginBottom = '12px';
            taskCard.style.padding = '12px';
            taskCard.style.boxSizing = 'border-box';

            taskCard.innerHTML = `
                <div style="flex: 2; min-width: 0;">
                    <div style="font-size: 16px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</div>
                    <div style="font-size: 11px; color: #aaa; margin-top: 2px;">${displayDesc}</div>
                    <div style="margin-top: 8px;">
                        <div style="background-color: #2f3542; height: 5px; border-radius: 3px;">
                            <div style="background-color: #00aaff; width: ${progressPercent}%; height: 100%; border-radius: 3px;"></div>
                        </div>
                        <div style="font-size: 10px; color: #aaa; margin-top: 3px;">${clampedProgress}/${task.target_value}</div>
                    </div>
                </div>
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px; margin: 0 10px;">
                    <span style="font-weight: bold; color: white; font-size: 14px; white-space: nowrap;">${rewardText}</span>
                </div>
                <div style="flex: 0 0 100px; text-align: right;">
                    <button class="btn claim-task-btn" data-task-id="${task.id}" data-reward-type="${task.reward_type}" data-reward-amount="${task.reward_amount}" style="padding: 8px 12px; font-size: 12px; width: 100%;">ПОЛУЧИТЬ</button>
                </div>
            `;
            tasksList.appendChild(taskCard);
        });

        document.querySelectorAll('.claim-task-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const taskId = btn.dataset.taskId;
                const rewardType = btn.dataset.rewardType;
                const rewardAmount = parseInt(btn.dataset.rewardAmount);

                if (rewardType === 'exp') {
                    claimDailyExp(taskId, rewardAmount);
                } else {
                    const res = await fetch('https://fight-club-api-4och.onrender.com/tasks/daily/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tg_id: userData.tg_id, task_id: taskId })
                    });
                    const data = await res.json();
                    if (data.error) {
                        alert(data.error);
                    } else {
                        alert(`Вы получили ${rewardAmount} монет!`);
                        loadDailyTasks();
                        refreshData();
                    }
                }
            });
        });

    } catch (e) {
        console.error('Error loading daily tasks:', e);
    }
}


function renderRating() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="margin-top: 10px;"></div>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button class="btn ${ratingTab === 'rating' ? 'active' : ''}" id="ratingTabBtn" style="flex:1;"><i class="fas fa-trophy"></i> РЕЙТИНГ</button>
            <button class="btn ${ratingTab === 'power' ? 'active' : ''}" id="powerTabBtn" style="flex:1;"><i class="fas fa-fist-raised"></i> СИЛА</button>
        </div>
        <div id="ratingContent"></div>
    `;

    document.getElementById('ratingTabBtn').addEventListener('click', () => {
        ratingTab = 'rating';
        renderRating();
        loadRatingData('rating');
    });

    document.getElementById('powerTabBtn').addEventListener('click', () => {
        ratingTab = 'power';
        renderRating();
        loadRatingData('power');
    });

    loadRatingData(ratingTab);
}

async function loadRatingData(type) {
    const container = document.getElementById('ratingContent');
    container.innerHTML = '<p style="text-align:center;">Загрузка...</p>';

    try {
        const res = await fetch(`https://fight-club-api-4och.onrender.com/rank/${type}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error('Invalid data');

        let html = '<table style="width:100%; border-collapse: collapse; font-size: 14px;">';
        html += '<tr><th>#</th><th>Игрок</th><th>Класс</th><th>Очки</th></tr>';
        data.forEach((item, index) => {
            const className = item.class === 'warrior' ? 'Воин' : (item.class === 'assassin' ? 'Ассасин' : 'Маг');
            const points = type === 'rating' ? item.rating : item.power;
            html += `<tr>
                <td style="padding: 8px 0; text-align:center;">${index + 1}</td>
                <td>${item.username}</td>
                <td>${className}</td>
                <td style="text-align:center;">${points}</td>
            </tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    } catch (e) {
        console.error('Error loading rating:', e);
        container.innerHTML = '<p style="color:#aaa; text-align:center;">Ошибка загрузки</p>';
    }
}

// ==================== КУЗНИЦА ====================
function renderForge() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="forge-container">
            <div class="forge-banner">
                <img src="/assets/banner_forge.png" alt="Кузница" style="width: 100%; height: auto; display: block;">
            </div>
            <div style="display: flex; gap: 10px; margin: 20px 0;">
                <button class="btn forge-tab active" data-forge-tab="forge">Ковать</button>
                <button class="btn forge-tab" data-forge-tab="smelt">Расплавить</button>
            </div>
            <div id="forgeContent"></div>
        </div>
    `;

    document.querySelectorAll('.forge-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.forge-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// ==================== АДВЕНТ-КАЛЕНДАРЬ (функции) ====================
function showAdventCalendar() {
    fetch(`https://fight-club-api-4och.onrender.com/tasks/advent?tg_id=${userData.tg_id}`)
        .then(res => res.json())
        .then(data => {
            renderAdventCalendar(data);
        })
        .catch(err => {
            console.error(err);
            alert('Ошибка загрузки календаря');
        });
}

function renderAdventCalendar(data) {
    const { currentDay, daysInMonth, mask } = data;
    const content = document.getElementById('content');

    let firstUnclaimed = null;
    for (let d = 1; d <= currentDay; d++) {
        if (!(mask & (1 << (d-1)))) {
            firstUnclaimed = d;
            break;
        }
    }

    let html = '<h3 style="text-align:center;">Адвент-календарь</h3><div class="advent-grid">';
    for (let day = 1; day <= daysInMonth; day++) {
        const claimed = mask & (1 << (day-1));
        const available = (day === firstUnclaimed);
        let className = 'advent-day';
        if (claimed) className += ' claimed';
        else if (available) className += ' available';
        else className += ' locked';

        const reward = getAdventReward(day, daysInMonth);
        let iconHtml = '';
        if (reward.type === 'coins') {
            iconHtml = '<i class="fas fa-coins" style="color: gold;"></i>';
        } else if (reward.type === 'exp') {
            iconHtml = '<span style="font-weight:bold; color:#00aaff;">EXP</span>';
        } else if (reward.type === 'item') {
            let color = '#aaa';
            if (reward.rarity === 'uncommon') color = '#2ecc71';
            else if (reward.rarity === 'rare') color = '#2e86de';
            else if (reward.rarity === 'epic') color = '#9b59b6';
            else if (reward.rarity === 'legendary') color = '#f1c40f';
            iconHtml = `<i class="fas fa-tshirt" style="color: ${color};"></i>`;
        }

        html += `<div class="${className}" data-day="${day}">
            <div>${day}</div>
            <div style="font-size: 12px;">${iconHtml}</div>
        </div>`;
    }
    html += '</div><button class="btn" id="backFromAdvent">Назад</button>';
    content.innerHTML = html;

    document.querySelectorAll('.advent-day.available').forEach(div => {
        div.addEventListener('click', () => claimAdventDay(parseInt(div.dataset.day), daysInMonth));
    });

    document.getElementById('backFromAdvent').addEventListener('click', () => renderTasks());
}

function claimAdventDay(day, daysInMonth) {
    const reward = getAdventReward(day, daysInMonth);

    if (reward.type === 'exp') {
        showClassChoiceModal(day, reward.amount);
    } else {
        fetch('https://fight-club-api-4och.onrender.com/tasks/advent/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id, day })
        })
        .then(res => res.json())
        .then(data => {
            if (data.error) alert(data.error);
            else {
                alert(`Вы получили: ${data.reward}`);
                showAdventCalendar();
                refreshData();
            }
        })
        .catch(err => alert('Ошибка: ' + err));
    }
}

function showClassChoiceModal(day, expAmount) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Выберите класс';
    modalBody.innerHTML = `
        <p>Вы получили ${expAmount} опыта. Какому классу хотите его вручить?</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
            <button class="btn class-choice" data-class="warrior">Воин</button>
            <button class="btn class-choice" data-class="assassin">Ассасин</button>
            <button class="btn class-choice" data-class="mage">Маг</button>
        </div>
    `;

    modal.style.display = 'block';

    const classButtons = modalBody.querySelectorAll('.class-choice');
    classButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const classChoice = e.target.dataset.class;
            modal.style.display = 'none';

            const res = await fetch('https://fight-club-api-4och.onrender.com/tasks/advent/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, day, classChoice })
            });
            const data = await res.json();
            if (data.error) alert(data.error);
            else {
                alert(`Вы получили: ${data.reward}`);
                showAdventCalendar();
                refreshData();
            }
        });
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

function claimDailyExp(taskId, expAmount) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');

    modalTitle.innerText = 'Выберите класс';
    modalBody.innerHTML = `
        <p>Вы получили ${expAmount} опыта. Какому классу хотите его вручить?</p>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 15px;">
            <button class="btn class-choice" data-class="warrior">Воин</button>
            <button class="btn class-choice" data-class="assassin">Ассасин</button>
            <button class="btn class-choice" data-class="mage">Маг</button>
        </div>
    `;

    modal.style.display = 'block';

    const classButtons = modalBody.querySelectorAll('.class-choice');
    classButtons.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const classChoice = e.target.dataset.class;
            modal.style.display = 'none';

            const res = await fetch('https://fight-club-api-4och.onrender.com/tasks/daily/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    tg_id: userData.tg_id, 
                    task_id: taskId, 
                    class_choice: classChoice 
                })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                alert(`Вы получили ${expAmount} опыта для класса ${classChoice}!`);
                renderTasks();
                refreshData();
            }
        });
    });

    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

// Инициализация меню и запуск
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

init();
