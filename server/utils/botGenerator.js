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

// Остальные характеристики (всего 10, остальные 4)
const otherStats = ['spd', 'dodge', 'acc', 'mana']; // но нужно точное соответствие полей
// В реальности у нас 10 характеристик: hp, atk, def, agi, int, spd, crit, critDmg, vamp, reflect
// Поэтому для каждого класса остальные будут вычисляться как разность.

/**
 * Генерация бота с уровнем, приблизительно равным уровню игрока (в диапазоне ±2)
 * @param {number} playerLevel - уровень игрока
 * @returns {object} - данные бота
 */
function generateBot(playerLevel) {
    // Диапазон уровня бота: от playerLevel-3 до playerLevel+3, но не меньше 1 и не больше 60
    const level = Math.max(1, Math.min(60, playerLevel - 3 + Math.floor(Math.random() * 7))); // 7 вариантов: -3,-2,-1,0,+1,+2,+3

    // Выбор шаблона бота
    const templates = [
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
    const template = templates[Math.floor(Math.random() * templates.length)];

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

    // Применяем распределение к stats
    // Примечание: каждое очко в hp_points даёт +2 к hp, в остальных +1 к соответствующей характеристике
    // Но в stats у нас уже есть база, будем добавлять напрямую бонусы от навыков, как это делается у игроков.
    // Удобно создать объект classData, имитирующий запись из БД.
    const classData = {
        hp_points: 0,
        atk_points: 0,
        def_points: 0,
        dodge_points: 0,
        int_points: 0,
        spd_points: 0,
        crit_points: 0,
        crit_dmg_points: 0,
        vamp_points: 0,
        reflect_points: 0
    };

    // Маппинг характеристик на поля в classData
    const statToField = {
        hp: 'hp_points',
        atk: 'atk_points',
        def: 'def_points',
        agi: 'dodge_points',
        int: 'int_points',
        spd: 'spd_points',
        crit: 'crit_points',
        critDmg: 'crit_dmg_points',
        vamp: 'vamp_points',
        reflect: 'reflect_points'
    };

    // Суммируем распределения
    const totalDist = { ...bestDist };
    for (let stat in otherDist) {
        totalDist[stat] = (totalDist[stat] || 0) + otherDist[stat];
    }

    // Заполняем classData
    for (let stat in totalDist) {
        const field = statToField[stat];
        if (field) {
            classData[field] = totalDist[stat];
        }
    }

    // Применяем бонусы от навыков
    stats.hp += classData.hp_points * 2;
    stats.atk += classData.atk_points;
    stats.def += classData.def_points;
    stats.agi += classData.dodge_points;
    stats.int += classData.int_points;
    stats.spd += classData.spd_points;
    stats.crit += classData.crit_points;
    stats.critDmg += classData.crit_dmg_points / 100;
    stats.vamp += classData.vamp_points;
    stats.reflect += classData.reflect_points;

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
        stats.atk += Math.floor(stats.int / 5) * 2;
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
        id: `bot_${Date.now()}_${Math.random()}`,
        username: template.name,
        class: template.class,
        subclass: template.subclass,
        level: level,
        stats: stats
    };
}

module.exports = { generateBot };
