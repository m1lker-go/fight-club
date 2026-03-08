// utils/botGenerator.js

const baseStats = {
    warrior: { hp: 30, atk: 3, def: 5, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 18, atk: 4, def: 1, agi: 5, int: 0, spd: 14, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 18, atk: 3, def: 1, agi: 3, int: 6, spd: 14, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
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

// Лучшие характеристики для каждого класса (по 6)
const bestStatsByClass = {
    warrior: ['hp', 'atk', 'def', 'crit', 'reflect', 'critDmg'],
    assassin: ['atk', 'agi', 'vamp', 'hp', 'crit', 'critDmg'],
    mage: ['atk', 'int', 'agi', 'hp', 'crit', 'critDmg']
};

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
 * Генерация обычного бота
 * @param {number} playerLevel - уровень игрока
 * @returns {object} - данные бота
 */
function generateNormalBot(playerLevel) {
    // Диапазон уровня бота: от playerLevel-3 до playerLevel+3, но не меньше 1 и не больше 60
    const level = Math.max(1, Math.min(60, playerLevel - 3 + Math.floor(Math.random() * 7))); // 7 вариантов: -3,-2,-1,0,+1,+2,+3

    // Выбор шаблона бота
    const template = botTemplates[Math.floor(Math.random() * botTemplates.length)];

    // Базовые характеристики
    const base = baseStats[template.class] || baseStats.warrior;
    let stats = {
        hp: base.hp,
        atk: base.atk,
        def: base.def,
        agi: base.agi,
        int: base.int,
        spd: base.spd,
        crit: base.crit,
        critDmg: 1.5,
        vamp: 0,
        reflect: 0,
        manaMax: 100,
        manaRegen: template.class === 'warrior' ? 15 : (template.class === 'assassin' ? 18 : 30)
    };

    // --- Расчёт очков навыков бота ---
    let totalSkillPoints = 0;
    for (let lvl = 1; lvl < level; lvl++) {
        if (lvl <= 3) totalSkillPoints += 2;
        else if (lvl <= 6) totalSkillPoints += 3;
        else if (lvl <= 25) totalSkillPoints += 4;
        else totalSkillPoints += 5;
    }
    // Для 1 уровня добавляем случайные 1-3 очка (чтобы новички не были совсем нулевыми)
    if (level === 1) {
        totalSkillPoints += Math.floor(Math.random() * 3) + 1; // 1-3
    }

    // Определяем лучшие и остальные характеристики для этого класса
    const bestStats = bestStatsByClass[template.class] || bestStatsByClass.warrior;
    const allStats = ['hp', 'atk', 'def', 'agi', 'int', 'spd', 'crit', 'critDmg', 'vamp', 'reflect'];
    const otherStats = allStats.filter(stat => !bestStats.includes(stat));

    // Распределяем очки: 60-70% в лучшие, остальное в остальные
    const percentToBest = 0.6 + Math.random() * 0.1; // 0.6-0.7
    const pointsToBest = Math.floor(totalSkillPoints * percentToBest);
    const pointsToOther = totalSkillPoints - pointsToBest;

    // Функция для случайного распределения очков по массиву характеристик
    function distributePoints(points, statArray) {
        const dist = {};
        statArray.forEach(stat => dist[stat] = 0);
        for (let i = 0; i < points; i++) {
            const stat = statArray[Math.floor(Math.random() * statArray.length)];
            dist[stat]++;
        }
        return dist;
    }

    const bestDist = distributePoints(pointsToBest, bestStats);
    const otherDist = distributePoints(pointsToOther, otherStats);

    // Объединяем распределения
    const totalDist = { ...bestDist };
    for (let stat in otherDist) {
        totalDist[stat] = (totalDist[stat] || 0) + otherDist[stat];
    }

    // Применяем бонусы от навыков
    for (let stat in totalDist) {
        const points = totalDist[stat];
        switch (stat) {
            case 'hp':
                stats.hp += points * 2;
                break;
            case 'atk':
                stats.atk += points;
                break;
            case 'def':
                stats.def += points;
                break;
            case 'agi':
                stats.agi += points;
                break;
            case 'int':
                stats.int += points;
                break;
            case 'spd':
                stats.spd += points;
                break;
            case 'crit':
                stats.crit += points;
                break;
            case 'critDmg':
                stats.critDmg += points / 100;
                break;
            case 'vamp':
                stats.vamp += points;
                break;
            case 'reflect':
                stats.reflect += points;
                break;
        }
    }

    // Пассивные бонусы подкласса
    const roleBonus = rolePassives[template.subclass] || {};
    if (roleBonus.vamp) stats.vamp += roleBonus.vamp;
    if (roleBonus.reflect) stats.reflect += roleBonus.reflect;

    // Классовые особенности (постоянные бонусы)
    if (template.class === 'warrior') {
        stats.hp += Math.floor(stats.def / 5) * 3;
    } else if (template.class === 'assassin') {
        stats.spd += Math.floor(stats.agi / 5);
    } else if (template.class === 'mage') {
        stats.agi += Math.floor(stats.int / 5);
        stats.manaRegen += Math.floor(stats.int / 5) * 2;
    }

    // Классовые бонусы (умножение)
    if (template.class === 'warrior') {
        stats.def = Math.min(70, stats.def * 1.5);
    } else if (template.class === 'assassin') {
        stats.atk = Math.floor(stats.atk * 1.2);
        stats.crit = Math.min(100, stats.crit * 1.25);
        stats.agi = Math.min(100, stats.agi * 1.1);
    } else if (template.class === 'mage') {
        stats.atk = Math.floor(stats.atk * 1.2);
        stats.int = stats.int * 1.2;
    }

    // Капы
    stats.def = Math.min(70, stats.def);
    stats.crit = Math.min(100, stats.crit);
    stats.agi = Math.min(100, stats.agi);

    return {
        username: template.name,
        avatar_id: null,
        class: template.class,
        subclass: template.subclass,
        level: level,
        stats: stats,
        is_cybercat: false
    };
}

/**
 * Генерация киберкота
 * @param {number} playerLevel - уровень игрока
 * @returns {object} - данные киберкота
 */
function generateCybercat(playerLevel) {
    // Киберкот: уровень +1-3 (но не больше 60)
    const cybercatLevel = Math.min(60, playerLevel + Math.floor(Math.random() * 3) + 1);
    
    // Случайный класс
    const classes = ['warrior', 'assassin', 'mage'];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    
    // Случайный подкласс для этого класса
    const subclassOptions = {
        warrior: ['guardian', 'berserker', 'knight'],
        assassin: ['assassin', 'venom_blade', 'blood_hunter'],
        mage: ['pyromancer', 'cryomancer', 'illusionist']
    };
    const options = subclassOptions[randomClass];
    const randomSubclass = options[Math.floor(Math.random() * options.length)];
    
    // Базовые характеристики для этого уровня (используем ту же логику, что и для обычного бота)
    // Но нам нужно сгенерировать обычного бота этого уровня, чтобы получить нормальные статы
    const baseBot = generateNormalBot(cybercatLevel);
    
    // Добавляем бонусы киберкота
    const cybercatStats = {
        ...baseBot.stats,
        hp: baseBot.stats.hp + 10,
        atk: baseBot.stats.atk + 3,
        def: baseBot.stats.def + 2
    };
    
    return {
        username: 'Киберкот',
        avatar_id: null,
        class: randomClass,
        subclass: randomSubclass,
        level: cybercatLevel,
        stats: cybercatStats,
        is_cybercat: true
    };
}

/**
 * Основная функция генерации бота
 * @param {number} playerLevel - уровень игрока
 * @param {boolean} isCybercat - true для киберкота, false для обычного бота
 * @returns {object} - данные бота
 */
function generateBot(playerLevel, isCybercat = false) {
    if (isCybercat) {
        return generateCybercat(playerLevel);
    } else {
        return generateNormalBot(playerLevel);
    }
}

module.exports = { generateBot };
