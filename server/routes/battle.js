const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { updatePlayerPower } = require('../utils/power');
const { generateBot } = require('../utils/botGenerator');

// Импорт фраз из отдельного файла
const {
    attackPhrases,
    dodgePhrases,
    critPhrases,
    vampPhrase,
    reflectPhrase,
    poisonStackPhrase,
    burnStackPhrase,
    poisonPhrases,
    burnPhrases,
    selfDamagePhrase,
    ultPhrases
} = require('../data/battlePhrases');

// Базовые характеристики для каждого класса
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
        stats.agi += Math.floor(stats.int / 5);
        stats.manaRegen += Math.floor(stats.int / 5) * 2;
    }

    // Пассивные бонусы подклассов (добавляем к статам)
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

    // Накопление яда (venom_blade)
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

    // Накопление огня (pyromancer) – максимум 5 стаков
    if (attackerSubclass === 'pyromancer' && rolePassives.pyromancer.burn) {
        if (!defenderState.burnStacks) defenderState.burnStacks = 0;
        const oldStacks = defenderState.burnStacks;
        defenderState.burnStacks = Math.min(5, defenderState.burnStacks + 1);
        if (defenderState.burnStacks > oldStacks) {
            extraLogs.push(burnStackPhrase
                .replace('%s', defenderName)
                .replace('%d', defenderState.burnStacks - oldStacks)
                .replace('%d', defenderState.burnStacks));
        }
    }

    // Накопление стаков заморозки (cryomancer) – каждая атака добавляет 1 стак, при 3 – заморозка
    if (attackerSubclass === 'cryomancer') {
        if (!defenderState.freezeStacks) defenderState.freezeStacks = 0;
        defenderState.freezeStacks++;
        if (defenderState.freezeStacks >= 3) {
            defenderState.frozen = 1; // заморозка на следующий ход
            defenderState.freezeStacks = 0; // сброс стаков
            extraLogs.push(`<span style="color:#00aaff;">${defenderName} заморожен!</span>`);
        } else {
            extraLogs.push(`<span style="color:#00aaff;">Стак заморозки на ${defenderName} (${defenderState.freezeStacks}/3)</span>`);
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
        stateChanges: { 
            poisonStacks: defenderState.poisonStacks, 
            burnStacks: defenderState.burnStacks,
            freezeStacks: defenderState.freezeStacks,
            frozen: defenderState.frozen
        },
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
            // Снятие всех отрицательных эффектов с себя
            attackerState.poisonStacks = 0;
            attackerState.burnStacks = 0;
            attackerState.freezeStacks = 0;
            attackerState.frozen = 0;
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
            // Снятие всех отрицательных эффектов с себя
            attackerState.poisonStacks = 0;
            attackerState.burnStacks = 0;
            attackerState.freezeStacks = 0;
            attackerState.frozen = 0;
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
            // Урон = интеллект × 2.5 + текущие стаки × 2
            const burnStacks = defenderState.burnStacks || 0;
            damage = Math.floor(attackerStats.int * 2.5) + (burnStacks * 2);
            log = ultPhrases.pyromancer.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            defenderState.burnStacks = 0; // сброс стаков
            break;
        case 'cryomancer':
            // Если цель уже заморожена, урон ×3, иначе ×2
            const frozenBonus = defenderState.frozen ? 3 : 2;
            damage = Math.round(attackerStats.int * frozenBonus); // округляем до целого
            // Гарантированная заморозка на 1 ход
            defenderState.frozen = 1;
            defenderState.freezeStacks = 0;
            // Формируем лог с указанием множителя
            log = `<span style="color:#3498db;">${attackerName} призывает ВЕЧНУЮ ЗИМУ, замораживая ${defenderName} и нанося ${damage} урона магией льда${frozenBonus === 3 ? ' (тройной урон!)' : ' (двойной урон!)'}!</span>`;
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

    // Урон от яда в конце хода цели
    if (defenderState.poisonStacks && defenderState.poisonStacks > 0) {
        const poisonDamage = defenderState.poisonStacks * 2;
        damageToDefender += poisonDamage;
        const phrase = poisonPhrases[Math.floor(Math.random() * poisonPhrases.length)]
            .replace('%s', defenderName)
            .replace('%d', poisonDamage);
        logEntries.push(phrase);
    }

    // Урон от огня в конце хода цели (игнорирует защиту)
    if (defenderState.burnStacks && defenderState.burnStacks > 0) {
        const burnDamage = defenderState.burnStacks * 2;
        damageToDefender += burnDamage;
        const phrase = burnPhrases[Math.floor(Math.random() * burnPhrases.length)]
            .replace('%s', defenderName)
            .replace('%d', burnDamage);
        logEntries.push(phrase);
    }

    // Урон берсерку от его же пассивки
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
        freezeStacks: 0,
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
        freezeStacks: 0,
        frozen: 0,
        reflectBuff: 0,
        reflectBonus: 0,
        vampBuff: 0,
        vampBonus: 0,
        hp: enemyHp,
        mirageCounter: 0
    };

    // Определение первого хода с учётом равенства скорости (рандом)
    let turn;
    if (playerStats.spd > enemyStats.spd) {
        turn = 'player';
    } else if (enemyStats.spd > playerStats.spd) {
        turn = 'enemy';
    } else {
        // При равенстве скорости – случайный выбор
        turn = Math.random() < 0.5 ? 'player' : 'enemy';
    }

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
            // Если игрок заморожен, он пропускает ход
            if (playerState.frozen > 0) {
                playerState.frozen = 0; // разморозка
                log.push(`<span style="color:#00aaff;">${playerName} пропускает ход (заморожен).</span>`);
                turnState.action = `${playerName} пропускает ход.`;
                turn = 'enemy';
                turns.push(turnState);
                continue;
            }

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
            // Если враг заморожен, он пропускает ход
            if (enemyState.frozen > 0) {
                enemyState.frozen = 0;
                log.push(`<span style="color:#00aaff;">${enemyName} пропускает ход (заморожен).</span>`);
                turnState.action = `${enemyName} пропускает ход.`;
                turn = 'player';
                turns.push(turnState);
                continue;
            }

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
