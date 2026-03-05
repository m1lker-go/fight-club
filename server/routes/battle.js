const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { updatePlayerPower } = require('../utils/power');
const { generateBot } = require('../utils/botGenerator'); // импортируем нового генератора ботов

// Базовые характеристики для каждого класса (новые значения)
const baseStats = {
    warrior: { hp: 30, atk: 3, def: 5, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 18, atk: 4, def: 1, agi: 5, int: 0, spd: 14, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 18, atk: 3, def: 1, agi: 3, int: 6, spd: 14, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
};

// Пассивные бонусы подклассов
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

// Фразы для атак (по 5 на класс)
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
const poisonStackPhrase = '<span style="color:#27ae60;">Яд накапливается на %s (+%d стак, всего %d).</span>';
const burnStackPhrase = '<span style="color:#e67e22;">Пламя усиливается на %s (+%d стак, всего %d).</span>';
const poisonPhrases = [
    '<span style="color:#27ae60;">Яд разъедает плоть %s, нанося %d урона.</span>',
    '<span style="color:#27ae60;">%s страдает от яда, теряя %d HP.</span>',
    '<span style="color:#27ae60;">Отравление усиливается: %s получает %d урона.</span>'
];
const burnPhrases = [
    '<span style="color:#e67e22;">Пламя пожирает %s, нанося %d урона.</span>',
    '<span style="color:#e67e22;">Огонь обжигает %s — %d единиц боли.</span>',
    '<span style="color:#e67e22;">Горящие души терзают %s, отнимая %d HP.</span>'
];
const selfDamagePhrase = '<span style="color:#e74c3c;">%s жертвует частью своей жизни, теряя %d HP.</span>';

const ultPhrases = {
    guardian: '<span style="color:#3498db;">%s использует НЕСОКРУШИМОСТЬ и восстанавливает %d HP!</span>',
    berserker: '<span style="color:#3498db;">%s применяет КРОВОПУСКАНИЕ, нанося %d урона ценой %d HP!</span>',
    knight: '<span style="color:#3498db;">%s активирует ЩИТ ПРАВОСУДИЯ, увеличивая отражение на 50%% на 2 хода!</span>',
    assassin: '<span style="color:#3498db;">%s наносит СМЕРТЕЛЬНЫЙ УДАР, критически поражая %s на %d урона!</span>',
    venom_blade: '<span style="color:#3498db;">%s применяет ЯДОВИТУЮ ВОЛНУ, нанося %d урона ядом!</span>',
    blood_hunter: '<span style="color:#3498db;">%s активирует КРОВАВУЮ ЖАТВУ, усиливая вампиризм и нанося %d урона!</span>',
    pyromancer: '<span style="color:#3498db;">%s обрушивает ОГНЕННЫЙ ШТОРМ на %s, нанося %d урона!</span>',
    cryomancer: '<span style="color:#3498db;">%s призывает ВЕЧНУЮ ЗИМУ, замораживая %s и нанося %d урона!</span>',
    illusionist: '<span style="color:#3498db;">%s создаёт ЗАЗЕРКАЛЬЕ, заставляя %s атаковать себя, нанося %d урона!</span>'
};

function applyIntBonus(damage, int) {
    return Math.floor(damage * (1 + int / 100));
}

function getBerserkerAtkBonus(currentHp, maxHp, baseAtk) {
    const hpPercent = (currentHp / maxHp) * 100;
    let bonusPercent = 0;
    if (hpPercent < 20) {
        bonusPercent = 50;
    } else if (hpPercent < 50) {
        bonusPercent = 30;
    } else if (hpPercent < 80) {
        bonusPercent = 15;
    } else {
        bonusPercent = 5;
    }
    return Math.max(1, Math.floor(baseAtk * bonusPercent / 100));
}

function calculateStats(classData, inventory, subclass) {
    const base = baseStats[classData.class] || baseStats.warrior;
    const classInventory = inventory.filter(item => item.owner_class === classData.class);

    let stats = {
        hp: base.hp + (classData.hp_points || 0) * 2,
        atk: base.atk + (classData.atk_points || 0),
        def: base.def + (classData.def_points || 0),
        agi: base.agi + (classData.dodge_points || 0),
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

    // Классовые особенности (постоянные бонусы)
    if (classData.class === 'warrior') {
        stats.hp += Math.floor(stats.def / 5) * 3;
    }
    if (classData.class === 'assassin') {
        stats.spd += Math.floor(stats.agi / 5);
    }
    if (classData.class === 'mage') {
        stats.atk += Math.floor(stats.int / 5) * 2;
        stats.manaRegen += Math.floor(stats.int / 5) * 2; // бонус к регенерации маны
    }

    // Пассивные бонусы подклассов (добавляем к статам, чтобы они влияли на бой)
    const roleBonus = rolePassives[subclass] || {};
    if (roleBonus.vamp) stats.vamp += roleBonus.vamp;
    if (roleBonus.reflect) stats.reflect += roleBonus.reflect;

    // Классовые бонусы (умножение)
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

    stats.def = Math.min(70, stats.def);
    stats.crit = Math.min(100, stats.crit);
    stats.agi = Math.min(100, stats.agi);

    return stats;
}

function performAttack(attackerStats, defenderStats, attackerVamp, defenderReflect, attackerName, defenderName, attackerClass, attackerSubclass, defenderSubclass, attackerState, defenderState) {
    let extraLogs = [];

    if (defenderSubclass === 'illusionist' && rolePassives.illusionist?.mirageGuaranteed) {
        defenderState.mirageCounter = (defenderState.mirageCounter || 0) + 1;
        if (defenderState.mirageCounter >= 4) {
            defenderState.mirageCounter = 0;
            const phrase = dodgePhrases[Math.floor(Math.random() * dodgePhrases.length)]
                .replace('%s', defenderName)
                .replace('%s', attackerName);
            return { hit: false, damage: 0, isCrit: false, log: phrase, reflectDamage: 0, vampHeal: 0, stateChanges: { mirageCounter: 0 }, extraLogs };
        }
    }

    const hitChance = Math.min(100, Math.max(5, 100 - defenderStats.agi));
    const isDodge = Math.random() * 100 > hitChance;
    if (isDodge) {
        const phrase = dodgePhrases[Math.floor(Math.random() * dodgePhrases.length)]
            .replace('%s', defenderName)
            .replace('%s', attackerName);
        return { hit: false, damage: 0, isCrit: false, log: phrase, reflectDamage: 0, vampHeal: 0, stateChanges: {}, extraLogs };
    }

    let damage = attackerStats.atk;

    // Бонус мага: +2 урона за каждые 5 интеллекта
    if (attackerClass === 'mage') {
        damage += Math.floor(attackerStats.int / 5) * 2;
    }

    let berserkerBonus = 0;
    if (attackerSubclass === 'berserker' && rolePassives.berserker?.rage) {
        const bonus = getBerserkerAtkBonus(attackerState.hp, attackerStats.hp, attackerStats.atk);
        damage += bonus;
        berserkerBonus = bonus;
    }
    let isCrit = false;
    let critMultiplier = attackerStats.critDmg;

    if (attackerSubclass === 'assassin' && rolePassives.assassin.critMultiplier) {
        critMultiplier = rolePassives.assassin.critMultiplier;
    }

    if (Math.random() * 100 < attackerStats.crit) {
        isCrit = true;
        damage *= critMultiplier;
    }

    if (defenderSubclass === 'cryomancer' && rolePassives.cryomancer.physReduction) {
        damage = Math.floor(damage * (1 - rolePassives.cryomancer.physReduction / 100));
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

    if (attackerSubclass === 'venom_blade' && rolePassives.venom_blade.poison) {
        if (!defenderState.poisonStacks) defenderState.poisonStacks = 0;
        const oldStacks = defenderState.poisonStacks;
        defenderState.poisonStacks = Math.min(30, defenderState.poisonStacks + 1);
        if (defenderState.poisonStacks > oldStacks) {
            extraLogs.push(poisonStackPhrase
                .replace('%s', defenderName)
                .replace('%d', defenderState.poisonStacks - oldStacks)
                .replace('%d', defenderState.poisonStacks));
        }
    }

    if (attackerSubclass === 'pyromancer' && rolePassives.pyromancer.burn) {
        if (!defenderState.burnStacks) defenderState.burnStacks = 0;
        const oldStacks = defenderState.burnStacks;
        defenderState.burnStacks = Math.min(30, defenderState.burnStacks + 1);
        if (defenderState.burnStacks > oldStacks) {
            extraLogs.push(burnStackPhrase
                .replace('%s', defenderName)
                .replace('%d', defenderState.burnStacks - oldStacks)
                .replace('%d', defenderState.burnStacks));
        }
    }

    let attackPhrase;
    if (isCrit) {
        const classPhrases = critPhrases[attackerClass] || critPhrases.warrior;
        attackPhrase = classPhrases[Math.floor(Math.random() * classPhrases.length)]
            .replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
    } else {
        const classPhrases = attackPhrases[attackerClass] || attackPhrases.warrior;
        attackPhrase = classPhrases[Math.floor(Math.random() * classPhrases.length)]
            .replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
    }

    return {
        hit: true,
        damage,
        isCrit,
        log: attackPhrase,
        reflectDamage,
        vampHeal,
        stateChanges: { poisonStacks: defenderState.poisonStacks, burnStacks: defenderState.burnStacks },
        berserkerBonus,
        extraLogs
    };
}

function performActiveSkill(attackerStats, defenderStats, attackerState, defenderState, attackerName, defenderName, attackerSubclass, defenderSubclass) {
    let damage = 0;
    let selfDamage = 0;
    let heal = 0;
    let log = '';
    let stateChanges = {};

    const intBonus = 1 + attackerStats.int / 100;

    switch (attackerSubclass) {
        case 'guardian':
            heal = Math.floor(attackerStats.hp * 0.2);
            log = ultPhrases.guardian.replace('%s', attackerName).replace('%d', heal);
            break;
        case 'berserker':
            selfDamage = Math.floor(attackerStats.hp * 0.3);
            selfDamage = Math.min(selfDamage, attackerState.hp - 1);
            damage = applyIntBonus(attackerStats.atk * 3, attackerStats.int);
            log = ultPhrases.berserker.replace('%s', attackerName).replace('%d', damage).replace('%d', selfDamage);
            break;
        case 'knight':
            attackerState.reflectBuff = 2;
            attackerState.reflectBonus = 50;
            log = ultPhrases.knight.replace('%s', attackerName);
            break;
        case 'assassin':
            damage = applyIntBonus(attackerStats.atk * 3.5, attackerStats.int);
            log = ultPhrases.assassin.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            break;
        case 'venom_blade':
            const stacks = defenderState.poisonStacks || 0;
            damage = stacks * 5;
            log = ultPhrases.venom_blade.replace('%s', attackerName).replace('%d', damage);
            defenderState.poisonStacks = 0;
            break;
        case 'blood_hunter':
            damage = applyIntBonus(attackerStats.atk * 1.5, attackerStats.int);
            attackerState.vampBuff = 2;
            attackerState.vampBonus = 50;
            log = ultPhrases.blood_hunter.replace('%s', attackerName).replace('%d', damage);
            break;
        case 'pyromancer':
            damage = applyIntBonus(attackerStats.atk * 4, attackerStats.int);
            if (!defenderState.burnStacks) defenderState.burnStacks = 0;
            defenderState.burnStacks += Math.floor(damage * 0.5);
            log = ultPhrases.pyromancer.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            break;
        case 'cryomancer':
            let frozen = defenderState.frozen;
            damage = applyIntBonus(attackerStats.atk * 2, attackerStats.int);
            if (frozen) damage *= 2;
            defenderState.frozen = 1;
            log = ultPhrases.cryomancer.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            break;
        case 'illusionist':
            damage = applyIntBonus(defenderStats.atk * 2, defenderStats.int);
            log = ultPhrases.illusionist.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            break;
        default:
            return { damage: 0, heal: 0, log: 'ничего не произошло', selfDamage: 0, stateChanges: {} };
    }

    return { damage, heal, log, selfDamage, stateChanges };
}

function applyTurnStartEffects(attackerStats, defenderState, attackerName, defenderName, attackerSubclass, attackerState) {
    let damageToDefender = 0;
    let damageToSelf = 0;
    let logEntries = [];

    if (defenderState.poisonStacks && defenderState.poisonStacks > 0) {
        const poisonDamage = defenderState.poisonStacks * 2;
        damageToDefender += poisonDamage;
        const phrase = poisonPhrases[Math.floor(Math.random() * poisonPhrases.length)]
            .replace('%s', defenderName)
            .replace('%d', poisonDamage);
        logEntries.push(phrase);
    }

    if (defenderState.burnStacks && defenderState.burnStacks > 0) {
        const burnDamage = defenderState.burnStacks * 2;
        damageToDefender += burnDamage;
        const phrase = burnPhrases[Math.floor(Math.random() * burnPhrases.length)]
            .replace('%s', defenderName)
            .replace('%d', burnDamage);
        logEntries.push(phrase);
    }

    if (attackerSubclass === 'berserker' && attackerState.hp > 1) {
        const rageDamage = Math.max(1, Math.floor(attackerStats.atk * 0.1));
        damageToSelf = Math.min(rageDamage, attackerState.hp - 1);
        if (damageToSelf > 0) {
            logEntries.push(selfDamagePhrase.replace('%s', attackerName).replace('%d', damageToSelf));
        }
    }

    return { damageToDefender, damageToSelf, logEntries };
}

function simulateBattle(playerStats, enemyStats, playerClass, enemyClass, playerName, enemyName, playerSubclass, enemySubclass) {
    let playerHp = playerStats.hp;
    let enemyHp = enemyStats.hp;
    let playerMana = 0;
    let enemyMana = 0;
    const log = [];
    const turns = [];

    let playerState = {
        poisonStacks: 0,
        burnStacks: 0,
        frozen: 0,
        reflectBuff: 0,
        reflectBonus: 0,
        vampBuff: 0,
        vampBonus: 0,
        hp: playerHp,
        mirageCounter: 0
    };
    let enemyState = {
        poisonStacks: 0,
        burnStacks: 0,
        frozen: 0,
        reflectBuff: 0,
        reflectBonus: 0,
        vampBuff: 0,
        vampBonus: 0,
        hp: enemyHp,
        mirageCounter: 0
    };

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
            playerState.hp = playerHp;
            enemyState.hp = enemyHp;

            const startEffects = applyTurnStartEffects(playerStats, enemyState, playerName, enemyName, playerSubclass, playerState);
            if (startEffects.damageToDefender > 0) {
                enemyHp -= startEffects.damageToDefender;
                log.push(...startEffects.logEntries);
            }
            if (startEffects.damageToSelf > 0) {
                playerHp -= startEffects.damageToSelf;
                log.push(...startEffects.logEntries);
            }

            if (enemyState.frozen > 0) {
                enemyState.frozen--;
            }

            playerMana = Math.min(100, playerMana + playerStats.manaRegen);
            let actionLog = '';

            if (playerMana >= 100) {
                const skill = performActiveSkill(playerStats, enemyStats, playerState, enemyState, playerName, enemyName, playerSubclass, enemySubclass);
                if (skill.damage > 0) enemyHp -= skill.damage;
                if (skill.heal > 0) playerHp += skill.heal;
                if (skill.selfDamage > 0) playerHp -= skill.selfDamage;
                actionLog = skill.log;
                playerMana -= 100;
                if (skill.stateChanges) Object.assign(enemyState, skill.stateChanges);
            } else {
                const attackResult = performAttack(
                    playerStats, enemyStats,
                    playerStats.vamp + (playerState.vampBuff > 0 ? playerState.vampBonus : 0),
                    enemyStats.reflect + (enemyState.reflectBuff > 0 ? enemyState.reflectBonus : 0),
                    playerName, enemyName,
                    playerClass, playerSubclass, enemySubclass,
                    playerState, enemyState
                );
                if (attackResult.hit) {
                    enemyHp -= attackResult.damage;
                    playerHp += attackResult.vampHeal;
                    playerHp -= attackResult.reflectDamage;
                    actionLog = attackResult.log;
                    if (attackResult.berserkerBonus > 0) {
                        actionLog += ` <span style="color:#f39c12;">(Ярость +${attackResult.berserkerBonus})</span>`;
                    }
                    if (attackResult.vampHeal > 0) {
                        actionLog += ' ' + vampPhrase.replace('%s', playerName).replace('%d', attackResult.vampHeal);
                    }
                    if (attackResult.reflectDamage > 0) {
                        actionLog += ' ' + reflectPhrase.replace('%s', enemyName).replace('%d', attackResult.reflectDamage).replace('%s', playerName);
                    }
                } else {
                    actionLog = attackResult.log;
                }
                if (attackResult.extraLogs && attackResult.extraLogs.length > 0) {
                    log.push(...attackResult.extraLogs);
                }
                if (attackResult.stateChanges) Object.assign(enemyState, attackResult.stateChanges);
            }

            log.push(actionLog);
            turnState.action = actionLog;

            if (playerState.reflectBuff > 0) playerState.reflectBuff--;
            if (playerState.vampBuff > 0) playerState.vampBuff--;

            turn = 'enemy';
        } else {
            playerState.hp = playerHp;
            enemyState.hp = enemyHp;

            const startEffects = applyTurnStartEffects(enemyStats, playerState, enemyName, playerName, enemySubclass, enemyState);
            if (startEffects.damageToDefender > 0) {
                playerHp -= startEffects.damageToDefender;
                log.push(...startEffects.logEntries);
            }
            if (startEffects.damageToSelf > 0) {
                enemyHp -= startEffects.damageToSelf;
                log.push(...startEffects.logEntries);
            }

            if (playerState.frozen > 0) {
                playerState.frozen--;
            }

            enemyMana = Math.min(100, enemyMana + enemyStats.manaRegen);
            let actionLog = '';

            if (enemyMana >= 100) {
                const skill = performActiveSkill(enemyStats, playerStats, enemyState, playerState, enemyName, playerName, enemySubclass, playerSubclass);
                if (skill.damage > 0) playerHp -= skill.damage;
                if (skill.heal > 0) enemyHp += skill.heal;
                if (skill.selfDamage > 0) enemyHp -= skill.selfDamage;
                actionLog = skill.log;
                enemyMana -= 100;
                if (skill.stateChanges) Object.assign(playerState, skill.stateChanges);
            } else {
                const attackResult = performAttack(
                    enemyStats, playerStats,
                    enemyStats.vamp + (enemyState.vampBuff > 0 ? enemyState.vampBonus : 0),
                    playerStats.reflect + (playerState.reflectBuff > 0 ? playerState.reflectBonus : 0),
                    enemyName, playerName,
                    enemyClass, enemySubclass, playerSubclass,
                    enemyState, playerState
                );
                if (attackResult.hit) {
                    playerHp -= attackResult.damage;
                    enemyHp += attackResult.vampHeal;
                    enemyHp -= attackResult.reflectDamage;
                    actionLog = attackResult.log;
                    if (attackResult.berserkerBonus > 0) {
                        actionLog += ` <span style="color:#f39c12;">(Ярость +${attackResult.berserkerBonus})</span>`;
                    }
                    if (attackResult.vampHeal > 0) {
                        actionLog += ' ' + vampPhrase.replace('%s', enemyName).replace('%d', attackResult.vampHeal);
                    }
                    if (attackResult.reflectDamage > 0) {
                        actionLog += ' ' + reflectPhrase.replace('%s', playerName).replace('%d', attackResult.reflectDamage).replace('%s', enemyName);
                    }
                } else {
                    actionLog = attackResult.log;
                }
                if (attackResult.extraLogs && attackResult.extraLogs.length > 0) {
                    log.push(...attackResult.extraLogs);
                }
                if (attackResult.stateChanges) Object.assign(playerState, attackResult.stateChanges);
            }

            log.push(actionLog);
            turnState.action = actionLog;

            if (enemyState.reflectBuff > 0) enemyState.reflectBuff--;
            if (enemyState.vampBuff > 0) enemyState.vampBuff--;

            turn = 'player';
        }
        turns.push(turnState);
    }

    let winner = null;
    if (playerHp <= 0 && enemyHp <= 0) winner = 'draw';
    else if (playerHp <= 0) winner = 'enemy';
    else if (enemyHp <= 0) winner = 'player';

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
    turns.push({ turn: 'final', action: finalPhrase });

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

// --- Вспомогательные функции для опыта, энергии и генерации бота ---
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
function getRatingChange(streak) {
    if (streak >= 20) return 30;
    if (streak >= 10) return 25;
    if (streak >= 5) return 20;
    return 15;
}

async function rechargeEnergy(client, userId) {
    const user = await client.query('SELECT energy, last_energy FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return;
    const last = new Date(user.rows[0].last_energy);
    const now = new Date();
    const diffMinutes = Math.floor((now - last) / (1000 * 60));
    const intervals = Math.floor(diffMinutes / 15);
    if (intervals > 0) {
        const newEnergy = Math.min(20, user.rows[0].energy + intervals);
        await client.query(
            'UPDATE users SET energy = $1, last_energy = $2 WHERE id = $3',
            [newEnergy, now, userId]
        );
    }
}

// Функция generateBot удалена – она вынесена в отдельный модуль

// Вспомогательные функции для PvP-подбора
async function getPlayerRatingPosition(client, userId) {
    const res = await client.query(`
        SELECT id, rating FROM users 
        WHERE (SELECT COUNT(*) FROM battles WHERE player1_id = id OR player2_id = id) > 0
        ORDER BY rating DESC
    `);
    const players = res.rows;
    return players.findIndex(p => p.id === userId);
}

async function selectPvPOpponent(client, currentUserId, currentPosition, allPlayers) {
    const total = allPlayers.length;
    const minPos = Math.max(0, currentPosition - 50);
    const maxPos = Math.min(total - 1, currentPosition + 50);
    const candidates = [];
    for (let i = minPos; i <= maxPos; i++) {
        if (allPlayers[i].id !== currentUserId) {
            const recent = await client.query(
                `SELECT 1 FROM users WHERE id = $1 AND last_pvp_opponent_id = $2 
                 AND last_pvp_time > NOW() - INTERVAL '15 minutes'`,
                [currentUserId, allPlayers[i].id]
            );
            if (recent.rowCount === 0) {
                candidates.push(allPlayers[i]);
            }
        }
    }
    if (candidates.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
}

// Основной маршрут начала боя
router.post('/start', async (req, res) => {
    const { tg_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userData = user.rows[0];

        await rechargeEnergy(client, userData.id);

        const energyResult = await client.query('SELECT energy FROM users WHERE id = $1', [userData.id]);
        const currentEnergy = energyResult.rows[0].energy;
        if (currentEnergy < 1) throw new Error('Недостаточно энергии');

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

        const isPvP = Math.random() < 0.3; // 30% шанс
        let opponentData = null;

        if (isPvP) {
            try {
                const playersRes = await client.query(`
                    SELECT id, rating FROM users 
                    WHERE (SELECT COUNT(*) FROM battles WHERE player1_id = id OR player2_id = id) > 0
                    ORDER BY rating DESC
                `);
                const allPlayers = playersRes.rows;
                const currentPos = allPlayers.findIndex(p => p.id === userData.id);
                if (currentPos !== -1) {
                    const opponent = await selectPvPOpponent(client, userData.id, currentPos, allPlayers);
                    if (opponent) {
                        const opponentUser = await client.query('SELECT * FROM users WHERE id = $1', [opponent.id]);
                        const opponentUserId = opponentUser.rows[0].id;
                        const powerRes = await client.query(`
                            SELECT class, power FROM user_classes WHERE user_id = $1 ORDER BY power DESC LIMIT 1
                        `, [opponentUserId]);
                        if (powerRes.rows.length > 0) {
                            const bestClass = powerRes.rows[0].class;
                            await updatePlayerPower(client, opponentUserId, bestClass);
                            const classDataRes = await client.query(
                                'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
                                [opponentUserId, bestClass]
                            );
                            const opponentClassData = classDataRes.rows[0];

                            // Случайный выбор подкласса для лучшего класса
                            const subclassOptions = {
                                warrior: ['guardian', 'berserker', 'knight'],
                                assassin: ['assassin', 'venom_blade', 'blood_hunter'],
                                mage: ['pyromancer', 'cryomancer', 'illusionist']
                            };
                            const options = subclassOptions[bestClass] || subclassOptions.warrior;
                            const randomSubclass = options[Math.floor(Math.random() * options.length)];

                            const invRes = await client.query(`
                                SELECT i.*, it.* FROM inventory i
                                JOIN items it ON i.item_id = it.id
                                WHERE i.user_id = $1 AND i.equipped = true AND it.owner_class = $2
                            `, [opponentUserId, bestClass]);
                            const opponentInventory = invRes.rows;
                            const opponentStats = calculateStats(opponentClassData, opponentInventory, randomSubclass);
                            opponentData = {
                                id: opponentUserId,
                                username: opponentUser.rows[0].username,
                                avatar_id: opponentUser.rows[0].avatar_id,
                                class: bestClass,
                                subclass: randomSubclass,
                                level: opponentClassData.level,
                                stats: opponentStats
                            };
                            await client.query(
                                `UPDATE users SET last_pvp_opponent_id = $1, last_pvp_time = NOW() WHERE id = $2`,
                                [opponentUserId, userData.id]
                            );
                        }
                    }
                }
            } catch (e) {
                console.error('Error selecting PvP opponent:', e);
            }
        }

        if (!opponentData) {
            opponentData = generateBot(classData.rows[0].level); // используется импортированная функция
        }

        const battleResult = simulateBattle(
            playerStats,
            opponentData.stats,
            userData.current_class,
            opponentData.class,
            userData.username,
            opponentData.username,
            userData.subclass,
            opponentData.subclass
        );

        let isVictory = false;
        if (battleResult.winner === 'player') isVictory = true;
        else if (battleResult.winner === 'enemy') isVictory = false;
        else isVictory = false;

        let expGain = isVictory ? 10 : 3;
        let coinReward = 0;
        let newStreak = userData.win_streak || 0;

        let ratingChange = -15;
        if (isVictory) {
            newStreak++;
            coinReward = getCoinReward(newStreak);
            const ratingGain = getRatingChange(newStreak);
            ratingChange = ratingGain;
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [coinReward, userData.id]);
            await client.query('UPDATE users SET rating = rating + $1 WHERE id = $2', [ratingGain, userData.id]);
            await client.query('UPDATE users SET season_rating = season_rating + $1 WHERE id = $2', [ratingGain, userData.id]);
        } else {
            newStreak = 0;
            await client.query('UPDATE users SET rating = GREATEST(0, rating - 15) WHERE id = $1', [userData.id]);
            await client.query('UPDATE users SET season_rating = GREATEST(0, season_rating - 15) WHERE id = $1', [userData.id]);
        }
       
        await client.query('UPDATE users SET win_streak = $1 WHERE id = $2', [newStreak, userData.id]);

        const leveledUp = await addExp(client, userData.id, userData.current_class, expGain);

        if (leveledUp) {
            await updatePlayerPower(client, userData.id, userData.current_class);
        }

        await client.query('UPDATE users SET energy = energy - 1 WHERE id = $1', [userData.id]);

        await client.query('COMMIT');

        const energyQuery = await client.query('SELECT energy FROM users WHERE id = $1', [userData.id]);
        const updatedEnergy = energyQuery.rows[0].energy;

        res.json({
            opponent: {
                username: opponentData.username,
                avatar_id: opponentData.avatar_id,
                class: opponentData.class,
                subclass: opponentData.subclass,
                level: opponentData.level
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
                leveledUp,
                newStreak
            },
            ratingChange: ratingChange,
            newEnergy: updatedEnergy
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
