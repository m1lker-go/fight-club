let tg = window.Telegram.WebApp;
tg.expand();

let userData = null;
let userClasses = [];
let inventory = [];
let currentScreen = 'main';
let currentPower = 0;
let BOT_USERNAME = '';

// Словарь для перевода подклассов
const roleDescriptions = {
    // Воин
    guardian: {
        name: 'Страж',
        passive: 'Живой щит – снижает весь входящий урон на 10%, 20% шанс полностью заблокировать атаку.',
        active: 'Несокрушимость – восстанавливает 20% от максимального HP, снимает отрицательные эффекты.'
    },
    berserker: {
        name: 'Берсерк',
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
                // Есть доступная награда
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
            BOT_USERNAME = data.bot_username || ''; // ← добавить
            updateTopBar();
            showScreen(currentScreen);
        }
    } catch (e) {
        console.error('Refresh error:', e);
    }
}

function updateTopBar() {
    document.getElementById('coinCount').innerText = userData.coins;
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
        case 'shop': renderShop(); break;
        case 'market': renderMarket(); break;
        case 'tasks': renderTasks(); break;
        case 'profile': renderProfile(); break;
        case 'skills': renderSkills(); break;
        default: renderMain();
    }
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
        <div style="text-align: center; padding: 20px;">
            <div class="hero-avatar" style="width: 120px; height: 180px; margin: 20px auto;">
                <img src="/assets/cat_heroweb.png" alt="hero" style="width:100%; height:100%;">
            </div>
            <h2>${userData.username || 'Игрок'}</h2>
            
            <div style="margin: 15px 0; text-align: left;">
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <span>Уровень ${level}</span>
                    <span>${exp}/${nextExp} опыта</span>
                </div>
                <div style="background-color: #2f3542; height: 10px; border-radius: 5px; margin-top: 5px;">
                    <div style="background-color: #00aaff; width: ${expPercent}%; height: 100%; border-radius: 5px;"></div>
                </div>
            </div>
            
            <div style="margin: 20px 0;">
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
            
            <button class="btn" id="fightBtn" style="margin-top: 20px;">Начать бой</button>
        </div>
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
                    <img src="/assets/cat_heroweb.png" alt="hero" style="width:100%; height:100%;">
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
        <h3 style="text-align:center;">Торговля</h3>
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button class="btn" id="tradeShopBtn" style="flex:1;">МАГАЗИН</button>
            <button class="btn" id="tradeMarketBtn" style="flex:1;">МАРКЕТ</button>
        </div>
        <div id="tradeContent"></div>
    `;
    
    const tradeContent = document.getElementById('tradeContent');
    
    document.getElementById('tradeShopBtn').addEventListener('click', () => {
        renderShop(tradeContent);
    });
    
    document.getElementById('tradeMarketBtn').addEventListener('click', () => {
        renderMarket(tradeContent);
    });
    
    // По умолчанию показываем магазин
    renderShop(tradeContent);
}
// ==================== КУЗНИЦА ====================
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
    // Пока обработчики не нужны
}
// ==================== РЕЙТИНГ ====================
function renderRating() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h3 style="text-align:center;">Рейтинг игроков</h3>
        <p style="text-align:center; color:#aaa;">Скоро здесь появится таблица лидеров</p>
    `;
}
// ==================== МАГАЗИН СУНДУКОВ ====================
function renderShop(target = null) {
    const container = target || document.getElementById('content');
    container.innerHTML = `
        <h3 style="text-align: center; margin-bottom: 20px;">МАГАЗИН</h3>
        <div class="chest-list">
            <div class="chest-card">
                <div class="chest-icon">
                    <img src="/assets/rare-chess.png" alt="Редкий сундук">
                </div>
                <div class="chest-info">
                    <div class="chest-name">Редкий сундук</div>
                    <div class="chest-desc">Шанс получения редкого снаряжения 70%</div>
                </div>
                <button class="chest-btn" data-chest="rare">
                    <span class="chest-price">100</span>
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
                    <span class="chest-price">500</span>
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
                    <span class="chest-price">2000</span>
                    <i class="fas fa-coins" style="color: white;"></i>
                </button>
            </div>
        </div>
    `;

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
            } else {
                alert('Ошибка: ' + data.error);
            }
        });
    });
}

