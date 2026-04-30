// server/utils/botGenerator.js (финальная версия с предметами, баланс v2.0)

const { itemNames, fixedBonuses } = require('../data/itemData');

// Базовые статы (ослаблены относительно игрока, так как боты получат предметы)
const baseStats = {
    warrior: { hp: 30, atk: 3, def: 4, agi: 2, int: 0, spd: 8, crit: 2, critDmg: 1.5, vamp: 0, reflect: 2 },
    assassin: { hp: 22, atk: 4, def: 1, agi: 5, int: 0, spd: 12, crit: 4, critDmg: 1.6, vamp: 2, reflect: 0 },
    mage: { hp: 20, atk: 2, def: 1, agi: 3, int: 5, spd: 12, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
};

// Веса распределения очков (сумма ~40 для удобной нормализации)
const statWeights = {
    warrior: { hp:9, atk:7, def:9, agi:4, int:1, spd:3, crit:4, critDmg:2, vamp:2, reflect:4 },
    assassin: { hp:5, atk:11, def:2, agi:9, int:1, spd:6, crit:6, critDmg:4, vamp:5, reflect:1 },
    mage: { hp:4, atk:4, def:3, agi:6, int:12, spd:5, crit:5, critDmg:3, vamp:2, reflect:1 }
};

const rolePassives = {
    guardian: { defenseBonus: 5, blockChance: 10 },
    berserker: { rage: true },
    knight: { reflect: 20 },
    assassin: { critMultiplier: 2.5 },
    venom_blade: { poison: true },
    blood_hunter: { vamp: 20 },
    pyromancer: { burn: true },
    cryomancer: { freezeChance: 25 },
    illusionist: { mirageGuaranteed: true }
};

const statKeys = ['hp', 'atk', 'def', 'agi', 'int', 'spd', 'crit', 'critDmg', 'vamp', 'reflect'];

const botTemplates = [
    { name: 'Деревянный манекен', class: 'warrior', subclass: 'guardian' },
    { name: 'Деревянный манекен', class: 'warrior', subclass: 'berserker' },
    { name: 'Деревянный манекен', class: 'warrior', subclass: 'knight' },
    { name: 'Серебряный защитник', class: 'assassin', subclass: 'assassin' },
    { name: 'Серебряный защитник', class: 'assassin', subclass: 'venom_blade' },
    { name: 'Серебряный защитник', class: 'assassin', subclass: 'blood_hunter' },
    { name: 'Золотой защитник', class: 'mage', subclass: 'pyromancer' },
    { name: 'Золотой защитник', class: 'mage', subclass: 'cryomancer' },
    { name: 'Золотой защитник', class: 'mage', subclass: 'illusionist' }
];

const itemSlots = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];

// ========== ОЧКИ НАВЫКОВ ==========
function getTotalPointsForLevel(level) {
    if (level <= 0) return 0;
    let points = 0;
    for (let lvl = 1; lvl <= level; lvl++) {
        points += (lvl <= 10) ? 2 : 4;
    }
    return points;
}

function distributeSkillPoints(totalPoints, className) {
    const weights = statWeights[className] || statWeights.warrior;
    const distribution = {};
    for (const key of statKeys) distribution[key + '_points'] = 0;

    const statBag = [];
    for (const [stat, weight] of Object.entries(weights)) {
        for (let i = 0; i < weight; i++) statBag.push(stat);
    }

    for (let i = 0; i < totalPoints; i++) {
        const stat = statBag[Math.floor(Math.random() * statBag.length)];
        distribution[stat + '_points']++;
    }
    return distribution;
}

function applySkillBonuses(base, dist) {
    return {
        hp: base.hp + (dist.hp_points || 0) * 5,
        atk: base.atk + (dist.atk_points || 0),
        def: base.def + (dist.def_points || 0),
        agi: base.agi + (dist.agi_points || 0),
        int: base.int + (dist.int_points || 0),
        spd: base.spd + (dist.spd_points || 0),
        crit: base.crit + (dist.crit_points || 0),
        critDmg: 1.5 + ((dist.crit_dmg_points || 0) / 50),
        vamp: base.vamp + (dist.vamp_points || 0),
        reflect: base.reflect + (dist.reflect_points || 0)
    };
}

