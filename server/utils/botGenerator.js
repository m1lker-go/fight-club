// server/utils/botGenerator.js
const { baseStats, rolePassives, subclassOptions, roleNames, clamp, GAME_LIMITS } = require('../game-balance');

// Веса характеристик для каждого класса (чем выше вес, тем чаще очки будут вкладываться)
const statWeights = {
    warrior: {
        hp: 10,
        atk: 8,
        def: 10,
        agi: 3,
        int: 1,
        spd: 5,
        crit: 6,
        critDmg: 6,
        vamp: 4,
        reflect: 7
    },
    assassin: {
        hp: 6,
        atk: 10,
        def: 2,
        agi: 10,
        int: 1,
        spd: 8,
        crit: 9,
        critDmg: 9,
        vamp: 8,
        reflect: 3
    },
    mage: {
        hp: 5,
        atk: 6,
        def: 3,
        agi: 7,
        int: 10,
        spd: 7,
        crit: 8,
        critDmg: 8,
        vamp: 4,
        reflect: 3
    }
};

const statKeys = ['hp', 'atk', 'def', 'agi', 'int', 'spd', 'crit', 'critDmg', 'vamp', 'reflect'];

// Имена для обычных ботов
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

/**
 * Вычисляет общее количество очков навыков для бота заданного уровня
 */
function getSkillPointsForLevel(level) {
    let total = 0;
    for (let lvl = 1; lvl <= level; lvl++) {
        if (lvl <= 5) total += 5;
        else if (lvl <= 39) total += 7;
        else total += 8;
    }
    return total;
}

/**
 * Распределяет очки навыков случайно, но с учётом весов характеристик для класса.
 * Возвращает объект с количеством очков в каждой характеристике.
 */
function distributeSkillPoints(totalPoints, className) {
    const weights = statWeights[className] || statWeights.warrior;
    // Преобразуем веса в массив для удобства выбора
    const statList = [];
    for (const stat of statKeys) {
        const weight = weights[stat];
        for (let i = 0; i < weight; i++) {
            statList.push(stat);
        }
    }
    const distribution = {
        hp_points: 0,
        atk_points: 0,
        def_points: 0,
        agi_points: 0,
        int_points: 0,
        spd_points: 0,
        crit_points: 0,
        crit_dmg_points: 0,
        vamp_points: 0,
        reflect_points: 0
    };
    for (let i = 0; i < totalPoints; i++) {
        const randomIndex = Math.floor(Math.random() * statList.length);
        const stat = statList[randomIndex];
        distribution[stat + '_points']++;
    }
    return distribution;
}

/**
 * Применяет бонусы от очков навыков к базовым статам
 */
function applySkillBonuses(base, dist) {
    return {
        hp: base.hp + (dist.hp_points || 0) * 5,
        atk: base.atk + (dist.atk_points || 0),
        def: base.def + (dist.def_points || 0),
        agi: base.agi + (dist.agi_points || 0),
        int: base.int + (dist.int_points || 0),
        spd: base.spd + (dist.spd_points || 0),
        crit: base.crit + (dist.crit_points || 0),
        critDmg: 1.5 + ((dist.crit_dmg_points || 0) / 50), // ✅ Синхронизировано с клиентом: делитель 50
        vamp: base.vamp + (dist.vamp_points || 0),
        reflect: base.reflect + (dist.reflect_points || 0)
    };
}

/**
 * Применяет классовые и подклассовые бонусы (как у игроков)
 */
function applyClassBonuses(stats, className, subclass) {
    let result = { ...stats };

    const roleBonus = rolePassives[subclass] || {};
    if (roleBonus.vamp) result.vamp += roleBonus.vamp;
    if (roleBonus.reflect) result.reflect += roleBonus.reflect;

    // Классовые особенности
    if (className === 'warrior') {
        result.hp += Math.floor(result.def / 5) * 5; // ✅ Исправлено: было *3
    } else if (className === 'assassin') {
        result.spd += Math.floor(result.agi / 5);
    } else if (className === 'mage') {
        result.agi += Math.floor(result.int / 5);
        // manaRegen будет добавлен позже
    }

    // Классовые множители + лимиты через clamp()
    if (className === 'warrior') {
        result.def = clamp(result.def * 1.5, GAME_LIMITS.def.min, GAME_LIMITS.def.max);
        result.hp = Math.floor(result.hp * 1.1);
    } else if (className === 'assassin') {
        result.atk = Math.floor(result.atk * 1.2);
        result.crit = clamp(result.crit * 1.25, GAME_LIMITS.crit.min, GAME_LIMITS.crit.max);
        result.agi = clamp(result.agi * 1.1, GAME_LIMITS.agi.min, GAME_LIMITS.agi.max);
    } else if (className === 'mage') {
        result.atk = Math.floor(result.atk * 1.2);
        result.int = result.int * 1.2;
    }

    // Финальные капы через clamp()
    result.def = clamp(result.def, GAME_LIMITS.def.min, GAME_LIMITS.def.max);
    result.crit = clamp(result.crit, GAME_LIMITS.crit.min, GAME_LIMITS.crit.max);
    result.agi = clamp(result.agi, GAME_LIMITS.agi.min, GAME_LIMITS.agi.max);
    result.critDmg = clamp(result.critDmg, GAME_LIMITS.critDmg.min, GAME_LIMITS.critDmg.max);

    // Округления
    result.hp = Math.round(result.hp);
    result.atk = Math.round(result.atk);
    result.spd = Math.round(result.spd);
    result.def = Math.round(result.def * 10) / 10;
    result.agi = Math.round(result.agi * 10) / 10;
    result.int = Math.round(result.int * 10) / 10;
    result.crit = Math.round(result.crit * 10) / 10;
    result.critDmg = Math.round(result.critDmg * 100) / 100;
    result.vamp = Math.round(result.vamp * 10) / 10;
    result.reflect = Math.round(result.reflect * 10) / 10;

    return result;
}