// ==================== МАРКЕТ ====================
async function renderMarket(target = null) {
    const container = target || document.getElementById('content');
    container.innerHTML = `
        <h3 style="text-align: center; margin-bottom: 15px;">Маркет</h3>
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
            <button class="btn" id="applyFilters">Применить</button>
        </div>
        <div class="filter-stats" id="statFilters">
            <button class="stat-filter-btn" data-stat="any">Любой</button>
            <button class="stat-filter-btn" data-stat="atk_bonus">АТК</button>
            <button class="stat-filter-btn" data-stat="def_bonus">ЗАЩ</button>
            <button class="stat-filter-btn" data-stat="hp_bonus">ЗДОР</button>
            <button class="stat-filter-btn" data-stat="spd_bonus">СКОР</button>
            <button class="stat-filter-btn" data-stat="crit_bonus">КРИТ</button>
            <button class="stat-filter-btn" data-stat="crit_dmg_bonus">КР.УРОН</button>
            <button class="stat-filter-btn" data-stat="agi_bonus">ЛОВ</button>
            <button class="stat-filter-btn" data-stat="int_bonus">ИНТ</button>
            <button class="stat-filter-btn" data-stat="vamp_bonus">ВАМП</button>
            <button class="stat-filter-btn" data-stat="reflect_bonus">ОТР</button>
        </div>
        <div class="market-container">
            <div id="marketItems" class="market-grid"></div>
        </div>
    `;

    let activeStat = 'any';

    container.querySelectorAll('.stat-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            container.querySelectorAll('.stat-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeStat = btn.dataset.stat;
            loadMarketItems(activeStat, container);
        });
    });

    container.querySelector('#applyFilters').addEventListener('click', () => {
        loadMarketItems(activeStat, container);
    });

    await loadMarketItems(activeStat, container);
}

// Вспомогательная функция загрузки предметов маркета (модифицирована)
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
        <h3 style="text-align:center; margin-bottom:20px;">Ежедневные награды</h3>
        
        <!-- Карточка адвент-календаря -->
        <div class="task-card" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 2;">
                <div style="font-size: 18px; font-weight: bold;">Адвент-календарь</div>
                <div style="font-size: 12px; color: #aaa;">Забирайте награды каждый день!</div>
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px;">
                <i class="fas fa-coins" style="color: white; font-size: 24px;"></i>
                <span style="font-size: 12px; color: white; font-weight: bold;">EXP</span>
                <i class="fas fa-tshirt" style="color: white; font-size: 24px;"></i>
            </div>
            <div style="flex: 0 0 120px;">
                <button class="btn" id="adventBtn" style="width: 100%;">ПОКАЗАТЬ</button>
            </div>
        </div>

        <!-- Карточка реферальной программы -->
        <div class="task-card" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 2;">
                <div style="font-size: 18px; font-weight: bold;">Реферальная программа</div>
                <div style="font-size: 12px; color: #aaa;">Пригласи друга и получи 100 монет</div>
            </div>
            <div style="flex: 1; display: flex; justify-content: center; align-items: center; gap: 5px;">
                <span style="font-weight: bold; color: white;">100</span>
                <i class="fas fa-coins" style="color: white; font-size: 20px;"></i>
            </div>
            <div style="flex: 0 0 120px; display: flex; gap: 5px;">
                <button class="btn" id="copyRefLink" style="flex: 1; padding: 8px 0;" title="Копировать ссылку">
                    <img src="/assets/icons/copy.png" style="width:20px; height:20px;" alt="копировать">
                </button>
                <button class="btn" id="shareRefLink" style="flex: 1; padding: 8px 0;" title="Поделиться">
                    <img src="/assets/icons/post.png" style="width:20px; height:20px;" alt="поделиться">
                </button>
            </div>
        </div>

        <!-- Карточка топ игроков -->
        <div class="task-card" style="display: flex; align-items: center; justify-content: space-between;">
            <div style="flex: 2;">
                <div style="font-size: 18px; font-weight: bold;">Топ игроков</div>
                <div style="font-size: 12px; color: #aaa;">Рейтинг лучших бойцов</div>
            </div>
            <div style="flex: 1;"></div>
            <div style="flex: 0 0 120px;">
                <button class="btn" id="ratingBtn" style="width: 100%;">РЕЙТИНГ</button>
            </div>
        </div>
    `;

    // Обработчики
    document.getElementById('adventBtn').addEventListener('click', () => showAdventCalendar());
    
    document.getElementById('copyRefLink').addEventListener('click', () => {
        if (!BOT_USERNAME) {
            alert('Имя бота не загружено');
            return;
        }
        const link = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(() => {
                alert('Ссылка скопирована в буфер обмена');
            }).catch(() => {
                alert('Не удалось скопировать ссылку');
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = link;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            alert('Ссылка скопирована в буфер обмена');
        }
    });

    document.getElementById('shareRefLink').addEventListener('click', () => {
        if (!BOT_USERNAME) {
            alert('Имя бота не загружено');
            return;
        }
        const link = `https://t.me/${BOT_USERNAME}?start=${userData.referral_code}`;
        const message = `Присоединяйся и сражайся!meow-meow 🐾\n\n${link}`;
        
        if (window.Telegram && Telegram.WebApp && Telegram.WebApp.shareMessage) {
            Telegram.WebApp.shareMessage(message);
        } else {
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Присоединяйся и сражайся!meow-meow 🐾')}`;
            window.open(shareUrl, '_blank');
        }
    });

    document.getElementById('ratingBtn').addEventListener('click', () => {
        alert('Рейтинг пока не реализован');
    });
}
// ==================== ПРОФИЛЬ ====================
function renderProfile() {
    const currentClass = userData.current_class;
    const classData = getCurrentClassData();
    const stats = calculateClassStats(currentClass, classData, inventory, userData.subclass);

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="class-selector">
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
                await refreshData();
            }
        });
    });
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