function applyClassBonuses(stats, className, subclass) {
    let result = { ...stats };

    if (className === 'warrior') {
        result.hp += Math.floor(result.def / 5) * 5;
    } else if (className === 'assassin') {
        result.spd += Math.floor(result.agi / 5);
    } else if (className === 'mage') {
        result.agi += Math.floor(result.int / 5);
        result.manaRegen = (result.manaRegen || 0) + Math.floor(result.int / 5) * 2;
    }

    const roleBonus = rolePassives[subclass] || {};
    if (roleBonus.vamp) result.vamp += roleBonus.vamp;
    if (roleBonus.reflect) result.reflect += roleBonus.reflect;

    if (className === 'warrior' && subclass === 'guardian') {
        result.def = Math.min(75, result.def + 5);
    }

    if (className === 'warrior') {
        result.hp = Math.floor(result.hp * 1.1);
    }

    // Капы
    result.def = Math.min(75, result.def);
    result.agi = Math.min(70, result.agi);
    result.crit = Math.min(100, result.crit);
    result.manaRegen = Math.min(35, result.manaRegen || 0); // боты не более 35 регена

    // Округления
    for (const key of ['hp','atk','spd']) result[key] = Math.round(result[key]);
    for (const key of ['def','agi','int','crit','vamp','reflect']) result[key] = Math.round(result[key] * 10) / 10;
    result.critDmg = Math.round(result.critDmg * 100) / 100;

    return result;
}

// ========== ГЕНЕРАЦИЯ ПРЕДМЕТОВ ДЛЯ БОТОВ ==========
function generateBotItem(className, level) {
    // Определяем редкость в зависимости от уровня
    let rarity = 'common';
    const r = Math.random() * 100;
    if (level >= 40 && r < 5) rarity = 'legendary';
    else if (level >= 30 && r < 12) rarity = 'epic';
    else if (level >= 15 && r < 25) rarity = 'rare';
    else if (level >= 5 && r < 45) rarity = 'uncommon';
    // иначе common

    const type = itemSlots[Math.floor(Math.random() * itemSlots.length)];
    const names = itemNames[className]?.[type]?.[rarity];
    if (!names || names.length === 0) return null;
    const name = names[Math.floor(Math.random() * names.length)];

    // Выбираем 2 случайные характеристики, которые будут у предмета
    const possibleStats = ['atk', 'def', 'hp', 'spd', 'crit', 'crit_dmg', 'agi', 'int', 'vamp', 'reflect'];
    const stat1 = possibleStats[Math.floor(Math.random() * possibleStats.length)];
    let stat2 = possibleStats[Math.floor(Math.random() * possibleStats.length)];
    while (stat2 === stat1) stat2 = possibleStats[Math.floor(Math.random() * possibleStats.length)];

    const bonus = fixedBonuses[rarity];
    const item = {
        name,
        type,
        rarity,
        owner_class: className,
        atk_bonus: 0, def_bonus: 0, hp_bonus: 0, spd_bonus: 0,
        crit_bonus: 0, crit_dmg_bonus: 0, agi_bonus: 0, int_bonus: 0, vamp_bonus: 0, reflect_bonus: 0
    };

    const applyBonus = (stat) => {
        switch (stat) {
            case 'atk': item.atk_bonus += bonus.atk; break;
            case 'def': item.def_bonus += bonus.def; break;
            case 'hp': item.hp_bonus += bonus.hp; break;
            case 'spd': item.spd_bonus += bonus.spd; break;
            case 'crit': item.crit_bonus += bonus.crit; break;
            case 'crit_dmg': item.crit_dmg_bonus += bonus.crit_dmg; break;
            case 'agi': item.agi_bonus += bonus.agi; break;
            case 'int': item.int_bonus += bonus.int; break;
            case 'vamp': item.vamp_bonus += bonus.vamp; break;
            case 'reflect': item.reflect_bonus += bonus.reflect; break;
        }
    };
    applyBonus(stat1);
    applyBonus(stat2);

    return item;
}

function applyItemBonuses(stats, items) {
    if (!items) return stats;
    const result = { ...stats };
    for (const item of items) {
        if (!item) continue;
        result.hp += item.hp_bonus || 0;
        result.atk += item.atk_bonus || 0;
        result.def += item.def_bonus || 0;
        result.agi += item.agi_bonus || 0;
        result.int += item.int_bonus || 0;
        result.spd += item.spd_bonus || 0;
        result.crit += item.crit_bonus || 0;
        result.critDmg += (item.crit_dmg_bonus || 0) / 100;
        result.vamp += item.vamp_bonus || 0;
        result.reflect += item.reflect_bonus || 0;
    }
    return result;
}

