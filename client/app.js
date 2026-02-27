let tg = window.Telegram.WebApp;
tg.expand();

let userData = null;
let userClasses = [];
let inventory = [];
let currentScreen = 'main';
let currentPower = 0;
let BOT_USERNAME = '';
let avatarsList = null; // для хранения списка аватаров

// Для вкладок в профиле
let profileTab = 'bonuses';

// Для вкладок в торговле
let tradeTab = 'shop';

// Словарь для перевода подклассов
const roleDescriptions = {
    // Воин
    guardian: {
        name: 'Страж',
        passive: 'Живой щит – снижает весь входящий урон на 10%, 20% шанс полностью заблокировать атаку.',
        active: 'Несокрушимость – восстанавливает 20% от максимального HP, снимает отрицательные эффекты.'
    },
    berserker: {
        name: 'Берсерк',//==================Вот
        passive: 'Кровавая ярость – чем меньше HP, тем выше урон (до +50% при HP < 20%). Каждая атака наносит себе 10% от показателя атаки (но не менее 1).',
        active: 'Кровопускание – жертвует 30% от максимального HP, затем наносит урон x3 от атаки.'
    },
    knight: {
        name: 'Рыцарь',
        passive: 'Зеркальный щит – отражает 20% полученного физического урона обратно атакующему.',
        active: 'Щит правосудия – на 2 хода увеличивает отражение урона на 50% и снимает все негативные эффекты.'
    },
    // Ассасин
    assassin: {
        name: 'Убийца',
        passive: 'Смертельное касание – критический урон ×2.5 вместо ×1.5.',
        active: 'Смертельный удар – наносит 350% урона от атаки, гарантированный критический удар.'
    },
    venom_blade: {
        name: 'Ядовитый клинок',
        passive: 'Кумулятивный яд – каждая атака накладывает яд (+2 урона за стак, макс. 30). В конце хода яд наносит урон = стаки ×2.',
        active: 'Ядовитая волна – наносит урон = текущий яд ×5 и сбрасывает стаки.'
    },
    blood_hunter: {
        name: 'Кровавый охотник',
        passive: 'Вампиризм – восстанавливает 20% от нанесённого урона.',
        active: 'Кровавая жатва – на 2 хода усиливает вампиризм до 50% и наносит 150% урона от атаки.'
    },
    // Маг
    pyromancer: {
        name: 'Поджигатель',
        passive: 'Горящие души – каждая атака поджигает цель (+2 урона огнём за стак). В конце хода огонь наносит урон = стаки ×2.',
        active: 'Огненный шторм – наносит 400% урона от атаки и поджигает с силой 50% от урона.'
    },
    cryomancer: {
        name: 'Ледяной маг',
        passive: 'Ледяная кровь – 25% шанс заморозить атакующего на 1 ход при получении урона. Снижает входящий физический урон на 30% (не действует на ультимейты).',
        active: 'Вечная зима – замораживает врага на 1 ход и наносит 200% урона от атаки (удваивается, если враг уже заморожен).'
    },
    illusionist: {
        name: 'Иллюзионист',
        passive: 'Мираж – гарантированно избегает каждой 4-й атаки противника.',
        active: 'Зазеркалье – заставляет врага атаковать самого себя, нанося себе удвоенный урон от своей атаки.'
    }
};

// Базовые характеристики классов
const baseStats = {
    warrior: { hp: 28, atk: 3, def: 4, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 20, atk: 5, def: 1, agi: 5, int: 0, spd: 15, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 18, atk: 2, def: 1, agi: 2, int: 5, spd: 12, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
};

// Словарь перевода названий предметов
const itemNameTranslations = {
    'Rusty Sword': 'Ржавый меч',
    'Wooden Shield': 'Деревянный щит',
    'Leather Helmet': 'Кожаный шлем',
    'Rag Gloves': 'Тряпичные перчатки',
    'Old Boots': 'Старые сапоги',
    'Copper Ring': 'Медное кольцо',
    'Blunt Dagger': 'Затупленный кинжал',
    'Rag Cloak': 'Тряпичный плащ',
    'Burlap Mask': 'Маска из мешковины',
    'Thief Gloves': 'Перчатки вора',
    'Torn Boots': 'Рваные сапоги',
    'Trickster Ring': 'Кольцо ловкача',
    'Broken Staff': 'Сломанный посох',
    'Worn Robe': 'Потёртая мантия',
    'Old Hood': 'Старый капюшон',
    'Rag Mitts': 'Тряпичные рукавицы',
    'Holey Shoes': 'Дырявые башмаки',
    'Novice Ring': 'Кольцо начинающего',
    'Quality Sword': 'Качественный меч',
    'Reinforced Shield': 'Укреплённый щит',
    'Visor Helmet': 'Шлем с забралом',
    'Leather Gloves': 'Кожаные перчатки',
    'Speed Boots': 'Сапоги скорохода',
    'Strength Ring': 'Кольцо силы',
    'Sharp Dagger': 'Острый кинжал',
    'Wanderer Cloak': 'Плащ странника',
    'Stealth Mask': 'Маска скрытности',
    'Nimble Gloves': 'Перчатки проворства',
    'Silent Boots': 'Сапоги бесшумные',
    'Lucky Ring': 'Кольцо удачи',
    'Unity Staff': 'Посох единства',
    'Apprentice Robe': 'Мантия ученика',
    'Wizard Hood': 'Капюшон чародея',
    'Spellcaster Gloves': 'Перчатки заклинателя',
    'Wanderer Boots': 'Сапоги странника',
    'Wisdom Ring': 'Кольцо мудрости',
    'Knights Shield': 'Щит рыцаря',
    'Warrior Sword': 'Меч воина',
    'Heavy Sword': 'Тяжелый меч',
    'Plate Armor': 'Латы',
    'Warrior Helmet': 'Шлем воина',
    'Warrior Gloves': 'Перчатки воина',
    'Warrior Boots': 'Сапоги воина',
    'Warrior Ring': 'Кольцо воина',
    'Health Ring': 'Кольцо здоровья',
    'Assassin Dagger': 'Кинжал ассасина',
    'Poison Blade': 'Отравленный клинок',
    'Shadow Cloak': 'Плащ теней',
    'Assassin Mask': 'Маска убийцы',
    'Assassin Gloves': 'Перчатки ловкача',
    'Speed Boots': 'Сапоги скорости',
    'Assassin Ring': 'Кольцо ловкости',
    'Critical Amulet': 'Амулет крита',
    'Mage Staff': 'Посох мага',
    'Fire Wand': 'Жезл огня',
    'Mage Robe': 'Мантия чародея',
    'Mage Hood': 'Капюшон мага',
    'Mage Gloves': 'Перчатки мага',
    'Mage Boots': 'Сапоги мага',
    'Mana Ring': 'Кольцо маны',
    'Resistance Amulet': 'Амулет сопротивления',
    'Legendary Sword': 'Легендарный меч',
    'Blade of Darkness': 'Клинок тьмы',
    'Elemental Staff': 'Посох стихий',
    'Titan Cuirass': 'Кираса титана',
    'Ghost Cloak': 'Плащ призрака',
    'Archmage Robe': 'Роба архимага',
    'Excalibur': 'Экскалибур',
    'Dagger of Fate': 'Кинжал судьбы',
    'Staff of Gods': 'Посох богов',
    'Ancient Armor': 'Доспех древних',
    'Invisibility Cloak': 'Плащ невидимости',
    'Omnipotence Robe': 'Мантия всевластия'
};

const rarityTranslations = {
    'common': 'Обычное',
    'uncommon': 'Необычное',
    'rare': 'Редкое',
    'epic': 'Эпическое',
    'legendary': 'Легендарное'
};
// Словарь для перевода названий скинов (английские из БД -> русские)
const skinNameTranslations = {
    'skin1': 'Бедолага',
    'skin3': 'Зоркий глаз',
    'skin4': 'Улыбочка',
    'skin5': 'Ночная тень',
    'skin6': 'Стальная броня',
    'skin7': 'Чародей',
    'skin9': 'Магический снежок',
    'skin10': 'Страж королевства'
};

function translateSkinName(englishName) {
    return skinNameTranslations[englishName] || englishName;
}
// Инициализация
async function init() {
    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData: tg.initData })
        });
        const data = await response.json();
        if (data.user) {
            userData = data.user;
            userClasses = data.classes || [];
            inventory = data.inventory || [];
            BOT_USERNAME = data.bot_username || '';
            
            // Загружаем список аватаров и устанавливаем имя файла по avatar_id
            await loadAvatars();
            userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);
            
            updateTopBar();
            showScreen('main');
            checkAdvent();
        } else {
            alert('Ошибка авторизации');
        }
    } catch (e) {
        console.error('Init error:', e);
        alert('Ошибка соединения с сервером');
    }
}

