// utils/botGenerator.js

const baseStats = {
    warrior: { hp: 30, atk: 3, def: 5, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 15, atk: 4, def: 1, agi: 5, int: 0, spd: 14, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 15, atk: 3, def: 1, agi: 3, int: 6, spd: 14, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
};

const rolePassives = {
    guardian: { damageReduction: 10, blockChance: 20 },
    berserker: { rage: true },
    knight: { reflect: 20 },
    assassin: { critMultiplier: 2.5 },
    venom_blade: { poison: true },
    blood_hunter: { vamp: 20 },
    pyromancer: { burn: true },
    cryomancer: { freezeChance: 25, physReduction: 30 },
    illusionist: { mirageGuaranteed: true }
};

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
        critDmg: base.critDmg + ((dist.crit_dmg_points || 0) / 100),
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
        result.hp += Math.floor(result.def / 5) * 5;
    } else if (className === 'assassin') {
        result.spd += Math.floor(result.agi / 5);
    } else if (className === 'mage') {
        result.agi += Math.floor(result.int / 5);
        // manaRegen будет добавлен позже
    }

    // Классовые множители
    if (className === 'warrior') {
        result.def = Math.min(70, result.def * 1.5);
        result.hp = Math.floor(result.hp * 1.1);
    } else if (className === 'assassin') {
        result.atk = Math.floor(result.atk * 1.2);
        result.crit = Math.min(100, result.crit * 1.25);
        result.agi = Math.min(100, result.agi * 1.1);
    } else if (className === 'mage') {
        result.atk = Math.floor(result.atk * 1.2);
        result.int = result.int * 1.2;
    }

    // Капы
    result.def = Math.min(70, result.def);
    result.crit = Math.min(100, result.crit);
    result.agi = Math.min(100, result.agi);

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
 */
function generateNormalBot(playerLevel) {
    const level = Math.max(1, Math.min(60, playerLevel - 2 + Math.floor(Math.random() * 5)));
    const template = botTemplates[Math.floor(Math.random() * botTemplates.length)];
    const className = template.class;
    const subclass = template.subclass;

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

    return {
        username: template.name,
        avatar_id: null,
        class: className,
        subclass: subclass,
        level: level,
        stats: stats,
        is_cybercat: false
    };
}

/**
 * Генерация киберкота
 */
function generateCybercat(playerLevel) {
    const level = Math.max(1, Math.min(60, playerLevel - 2 + Math.floor(Math.random() * 5)));
    const classes = ['warrior', 'assassin', 'mage'];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    const subclassOptions = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    };
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
    stats.def = Math.min(70, stats.def);
    stats.agi = Math.min(100, stats.agi);
    stats.crit = Math.min(100, stats.crit);
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

function generateBot(playerLevel, isCybercat = false) {
    if (isCybercat) {
        return generateCybercat(playerLevel);
    } else {
        return generateNormalBot(playerLevel);
    }
}

module.exports = { generateBot };