// ========== ГЕНЕРАЦИЯ БОТА ==========
function generateNormalBot(playerLevel, forcedClass = null, forcedSubclass = null) {
    let level, className, subclass, template = null;

    if (forcedClass && forcedSubclass) {
        level = Math.min(60, Math.max(1, playerLevel));
        className = forcedClass;
        subclass = forcedSubclass;
    } else {
        const minLevel = Math.max(1, playerLevel - 2);
        const maxLevel = Math.min(60, playerLevel + 2);
        level = minLevel + Math.floor(Math.random() * (maxLevel - minLevel + 1));
        template = botTemplates[Math.floor(Math.random() * botTemplates.length)];
        className = template.class;
        subclass = template.subclass;
    }

    const base = baseStats[className] || baseStats.warrior;
    const totalSkillPoints = getTotalPointsForLevel(level);
    const distribution = distributeSkillPoints(totalSkillPoints, className);
    let stats = applySkillBonuses(base, distribution);
    stats = applyClassBonuses(stats, className, subclass);

    // Генерируем предметы (от 0 до 4 слотов, чем выше уровень – тем больше шанс)
    const numItems = Math.min(4, Math.floor(level / 10) + Math.floor(Math.random() * 2)); // максимум 4
    const botItems = [];
    for (let i = 0; i < numItems; i++) {
        const item = generateBotItem(className, level);
        if (item) botItems.push(item);
    }

    // Применяем бонусы предметов
    stats = applyItemBonuses(stats, botItems);

    // Мана и реген
    stats.manaMax = 100;
    stats.manaRegen = className === 'warrior' ? 10 : (className === 'assassin' ? 14 : 20);
    if (className === 'mage') {
        stats.manaRegen += Math.floor(stats.int / 5) * 2;
    }
    stats.manaRegen = Math.min(35, stats.manaRegen);

    const username = template ? template.name : (rolePassives[subclass] ? subclass : `${className} ${subclass}`);

    return {
        username,
        avatar_id: null,
        class: className,
        subclass,
        level,
        stats,
        items: botItems,   // для информации, в бою используется stats уже с учётом предметов
        is_cybercat: false
    };
}

function generateCybercat(playerLevel) {
    // Киберкоты получают усиленные статы, но также используют предметы как обычные боты
    const bot = generateNormalBot(playerLevel);
    bot.username = 'Киберкот';
    bot.is_cybercat = true;
    // Дополнительные бонусы киберкоту
    bot.stats.hp += 12;
    bot.stats.atk += 6;
    bot.stats.def += 5;
    bot.stats.int += 6;
    bot.stats.def = Math.min(75, bot.stats.def);
    bot.stats.agi = Math.min(70, bot.stats.agi);
    bot.stats.crit = Math.min(100, bot.stats.crit);
    bot.stats.manaRegen = Math.min(35, (bot.stats.manaRegen || 15) + 2);
    return bot;
}

// ========== МЫШИНЫЕ БОССЫ (БАШНЯ) ==========
const mouseBosses = [
    { type: 'necromancer', name: 'Мышь-некромант', avatar: 'mouse-skin-necr.png', subclass: 'mouse_necromancer',
      baseHp: 80, baseAtk: 12, baseDef: 8, baseAgi: 15, baseInt: 15, baseSpd: 18 },
    { type: 'blade', name: 'Клинок', avatar: 'mouse-skin-blade.png', subclass: 'mouse_blade',
      baseHp: 70, baseAtk: 18, baseDef: 5, baseAgi: 25, baseInt: 5, baseSpd: 25 },
    { type: 'antimag', name: 'Антимаг', avatar: 'mouse-skin-antimag.png', subclass: 'mouse_antimag',
      baseHp: 75, baseAtk: 14, baseDef: 6, baseAgi: 20, baseInt: 20, baseSpd: 20 },
    { type: 'paladin', name: 'Паладин', avatar: 'mouse-skin-titan.png', subclass: 'mouse_paladin',
      baseHp: 100, baseAtk: 10, baseDef: 12, baseAgi: 10, baseInt: 10, baseSpd: 12 },
    { type: 'alchemist', name: 'Алхимик', avatar: 'icon-mouse-alchim.png', subclass: 'mouse_alchemist',
      baseHp: 85, baseAtk: 13, baseDef: 7, baseAgi: 18, baseInt: 18, baseSpd: 16 },
    { type: 'shadow', name: 'Тень', avatar: 'mouse-skin-shadow.png', subclass: 'mouse_shadow',
      baseHp: 65, baseAtk: 16, baseDef: 4, baseAgi: 30, baseInt: 8, baseSpd: 28 }
];