/**
 * Генерация обычного бота
 * @param {number} playerLevel - уровень игрока (или желаемый уровень)
 * @param {string|null} forcedClass - принудительный класс (для башни)
 * @param {string|null} forcedSubclass - принудительный подкласс
 * @returns {object} - данные бота
 */
function generateNormalBot(playerLevel, forcedClass = null, forcedSubclass = null) {
    let level;
    let className, subclass;
    let template = null;

    if (forcedClass && forcedSubclass) {
        // Для башни: уровень точно равен переданному (без случайного отклонения)
        level = playerLevel;
        className = forcedClass;
        subclass = forcedSubclass;
    } else {
        // Обычный бот: уровень с небольшим отклонением (±2) для разнообразия
        level = Math.max(1, Math.min(60, playerLevel - 2 + Math.floor(Math.random() * 5)));
        template = botTemplates[Math.floor(Math.random() * botTemplates.length)];
        className = template.class;
        subclass = template.subclass;
    }

    const base = baseStats[className] || baseStats.warrior;
    const totalSkillPoints = getSkillPointsForLevel(level);
    const distribution = distributeSkillPoints(totalSkillPoints, className);
    let stats = applySkillBonuses(base, distribution);
    stats = applyClassBonuses(stats, className, subclass);

    // Мана и регенерация
    stats.manaMax = 100;
    stats.manaRegen = className === 'warrior' ? 15 : (className === 'assassin' ? 18 : 30);
    if (className === 'mage') {
        stats.manaRegen += Math.floor(stats.int / 5) * 2;
    }

    // Определяем имя бота
    let username;
    if (template) {
        username = template.name;
    } else {
        // Используем русские названия из словаря
        username = roleNames[className]?.[subclass] || `${className} ${subclass}`;
    }

    return {
        username: username,
        avatar_id: null,
        class: className,
        subclass: subclass,
        level: level,
        stats: stats,
        is_cybercat: false
    };
}

/**
 * Генерация киберкота (без изменений)
 */
function generateCybercat(playerLevel) {
    const level = Math.max(1, Math.min(60, playerLevel - 2 + Math.floor(Math.random() * 5)));
    const classes = ['warrior', 'assassin', 'mage'];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    const options = subclassOptions[randomClass];
    const randomSubclass = options[Math.floor(Math.random() * options.length)];

    const base = baseStats[randomClass] || baseStats.warrior;
    const totalSkillPoints = getSkillPointsForLevel(level);
    const distribution = distributeSkillPoints(totalSkillPoints, randomClass);
    let stats = applySkillBonuses(base, distribution);
    stats = applyClassBonuses(stats, randomClass, randomSubclass);

    // Бонусы киберкота
    stats.hp += 10;
    stats.atk += 5;
    stats.def += 5;
    stats.int += 5;

    // Повторные капы и округления после добавления бонусов
    stats.def = clamp(stats.def, GAME_LIMITS.def.min, GAME_LIMITS.def.max);
    stats.agi = clamp(stats.agi, GAME_LIMITS.agi.min, GAME_LIMITS.agi.max);
    stats.crit = clamp(stats.crit, GAME_LIMITS.crit.min, GAME_LIMITS.crit.max);
    stats.hp = Math.round(stats.hp);
    stats.atk = Math.round(stats.atk);
    stats.spd = Math.round(stats.spd);
    stats.def = Math.round(stats.def * 10) / 10;
    stats.agi = Math.round(stats.agi * 10) / 10;
    stats.int = Math.round(stats.int * 10) / 10;
    stats.crit = Math.round(stats.crit * 10) / 10;
    stats.critDmg = Math.round(stats.critDmg * 100) / 100;
    stats.vamp = Math.round(stats.vamp * 10) / 10;
    stats.reflect = Math.round(stats.reflect * 10) / 10;

    stats.manaMax = 100;
    stats.manaRegen = randomClass === 'warrior' ? 15 : (randomClass === 'assassin' ? 18 : 30);
    if (randomClass === 'mage') {
        stats.manaRegen += Math.floor(stats.int / 5) * 2;
    }

    return {
        username: 'Киберкот',
        avatar_id: null,
        class: randomClass,
        subclass: randomSubclass,
        level: level,
        stats: stats,
        is_cybercat: true
    };
}

