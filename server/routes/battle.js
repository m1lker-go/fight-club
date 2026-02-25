const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Базовые характеристики для каждого класса (на 1 уровне)
const baseStats = {
    warrior: { hp: 28, atk: 3, def: 4, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 20, atk: 5, def: 1, agi: 5, int: 0, spd: 15, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 18, atk: 2, def: 1, agi: 2, int: 5, spd: 12, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
};

// Пассивные бонусы подклассов
const rolePassives = {
    knight: { reflect: 20 },
    assassin: { vamp: 20 },
    blood_hunter: { vamp: 20 }
};

// Массивы фраз для атак (по 5 на класс)
const attackPhrases = {
    warrior: [
        '%s сокрушает %s мощным ударом, нанося <span style="color:#e74c3c;">%d</span> урона!',
        '%s обрушивает топор на %s — <span style="color:#e74c3c;">%d</span> единиц боли!',
        '%s пробивает броню %s, оставляя кровавую рану на <span style="color:#e74c3c;">%d</span> HP.',
        '%s яростно атакует %s, выбивая <span style="color:#e74c3c;">%d</span> жизней.',
        '%s с размаху бьёт щитом по голове %s — <span style="color:#e74c3c;">%d</span> урона.'
    ],
    assassin: [
        '%s вонзает кинжал в спину %s, нанося <span style="color:#e74c3c;">%d</span> смертельного урона!',
        '%s бесшумно подкрадывается и режет горло %s — <span style="color:#e74c3c;">%d</span> HP.',
        '%s отравляет клинок и атакует %s — <span style="color:#e74c3c;">%d</span> урона.',
        '%s делает выпад и пронзает %s, забирая <span style="color:#e74c3c;">%d</span> жизней.',
        '%s исчезает в тени и наносит удар из ниоткуда — <span style="color:#e74c3c;">%d</span> урона.'
    ],
    mage: [
        '%s выпускает огненный шар в %s, испепеляя на <span style="color:#e74c3c;">%d</span> HP!',
        '%s читает заклинание ледяной стрелы, поражая %s — <span style="color:#e74c3c;">%d</span> урона.',
        '%s призывает молнию, которая разит %s, отнимая <span style="color:#e74c3c;">%d</span> здоровья.',
        '%s создаёт магический взрыв вокруг %s, нанося <span style="color:#e74c3c;">%d</span> урона.',
        '%s проклинает %s, и тот теряет <span style="color:#e74c3c;">%d</span> HP от магии.'
    ]
};

const dodgePhrases = [
    '<span style="color:#2ecc71;">%s ловко уклоняется от атаки %s!</span>',
    '<span style="color:#2ecc71;">%s уворачивается, и удар %s уходит в пустоту.</span>',
    '<span style="color:#2ecc71;">%s использует неуловимый манёвр, избегая удара %s.</span>'
];

const critPhrases = {
    warrior: [
        '%s с невероятной силой обрушивается на %s, нанося <span style="color:#e74c3c;">%d</span> КРИТИЧЕСКОГО урона!',
        '%s вкладывает всю ярость в удар — <span style="color:#e74c3c;">%d</span> единиц боли по %s!'
    ],
    assassin: [
        '%s находит уязвимое место и наносит сокрушительный удар — <span style="color:#e74c3c;">%d</span> смертельного крита!',
        '%s вонзает клинок по самую рукоять, нанося <span style="color:#e74c3c;">%d</span> критического урона %s!'
    ],
    mage: [
        '%s заряжает заклинание магией хаоса — <span style="color:#e74c3c;">%d</span> КРИТИЧЕСКОГО магического урона по %s!',
        '%s произносит слово силы, и взрыв выжигает <span style="color:#e74c3c;">%d</span> HP у %s!'
    ]
};

const vampPhrase = '%s восстанавливает <span style="color:#2ecc71;">%d</span> очков здоровья благодаря вампиризму.';
const reflectPhrase = '%s отражает <span style="color:#e74c3c;">%d</span> урона обратно в %s!';
const ultPhrases = {
    warrior: '<span style="color:#3498db;">%s использует НЕСОКРУШИМОСТЬ и восстанавливает %d HP!</span>',
    assassin: '<span style="color:#3498db;">%s применяет ТАНЕЦ СМЕРТИ, нанося %d урона и восстанавливая %d HP!</span>',
    mage: '<span style="color:#3498db;">%s активирует ЧИСТУЮ ЭНЕРГИЮ, нанося %d магического урона!</span>'
};

function calculateStats(classData, inventory, subclass) {
    const base = baseStats[classData.class] || baseStats.warrior;
    // Фильтруем только предметы, принадлежащие текущему классу
    const classInventory = inventory.filter(item => item.owner_class === classData.class);

    let stats = {
        hp: base.hp + (classData.hp_points || 0) * 2,
        atk: base.atk + (classData.atk_points || 0),
        def: base.def + (classData.def_points || 0),
        agi: base.agi + (classData.agi_points || 0),
        int: base.int + (classData.int_points || 0),
        spd: base.spd + (classData.spd_points || 0),
        crit: base.crit + (classData.crit_points || 0),
        critDmg: 1.5 + ((classData.crit_dmg_points || 0) / 100),
        vamp: base.vamp + (classData.vamp_points || 0),
        reflect: base.reflect + (classData.reflect_points || 0),
        manaMax: 100,
        manaRegen: classData.class === 'warrior' ? 15 : (classData.class === 'assassin' ? 18 : 30)
    };

    classInventory.forEach(item => {
        stats.hp += item.hp_bonus || 0;
        stats.atk += item.atk_bonus || 0;
        stats.def += item.def_bonus || 0;
        stats.agi += item.agi_bonus || 0;
        stats.int += item.int_bonus || 0;
        stats.spd += item.spd_bonus || 0;
        stats.crit += item.crit_bonus || 0;
        stats.critDmg += (item.crit_dmg_bonus || 0) / 100;
        stats.vamp += item.vamp_bonus || 0;
        stats.reflect += item.reflect_bonus || 0;
    });

    // Пассивки подкласса
    const roleBonus = rolePassives[subclass] || {};
    if (roleBonus.vamp) stats.vamp += roleBonus.vamp;
    if (roleBonus.reflect) stats.reflect += roleBonus.reflect;

    // Классовые бонусы
    if (classData.class === 'warrior') {
        stats.def = Math.min(70, stats.def * 1.5);
    } else if (classData.class === 'assassin') {
        stats.atk = Math.floor(stats.atk * 1.2);
        stats.crit = Math.min(100, stats.crit * 1.25);
        stats.agi = Math.min(100, stats.agi * 1.1);
    } else if (classData.class === 'mage') {
        stats.atk = Math.floor(stats.atk * 1.2);
        stats.int = stats.int * 1.2;
    }

    // Ограничения
    stats.def = Math.min(70, stats.def);
    stats.crit = Math.min(100, stats.crit);
    stats.agi = Math.min(100, stats.agi);

    return stats;
}

function performAttack(attackerStats, defenderStats, attackerVamp, defenderReflect, attackerName, defenderName, attackerClass) {
    const hitChance = Math.min(100, Math.max(5, 100 - defenderStats.agi));
    const isDodge = Math.random() * 100 > hitChance;
    if (isDodge) {
        const phrase = dodgePhrases[Math.floor(Math.random() * dodgePhrases.length)]
            .replace('%s', defenderName)
            .replace('%s', attackerName);
        return { hit: false, damage: 0, isCrit: false, log: phrase, reflectDamage: 0, vampHeal: 0 };
    }

    let damage = attackerStats.atk;
    const isCrit = Math.random() * 100 < attackerStats.crit;
    if (isCrit) {
        damage *= attackerStats.critDmg;
    }

    damage = damage * (1 - defenderStats.def / 100);
    damage = Math.max(1, Math.floor(damage));

    let vampHeal = 0;
    if (attackerVamp > 0) {
        vampHeal = Math.floor(damage * attackerVamp / 100);
    }

    let reflectDamage = 0;
    if (defenderReflect > 0) {
        reflectDamage = Math.floor(damage * defenderReflect / 100);
    }

    let attackPhrase;
    if (isCrit) {
        const classPhrases = critPhrases[attackerClass] || critPhrases.warrior;
        attackPhrase = classPhrases[Math.floor(Math.random() * classPhrases.length)];
        attackPhrase = attackPhrase.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
    } else {
        const classPhrases = attackPhrases[attackerClass] || attackPhrases.warrior;
        attackPhrase = classPhrases[Math.floor(Math.random() * classPhrases.length)];
        attackPhrase = attackPhrase.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
    }

    return { hit: true, damage, isCrit, log: attackPhrase, reflectDamage, vampHeal };
}

function performUltimate(attackerStats, defenderStats, className, attackerName, defenderName) {
    let damage = 0;
    let heal = 0;
    let log = '';

    switch (className) {
        case 'warrior':
            heal = Math.floor(attackerStats.hp * 0.3);
            log = ultPhrases.warrior.replace('%s', attackerName).replace('%d', heal);
            break;
        case 'assassin':
            damage = Math.floor(attackerStats.atk * 3);
            heal = Math.floor(damage * 0.5);
            log = ultPhrases.assassin.replace('%s', attackerName).replace('%d', damage).replace('%d', heal);
            break;
        case 'mage':
            damage = Math.floor(attackerStats.atk * 4);
            log = ultPhrases.mage.replace('%s', attackerName).replace('%d', damage);
            break;
        default:
            return { damage: 0, heal: 0, log: 'ничего не произошло' };
    }
    return { damage, heal, log };
}

function simulateBattle(playerStats, enemyStats, playerClass, enemyClass, playerName, enemyName) {
    let playerHp = playerStats.hp;
    let enemyHp = enemyStats.hp;
    let playerMana = 0;
    let enemyMana = 0;
    const log = [];
    const turns = [];

    let turn = playerStats.spd >= enemyStats.spd ? 'player' : 'enemy';
    let maxTurns = 100;
    let t = 0;

    while (playerHp > 0 && enemyHp > 0 && t < maxTurns) {
        t++;
        const turnState = {
            turn,
            playerHp,
            enemyHp,
            playerMana,
            enemyMana,
            action: null
        };

        if (turn === 'player') {
            playerMana = Math.min(100, playerMana + playerStats.manaRegen);
            let actionLog = '';
            if (playerMana >= 100) {
                const ult = performUltimate(playerStats, enemyStats, playerClass, playerName, enemyName);
                if (ult.damage > 0) enemyHp -= ult.damage;
                if (ult.heal > 0) playerHp = Math.min(playerStats.hp, playerHp + ult.heal);
                actionLog = ult.log;
                playerMana -= 100;
            } else {
                const attackResult = performAttack(playerStats, enemyStats, playerStats.vamp, enemyStats.reflect, playerName, enemyName, playerClass);
                if (attackResult.hit) {
                    enemyHp -= attackResult.damage;
                    playerHp = Math.min(playerStats.hp, playerHp + attackResult.vampHeal);
                    playerHp -= attackResult.reflectDamage;
                    actionLog = attackResult.log;
                    if (attackResult.vampHeal > 0) {
                        actionLog += ' ' + vampPhrase.replace('%s', playerName).replace('%d', attackResult.vampHeal);
                    }
                    if (attackResult.reflectDamage > 0) {
                        actionLog += ' ' + reflectPhrase.replace('%s', enemyName).replace('%d', attackResult.reflectDamage).replace('%s', playerName);
                    }
                } else {
                    actionLog = attackResult.log;
                }
            }
            log.push(actionLog);
            turnState.action = actionLog;
            turn = 'enemy';
        } else {
            enemyMana = Math.min(100, enemyMana + enemyStats.manaRegen);
            let actionLog = '';
            if (enemyMana >= 100) {
                const ult = performUltimate(enemyStats, playerStats, enemyClass, enemyName, playerName);
                if (ult.damage > 0) playerHp -= ult.damage;
                if (ult.heal > 0) enemyHp = Math.min(enemyStats.hp, enemyHp + ult.heal);
                actionLog = ult.log;
                enemyMana -= 100;
            } else {
                const attackResult = performAttack(enemyStats, playerStats, enemyStats.vamp, playerStats.reflect, enemyName, playerName, enemyClass);
                if (attackResult.hit) {
                    playerHp -= attackResult.damage;
                    enemyHp = Math.min(enemyStats.hp, enemyHp + attackResult.vampHeal);
                    enemyHp -= attackResult.reflectDamage;
                    actionLog = attackResult.log;
                    if (attackResult.vampHeal > 0) {
                        actionLog += ' ' + vampPhrase.replace('%s', enemyName).replace('%d', attackResult.vampHeal);
                    }
                    if (attackResult.reflectDamage > 0) {
                        actionLog += ' ' + reflectPhrase.replace('%s', playerName).replace('%d', attackResult.reflectDamage).replace('%s', enemyName);
                    }
                } else {
                    actionLog = attackResult.log;
                }
            }
            log.push(actionLog);
            turnState.action = actionLog;
            turn = 'player';
        }
        turns.push(turnState);
    }

    let winner = null;
    if (playerHp <= 0 && enemyHp <= 0) winner = 'draw';
    else if (playerHp <= 0) winner = 'enemy';
    else if (enemyHp <= 0) winner = 'player';

// После определения winner, перед return:
const victoryPhrases = [
    'Вы наносите сокрушительный удар. Соперник повержен. <span style="color:#2ecc71;">ПОБЕДА!</span>',
    'Ваша атака не оставляет шансов. Враг падает. <span style="color:#2ecc71;">ПОБЕДА!</span>',
    'С последним ударом противник рушится на землю. <span style="color:#2ecc71;">ПОБЕДА!</span>',
    'Вы оказались сильнее. Бой окончен. <span style="color:#2ecc71;">ПОБЕДА!</span>',
    'Невероятная схватка! Вы выходите победителем. <span style="color:#2ecc71;">ПОБЕДА!</span>'
];
const defeatPhrases = [
    'Соперник наносит решающий удар. Вы повержены. <span style="color:#e74c3c;">ПОРАЖЕНИЕ!</span>',
    'Ваши силы иссякли... Это поражение. <span style="color:#e74c3c;">ПОРАЖЕНИЕ!</span>',
    'Удар оказался смертельным. Вы проиграли. <span style="color:#e74c3c;">ПОРАЖЕНИЕ!</span>',
    'Противник оказался сильнее. <span style="color:#e74c3c;">ПОРАЖЕНИЕ!</span>',
    'Бой закончен. Увы, победа не ваша. <span style="color:#e74c3c;">ПОРАЖЕНИЕ!</span>'
];
const drawPhrases = [
    'Оба бойца падают одновременно. Ничья!',
    'Взаимный удар – никто не выжил. Ничья.'
];

let finalPhrase = '';
if (winner === 'player') {
    finalPhrase = victoryPhrases[Math.floor(Math.random() * victoryPhrases.length)];
} else if (winner === 'enemy') {
    finalPhrase = defeatPhrases[Math.floor(Math.random() * defeatPhrases.length)];
} else {
    finalPhrase = drawPhrases[Math.floor(Math.random() * drawPhrases.length)];
}
log.push(finalPhrase);
turns.push({ turn: 'final', action: finalPhrase }); // можно добавить, но не обязательно
    
    return {
        winner,
        playerHpRemain: Math.max(0, playerHp),
        enemyHpRemain: Math.max(0, enemyHp),
        log,
        turns,
        playerMaxHp: playerStats.hp,
        enemyMaxHp: enemyStats.hp
    };
}

// Фиксированные значения бонусов по редкости (копия из shop.js)
const fixedStats = {
    common: {
        atk_bonus: 1,
        def_bonus: 1,
        hp_bonus: 2,
        agi_bonus: 0,
        int_bonus: 0,
        spd_bonus: 0,
        crit_bonus: 1,
        crit_dmg_bonus: 3,
        vamp_bonus: 0,
        reflect_bonus: 0
    },
    uncommon: {
        atk_bonus: 2,
        def_bonus: 2,
        hp_bonus: 4,
        agi_bonus: 1,
        int_bonus: 1,
        spd_bonus: 1,
        crit_bonus: 2,
        crit_dmg_bonus: 5,
        vamp_bonus: 1,
        reflect_bonus: 1
    },
    rare: {
        atk_bonus: 3,
        def_bonus: 3,
        hp_bonus: 6,
        agi_bonus: 2,
        int_bonus: 2,
        spd_bonus: 2,
        crit_bonus: 3,
        crit_dmg_bonus: 8,
        vamp_bonus: 2,
        reflect_bonus: 2
    },
    epic: {
        atk_bonus: 5,
        def_bonus: 5,
        hp_bonus: 10,
        agi_bonus: 3,
        int_bonus: 3,
        spd_bonus: 3,
        crit_bonus: 5,
        crit_dmg_bonus: 12,
        vamp_bonus: 3,
        reflect_bonus: 3
    },
    legendary: {
        atk_bonus: 7,
        def_bonus: 7,
        hp_bonus: 15,
        agi_bonus: 4,
        int_bonus: 4,
        spd_bonus: 4,
        crit_bonus: 7,
        crit_dmg_bonus: 18,
        vamp_bonus: 4,
        reflect_bonus: 4
    }
};

// Типы предметов и соответствующие им поля бонусов
const itemTypes = [
    { type: 'weapon', stat: 'atk_bonus' },
    { type: 'armor', stat: 'def_bonus' },
    { type: 'helmet', stat: 'hp_bonus' },
    { type: 'gloves', stat: 'agi_bonus' },
    { type: 'boots', stat: 'spd_bonus' },
    { type: 'accessory', stat: 'crit_bonus' }
];

// Диапазоны уровней и вероятности выпадения редкостей
const rarityChances = [
    { minLevel: 1, maxLevel: 5,   common: 0.6, uncommon: 0.3, rare: 0.1, epic: 0, legendary: 0 },
    { minLevel: 6, maxLevel: 10,  common: 0.4, uncommon: 0.4, rare: 0.15, epic: 0.05, legendary: 0 },
    { minLevel: 11, maxLevel: 15, common: 0.2, uncommon: 0.4, rare: 0.3, epic: 0.1, legendary: 0 },
    { minLevel: 16, maxLevel: 20, common: 0.1, uncommon: 0.3, rare: 0.4, epic: 0.15, legendary: 0.05 },
    { minLevel: 21, maxLevel: 25, common: 0, uncommon: 0.2, rare: 0.4, epic: 0.3, legendary: 0.1 },
    { minLevel: 26, maxLevel: 30, common: 0, uncommon: 0.1, rare: 0.3, epic: 0.4, legendary: 0.2 },
    { minLevel: 31, maxLevel: 35, common: 0, uncommon: 0.05, rare: 0.25, epic: 0.4, legendary: 0.3 },
    { minLevel: 36, maxLevel: 40, common: 0, uncommon: 0, rare: 0.2, epic: 0.4, legendary: 0.4 },
    { minLevel: 41, maxLevel: 45, common: 0, uncommon: 0, rare: 0.15, epic: 0.35, legendary: 0.5 },
    { minLevel: 46, maxLevel: 50, common: 0, uncommon: 0, rare: 0.1, epic: 0.3, legendary: 0.6 },
    { minLevel: 51, maxLevel: 55, common: 0, uncommon: 0, rare: 0.05, epic: 0.25, legendary: 0.7 },
    { minLevel: 56, maxLevel: 60, common: 0, uncommon: 0, rare: 0, epic: 0.2, legendary: 0.8 }
];

function getRandomRarity(level) {
    const range = rarityChances.find(r => level >= r.minLevel && level <= r.maxLevel);
    if (!range) return 'common';
    const rand = Math.random();
    if (rand < range.common) return 'common';
    if (rand < range.common + range.uncommon) return 'uncommon';
    if (rand < range.common + range.uncommon + range.rare) return 'rare';
    if (rand < range.common + range.uncommon + range.rare + range.epic) return 'epic';
    return 'legendary';
}

function generateBot(playerLevel) {
    const level = Math.max(1, Math.min(60, playerLevel - 2 + Math.floor(Math.random() * 5)));
    const names = [
        { name: 'Деревянный манекен', class: 'warrior', subclass: 'guardian' },
        { name: 'Деревянный манекен', class: 'warrior', subclass: 'berserker' },
        { name: 'Деревянный манекен', class: 'warrior', subclass: 'knight' },
        { name: 'Серебряный защитник', class: 'assassin', subclass: 'assassin' },
        { name: 'Серебряный защитник', class: 'assassin', subclass: 'venom_blade' },
        { name: 'Серебряный защитник', class: 'assassin', subclass: 'blood_hunter' },
        { name: 'Золотой защитник', class: 'mage', subclass: 'pyromancer' },
        { name: 'Золотой защитник', class: 'mage', subclass: 'cryomancer' },
        { name: 'Золотой защитник', class: 'mage', subclass: 'illusionist' },
        { name: 'Изумрудный защитник', class: 'warrior', subclass: 'guardian' },
        { name: 'Изумрудный защитник', class: 'warrior', subclass: 'berserker' },
        { name: 'Изумрудный защитник', class: 'warrior', subclass: 'knight' },
        { name: 'Изумрудный защитник', class: 'assassin', subclass: 'assassin' },
        { name: 'Изумрудный защитник', class: 'assassin', subclass: 'venom_blade' },
        { name: 'Изумрудный защитник', class: 'assassin', subclass: 'blood_hunter' },
        { name: 'Изумрудный защитник', class: 'mage', subclass: 'pyromancer' },
        { name: 'Изумрудный защитник', class: 'mage', subclass: 'cryomancer' },
        { name: 'Изумрудный защитник', class: 'mage', subclass: 'illusionist' },
        { name: 'Защитник королевства', class: 'warrior', subclass: 'guardian' },
        { name: 'Защитник королевства', class: 'warrior', subclass: 'berserker' },
        { name: 'Защитник королевства', class: 'warrior', subclass: 'knight' },
        { name: 'Защитник королевства', class: 'assassin', subclass: 'assassin' },
        { name: 'Защитник королевства', class: 'assassin', subclass: 'venom_blade' },
        { name: 'Защитник королевства', class: 'assassin', subclass: 'blood_hunter' },
        { name: 'Защитник королевства', class: 'mage', subclass: 'pyromancer' },
        { name: 'Защитник королевства', class: 'mage', subclass: 'cryomancer' },
        { name: 'Защитник королевства', class: 'mage', subclass: 'illusionist' }
    ];
    const template = names[Math.floor(Math.random() * names.length)];

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

    const totalSkillPoints = (level - 1) * 3;
    const skillDist = [0,0,0,0,0,0,0,0,0,0];
    for (let i = 0; i < totalSkillPoints; i++) {
        skillDist[Math.floor(Math.random() * 10)]++;
    }
    stats.hp += skillDist[0] * 2;
    stats.atk += skillDist[1];
    stats.def += skillDist[2];
    stats.agi += skillDist[3];
    stats.int += skillDist[4];
    stats.spd += skillDist[5];
    stats.crit += skillDist[6];
    stats.critDmg += skillDist[7] / 100;
    stats.vamp += skillDist[8];
    stats.reflect += skillDist[9];

    const itemCount = 3 + Math.floor(Math.random() * 4);
    const usedTypes = new Set();
    for (let i = 0; i < itemCount; i++) {
        const availableTypes = itemTypes.filter(t => !usedTypes.has(t.type));
        if (availableTypes.length === 0) break;
        const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        usedTypes.add(type.type);
        const rarity = getRandomRarity(level);
        const bonuses = fixedStats[rarity];
        const allFields = Object.keys(bonuses);
        const shuffled = allFields.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 2);
        selected.forEach(field => {
            if (field === 'atk_bonus') stats.atk += bonuses[field];
            else if (field === 'def_bonus') stats.def += bonuses[field];
            else if (field === 'hp_bonus') stats.hp += bonuses[field];
            else if (field === 'agi_bonus') stats.agi += bonuses[field];
            else if (field === 'int_bonus') stats.int += bonuses[field];
            else if (field === 'spd_bonus') stats.spd += bonuses[field];
            else if (field === 'crit_bonus') stats.crit += bonuses[field];
            else if (field === 'crit_dmg_bonus') stats.critDmg += bonuses[field] / 100;
            else if (field === 'vamp_bonus') stats.vamp += bonuses[field];
            else if (field === 'reflect_bonus') stats.reflect += bonuses[field];
        });
    }

    const roleBonus = rolePassives[template.subclass] || {};
    if (roleBonus.vamp) stats.vamp += roleBonus.vamp;
    if (roleBonus.reflect) stats.reflect += roleBonus.reflect;

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

function expNeeded(level) {
    return Math.floor(80 * Math.pow(level, 1.5));
}

async function addExp(client, userId, className, expGain) {
    const classRes = await client.query(
        'SELECT level, exp FROM user_classes WHERE user_id = $1 AND class = $2',
        [userId, className]
    );
    let { level, exp } = classRes.rows[0];
    exp += expGain;
    let leveledUp = false;
    while (exp >= expNeeded(level)) {
        exp -= expNeeded(level);
        level++;
        leveledUp = true;
        await client.query(
            'UPDATE user_classes SET skill_points = skill_points + 3 WHERE user_id = $1 AND class = $2',
            [userId, className]
        );
    }
    await client.query(
        'UPDATE user_classes SET level = $1, exp = $2 WHERE user_id = $3 AND class = $4',
        [level, exp, userId, className]
    );
    return leveledUp;
}

function getCoinReward(streak) {
    if (streak >= 25) return 20;
    if (streak >= 10) return 10;
    if (streak >= 5) return 7;
    return 5;
}

async function rechargeEnergy(client, userId) {
    const user = await client.query('SELECT energy, last_energy FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return;
    const last = new Date(user.rows[0].last_energy);
    const now = new Date();
    const diffMinutes = Math.floor((now - last) / (1000 * 60));
    if (diffMinutes > 0) {
        const newEnergy = Math.min(20, user.rows[0].energy + diffMinutes);
        await client.query(
            'UPDATE users SET energy = $1, last_energy = $2 WHERE id = $3',
            [newEnergy, now, userId]
        );
    }
}

router.post('/start', async (req, res) => {
    const { tg_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userData = user.rows[0];

        await rechargeEnergy(client, userData.id);

        if (userData.energy < 1) throw new Error('Not enough energy');

        const classData = await client.query(
            'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
            [userData.id, userData.current_class]
        );
        if (classData.rows.length === 0) throw new Error('Class data not found');

        const inv = await client.query(
            `SELECT id, name, type, rarity, class_restriction, owner_class,
                    atk_bonus, def_bonus, hp_bonus, agi_bonus, int_bonus, spd_bonus,
                    crit_bonus, crit_dmg_bonus, vamp_bonus, reflect_bonus
             FROM inventory
             WHERE user_id = $1 AND equipped = true`,
            [userData.id]
        );
        const playerInventory = inv.rows;

        const playerStats = calculateStats(classData.rows[0], playerInventory, userData.subclass);
        const bot = generateBot(classData.rows[0].level);

        const battleResult = simulateBattle(playerStats, bot.stats, userData.current_class, bot.class, userData.username, bot.username);

        let isVictory = false;
        if (battleResult.winner === 'player') isVictory = true;
        else if (battleResult.winner === 'enemy') isVictory = false;
        else isVictory = false;

        let expGain = isVictory ? 10 : 3;
        let coinReward = 0;
        let newStreak = userData.win_streak || 0;

        if (isVictory) {
            newStreak++;
            coinReward = getCoinReward(newStreak);
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [coinReward, userData.id]);
        } else {
            newStreak = 0;
        }

        await client.query('UPDATE users SET win_streak = $1 WHERE id = $2', [newStreak, userData.id]);

        const leveledUp = await addExp(client, userData.id, userData.current_class, expGain);

        await client.query('UPDATE users SET energy = energy - 1 WHERE id = $1', [userData.id]);

        await client.query('COMMIT');

        res.json({
            opponent: {
                username: bot.username,
                class: bot.class,
                subclass: bot.subclass,
                level: bot.level
            },
            result: {
                winner: battleResult.winner,
                playerHpRemain: battleResult.playerHpRemain,
                enemyHpRemain: battleResult.enemyHpRemain,
                playerMaxHp: battleResult.playerMaxHp,
                enemyMaxHp: battleResult.enemyMaxHp,
                log: battleResult.log,
                turns: battleResult.turns
            },
            reward: {
                exp: expGain,
                coins: coinReward,
                leveledUp
            },
            ratingChange: isVictory ? 15 : -15
        });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
