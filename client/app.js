let tg = window.Telegram.WebApp;
tg.expand();

let userData = null;
let userClasses = [];
let inventory = [];
let currentScreen = 'main';
let currentPower = 0;

// Словарь для перевода подклассов
const roleDescriptions = {
    guardian: {
        name: 'Страж',
        passive: 'Живой щит – снижает весь входящий урон на 10%, 20% шанс полностью заблокировать атаку.',
        active: 'Несокрушимость – восстанавливает 20% + MANA% от максимального HP, снимает отрицательные эффекты.'
    },
    berserker: {
        name: 'Берсерк',
        passive: 'Кровавая ярость – чем меньше HP, тем выше урон (до +30% при 10% HP).',
        active: 'Кровопускание – наносит чистый урон, равный 15% + MANA% от текущего HP врага, жертвуя 10% своего HP.'
    },
    knight: {
        name: 'Рыцарь',
        passive: 'Зеркальный щит – отражает 20% полученного физического урона обратно атакующему.',
        active: 'Щит правосудия – на 2 хода увеличивает отражение урона на 30% + MANA% и даёт 50% сопротивления контролю.'
    },
    assassin: {
        name: 'Убийца',
        passive: 'Смертельное касание – критический урон ×2.5 вместо ×2.0.',
        active: 'Смертельный удар – наносит 300% + MANA% урона от ATK, гарантированный крит.'
    },
    venom_blade: {
        name: 'Ядовитый клинок',
        passive: 'Кумулятивный яд – каждая атака накладывает яд (урон +2 за попадание, макс. 30), яд тикает в конце хода.',
        active: 'Ядовитая волна – наносит урон ядом, равный текущий яд ×5 + MANA%, и мгновенно срабатывает яд.'
    },
    blood_hunter: {
        name: 'Кровавый охотник',
        passive: 'Вампиризм – восстанавливает 20% от нанесённого урона (лечение может превысить HP до 2×).',
        active: 'Кровавая жатва – на 2 хода усиливает вампиризм до 50% + MANA% и наносит 150% урона.'
    },
    pyromancer: {
        name: 'Поджигатель',
        passive: 'Горящие души – активные навыки поджигают цель: урон в конце хода 10% от урона навыка (до 3 стаков).',
        active: 'Огненный шторм – наносит магический урон 400% + MANA% от ATK, поджигает с силой 50% от урона.'
    },
    cryomancer: {
        name: 'Ледяной маг',
        passive: 'Ледяная кровь – 10% шанс заморозить атакующего на 1 ход при получении урона.',
        active: 'Вечная зима – замораживает врага на 1 ход и наносит 200% + MANA% урона от ATK (удваивается, если враг уже заморожен).'
    },
    illusionist: {
        name: 'Иллюзионист',
        passive: 'Мираж – 20% шанс создать иллюзию и полностью избежать урона (срабатывает после уворота).',
        active: 'Зазеркалье – на 1 ход враг атакует сам себя, нанося себе 100% + MANA% от своей ATK.'
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
            updateTopBar();
            showScreen('main');
        } else {
            alert('Ошибка авторизации');
        }
    } catch (e) {
        console.error('Init error:', e);
        alert('Ошибка соединения с сервером');
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
        agi: base.agi + (classData.agi_points || 0),
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

    // Ограничения
    final.def = Math.min(100, final.def);
    final.agi = Math.min(100, final.agi);
    final.crit = Math.min(100, final.crit);

    // Округление
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

// ==================== МАГАЗИН СУНДУКОВ ====================
function renderShop() {
    const content = document.getElementById('content');
    content.innerHTML = `
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

    document.querySelectorAll('.chest-btn').forEach(btn => {
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
            <div style="font-size: 20px; font-weight: bold; margin-bottom: 5px;">${itemNameTranslations[item.name] || item.name}</div>
            <div class="item-rarity rarity-${item.rarity}" style="margin-bottom: 5px;">${rarityTranslations[item.rarity] || item.rarity}</div>
            <div style="color: #aaa; font-size: 14px; margin-bottom: 5px;">Класс: ${classDisplay}</div>
            <div style="color: #aaa; font-size: 14px;">${stats.join(' • ')}</div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// ==================== МАРКЕТ ====================
function renderMarket() {
    const content = document.getElementById('content');
    content.innerHTML = `
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

    document.querySelectorAll('.stat-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.stat-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeStat = btn.dataset.stat;
            loadMarketItems(activeStat);
        });
    });

    document.getElementById('applyFilters').addEventListener('click', () => {
        loadMarketItems(activeStat);
    });

    loadMarketItems(activeStat);
}