// Функция адвента
async function checkAdvent() {
    try {
        const res = await fetch(`/tasks/advent?tg_id=${userData.tg_id}`);
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

// Функция для определения награды по дню (копия с сервера)
function getAdventReward(day, daysInMonth) {
    const coinExpBase = [50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 100, 100, 120, 120, 150, 150, 200, 200, 250, 250, 300, 300, 400, 400, 500, 500];
    if (day === 7) return { type: 'item', rarity: 'common' };
    if (day === 15) return { type: 'item', rarity: 'rare' };
    if (day === 22) return { type: 'item', rarity: 'epic' };
    if (day === 30) return { type: 'item', rarity: 'legendary' };
    if (daysInMonth === 31 && day === 31) return { type: 'item', rarity: 'legendary' };
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
        const response = await fetch('/auth/refresh', {
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
            
            // Обновляем имя файла аватара в соответствии с новым avatar_id
            await loadAvatars(); // безопасно, если уже загружены – просто вернёт
            userData.avatar = getAvatarFilenameById(userData.avatar_id || 1);
            
            updateTopBar();
            showScreen(currentScreen);
        }
    } catch (e) {
        console.error('Refresh error:', e);
    }
}

function updateTopBar() {
    document.getElementById('coinCount').innerText = userData.coins;
    document.getElementById('diamondCount').innerText = userData.diamonds || 0; // добавить элемент
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
        case 'forge': renderForge(); break;
        case 'tasks': renderTasks(); break;
        case 'rating': renderRating(); break;
        case 'profile': renderProfile(); break;
        default: renderMain();
    }
}
async function loadAvatars() {
    if (avatarsList) return avatarsList;
    try {
        const res = await fetch('/avatars');
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
    let roleBonuses = {
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

    const rolePassives = {
        knight: { reflect: 20 },
        assassin: { vamp: 20 },
        blood_hunter: { vamp: 20 }
    };
    const roleBonus = rolePassives[subclass] || {};
    if (roleBonus.vamp) roleBonuses.vamp += roleBonus.vamp;
    if (roleBonus.reflect) roleBonuses.reflect += roleBonus.reflect;

    let final = {
        hp: baseStatsWithSkills.hp + gearBonuses.hp + roleBonuses.hp,
        atk: baseStatsWithSkills.atk + gearBonuses.atk + roleBonuses.atk,
        def: baseStatsWithSkills.def + gearBonuses.def + roleBonuses.def,
        agi: baseStatsWithSkills.agi + gearBonuses.agi + roleBonuses.agi,
        int: baseStatsWithSkills.int + gearBonuses.int + roleBonuses.int,
        spd: baseStatsWithSkills.spd + gearBonuses.spd + roleBonuses.spd,
        crit: baseStatsWithSkills.crit + gearBonuses.crit + roleBonuses.crit,
        critDmg: baseStatsWithSkills.critDmg + gearBonuses.critDmg + roleBonuses.critDmg,
        vamp: baseStatsWithSkills.vamp + gearBonuses.vamp + roleBonuses.vamp,
        reflect: baseStatsWithSkills.reflect + gearBonuses.reflect + roleBonuses.reflect
    };

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

    return { base: baseStatsWithSkills, gear: gearBonuses, role: roleBonuses, final: final };
}

function calculatePower(className, finalStats) {
    const importance = {
        warrior: {
            hp: 2.0, atk: 2.0, def: 2.0, agi: 1.0, int: 1.0,
            spd: 1.0, crit: 1.5, critDmg: 1.5, vamp: 0.5, reflect: 1.0
        },
        assassin: {
            hp: 1.5, atk: 2.0, def: 1.0, agi: 2.0, int: 1.0,
            spd: 1.5, crit: 2.0, critDmg: 1.5, vamp: 1.5, reflect: 1.0
        },
        mage: {
            hp: 1.5, atk: 2.0, def: 1.0, agi: 1.0, int: 2.0,
            spd: 1.0, crit: 1.5, critDmg: 1.5, vamp: 0.5, reflect: 0.5
        }
    };
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
    return Math.round(power);
}
// Вспомогательная функция для получения русского названия класса
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
    modalTitle.innerText = `Роли класса ${classNameRu}`;
    
    const subclasses = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    }[className] || [];
    
    let html = '';
    subclasses.forEach(sc => {
        const desc = roleDescriptions[sc];
        if (desc) {
            html += `
                <div class="role-card">
                    <h3>${desc.name}</h3>
                    <p><span class="passive">Пассивный:</span> ${desc.passive}</p>
                    <p><span class="active">Активный:</span> ${desc.active}</p>
                </div>
            `;
        }
    });
    modalBody.innerHTML = html;
    
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
    if (item.class_restriction && item.class_restriction !== 'any') {
        classDisplay = item.class_restriction === 'warrior' ? 'Воин' : (item.class_restriction === 'assassin' ? 'Ассасин' : 'Маг');
    } else {
        classDisplay = 'Универсальный';
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

    // Обработчики кнопок (заменяем старые, чтобы избежать дублирования)
    const upgradeBtn = document.getElementById('levelUpUpgradeBtn');
    const laterBtn = document.getElementById('levelUpLaterBtn');
    
    // Удаляем старые обработчики, заменяя кнопки новыми (простой способ)
    const newUpgrade = upgradeBtn.cloneNode(true);
    const newLater = laterBtn.cloneNode(true);
    upgradeBtn.parentNode.replaceChild(newUpgrade, upgradeBtn);
    laterBtn.parentNode.replaceChild(newLater, laterBtn);

    newUpgrade.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    newLater.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Закрытие по крестику
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
            const res = await fetch('/inventory/equip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: newItem.id })
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
    currentPower = calculatePower(currentClass, stats.final);
    updateTopBar();

    const content = document.getElementById('content');
    content.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: stretch; padding: 20px;">
            <!-- Левая колонка (пустая) -->
            <div style="flex: 1;"></div>

            <!-- Центральная колонка с аватаром -->
            <div style="flex: 0 0 auto; text-align: center;">
                <div class="hero-avatar" style="width: 120px; height: 180px; cursor: pointer; margin: 0 auto;" id="avatarClick">
                    <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                </div>
                <h2 style="margin-top: 10px;">${userData.username || 'Игрок'}</h2>
            </div>

            <!-- Правая колонка с круглыми кнопками (уменьшенные) -->
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

        <!-- Информация об уровне и опыте -->
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
                <select id="subclassSelect" style="flex: 1; margin-left: 10px; background-color: #2f3542; color: white; border: 1px solid #00aaff; border-radius: 20px; padding: 8px 12px;">
                    <!-- заполняется динамически -->
                </select>
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
            const res = await fetch('/player/class', {
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
                await fetch('/player/subclass', {
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
        const res = await fetch('/player/subclass', {
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
        const unequipped = classItems.filter(item => !item.equipped);

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
            const itemIcon = getItemIconPath(item) || '';

            html += `
                <div class="inventory-item ${rarityClass}" data-item-id="${item.id}" data-for-sale="${item.for_sale}">
                    <div class="item-icon" style="background-image: url('${itemIcon}'); background-size: cover; background-position: center;"></div>
                    <div class="item-content">
                        <div class="item-name">${itemNameTranslations[item.name] || item.name}</div>
                        <div class="item-stats">${stats.join(' • ')}</div>
                        <div class="item-rarity">${rarityTranslations[item.rarity] || item.rarity}</div>
                        ${saleTag}
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
                        const res = await fetch('/inventory/unequip', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
                        });
                        if (res.ok) {
                            await refreshData();
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
                const actionsDiv = itemDiv.querySelector('.item-actions');

                document.querySelectorAll('.inventory-item .item-actions').forEach(div => {
                    if (div !== actionsDiv) div.style.display = 'none';
                });

                if (actionsDiv.style.display === 'flex') {
                    actionsDiv.style.display = 'none';
                } else {
                    if (forSale) {
                        actionsDiv.innerHTML = `
                            <button class="action-btn unsell-btn" data-item-id="${itemId}">Не продавать</button>
                            <button class="action-btn cancel-btn">Отмена</button>
                        `;
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
                            const res = await fetch('/inventory/unsell', {
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
                    } else {
                       actionsDiv.querySelector('.equip-btn').addEventListener('click', async (e) => {
    e.stopPropagation();
    const item = inventory.find(i => i.id == itemId);
    if (!item) return;

    const equippedInSlot = inventory.find(i => i.equipped && i.type === item.type && i.owner_class === userData.current_class);
    
    if (equippedInSlot) {
        showEquipCompareModal(equippedInSlot, item);
    } else {
                                const res = await fetch('/inventory/equip', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
                                });
                                if (res.ok) {
                                    await refreshData();
                                } else {
                                    const err = await res.json();
                                    alert('Ошибка: ' + err.error);
                                }
                            }
                        });

                        actionsDiv.querySelector('.sell-btn').addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const price = prompt('Введите цену продажи в монетах:');
                            if (price && !isNaN(price) && parseInt(price) > 0) {
                                const res = await fetch('/inventory/sell', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId, price: parseInt(price) })
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
        renderTrade(); // перерисовываем, чтобы обновить стиль кнопок
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

function renderForge() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3 style="text-align:center;">Кузница</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button class="btn" id="forgeSmeltBtn" style="flex:1;">РАСПЛАВИТЬ</button>
            <button class="btn" id="forgeCraftBtn" style="flex:1;">КОВАТЬ</button>
        </div>
        <div id="forgeContent" style="text-align:center; color:#aaa;">
            Здесь будет функционал кузницы (в разработке)
        </div>
    `;
}

function renderRating() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3 style="text-align:center;">Рейтинг игроков</h3>
        <p style="text-align:center; color:#aaa;">Скоро здесь появится таблица лидеров</p>
    `;
}



    // Функция для обновления цены обычного сундука (бесплатно/50)
    async function updateCommonChestPrice() {
        try {
            const res = await fetch(`/user/freechest?tg_id=${userData.tg_id}`);
            const data = await res.json();
            const priceSpan = container.querySelector('[data-chest="common"] .chest-price');
            if (data.freeAvailable) {
                priceSpan.innerText = 'Бесплатно';
            } else {
                priceSpan.innerText = '50';
            }
        } catch (e) {
            console.error('Failed to fetch free chest status', e);
        }
    }

    updateCommonChestPrice();

    container.querySelectorAll('.chest-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const chest = btn.dataset.chest;
            const res = await fetch('/shop/buychest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, chestType: chest })
            });
            const data = await res.json();
            if (data.item) {
                showChestResult(data.item);
                await refreshData();
                // Если это был обычный сундук, обновляем цену
                if (chest === 'common') updateCommonChestPrice();
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
    const classSelect = container.querySelector('#classFilter');
    const raritySelect = container.querySelector('#rarityFilter');

    container.querySelector('#applyFilters').addEventListener('click', () => {
        loadMarketItems(statSelect.value, container);
    });

    await loadMarketItems(statSelect.value, container);
}
async function loadMarketItems(statFilter = 'any', container) {
    const classFilter = container.querySelector('#classFilter').value;
    const rarityFilter = container.querySelector('#rarityFilter').value;
    const params = new URLSearchParams({ class: classFilter, rarity: rarityFilter });
    const res = await fetch('/market?' + params);
    const items = await res.json();
    let filteredItems = items;

    if (statFilter !== 'any') {
        filteredItems = items.filter(item => item[statFilter] > 0);
    }

    const marketItemsDiv = container.querySelector('#marketItems');
    marketItemsDiv.innerHTML = '';

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

    filteredItems.forEach(item => {
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

        marketItemsDiv.innerHTML += `
            <div class="market-item ${rarityClass}" data-item-id="${item.id}">
                <div class="item-icon" style="background-image: url('${iconPath}'); background-size: cover; background-position: center;"></div>
                <div class="item-content">
                    <div class="item-name">${itemNameTranslations[item.name] || item.name}</div>
                    <div class="item-stats">${stats.join(' • ')}</div>
                    <div class="item-rarity">${rarityTranslations[item.rarity] || item.rarity}</div>
                    <div class="item-price">${item.price} <i class="fas fa-coins" style="color: gold;"></i></div>
                    <button class="buy-btn" data-item-id="${item.id}">Купить</button>
                </div>
            </div>
        `;
    });

    container.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const itemId = btn.dataset.itemId;
            if (!confirm('Подтвердите покупку')) return;
            const res = await fetch('/market/buy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, item_id: itemId })
            });
            const data = await res.json();
            if (data.success) {
                alert('Покупка успешна!');
                await refreshData();
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

// ==================== ЗАДАНИЯ ====================

function renderTasks() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3 style="text-align:center; margin-bottom:20px;">Ежедневные задания</h3>
        <div id="tasksList"></div>
    `;

    loadDailyTasks();
}

async function loadDailyTasks() {
    try {
        const res = await fetch(`/tasks/daily/list?tg_id=${userData.tg_id}`);
        const tasks = await res.json();
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';

        tasks.forEach(task => {
            if (task.completed) return; // выполненные не показываем

            const progressPercent = (task.progress / task.target_value) * 100;
            const rewardText = task.reward_type === 'coins' ? `${task.reward_amount} <i class="fas fa-coins" style="color:white;"></i>` : `${task.reward_amount} EXP`;

            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.style.display = 'flex';
            taskCard.style.alignItems = 'center';
            taskCard.style.justifyContent = 'space-between';
            taskCard.innerHTML = `
                <div style="flex: 2;">
                    <div style="font-size: 18px; font-weight: bold;">${task.name}</div>
                    <div style="font-size: 12px; color: #aaa;">${task.description}</div>
                    <div style="margin-top: 8px;">
                        <div style="background-color: #2f3542; height: 6px; border-radius: 3px;">
                            <div style="background-color: #00aaff; width: ${progressPercent}%; height: 100%; border-radius: 3px;"></div>
                        </div>
                        <div style="font-size: 11px; color: #aaa; margin-top: 4px;">${task.progress}/${task.target_value}</div>
                    </div>
                </div>
                <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px;">
                    <span style="font-weight: bold; color: white;">${rewardText}</span>
                </div>
                <div style="flex: 0 0 120px;">
                    <button class="btn claim-task-btn" data-task-id="${task.id}" data-reward-type="${task.reward_type}" data-reward-amount="${task.reward_amount}">ПОЛУЧИТЬ</button>
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
                    const res = await fetch('/tasks/daily/claim', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tg_id: userData.tg_id, task_id: taskId })
                    });
                    const data = await res.json();
                    if (data.error) {
                        alert(data.error);
                    } else {
                        alert(`Вы получили ${rewardAmount} монет!`);
                        loadDailyTasks(); // перезагрузить список
                        refreshData(); // обновить баланс
                    }
                }
            });
        });

    } catch (e) {
        console.error('Error loading daily tasks:', e);
    }
}
// ==================== ПРОФИЛЬ И ВКЛАДКИ ====================

function renderProfile() {
    const content = document.getElementById('content');
   
    // Обновляем задание "Любознательный"
    fetch('/tasks/daily/update/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: userData.tg_id })
    }).catch(err => console.error('Failed to update profile task', err));
    
    
    content.innerHTML = `
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button class="btn profile-tab ${profileTab === 'skins' ? 'active' : ''}" data-tab="skins">Скины</button>
            <button class="btn profile-tab ${profileTab === 'bonuses' ? 'active' : ''}" data-tab="bonuses">Бонусы</button>
            <button class="btn profile-tab ${profileTab === 'upgrade' ? 'active' : ''}" data-tab="upgrade">Улучшить</button>
        </div>
        <div id="profileContent"></div>
    `;

    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            profileTab = e.target.dataset.tab;
            renderProfile(); // перерисовываем весь профиль, чтобы обновить активную кнопку
        });
    });

    // Отрисовываем содержимое текущей вкладки
    renderProfileTab(profileTab);
}
function renderProfileTab(tab) {
    const profileContent = document.getElementById('profileContent');
    if (tab === 'bonuses') {
        renderProfileBonuses(profileContent);
    } else if (tab === 'upgrade') {
        renderSkills(profileContent);
    } else if (tab === 'skins') {
        renderSkins(profileContent);
    }
}

function renderProfileBonuses(container) {
    const currentClass = userData.current_class;
    const classData = getCurrentClassData();
    const stats = calculateClassStats(currentClass, classData, inventory, userData.subclass);

    container.innerHTML = `
        <div class="class-selector" style="margin-bottom: 15px;">
            <button class="class-btn ${currentClass === 'warrior' ? 'active' : ''}" data-class="warrior">Воин</button>
            <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin">Ассасин</button>
            <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage">Маг</button>
        </div>
        <div style="margin-top: 15px;">
            <div><strong>Уровень:</strong> ${classData.level}</div>
            <div><strong>Опыт:</strong> ${classData.exp}</div>
            <div><strong>Очки навыков:</strong> ${classData.skill_points}</div>
        </div>
        <h4 style="margin: 15px 0 5px;">Характеристики</h4>
        <table style="width:100%; border-collapse: collapse;">
            <tr>
                <th style="text-align:left;">Параметр</th>
                <th style="text-align:center;">База</th>
                <th style="text-align:center;">+Снаряжение</th>
                <th style="text-align:center;">+Роль</th>
                <th style="text-align:center;">Итого</th>
            </tr>
            ${renderStatRow('Здоровье (HP)', stats.base.hp, stats.gear.hp, stats.role.hp, stats.final.hp)}
            ${renderStatRow('Атака (ATK)', stats.base.atk, stats.gear.atk, stats.role.atk, stats.final.atk)}
            ${renderStatRow('Защита (DEF)', stats.base.def + '%', stats.gear.def + '%', stats.role.def + '%', stats.final.def + '%')}
            ${renderStatRow('Ловкость (AGI)', stats.base.agi + '%', stats.gear.agi + '%', stats.role.agi + '%', stats.final.agi + '%')}
            ${renderStatRow('Интеллект (INT)', stats.base.int + '%', stats.gear.int + '%', stats.role.int + '%', stats.final.int + '%')}
            ${renderStatRow('Скорость (SPD)', stats.base.spd, stats.gear.spd, stats.role.spd, stats.final.spd)}
            ${renderStatRow('Шанс крита (CRIT)', stats.base.crit + '%', stats.gear.crit + '%', stats.role.crit + '%', stats.final.crit + '%')}
            ${renderStatRow('Крит. урон (CRIT DMG)', (stats.base.critDmg*100).toFixed(1) + '%', (stats.gear.critDmg*100).toFixed(1) + '%', (stats.role.critDmg*100).toFixed(1) + '%', (stats.final.critDmg*100).toFixed(1) + '%')}
            ${renderStatRow('Вампиризм (VAMP)', stats.base.vamp + '%', stats.gear.vamp + '%', stats.role.vamp + '%', stats.final.vamp + '%')}
            ${renderStatRow('Отражение (REFLECT)', stats.base.reflect + '%', stats.gear.reflect + '%', stats.role.reflect + '%', stats.final.reflect + '%')}
        </table>
    `;

    container.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.target.dataset.class;
            if (newClass === currentClass) return;
            const res = await fetch('/player/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
            });
            if (res.ok) {
                userData.current_class = newClass;
                await refreshData();
                renderProfileTab(profileTab);
            }
        });
    });
}

function renderSkills(container) {
    const classData = getCurrentClassData();
    const skillPoints = classData.skill_points;
    const currentClass = userData.current_class;
    const base = baseStats[currentClass] || baseStats.warrior;

    container.innerHTML = `
        <div class="class-selector" style="margin-bottom: 15px;">
            <button class="class-btn ${currentClass === 'warrior' ? 'active' : ''}" data-class="warrior">Воин</button>
            <button class="class-btn ${currentClass === 'assassin' ? 'active' : ''}" data-class="assassin">Ассасин</button>
            <button class="class-btn ${currentClass === 'mage' ? 'active' : ''}" data-class="mage">Маг</button>
        </div>
        <div style="text-align: center; margin: 10px 0; font-size: 18px;">
            Доступно очков навыков: <strong>${skillPoints}</strong>
        </div>
        <div class="skills-list">
            ${renderSkillItem('hp_points', 'Здоровье', 'Увеличивает максимальное здоровье на 2', base.hp + (classData.hp_points || 0) * 2, classData.hp_points || 0, skillPoints)}
            ${renderSkillItem('atk_points', 'Атака', 'Увеличивает базовую атаку на 1', base.atk + (classData.atk_points || 0), classData.atk_points || 0, skillPoints)}
            ${renderSkillItem('def_points', 'Защита', 'Снижает получаемый физический урон на 1% (макс. 70%)', base.def + (classData.def_points || 0), classData.def_points || 0, skillPoints)}
            ${renderSkillItem('dodge_points', 'Ловкость', 'Увеличивает шанс уворота на 1% (макс. 100%)', base.agi + (classData.dodge_points || 0), classData.dodge_points || 0, skillPoints)}
            ${renderSkillItem('int_points', 'Интеллект', 'Усиливает активные навыки на 1%', base.int + (classData.int_points || 0), classData.int_points || 0, skillPoints)}
            ${renderSkillItem('spd_points', 'Скорость', 'Увеличивает скорость (очередность хода) на 1', base.spd + (classData.spd_points || 0), classData.spd_points || 0, skillPoints)}
            ${renderSkillItem('crit_points', 'Шанс крита', 'Увеличивает шанс критического удара на 1% (макс. 100%)', base.crit + (classData.crit_points || 0), classData.crit_points || 0, skillPoints)}
            ${renderSkillItem('crit_dmg_points', 'Крит. урон', 'Увеличивает множитель критического урона на 1% (база ×1.5)', (1.5 + (classData.crit_dmg_points || 0)/100).toFixed(2) + 'x', classData.crit_dmg_points || 0, skillPoints)}
            ${renderSkillItem('vamp_points', 'Вампиризм', 'Восстанавливает % от нанесённого урона', base.vamp + (classData.vamp_points || 0), classData.vamp_points || 0, skillPoints)}
            ${renderSkillItem('reflect_points', 'Отражение', 'Возвращает % полученного урона атакующему', base.reflect + (classData.reflect_points || 0), classData.reflect_points || 0, skillPoints)}
        </div>
    `;

    container.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.target.dataset.class;
            if (newClass === currentClass) return;
            await fetch('/player/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
            });
            userData.current_class = newClass;
            renderSkills(container);
        });
    });

    container.querySelectorAll('.skill-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const stat = e.target.dataset.stat;
            const res = await fetch('/player/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tg_id: userData.tg_id,
                    class: currentClass,
                    stat: stat,
                    points: 1
                })
            });
            const data = await res.json();
            if (data.success) {
                await refreshData();
                renderSkills(container);
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

function renderSkillItem(statName, displayName, description, currentValue, level, skillPoints) {
    return `
        <div class="skill-item">
            <div class="skill-info">
                <div class="skill-name">${displayName}</div>
                <div class="skill-desc">${description}</div>
            </div>
            <div class="skill-value">${currentValue}</div>
            <button class="skill-btn" data-stat="${statName}" ${skillPoints < 1 ? 'disabled' : ''}>+</button>
        </div>
    `;
}

function renderStatRow(label, baseValue, gearValue, roleValue, finalValue) {
    const gearNum = parseFloat(gearValue) || 0;
    const roleNum = parseFloat(roleValue) || 0;
    const gearDisplay = gearNum !== 0 ? `<span style="color:#2ecc71;">+${gearValue}</span>` : '';
    const roleDisplay = roleNum !== 0 ? `<span style="color:#00aaff;">+${roleValue}</span>` : '';
    return `
        <tr>
            <td style="padding: 5px 0;">${label}</td>
            <td style="text-align:center;">${baseValue}</td>
            <td style="text-align:center;">${gearDisplay}</td>
            <td style="text-align:center;">${roleDisplay}</td>
            <td style="text-align:center; font-weight:bold;">${finalValue}</td>
        </tr>
    `;
}

// ==================== СКИНЫ ====================

function renderSkins(container) {
    console.log('Fetching avatars...');
    Promise.all([
        fetch('/avatars').then(res => {
            if (!res.ok) throw new Error('Failed to fetch avatars');
            return res.json();
        }),
        fetch(`/avatars/user/${userData.tg_id}`).then(res => {
            if (!res.ok) throw new Error('Failed to fetch owned avatars');
            return res.json();
        })
    ])
    .then(([allAvatars, ownedIds]) => {
        console.log('All avatars:', allAvatars);
        console.log('Owned ids:', ownedIds);
        const activeAvatarId = userData.avatar_id || 1;
        const ownedSet = new Set(ownedIds);
        ownedSet.add(1); // базовый аватар всегда куплен

        const sortedAvatars = [...allAvatars].sort((a, b) => {
            if (a.id === activeAvatarId) return -1;
            if (b.id === activeAvatarId) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });

        let html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;">';
        sortedAvatars.forEach(avatar => {
            const isActive = avatar.id === activeAvatarId;
            const isOwned = ownedSet.has(avatar.id);
            const priceGold = parseInt(avatar.price_gold, 10) || 0;
            const priceDiamonds = parseInt(avatar.price_diamonds, 10) || 0;

                       let priceHtml = '';
            if (!isOwned) {
                let parts = [];
                if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins" style="color:white;"></i>`);
                if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem" style="color:white;"></i>`);
                if (parts.length > 0) {
                    priceHtml = `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; padding: 2px 0; font-size: 12px; pointer-events: none; z-index: 1;">${parts.join(' + ')}</div>`;
                } else {
                    priceHtml = `<div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; padding: 2px 0; font-size: 12px; pointer-events: none; z-index: 1;">Бесплатно</div>`;
                }
            }

                        html += `
    <div style="position: relative; cursor: pointer;" data-avatar-id="${avatar.id}" data-avatar-filename="${avatar.filename}" data-owned="${isOwned}">
        ${isActive ? '<div style="position: absolute; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.7); color: white; text-align: center; font-weight: bold; z-index: 1; pointer-events: none;">АКТИВНЫЙ</div>' : ''}
        <img src="/assets/${avatar.filename}" style="width: 100%; height: auto; border: ${isActive ? '3px solid #00aaff' : '1px solid #2f3542'}; border-radius: 8px; box-sizing: border-box;">
        ${priceHtml}
    </div>
`;
        });
        html += '</div>';
        container.innerHTML = html;

        container.querySelectorAll('[data-avatar-id]').forEach(div => {
            div.addEventListener('click', () => {
                const avatarId = parseInt(div.dataset.avatarId);
                const avatarFilename = div.dataset.avatarFilename;
                const owned = div.dataset.owned === 'true';
                showSkinModal(avatarId, avatarFilename, owned);
            });
        });
    })
    .catch(err => {
        console.error('Error loading avatars:', err);
        container.innerHTML = '<p style="color:#aaa;">Ошибка загрузки аватаров. Проверьте консоль.</p>';
    });
}
function showSkinModal(avatarId, avatarFilename, owned) {
    const modal = document.getElementById('roleModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    fetch('/avatars')
        .then(res => res.json())
        .then(avatarsList => {
            const avatar = avatarsList.find(a => a.id === avatarId);
            if (!avatar) {
                alert('Аватар не найден');
                return;
            }

            const isActive = avatarId === userData.avatar_id;
            modalTitle.innerText = isActive ? 'Текущий аватар' : (owned ? 'Выберите аватар' : 'Купить аватар');
            
            const priceGold = parseInt(avatar.price_gold, 10) || 0;
            const priceDiamonds = parseInt(avatar.price_diamonds, 10) || 0;

            let priceHtml = '';
            if (!owned && !isActive) {
                let parts = [];
                if (priceGold > 0) parts.push(`${priceGold} <i class="fas fa-coins" style="color:white;"></i>`);
                if (priceDiamonds > 0) parts.push(`${priceDiamonds} <i class="fas fa-gem" style="color:white;"></i>`);
                if (parts.length > 0) {
                    priceHtml = `<p style="color:white;">Цена: ${parts.join(' + ')}</p>`;
                } else {
                    priceHtml = `<p style="color:white;">Бесплатно</p>`;
                }
            }

            modalBody.innerHTML = `
                <div style="text-align: center;">
                    <img src="/assets/${avatarFilename}" style="max-width: 100%; max-height: 300px; border-radius: 10px;">
                    <div style="font-size: 24px; font-weight: bold; color: white; margin: 15px 0 5px;">${translateSkinName(avatar.name)}</div>
                    ${priceHtml}
                    <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                        ${!owned && !isActive ? '<button class="btn" id="buySkin">Купить</button>' : ''}
                        ${owned && !isActive ? '<button class="btn" id="activateSkin">Активировать</button>' : ''}
                        <button class="btn" id="closeSkinModal">Назад</button>
                    </div>
                </div>
            `;
            
            modal.style.display = 'block';
            
            if (!owned && !isActive) {
                document.getElementById('buySkin').addEventListener('click', async () => {
                    const res = await fetch('/avatars/buy', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tg_id: userData.tg_id, avatar_id: avatarId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        await refreshData();
                        modal.style.display = 'none';
                        renderProfileTab('skins');
                    } else {
                        alert('Ошибка: ' + data.error);
                    }
                });
            }
            
            if (owned && !isActive) {
                document.getElementById('activateSkin').addEventListener('click', async () => {
                    const res = await fetch('/player/avatar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ tg_id: userData.tg_id, avatar_id: avatarId })
                    });
                    const data = await res.json();
                    if (data.success) {
                        userData.avatar_id = avatarId;
                        userData.avatar = avatarFilename;
                        modal.style.display = 'none';
                        // Обновляем текущую вкладку скинов
                        renderProfileTab('skins');
                        // Если открыт главный экран – перерисовываем его
                        if (currentScreen === 'main') renderMain();
                        // Если открыт экран экипировки – перерисовываем его
                        if (currentScreen === 'equip') renderEquip();
                    } else {
                        alert('Ошибка при смене аватара');
                    }
                });
            }
            
            document.getElementById('closeSkinModal').addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            const closeBtn = modal.querySelector('.close');
            closeBtn.onclick = () => modal.style.display = 'none';
        })
        .catch(err => {
            console.error('Error loading avatar details:', err);
            alert('Ошибка загрузки данных аватара');
        });
}
// ==================== АДВЕНТ-КАЛЕНДАРЬ ====================

function showAdventCalendar() {
    fetch(`/tasks/advent?tg_id=${userData.tg_id}`)
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
        fetch('/tasks/advent/claim', {
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
            
            const res = await fetch('/tasks/advent/claim', {
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
            
            const res = await fetch('/tasks/daily/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, task_id: taskId, class_choice: classChoice })
            });
            const data = await res.json();
            if (data.error) {
                alert(data.error);
            } else {
                alert(`Вы получили ${expAmount} опыта для класса ${classChoice}!`);
                renderTasks(); // перерисовать список заданий
                refreshData(); // обновить топ-бар и данные классов
            }
        });
    });
    
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = () => modal.style.display = 'none';
}

// ==================== БОЙ ====================

async function startBattle() {
    try {
        const res = await fetch('/battle/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id })
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
            return;
        }
        showBattleScreen(data);
    } catch (error) {
        console.error('Battle start error:', error);
        alert('Ошибка соединения с сервером');
    }
}

function showBattleScreen(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.5';
    });

    const getRoleNameRu = (role) => {
        const roles = {
            guardian: 'Страж', berserker: 'Берсерк', knight: 'Рыцарь',
            assassin: 'Убийца', venom_blade: 'Ядовитый клинок', blood_hunter: 'Кровавый охотник',
            pyromancer: 'Поджигатель', cryomancer: 'Ледяной маг', illusionist: 'Иллюзионист'
        };
        return roles[role] || role;
    };

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header" style="position: relative; display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;">
                <div style="text-align: left;">
                    <div>${userData.username}</div>
                    <div style="font-size: 12px; color: #aaa;">${getClassNameRu(userData.current_class)} (${getRoleNameRu(userData.subclass)})</div>
                </div>
                <div class="battle-timer" id="battleTimer" style="position: absolute; left: 50%; transform: translateX(-50%); background-color: #00aaff; padding: 5px 15px; border-radius: 20px; font-weight: bold;">45</div>
                <div style="text-align: right;">
                    <div>${battleData.opponent.username}</div>
                    <div style="font-size: 12px; color: #aaa;">${getClassNameRu(battleData.opponent.class)} (${getRoleNameRu(battleData.opponent.subclass)})</div>
                </div>
            </div>
            <div class="battle-arena">
                <div class="hero-card">
                    <div style="position: relative; width: 80px; height: 120px; margin: 0 auto;">
                        <img src="/assets/${userData.avatar || 'cat_heroweb.png'}" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                        <div id="hero-animation" class="animation-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none; z-index: 10;"></div>
                    </div>
                    <div class="hp-bar">
                        <div class="hp-fill" id="heroHp" style="width:${(battleData.result.playerHpRemain / battleData.result.playerMaxHp) * 100}%"></div>
                    </div>
                    <div id="heroHpText">${battleData.result.playerHpRemain}/${battleData.result.playerMaxHp}</div>
                    <div class="mana-bar">
                        <div class="mana-fill" id="heroMana" style="width:0%"></div>
                    </div>
                </div>
                <div>VS</div>
                <div class="enemy-card">
                    <div style="position: relative; width: 80px; height: 120px; margin: 0 auto;">
                        <img src="/assets/cat_heroweb.png" alt="hero" style="width:100%; height:100%; object-fit: cover;">
                        <div id="enemy-animation" class="animation-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; display: none; z-index: 10;"></div>
                    </div>
                    <div class="hp-bar">
                        <div class="hp-fill" id="enemyHp" style="width:${(battleData.result.enemyHpRemain / battleData.result.enemyMaxHp) * 100}%"></div>
                    </div>
                    <div id="enemyHpText">${battleData.result.enemyHpRemain}/${battleData.result.enemyMaxHp}</div>
                    <div class="mana-bar">
                        <div class="mana-fill" id="enemyMana" style="width:0%"></div>
                    </div>
                </div>
            </div>
            <div class="battle-log" id="battleLog"></div>
            <div class="battle-controls">
                <button class="speed-btn active" data-speed="1">x1</button>
                <button class="speed-btn" data-speed="2">x2</button>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
        .animation-container img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    `;
    document.head.appendChild(style);

    let turnIndex = 0;
    const turns = battleData.result.turns || [];
    const logContainer = document.getElementById('battleLog');
    let speed = 1;
    let interval;
    let currentAnimationTimeout = null;

    function hideAnimations() {
        if (currentAnimationTimeout) {
            clearTimeout(currentAnimationTimeout);
            currentAnimationTimeout = null;
        }
        const heroAnim = document.getElementById('hero-animation');
        const enemyAnim = document.getElementById('enemy-animation');
        heroAnim.style.display = 'none';
        heroAnim.innerHTML = '';
        enemyAnim.style.display = 'none';
        enemyAnim.innerHTML = '';
    }

    function showAnimation(target, animationFile) {
        hideAnimations();
        const container = document.getElementById(target + '-animation');
        const img = document.createElement('img');
        img.src = `/assets/fight/${animationFile}`;
        container.appendChild(img);
        container.style.display = 'flex';
        currentAnimationTimeout = setTimeout(() => {
            container.style.display = 'none';
            container.innerHTML = '';
            currentAnimationTimeout = null;
        }, 1000);
    }

    function getAnimationForAction(action, isPlayerTurn) {
        action = action.toLowerCase();
        let target = isPlayerTurn ? 'enemy' : 'hero';
        let anim = 'shot.gif';

        if (action.includes('несокрушимость')) {
            anim = 'hill.gif';
            target = isPlayerTurn ? 'hero' : 'enemy';
        } else if (action.includes('кровопускание')) {
            anim = 'crit.gif';
        } else if (action.includes('щит правосудия')) {
            anim = 'shield.gif';
            target = isPlayerTurn ? 'hero' : 'enemy';
        } else if (action.includes('смертельный удар')) {
            anim = 'ultimate.gif';
        } else if (action.includes('ядовитая волна')) {
            anim = 'poison.gif';
        } else if (action.includes('кровавая жатва')) {
            anim = 'crit.gif';
        } else if (action.includes('огненный шторм')) {
            anim = 'fire.gif';
        } else if (action.includes('вечная зима')) {
            anim = 'ice.gif';
        } else if (action.includes('зазеркалье')) {
            anim = 'chara.gif';
        } else if (action.includes('яд разъедает') || action.includes('отравление')) {
            anim = 'poison.gif';
        } else if (action.includes('пламя пожирает') || action.includes('огонь обжигает') || action.includes('горящие души')) {
            anim = 'fire.gif';
        }

        return { target, anim };
    }

    function playTurn() {
        if (turnIndex >= turns.length) {
            clearInterval(interval);
            if (timer) clearInterval(timer);
            hideAnimations();
            showBattleResult(battleData);
            return;
        }
        const turn = turns[turnIndex];
        document.getElementById('heroHp').style.width = (turn.playerHp / battleData.result.playerMaxHp) * 100 + '%';
        document.getElementById('heroHpText').innerText = turn.playerHp + '/' + battleData.result.playerMaxHp;
        document.getElementById('enemyHp').style.width = (turn.enemyHp / battleData.result.enemyMaxHp) * 100 + '%';
        document.getElementById('enemyHpText').innerText = turn.enemyHp + '/' + battleData.result.enemyMaxHp;
        document.getElementById('heroMana').style.width = (turn.playerMana / 100) * 100 + '%';
        document.getElementById('enemyMana').style.width = (turn.enemyMana / 100) * 100 + '%';

        const isPlayerTurn = turn.turn === 'player';
        const { target, anim } = getAnimationForAction(turn.action, isPlayerTurn);
        showAnimation(target, anim);

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = turn.action;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;

        turnIndex++;
    }

    playTurn();
    interval = setInterval(playTurn, 2500 / speed);

    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            speed = parseInt(btn.dataset.speed);
            clearInterval(interval);
            interval = setInterval(playTurn, 1000 / speed);
        });
    });

    let timeLeft = 45;
    const timerEl = document.getElementById('battleTimer');
    const timer = setInterval(() => {
        timeLeft--;
        timerEl.innerText = timeLeft;
        if (timeLeft <= 0) {
            clearInterval(timer);
            clearInterval(interval);
            hideAnimations();
            const playerPercent = battleData.result.playerHpRemain / battleData.result.playerMaxHp;
            const enemyPercent = battleData.result.enemyHpRemain / battleData.result.enemyMaxHp;
            let winner;
            if (playerPercent > enemyPercent) winner = 'player';
            else if (enemyPercent > playerPercent) winner = 'enemy';
            else winner = 'draw';
            showBattleResult({ ...battleData, result: { ...battleData.result, winner } }, true);
        }
    }, 1000);
}
function showBattleResult(battleData, timeOut = false) {
    // +++ НОВЫЙ БЛОК ДЛЯ ЭНЕРГИИ +++
    if (battleData.newEnergy !== undefined) {
        userData.energy = battleData.newEnergy;
        updateTopBar();
    }
    // +++ КОНЕЦ БЛОКА +++

    const winner = battleData.result.winner;
    const isVictory = (winner === 'player');
    const resultText = isVictory ? 'ПОБЕДА' : (winner === 'draw' ? 'НИЧЬЯ' : 'ПОРАЖЕНИЕ');

    const expGain = battleData.reward?.exp || 0;
    const coinGain = battleData.reward?.coins || 0;
    const leveledUp = battleData.reward?.leveledUp || false;
    const newStreak = battleData.reward?.newStreak || 0;

    // Обновляем прогресс заданий после боя
    fetch('/tasks/daily/update/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tg_id: userData.tg_id,
            class_played: userData.current_class,
            is_victory: isVictory
        })
    }).catch(err => console.error('Failed to update battle task', err));

    // Обновляем прогресс задания на получение опыта
    fetch('/tasks/daily/update/exp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tg_id: userData.tg_id, exp_gained: expGain })
    }).catch(err => console.error('Failed to update exp task', err));
    
    // Сбор статистики из turns
    let playerStats = {
        hits: 0, crits: 0, dodges: 0, totalDamage: 0, heal: 0, reflect: 0
    };
    let enemyStats = {
        hits: 0, crits: 0, dodges: 0, totalDamage: 0, heal: 0, reflect: 0
    };

    if (battleData.result.turns && Array.isArray(battleData.result.turns)) {
        battleData.result.turns.forEach(turn => {
            if (turn.turn === 'final') return;
            const action = turn.action;
            const isPlayerTurn = turn.turn === 'player';
            const attackerStats = isPlayerTurn ? playerStats : enemyStats;
            const defenderStats = isPlayerTurn ? enemyStats : playerStats;

            const dmgMatch = action.match(/(?:нанос(?:ит|я)|забирая|выбивая|отнимая|—)\s*(?:<span[^>]*>)?(\d+)(?:<\/span>)?\s*(?:урона|жизней|HP|здоровья)?/i);
            if (dmgMatch) {
                const dmg = parseInt(dmgMatch[1]);
                attackerStats.hits++;
                attackerStats.totalDamage += dmg;
                if (action.includes('КРИТИЧЕСКОГО') || action.includes('крита') || action.includes('крит')) {
                    attackerStats.crits++;
                }
            }

            const dodgeMatch = action.match(/([^\s]+)\s+(?:ловко\s+)?(?:уклоняется|уворачивается|использует неуловимый манёвр)/i);
            if (dodgeMatch) {
                const dodgerName = dodgeMatch[1].trim();
                if (dodgerName === userData.username) {
                    playerStats.dodges++;
                } else {
                    enemyStats.dodges++;
                }
            }

            const healMatch = action.match(/восстанавлива(?:ет|я)\s*(?:<span[^>]*>)?(\d+)(?:<\/span>)?\s*очков? здоровья/i);
            if (healMatch) {
                const heal = parseInt(healMatch[1]);
                attackerStats.heal += heal;
            }

            const reflectMatch = action.match(/отражает\s*(?:<span[^>]*>)?(\d+)(?:<\/span>)?\s*урона/i);
            if (reflectMatch) {
                const reflect = parseInt(reflectMatch[1]);
                defenderStats.reflect += reflect;
            }
        });
    }

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-result" style="padding: 10px;">
            <h2 style="text-align:center; margin-bottom:10px;">${resultText}</h2>
            <p style="text-align:center;">Опыт: ${expGain} | Монеты: ${coinGain} ${leveledUp ? '🎉' : ''}</p>
            ${isVictory && newStreak > 0 ? `<p style="text-align:center; color:#00aaff;">Серия побед: ${newStreak}</p>` : ''}
            
                       <div style="display: flex; gap: 10px; margin-bottom: 15px; justify-content: center;">
                <button class="btn" id="rematchBtn" style="flex: 1;">В бой</button>
                <button class="btn" id="backBtn" style="flex: 1;">Назад</button>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 10px; justify-content: center;">
                <button class="btn result-tab active" id="tabLog" style="flex: 1;">Лог боя</button>
                <button class="btn result-tab" id="tabStats" style="flex: 1;">Статистика</button>
            </div>
            
            <div id="resultContent" style="max-height: 300px; overflow-y: auto; background-color: #232833; padding: 10px; border-radius: 8px;">
                ${battleData.result.log.map(l => `<div class="log-entry">${l}</div>`).join('')}
            </div>
        </div>
    `;

    const resultDiv = document.getElementById('resultContent');
    const tabLog = document.getElementById('tabLog');
    const tabStats = document.getElementById('tabStats');

    tabLog.addEventListener('click', () => {
        tabLog.classList.add('active');
        tabStats.classList.remove('active');
        resultDiv.innerHTML = battleData.result.log.map(l => `<div class="log-entry">${l}</div>`).join('');
    });

    tabStats.addEventListener('click', () => {
        tabLog.classList.remove('active');
        tabStats.classList.add('active');
        resultDiv.innerHTML = `
            <style>
                .stats-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: center;
                    font-size: 14px;
                }
                .stats-table th {
                    color: #00aaff;
                    font-weight: bold;
                    padding-bottom: 8px;
                }
                .stats-table td {
                    padding: 4px 0;
                    border-bottom: 1px solid #2f3542;
                }
                .stats-table .player-col {
                    color: #00aaff;
                    font-weight: bold;
                }
                .stats-table .enemy-col {
                    color: #e74c3c;
                    font-weight: bold;
                }
            </style>
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Игрок</th>
                        <th>Параметр</th>
                        <th>Соперник</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td class="player-col">${playerStats.hits}</td><td>Ударов</td><td class="enemy-col">${enemyStats.hits}</td></tr>
                    <tr><td class="player-col">${playerStats.crits}</td><td>Критов</td><td class="enemy-col">${enemyStats.crits}</td></tr>
                    <tr><td class="player-col">${playerStats.dodges}</td><td>Уклонений</td><td class="enemy-col">${enemyStats.dodges}</td></tr>
                    <tr><td class="player-col">${playerStats.totalDamage}</td><td>Урона</td><td class="enemy-col">${enemyStats.totalDamage}</td></tr>
                    <tr><td class="player-col">${playerStats.heal}</td><td>Исцелено</td><td class="enemy-col">${enemyStats.heal}</td></tr>
                    <tr><td class="player-col">${playerStats.reflect}</td><td>Отражено</td><td class="enemy-col">${enemyStats.reflect}</td></tr>
                </tbody>
            </table>
        `;
    });

    document.getElementById('rematchBtn').addEventListener('click', async () => {
        await refreshData();
        startBattle();
    });

    document.getElementById('backBtn').addEventListener('click', async () => {
        document.querySelectorAll('.menu-item').forEach(item => {
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        await refreshData();
        showScreen('main');
    });
// Обновляем прогресс заданий после боя
fetch('/tasks/daily/update/battle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        tg_id: userData.tg_id,
        class_played: userData.current_class,
        is_victory: isVictory
    })
}).catch(err => console.error('Failed to update battle task', err));
    // Если персонаж получил уровень, показываем модалку
    if (leveledUp) {
        showLevelUpModal(userData.current_class);
    }
}

// Инициализация меню
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

init();