// ==================== НАВЫКИ ====================
function renderSkills() {
    const classData = getCurrentClassData();
    const skillPoints = classData.skill_points;
    const currentClass = userData.current_class;
    const base = baseStats[currentClass] || baseStats.warrior;

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="class-selector">
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

    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const newClass = e.target.dataset.class;
            if (newClass === currentClass) return;
            await fetch('/player/class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tg_id: userData.tg_id, class: newClass })
            });
            userData.current_class = newClass;
            renderSkills();
        });
    });

    document.querySelectorAll('.skill-btn').forEach(btn => {
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
    
    // Находим первый неполученный день
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
        const available = (day === firstUnclaimed); // только первый неполученный день доступен
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
                refreshData(); // обновит монеты и инвентарь
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

    const getClassNameRu = (cls) => {
        if (cls === 'warrior') return 'Воин';
        if (cls === 'assassin') return 'Ассасин';
        return 'Маг';
    };

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
                        <img src="/assets/cat_heroweb.png" alt="hero" style="width:100%; height:100%; object-fit: cover;">
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

        // Активные навыки (ультимейты)
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
        }
        // Эффекты яда и огня (пассивные)
        else if (action.includes('яд разъедает') || action.includes('отравление')) {
            anim = 'poison.gif';
        } else if (action.includes('пламя пожирает') || action.includes('огонь обжигает') || action.includes('горящие души')) {
            anim = 'fire.gif';
        }
        // В противном случае остаётся shot.gif (обычная атака)

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
    const winner = battleData.result.winner;
    const isVictory = (winner === 'player');
    const resultText = isVictory ? 'ПОБЕДА' : (winner === 'draw' ? 'НИЧЬЯ' : 'ПОРАЖЕНИЕ');

    const expGain = battleData.reward?.exp || 0;
    const coinGain = battleData.reward?.coins || 0;
    const leveledUp = battleData.reward?.leveledUp || false;
    const newStreak = battleData.reward?.newStreak || 0; // серия побед после боя (только при победе)

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
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button class="btn" id="rematchBtn">В бой</button>
                <button class="btn" id="backBtn">Назад</button>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <button class="btn result-tab active" id="tabLog">Лог боя</button>
                <button class="btn result-tab" id="tabStats">Статистика</button>
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
}

// Инициализация меню
document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

init();