function generateMouseBoss(floor) {
    const bossIndex = (Math.floor(floor / 5) - 1) % mouseBosses.length;
    const bossTemplate = mouseBosses[bossIndex];
    const scale = 1 + (floor - 5) / 50;
    return {
        username: bossTemplate.name,
        avatar_id: null,
        avatar_filename: bossTemplate.avatar,
        class: 'mouse',
        subclass: bossTemplate.subclass,
        level: Math.floor(floor / 2) + 10,
        is_cybercat: false,
        is_mouse: true,
        stats: {
            hp: Math.floor(bossTemplate.baseHp * scale),
            atk: Math.floor(bossTemplate.baseAtk * scale),
            def: Math.floor(bossTemplate.baseDef * scale),
            agi: Math.floor(bossTemplate.baseAgi * scale),
            int: Math.floor(bossTemplate.baseInt * scale),
            spd: Math.floor(bossTemplate.baseSpd * scale),
            crit: 10 + Math.floor(floor / 10),
            critDmg: 1.5,
            vamp: 0,
            reflect: 0,
            manaMax: 100,
            manaRegen: Math.min(35, 20 + Math.floor(floor / 5))
        }
    };
}

// Совместимость со старым вызовом generateBot(playerLevel, isCybercat, forcedClass, forcedSubclass)
function generateBot(playerLevel, isCybercat = false, forcedClass = null, forcedSubclass = null) {
    if (isCybercat) return generateCybercat(playerLevel);
    return generateNormalBot(playerLevel, forcedClass, forcedSubclass);
}

// Функция для генерации предмета по редкости (используется в адвенте)
function generateItemByRarity(rarity, ownerClass = null) {
    const classes = ['warrior', 'assassin', 'mage'];
    const chosenClass = ownerClass || classes[Math.floor(Math.random() * classes.length)];
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    const namesArray = itemNames[chosenClass][type][rarity];
    const name = namesArray[Math.floor(Math.random() * namesArray.length)];

    const possibleStats = ['atk', 'def', 'hp', 'spd', 'crit', 'crit_dmg', 'agi', 'int', 'vamp', 'reflect'];
    const stat1 = possibleStats[Math.floor(Math.random() * possibleStats.length)];
    const stat2 = possibleStats[Math.floor(Math.random() * possibleStats.length)];

    const item = {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: chosenClass,
        atk_bonus: 0,
        def_bonus: 0,
        hp_bonus: 0,
        spd_bonus: 0,
        crit_bonus: 0,
        crit_dmg_bonus: 0,
        agi_bonus: 0,
        int_bonus: 0,
        vamp_bonus: 0,
        reflect_bonus: 0
    };

    const bonus = fixedBonuses[rarity];

    const addBonus = (stat) => {
        switch (stat) {
            case 'atk': item.atk_bonus += bonus.atk; break;
            case 'def': item.def_bonus += bonus.def; break;
            case 'hp': item.hp_bonus += bonus.hp; break;
            case 'spd': item.spd_bonus += bonus.spd; break;
            case 'crit': item.crit_bonus += bonus.crit; break;
            case 'crit_dmg': item.crit_dmg_bonus += bonus.crit_dmg; break;
            case 'agi': item.agi_bonus += bonus.agi; break;
            case 'int': item.int_bonus += bonus.int; break;
            case 'vamp': item.vamp_bonus += bonus.vamp; break;
            case 'reflect': item.reflect_bonus += bonus.reflect; break;
        }
    };

    addBonus(stat1);
    addBonus(stat2);

    return item;
}

module.exports = {generateBot,generateMouseBoss,generateItemByRarity};