/**
 * Основная функция генерации бота
 * @param {number} playerLevel - уровень игрока (или желаемый уровень)
 * @param {boolean} isCybercat - true для киберкота
 * @param {string|null} forcedClass - принудительный класс (для башни)
 * @param {string|null} forcedSubclass - принудительный подкласс
 * @returns {object} - данные бота
 */
function generateBot(playerLevel, isCybercat = false, forcedClass = null, forcedSubclass = null) {
    if (isCybercat) {
        return generateCybercat(playerLevel);
    } else {
        return generateNormalBot(playerLevel, forcedClass, forcedSubclass);
    }
}

// ========== БОССЫ-МЫШИ ==========
const mouseBosses = [
    { 
        type: 'necromancer', 
        name: 'Мышь-некромант', 
        avatar: 'mouse-skin-necr.png', 
        subclass: 'mouse_necromancer',
        baseHp: 80,
        baseAtk: 12,
        baseDef: 8,
        baseAgi: 15,
        baseInt: 15,
        baseSpd: 18
    },
    { 
        type: 'blade', 
        name: 'Клинок', 
        avatar: 'mouse-skin-blade.png', 
        subclass: 'mouse_blade',
        baseHp: 70,
        baseAtk: 18,
        baseDef: 5,
        baseAgi: 25,
        baseInt: 5,
        baseSpd: 25
    },
    { 
        type: 'antimag', 
        name: 'Антимаг', 
        avatar: 'mouse-skin-antimag.png', 
        subclass: 'mouse_antimag',
        baseHp: 75,
        baseAtk: 14,
        baseDef: 6,
        baseAgi: 20,
        baseInt: 20,
        baseSpd: 20
    },
    { 
        type: 'paladin', 
        name: 'Паладин', 
        avatar: 'mouse-skin-titan.png', 
        subclass: 'mouse_paladin',
        baseHp: 100,
        baseAtk: 10,
        baseDef: 12,
        baseAgi: 10,
        baseInt: 10,
        baseSpd: 12
    },
    { 
        type: 'alchemist', 
        name: 'Алхимик', 
        avatar: 'icon-mouse-alchim.png', 
        subclass: 'mouse_alchemist',
        baseHp: 85,
        baseAtk: 13,
        baseDef: 7,
        baseAgi: 18,
        baseInt: 18,
        baseSpd: 16
    },
    { 
        type: 'shadow', 
        name: 'Тень', 
        avatar: 'mouse-skin-shadow.png', 
        subclass: 'mouse_shadow',
        baseHp: 65,
        baseAtk: 16,
        baseDef: 4,
        baseAgi: 30,
        baseInt: 8,
        baseSpd: 28
    }
];

function generateMouseBoss(floor) {
    // Определяем, какой босс на этом этаже (цикл каждые 30 этажей, начиная с 5)
    const bossIndex = (Math.floor(floor / 5) - 1) % mouseBosses.length;
    const bossTemplate = mouseBosses[bossIndex];
    
    // Масштабирование характеристик с ростом этажа
    const scale = 1 + (floor - 5) / 50;
    const hp = Math.floor(bossTemplate.baseHp * scale);
    const atk = Math.floor(bossTemplate.baseAtk * scale);
    const def = Math.floor(bossTemplate.baseDef * scale);
    const agi = Math.floor(bossTemplate.baseAgi * scale);
    const int = Math.floor(bossTemplate.baseInt * scale);
    const spd = Math.floor(bossTemplate.baseSpd * scale);
    const crit = 10 + Math.floor(floor / 10);
    const critDmg = 1.5;
    const vamp = 0;
    const reflect = 0;
    const manaMax = 100;
    const manaRegen = 20 + Math.floor(floor / 5);
    
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
            hp, atk, def, agi, int, spd,
            crit, critDmg, vamp, reflect,
            manaMax, manaRegen
        }
    };
}

module.exports = { generateBot, generateMouseBoss };