async function loadMarketItems(statFilter = 'any') {
    const classFilter = document.getElementById('classFilter').value;
    const rarityFilter = document.getElementById('rarityFilter').value;
    const params = new URLSearchParams({ class: classFilter, rarity: rarityFilter });
    const res = await fetch('/market?' + params);
    const items = await res.json();
    let filteredItems = items;

    if (statFilter !== 'any') {
        filteredItems = items.filter(item => item[statFilter] > 0);
    }

    const container = document.getElementById('marketItems');
    container.innerHTML = '';

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

        container.innerHTML += `
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

    document.querySelectorAll('.buy-btn').forEach(btn => {
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
        <h3>Ежедневные задания</h3>
        <div class="task-card">
            <div>Ежедневный вход</div>
            <div>Текущая серия: ${userData.daily_streak || 0} дней</div>
            <button class="btn" id="dailyBtn">Получить награду</button>
        </div>
        <div class="task-card">
            <div>Реферальная программа</div>
            <div>Ваш код: ${userData.referral_code}</div>
            <div>Пригласите друга и получите 50 монет</div>
        </div>
        <div class="task-card">
            <div>Топ игроков</div>
            <button class="btn" id="ratingBtn">Рейтинг</button>
        </div>
    `;
    document.getElementById('dailyBtn').addEventListener('click', async () => {
        const res = await fetch('/tasks/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tg_id: userData.tg_id })
        });
        const data = await res.json();
        if (data.streak !== undefined) {
            alert(`Получено ${data.rewardCoins} монет! Серия: ${data.streak}`);
            await refreshData();
        } else {
            alert('Ошибка: ' + data.error);
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
            ${renderSkillItem('agi_points', 'Ловкость', 'Увеличивает шанс уворота на 1% (макс. 100%)', base.agi + (classData.agi_points || 0), classData.agi_points || 0, skillPoints)}
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

// ==================== БОЙ ====================
async function startBattle() {
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
}

function showBattleScreen(battleData) {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.style.pointerEvents = 'none';
        item.style.opacity = '0.5';
    });

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-screen">
            <div class="battle-header">
                <div>${userData.username} (${userData.current_class === 'warrior' ? 'Воин' : userData.current_class === 'assassin' ? 'Ассасин' : 'Маг'})</div>
                <div class="battle-timer" id="battleTimer">45</div>
                <div>${battleData.opponent.username} (${battleData.opponent.class === 'warrior' ? 'Воин' : battleData.opponent.class === 'assassin' ? 'Ассасин' : 'Маг'})</div>
            </div>
            <div class="battle-arena">
                <div class="hero-card">
                    <div class="hero-avatar"><img src="/assets/cat_heroweb.png" alt="hero" style="width:100%; height:100%;"></div>
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
                    <div class="enemy-avatar"><img src="/assets/cat_heroweb.png" alt="hero" style="width:100%; height:100%;"></div>
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

    let turnIndex = 0;
    const turns = battleData.result.turns || [];
    const logContainer = document.getElementById('battleLog');
    let speed = 1;
    let interval;

    function playTurn() {
        if (turnIndex >= turns.length) {
            clearInterval(interval);
            // очищаем также таймер, если он ещё работает
            if (timer) clearInterval(timer);
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

        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerText = turn.action;
        logContainer.appendChild(logEntry);
        logContainer.scrollTop = logContainer.scrollHeight;

        turnIndex++;
    }

    playTurn();
    interval = setInterval(playTurn, 1000 / speed);

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

    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="battle-result">
            <h2>${resultText}</h2>
            <p>Получено опыта: ${expGain}</p>
            <p>Получено монет: ${coinGain}</p>
            ${leveledUp ? '<p>🎉 Уровень повышен!</p>' : ''}
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button class="btn" id="rematchBtn">В бой</button>
                <button class="btn" id="backBtn">Назад</button>
            </div>
        </div>
    `;

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

async function refreshData() {
    const res = await fetch(`/player/${userData.tg_id}`);
    const data = await res.json();
    userData = data.user;
    userClasses = data.classes || [];
    inventory = data.inventory || [];
    const classData = getCurrentClassData();
    const stats = calculateClassStats(userData.current_class, classData, inventory, userData.subclass);
    currentPower = calculatePower(userData.current_class, stats.final);
    updateTopBar();
    showScreen(currentScreen);
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', () => {
        showScreen(item.dataset.screen);
    });
});

init();
