const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { updatePlayerPower } = require('../utils/power');
const { generateBot } = require('../utils/botGenerator');

const {
    attackPhrases,
    dodgePhrases,
    critPhrases,
    vampPhrase,
    reflectPhrase,
    poisonStackPhrase,
    burnStackPhrase,
    freezeStackPhrase,
    poisonDamagePhrase,
    burnDamagePhrase,
    frozenPhrase,
    frozenContinuePhrase,
    frozenEndPhrase,
    frozenAlreadyPhrase,
    selfDamagePhrase,
    ultPhrases
} = require('../data/battlePhrases');

const subclassOptions = {
    warrior: ['guardian', 'berserker', 'knight'],
    assassin: ['assassin', 'venom_blade', 'blood_hunter'],
    mage: ['pyromancer', 'cryomancer', 'illusionist']
};

function getRandomSubclass(className) {
    const options = subclassOptions[className];
    if (!options || options.length === 0) return 'guardian';
    return options[Math.floor(Math.random() * options.length)];
}

const baseStats = {
    warrior: { hp: 35, atk: 3, def: 5, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 20, atk: 4, def: 1, agi: 5, int: 0, spd: 14, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 20, atk: 3, def: 1, agi: 3, int: 6, spd: 14, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
};

const rolePassives = {
    guardian: { damageReduction: 10, blockChance: 20 },
    berserker: { rage: true },
    knight: { reflect: 20 },
    assassin: { critMultiplier: 2.0 },
    venom_blade: { poison: true },
    blood_hunter: { vamp: 20 },
    pyromancer: { burn: true },
    cryomancer: { freezeChance: 25, physReduction: 30 },
    illusionist: { mirageGuaranteed: true }
};

const recentOpponents = new Map();

function getExpReward(streak) {
    if (streak >= 21) return 18;
    if (streak >= 11) return 15;
    if (streak >= 6) return 12;
    return 10;
}

function applyIntBonus(damage, int) {
    return Math.floor(damage * (1 + int / 100));
}

function getBerserkerRage(hpPercent) {
    if (hpPercent < 20) return { level: 5, bonus: 100 };
    if (hpPercent < 35) return { level: 4, bonus: 60 };
    if (hpPercent < 50) return { level: 3, bonus: 45 };
    if (hpPercent < 65) return { level: 2, bonus: 30 };
    if (hpPercent < 80) return { level: 1, bonus: 15 };
    return { level: 0, bonus: 0 };
}

function getBerserkerAtkBonus(currentHp, maxHp, baseAtk) {
    const hpPercent = (currentHp / maxHp) * 100;
    let bonusPercent = 0;
    if (hpPercent < 20) bonusPercent = 50;
    else if (hpPercent < 50) bonusPercent = 30;
    else if (hpPercent < 80) bonusPercent = 15;
    else bonusPercent = 5;
    return Math.max(1, Math.floor(baseAtk * bonusPercent / 100));
}

function calculateStats(classData, inventory, subclass) {
    const base = baseStats[classData.class] || baseStats.warrior;
    const classInventory = inventory.filter(item => item.owner_class === classData.class);

    let stats = {
        hp: base.hp + (classData.hp_points || 0) * 5,
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
        manaRegen: classData.class === 'warrior' ? 15 : (classData.class === 'assassin' ? 15 : 20)
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

    if (classData.class === 'warrior') stats.hp += Math.floor(stats.def / 5) * 5;
    if (classData.class === 'assassin') stats.spd += Math.floor(stats.agi / 5);
    if (classData.class === 'mage') {
        stats.agi += Math.floor(stats.int / 5);
        stats.manaRegen += Math.floor(stats.int / 5) * 2;
    }

    const roleBonus = rolePassives[subclass] || {};
    if (roleBonus.vamp) stats.vamp += roleBonus.vamp;
    if (roleBonus.reflect) stats.reflect += roleBonus.reflect;

    if (classData.class === 'warrior') {
        stats.def = Math.min(70, stats.def * 1.5);
        stats.hp = Math.floor(stats.hp * 1.1);
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
    stats.agi = Math.min(70, stats.agi);
    return stats;
}

function performAttack(attackerStats, defenderStats, attackerVamp, defenderReflect, attackerName, defenderName, attackerClass, attackerSubclass, defenderSubclass, attackerState, defenderState, isPlayerAttacker) {
    let extraLogs = [];

    if (defenderSubclass === 'illusionist' && rolePassives.illusionist && rolePassives.illusionist.mirageGuaranteed) {
        defenderState.mirageCounter = (defenderState.mirageCounter || 0) + 1;
        if (defenderState.mirageCounter >= 4) {
            defenderState.mirageCounter = 0;
            const phrase = dodgePhrases[Math.floor(Math.random() * dodgePhrases.length)]
                .replace('%s', '<strong>' + defenderName + '</strong>')
                .replace('%s', '<strong>' + attackerName + '</strong>');
            return { hit: false, damage: 0, isCrit: false, log: phrase, reflectDamage: 0, vampHeal: 0, stateChanges: { mirageCounter: 0 }, extraLogs };
        }
    }

    const hitChance = Math.min(100, Math.max(5, 100 - defenderStats.agi));
    const isDodge = Math.random() * 100 > hitChance;
    if (isDodge) {
        const phrase = dodgePhrases[Math.floor(Math.random() * dodgePhrases.length)]
            .replace('%s', '<strong>' + defenderName + '</strong>')
            .replace('%s', '<strong>' + attackerName + '</strong>');
        return { hit: false, damage: 0, isCrit: false, log: phrase, reflectDamage: 0, vampHeal: 0, stateChanges: {}, extraLogs };
    }

    let damage = attackerStats.atk;
    let berserkerBonus = 0;
    let rageInfo = null;
    let selfDamage = 0;

    // Обработка берсерка (ярость и самоповреждение)
    if (attackerSubclass === 'berserker' && rolePassives.berserker && rolePassives.berserker.rage) {
        const hpPercent = (attackerState.hp / attackerStats.hp) * 100;
        const rage = getBerserkerRage(hpPercent);
        
        let currentDamage = attackerStats.atk;
        if (rage.bonus > 0) {
            currentDamage += Math.ceil(attackerStats.atk * rage.bonus / 100);
        }
        
        selfDamage = Math.max(1, Math.ceil(currentDamage * 0.16));
        attackerState.hp = Math.max(1, attackerState.hp - selfDamage);
        
        extraLogs.push({
            text: selfDamagePhrase.replace('%s', '<strong>' + attackerName + '</strong>').replace('%d', selfDamage),
            type: 'damage_self',
            attacker: isPlayerAttacker ? 'player' : 'enemy'
        });
        
        const newHpPercent = (attackerState.hp / attackerStats.hp) * 100;
        const newRage = getBerserkerRage(newHpPercent);
        
        if (newRage.bonus > 0) {
            damage = attackerStats.atk + Math.ceil(attackerStats.atk * newRage.bonus / 100);
        } else {
            damage = attackerStats.atk;
        }
        
        if (newRage.level > 0) {
            berserkerBonus = Math.ceil(attackerStats.atk * newRage.bonus / 100);
            rageInfo = { level: newRage.level, bonus: newRage.bonus, added: berserkerBonus };
        }
    }

    let isCrit = false;
    let critMultiplier = attackerStats.critDmg;
    if (attackerSubclass === 'assassin' && rolePassives.assassin && rolePassives.assassin.critMultiplier) critMultiplier = rolePassives.assassin.critMultiplier;
    if (Math.random() * 100 < attackerStats.crit) {
        isCrit = true;
        damage *= critMultiplier;
    }

    if (defenderSubclass === 'cryomancer' && rolePassives.cryomancer && rolePassives.cryomancer.physReduction)
        damage = Math.floor(damage * (1 - rolePassives.cryomancer.physReduction / 100));

    damage = damage * (1 - defenderStats.def / 100);
    damage = Math.max(1, Math.floor(damage));

    console.log(`[DEBUG] ${attackerName} damage after defense: ${damage}, defender def: ${defenderStats.def}%`);
    console.log(`[DEBUG] ${attackerName} selfDamage: ${selfDamage}, hp before: ${attackerState.hp + selfDamage}, after: ${attackerState.hp}`);

    let vampHeal = 0;
    if (attackerVamp > 0) vampHeal = Math.floor(damage * attackerVamp / 100);

    let reflectDamage = 0;
    if (defenderReflect > 0) reflectDamage = Math.floor(damage * defenderReflect / 100);

    // Накопление яда
    if (attackerSubclass === 'venom_blade' && rolePassives.venom_blade && rolePassives.venom_blade.poison) {
        if (!defenderState.poisonStacks) defenderState.poisonStacks = 0;
        const oldStacks = defenderState.poisonStacks;
        defenderState.poisonStacks = Math.min(5, defenderState.poisonStacks + 1);
        if (defenderState.poisonStacks > oldStacks) {
            extraLogs.push({
                text: poisonStackPhrase.replace('%d', defenderState.poisonStacks),
                type: 'poison_stack',
                attacker: isPlayerAttacker ? 'player' : 'enemy'
            });
        }
    }

    // Накопление огня
    if (attackerSubclass === 'pyromancer' && rolePassives.pyromancer && rolePassives.pyromancer.burn) {
        if (!defenderState.burnStacks) defenderState.burnStacks = 0;
        const oldStacks = defenderState.burnStacks;
        defenderState.burnStacks = Math.min(5, defenderState.burnStacks + 1);
        if (defenderState.burnStacks > oldStacks) {
            extraLogs.push({
                text: burnStackPhrase.replace('%d', defenderState.burnStacks),
                type: 'burn_stack',
                attacker: isPlayerAttacker ? 'player' : 'enemy'
            });
        }
    }

    // Накопление заморозки
    if (attackerSubclass === 'cryomancer') {
        if (!defenderState.freezeStacks) defenderState.freezeStacks = 0;
        if (defenderState.frozen > 0) {
            extraLogs.push({
                text: '<strong>' + defenderName + '</strong> уже заморожен и пропускает ход.',
                type: 'frozen_already',
                attacker: isPlayerAttacker ? 'player' : 'enemy'
            });
        } else {
            defenderState.freezeStacks++;
            let stackText;
            if (defenderState.freezeStacks >= 3) {
                defenderState.frozen = 2;
                defenderState.freezeStacks = 0;
                stackText = 'Лед накапливается 3/3. <strong>' + defenderName + '</strong> замораживается и пропускает 1 ход.';
            } else {
                stackText = 'Лед накапливается ' + defenderState.freezeStacks + '/3.';
            }
            extraLogs.push({
                text: stackText,
                type: 'freeze_stack',
                attacker: isPlayerAttacker ? 'player' : 'enemy'
            });
        }
    }

    let attackPhrase;
    if (isCrit) {
        const classPhrases = critPhrases[attackerClass] || critPhrases.warrior;
        attackPhrase = classPhrases[Math.floor(Math.random() * classPhrases.length)]
            .replace('%s', '<strong>' + attackerName + '</strong>')
            .replace('%s', '<strong>' + defenderName + '</strong>')
            .replace('%d', damage);
    } else {
        const classPhrases = attackPhrases[attackerClass] || attackPhrases.warrior;
        attackPhrase = classPhrases[Math.floor(Math.random() * classPhrases.length)]
            .replace('%s', '<strong>' + attackerName + '</strong>')
            .replace('%s', '<strong>' + defenderName + '</strong>')
            .replace('%d', damage);
    }

    return {
        hit: true,
        damage,
        isCrit,
        log: attackPhrase,
        reflectDamage,
        vampHeal,
        selfDamage,
        stateChanges: { 
            poisonStacks: defenderState.poisonStacks, 
            burnStacks: defenderState.burnStacks,
            freezeStacks: defenderState.freezeStacks,
            frozen: defenderState.frozen
        },
        berserkerBonus,
        extraLogs,
        rageInfo: rageInfo
    };
}

function performActiveSkill(attackerStats, defenderStats, attackerState, defenderState, attackerName, defenderName, attackerSubclass, defenderSubclass) {
    let damage = 0, selfDamage = 0, heal = 0, log = '', stateChanges = {};
    const intBonus = 1 + attackerStats.int / 100;
    let type = 'ult';

    switch (attackerSubclass) {
        case 'guardian':
            heal = Math.floor(attackerStats.hp * 0.2);
            log = ultPhrases.guardian.replace('%s', '<strong>' + attackerName + '</strong>').replace('%d', heal);
            attackerState.poisonStacks = attackerState.burnStacks = attackerState.freezeStacks = attackerState.frozen = 0;
            type = 'heal';
            break;
        case 'berserker':
            let maxHp = attackerStats.hp;
            selfDamage = Math.floor(maxHp * 0.5);
            selfDamage = Math.min(selfDamage, attackerState.hp - 1);
            attackerState.hp -= selfDamage;
            damage = attackerStats.atk * 2;
            log = ultPhrases.berserker.replace('%s', '<strong>' + attackerName + '</strong>')
                              .replace('%d', damage)
                              .replace('%d', selfDamage);
            type = 'damage_self';
            break;
        case 'knight':
            attackerState.reflectBuff = 2;
            attackerState.reflectBonus = 50;
            log = ultPhrases.knight.replace('%s', '<strong>' + attackerName + '</strong>');
            attackerState.poisonStacks = attackerState.burnStacks = attackerState.freezeStacks = attackerState.frozen = 0;
            type = 'buff';
            break;
        case 'assassin':
            damage = applyIntBonus(attackerStats.atk * 3.0, attackerStats.int);
            log = ultPhrases.assassin.replace('%s', '<strong>' + attackerName + '</strong>').replace('%s', '<strong>' + defenderName + '</strong>').replace('%d', damage);
            type = 'damage';
            break;
        case 'venom_blade':
            let baseDamage = attackerStats.atk;
            let isCrit = Math.random() * 100 < attackerStats.crit;
            if (isCrit) baseDamage *= attackerStats.critDmg;
            baseDamage = baseDamage * (1 - defenderStats.def / 100);
            baseDamage = Math.max(1, Math.floor(baseDamage));
            let poisonDamage = (defenderState.poisonStacks || 0) * 5;
            damage = baseDamage + poisonDamage;
            log = ultPhrases.venom_blade.replace('%s', '<strong>' + attackerName + '</strong>').replace('%d', damage);
            defenderState.poisonStacks = 0;
            type = 'poison_ult';
            break;
        case 'blood_hunter':
            damage = applyIntBonus(attackerStats.atk * 1.5, attackerStats.int);
            attackerState.vampBuff = 2;
            attackerState.vampBonus = 50;
            log = ultPhrases.blood_hunter.replace('%s', '<strong>' + attackerName + '</strong>').replace('%d', damage);
            type = 'damage';
            break;
        case 'pyromancer':
            damage = Math.floor(attackerStats.int * 1.8) + ((defenderState.burnStacks || 0) * 2);
            log = ultPhrases.pyromancer.replace('%s', '<strong>' + attackerName + '</strong>').replace('%s', '<strong>' + defenderName + '</strong>').replace('%d', damage);
            defenderState.burnStacks = 0;
            type = 'fire_ult';
            break;
        case 'cryomancer':
            const isTargetFrozen = defenderState.frozen > 0;
            damage = Math.round(attackerStats.int * (isTargetFrozen ? 2.5 : 1.6));
            const phraseKey = isTargetFrozen ? 'frozen' : 'normal';
            log = ultPhrases.cryomancer[phraseKey];
            log = log.replace('%s', '<strong>' + attackerName + '</strong>')
                     .replace('%s', '<strong>' + defenderName + '</strong>')
                     .replace('%d', damage);
            if (!isTargetFrozen) {
                defenderState.frozen = 1;
            }
            defenderState.freezeStacks = 0;
            type = 'ice_ult';
            break;
        case 'illusionist':
            damage = applyIntBonus(defenderStats.atk * 2, defenderStats.int);
            log = ultPhrases.illusionist.replace('%s', '<strong>' + attackerName + '</strong>').replace('%s', '<strong>' + defenderName + '</strong>').replace('%d', damage);
            type = 'damage';
            break;
        default: return { damage:0, heal:0, log: 'ничего не произошло', selfDamage:0, stateChanges:{}, type: 'none' };
    }
    return { damage, heal, log, selfDamage, stateChanges, type };
}

function applyDotDamage(state, name) {
    let totalDamage = 0, logs = [];
    if (state.poisonStacks > 0) {
        const dmg = state.poisonStacks * 2;
        totalDamage += dmg;
        logs.push({
            text: poisonDamagePhrase.replace('%s', '<strong>' + name + '</strong>').replace('%d', dmg),
            type: 'poison_dot'
        });
    }
    if (state.burnStacks > 0) {
        const dmg = state.burnStacks * 2;
        totalDamage += dmg;
        logs.push({
            text: burnDamagePhrase.replace('%s', '<strong>' + name + '</strong>').replace('%d', dmg),
            type: 'burn_dot'
        });
    }
    return { damage: totalDamage, logs };
}

function simulateBattle(playerStats, enemyStats, playerClass, enemyClass, playerName, enemyName, playerSubclass, enemySubclass) {
    if (!playerStats || !enemyStats) throw new Error('playerStats or enemyStats is undefined');

    let playerHp = playerStats.hp, enemyHp = enemyStats.hp;
    let playerMana = 0, enemyMana = 0;
    const messages = [];
    const states = [];

    let playerState = { poisonStacks:0, burnStacks:0, freezeStacks:0, frozen:0, reflectBuff:0, reflectBonus:0, vampBuff:0, vampBonus:0, hp: playerHp, mirageCounter:0 };
    let enemyState = { poisonStacks:0, burnStacks:0, freezeStacks:0, frozen:0, reflectBuff:0, reflectBonus:0, vampBuff:0, vampBonus:0, hp: enemyHp, mirageCounter:0 };

    let playerActedThisRound = false;
    let enemyActedThisRound = false;

    function pushState() {
        states.push({
            playerHp, enemyHp, playerMana, enemyMana,
            playerFrozen: playerState.frozen, enemyFrozen: enemyState.frozen,
            playerShield: playerState.reflectBuff>0 ? 1:0, enemyShield: enemyState.reflectBuff>0 ? 1:0,
            playerPoisonStacks: playerState.poisonStacks, playerBurnStacks: playerState.burnStacks, playerFreezeStacks: playerState.freezeStacks,
            enemyPoisonStacks: enemyState.poisonStacks, enemyBurnStacks: enemyState.burnStacks, enemyFreezeStacks: enemyState.freezeStacks
        });
    }
    pushState();

    let turn = (playerStats.spd > enemyStats.spd) ? 'player' : (enemyStats.spd > playerStats.spd) ? 'enemy' : (Math.random()<0.5 ? 'player' : 'enemy');
    let maxTurns = 100, t = 0;

    console.log('=== BATTLE START ===');
    console.log('Player: ' + playerName + ', Enemy: ' + enemyName);
    console.log('First turn: ' + turn);

    while (playerHp>0 && enemyHp>0 && t<maxTurns) {
        t++;

        if (turn === 'player') {
            console.log('\n--- TURN ' + t + ' (PLAYER) ---');
            console.log('Player HP: ' + playerHp + ', Mana: ' + playerMana + ', Stacks: poison ' + playerState.poisonStacks + ', burn ' + playerState.burnStacks + ', freeze ' + playerState.freezeStacks + ', frozen ' + playerState.frozen);
            console.log('Enemy HP: ' + enemyHp + ', Mana: ' + enemyMana + ', Stacks: poison ' + enemyState.poisonStacks + ', burn ' + enemyState.burnStacks + ', freeze ' + enemyState.freezeStacks + ', frozen ' + enemyState.frozen);

            if (playerState.frozen > 0) {
                const frozenLeft = playerState.frozen;
                playerState.frozen--;
                let msg;
                if (playerState.frozen === 0) msg = frozenEndPhrase.replace('%s', '<strong>' + playerName + '</strong>');
                else msg = frozenContinuePhrase.replace('%s', '<strong>' + playerName + '</strong>').replace('%d', frozenLeft);
                messages.push({ text: msg, type: 'frozen_end', attacker: 'enemy' });
                pushState();
                turn = 'enemy';
                playerActedThisRound = true;
                continue;
            }
            playerState.hp = playerHp; enemyState.hp = enemyHp;
            playerMana += playerStats.manaRegen;
            let actionLog = null;

            if (playerMana >= 100) {
                console.log('[SERVER] Player ULT triggered, mana before: ' + playerMana);
                const skill = performActiveSkill(playerStats, enemyStats, playerState, enemyState, playerName, enemyName, playerSubclass, enemySubclass);
                console.log('[SERVER] ULT log: ' + skill.log + ', type: ' + skill.type);
                if (skill.damage) enemyHp -= skill.damage;
                if (skill.heal) playerHp += skill.heal;
                if (skill.selfDamage) playerHp -= skill.selfDamage;
                if (playerHp < 0) playerHp = 0; if (enemyHp < 0) enemyHp = 0;
                actionLog = { text: skill.log, type: skill.type, attacker: 'player' };
                messages.push(actionLog);
                pushState();
                playerMana -= 100;
                if (skill.stateChanges) Object.assign(enemyState, skill.stateChanges);
                // Синхронизация после ульты
                playerHp = playerState.hp;
                enemyHp = enemyState.hp;
            } else {
                const attackResult = performAttack(
                    playerStats, enemyStats,
                    playerStats.vamp + (playerState.vampBuff > 0 ? playerState.vampBonus : 0),
                    enemyStats.reflect + (enemyState.reflectBuff > 0 ? enemyState.reflectBonus : 0),
                    playerName, enemyName,
                    playerClass, playerSubclass, enemySubclass,
                    playerState, enemyState,
                    true
                );

                if (attackResult.hit) {
                    enemyHp -= attackResult.damage;
                    playerHp += attackResult.vampHeal;
                    playerHp -= attackResult.reflectDamage;
                    // Самоповреждение уже учтено в playerState.hp, поэтому не вычитаем повторно
                    // Синхронизируем playerHp и enemyHp с состоянием после атаки
                    playerHp = playerState.hp;
                    enemyHp = enemyState.hp;

                    if (playerHp < 0) playerHp = 0;
                    if (enemyHp < 0) enemyHp = 0;
                    console.log(`[DEBUG] Player attack: damage=${attackResult.damage}, selfDamage=${attackResult.selfDamage || 0}, vamp=${attackResult.vampHeal}, reflect=${attackResult.reflectDamage}, new player HP=${playerHp}, new enemy HP=${enemyHp}`);
                    let logText = attackResult.log;

                    if (attackResult.rageInfo) {
                        logText += ' <span style="color:#f39c12;">Уровень ярости ' + attackResult.rageInfo.level + '. Доп. урон +' + attackResult.rageInfo.added + '</span>';
                    } else if (attackResult.berserkerBonus > 0) {
                        logText += ' <span style="color:#f39c12;">(Ярость +' + attackResult.berserkerBonus + ')</span>';
                    }

                    if (attackResult.vampHeal > 0) {
                        logText += ' ' + vampPhrase.replace('%s', '<strong>' + playerName + '</strong>').replace('%d', attackResult.vampHeal);
                    }
                    if (attackResult.reflectDamage > 0) {
                        logText += ' ' + reflectPhrase.replace('%s', '<strong>' + enemyName + '</strong>').replace('%d', attackResult.reflectDamage).replace('%s', '<strong>' + playerName + '</strong>');
                    }

                    actionLog = { text: logText, type: attackResult.isCrit ? 'crit' : 'attack', attacker: 'player' };

                    if (attackResult.extraLogs && attackResult.extraLogs.length > 0) {
                        attackResult.extraLogs.forEach(extra => {
                            messages.push(extra);
                        });
                        pushState();
                    }
                    messages.push(actionLog);
                    pushState();
                } else {
                    actionLog = { text: attackResult.log, type: 'dodge', attacker: 'player' };
                    messages.push(actionLog);
                    pushState();
                }
                if (attackResult.stateChanges) Object.assign(enemyState, attackResult.stateChanges);
            }

            turn = 'enemy';
            playerActedThisRound = true;
        } else {
            console.log('\n--- TURN ' + t + ' (ENEMY) ---');
            console.log('Player HP: ' + playerHp + ', Mana: ' + playerMana + ', Stacks: poison ' + playerState.poisonStacks + ', burn ' + playerState.burnStacks + ', freeze ' + playerState.freezeStacks + ', frozen ' + playerState.frozen);
            console.log('Enemy HP: ' + enemyHp + ', Mana: ' + enemyMana + ', Stacks: poison ' + enemyState.poisonStacks + ', burn ' + enemyState.burnStacks + ', freeze ' + enemyState.freezeStacks + ', frozen ' + enemyState.frozen);

            if (enemyState.frozen > 0) {
                const frozenLeft = enemyState.frozen;
                enemyState.frozen--;
                let msg;
                if (enemyState.frozen === 0) msg = frozenEndPhrase.replace('%s', '<strong>' + enemyName + '</strong>');
                else msg = frozenContinuePhrase.replace('%s', '<strong>' + enemyName + '</strong>').replace('%d', frozenLeft);
                messages.push({ text: msg, type: 'frozen_end', attacker: 'player' });
                pushState();
                turn = 'player';
                enemyActedThisRound = true;
                continue;
            }
            playerState.hp = playerHp; enemyState.hp = enemyHp;
            enemyMana += enemyStats.manaRegen;
            let actionLog = null;

            if (enemyMana >= 100) {
                console.log('[SERVER] Enemy ULT triggered, mana before: ' + enemyMana);
                const skill = performActiveSkill(enemyStats, playerStats, enemyState, playerState, enemyName, playerName, enemySubclass, playerSubclass);
                console.log('[SERVER] ULT log: ' + skill.log + ', type: ' + skill.type);
                if (skill.damage) playerHp -= skill.damage;
                if (skill.heal) enemyHp += skill.heal;
                if (skill.selfDamage) enemyHp -= skill.selfDamage;
                if (playerHp < 0) playerHp = 0; if (enemyHp < 0) enemyHp = 0;
                actionLog = { text: skill.log, type: skill.type, attacker: 'enemy' };
                messages.push(actionLog);
                pushState();
                enemyMana -= 100;
                if (skill.stateChanges) Object.assign(playerState, skill.stateChanges);
                // Синхронизация после ульты
                playerHp = playerState.hp;
                enemyHp = enemyState.hp;
            } else {
                const attackResult = performAttack(
                    enemyStats, playerStats,
                    enemyStats.vamp + (enemyState.vampBuff>0 ? enemyState.vampBonus : 0),
                    playerStats.reflect + (playerState.reflectBuff>0 ? playerState.reflectBonus : 0),
                    enemyName, playerName,
                    enemyClass, enemySubclass, playerSubclass,
                    enemyState, playerState,
                    false
                );

                if (attackResult.hit) {
                    playerHp -= attackResult.damage;
                    enemyHp += attackResult.vampHeal;
                    enemyHp -= attackResult.reflectDamage;
                    // Самоповреждение уже учтено в enemyState.hp
                    // Синхронизируем
                    playerHp = playerState.hp;
                    enemyHp = enemyState.hp;

                    if (playerHp < 0) playerHp = 0;
                    if (enemyHp < 0) enemyHp = 0;
                    console.log(`[DEBUG] Enemy attack: damage=${attackResult.damage}, selfDamage=${attackResult.selfDamage || 0}, vamp=${attackResult.vampHeal}, reflect=${attackResult.reflectDamage}, new player HP=${playerHp}, new enemy HP=${enemyHp}`);
                    let logText = attackResult.log;

                    if (attackResult.rageInfo) {
                        logText += ' <span style="color:#f39c12;">Уровень ярости ' + attackResult.rageInfo.level + '. Доп. урон +' + attackResult.rageInfo.added + '</span>';
                    } else if (attackResult.berserkerBonus > 0) {
                        logText += ' <span style="color:#f39c12;">(Ярость +' + attackResult.berserkerBonus + ')</span>';
                    }
                    if (attackResult.vampHeal > 0) {
                        logText += ' ' + vampPhrase.replace('%s', '<strong>' + enemyName + '</strong>').replace('%d', attackResult.vampHeal);
                    }
                    if (attackResult.reflectDamage > 0) {
                        logText += ' ' + reflectPhrase.replace('%s', '<strong>' + playerName + '</strong>').replace('%d', attackResult.reflectDamage).replace('%s', '<strong>' + enemyName + '</strong>');
                    }

                    actionLog = { text: logText, type: attackResult.isCrit ? 'crit' : 'attack', attacker: 'enemy' };

                    if (attackResult.extraLogs && attackResult.extraLogs.length > 0) {
                        attackResult.extraLogs.forEach(extra => {
                            messages.push(extra);
                        });
                        pushState();
                    }
                    messages.push(actionLog);
                    pushState();
                } else {
                    actionLog = { text: attackResult.log, type: 'dodge', attacker: 'enemy' };
                    messages.push(actionLog);
                    pushState();
                }
                if (attackResult.stateChanges) Object.assign(playerState, attackResult.stateChanges);
            }

            turn = 'player';
            enemyActedThisRound = true;
        }

        if (playerActedThisRound && enemyActedThisRound) {
            const playerDot = applyDotDamage(playerState, playerName);
            const enemyDot = applyDotDamage(enemyState, enemyName);
            if (playerDot.damage > 0) {
                playerHp -= playerDot.damage;
                if (playerHp < 0) playerHp = 0;
                playerDot.logs.forEach(entry => {
                    entry.attacker = 'player';
                    messages.push(entry);
                });
                pushState();
            }
            if (enemyDot.damage > 0) {
                enemyHp -= enemyDot.damage;
                if (enemyHp < 0) enemyHp = 0;
                enemyDot.logs.forEach(entry => {
                    entry.attacker = 'enemy';
                    messages.push(entry);
                });
                pushState();
            }
            playerActedThisRound = false;
            enemyActedThisRound = false;
        }

        if (playerHp <= 0 || enemyHp <= 0) break;
    }

    let winner = (playerHp<=0 && enemyHp<=0) ? 'draw' : (playerHp<=0) ? 'enemy' : (enemyHp<=0) ? 'player' : null;
    const victoryPhrases = [
        '🎉 Это была невероятная схватка! Вы одержали <span style="color:#2ecc71;">ПОБЕДУ</span>!',
        '⚔️ С последним ударом враг повержен. <span style="color:#2ecc71;">ПОБЕДА</span>!',
        '🏆 Вы оказались сильнее! <span style="color:#2ecc71;">ПОБЕДА</span>!',
        '✨ Невероятная битва! <span style="color:#2ecc71;">ПОБЕДА</span> за вами!'
    ];
    const defeatPhrases = [
        '💔 В этой напряжённой схватке враг был сильнее. <span style="color:#e74c3c;">ПОРАЖЕНИЕ</span>',
        '😵 Ваши силы иссякли... <span style="color:#e74c3c;">ПОРАЖЕНИЕ</span>',
        '😢 Увы, победа не ваша. <span style="color:#e74c3c;">ПОРАЖЕНИЕ</span>',
        '⚰️ Соперник оказался сильнее. <span style="color:#e74c3c;">ПОРАЖЕНИЕ</span>'
    ];
    const drawPhrases = [
        '🤝 Оба бойца падают одновременно. Ничья!',
        '💥 Взаимный удар – никто не выжил. Ничья.'
    ];

    let finalPhrase = '';
    if (winner === 'player') finalPhrase = victoryPhrases[Math.floor(Math.random()*victoryPhrases.length)];
    else if (winner === 'enemy') finalPhrase = defeatPhrases[Math.floor(Math.random()*defeatPhrases.length)];
    else finalPhrase = drawPhrases[Math.floor(Math.random()*drawPhrases.length)];
    messages.push({ text: finalPhrase, type: 'final', attacker: 'none' });
    pushState();

    return {
        winner,
        playerHpRemain: Math.max(0,playerHp),
        enemyHpRemain: Math.max(0,enemyHp),
        messages,
        states,
        playerMaxHp: playerStats.hp,
        enemyMaxHp: enemyStats.hp
    };
}

function expNeeded(level) { return Math.floor(80 * Math.pow(level, 1.5)); }
async function addExp(client, userId, className, expGain) {
    const classRes = await client.query(
        'SELECT level, exp, skill_points FROM user_classes WHERE user_id = $1 AND class = $2',
        [userId, className]
    );
    if (classRes.rows.length === 0) return false;

    let { level, exp, skill_points } = classRes.rows[0];
    exp += expGain;
    let leveledUp = false;
    while (exp >= expNeeded(level)) {
        exp -= expNeeded(level);
        level++;
        let pointsToAdd = (level <= 14) ? 3 : 5;
        skill_points += pointsToAdd;
        leveledUp = true;
    }
    await client.query(
        'UPDATE user_classes SET level = $1, exp = $2, skill_points = $3 WHERE user_id = $4 AND class = $5',
        [level, exp, skill_points, userId, className]
    );
    return leveledUp;
}
function getCoinReward(streak) { return streak>=25 ? 20 : streak>=10 ? 10 : streak>=5 ? 7 : 5; }
function getRatingChange(streak) { return streak>=20 ? 30 : streak>=10 ? 25 : streak>=5 ? 20 : 15; }
async function rechargeEnergy(client, userId) { /* ... */ }
async function getPlayerRatingPosition(client, userId) { /* ... */ }

async function selectPvPOpponent(client, currentUserId, currentLevel) {
    const ratingRes = await client.query('SELECT id, rating FROM users WHERE rating > 0 ORDER BY rating DESC');
    const allPlayers = ratingRes.rows;
    const currentIndex = allPlayers.findIndex(p => p.id === currentUserId);
    if (currentIndex === -1) return null;

    const minIndex = Math.max(0, currentIndex - 50);
    const maxIndex = Math.min(allPlayers.length - 1, currentIndex + 50);
    let candidates = allPlayers.slice(minIndex, maxIndex + 1).filter(p => p.id !== currentUserId);
    if (candidates.length === 0) return null;

    let history = recentOpponents.get(currentUserId) || [];
    let availableCandidates = candidates.filter(c => !history.includes(c.id));
    if (availableCandidates.length === 0) {
        availableCandidates = candidates;
        history = [];
    }

    const randomIndex = Math.floor(Math.random() * availableCandidates.length);
    const opponentId = availableCandidates[randomIndex].id;
    history.push(opponentId);
    if (history.length > 10) history.shift();
    recentOpponents.set(currentUserId, history);

    const opponentUser = await client.query('SELECT id, username, avatar_id FROM users WHERE id = $1', [opponentId]);
    if (opponentUser.rows.length === 0) return null;
    const oppData = opponentUser.rows[0];

    const strongestClassRes = await client.query(
        `SELECT class, level, hp_points, atk_points, def_points, dodge_points, int_points, spd_points, 
                crit_points, crit_dmg_points, vamp_points, reflect_points, power
         FROM user_classes 
         WHERE user_id = $1 
         ORDER BY power DESC 
         LIMIT 1`,
        [opponentId]
    );
    if (strongestClassRes.rows.length === 0) return null;
    const strongestClass = strongestClassRes.rows[0];
    const subclass = getRandomSubclass(strongestClass.class);

    const invRes = await client.query(
        `SELECT i.*, it.* FROM inventory i
         JOIN items it ON i.item_id = it.id
         WHERE i.user_id = $1 AND i.equipped = true AND it.owner_class = $2`,
        [opponentId, strongestClass.class]
    );

    const stats = calculateStats(strongestClass, invRes.rows, subclass);
    return {
        username: oppData.username,
        avatar_id: oppData.avatar_id || 1,
        class: strongestClass.class,
        subclass: subclass,
        level: strongestClass.level,
        is_cybercat: false,
        stats: stats
    };
}

router.post('/start', async (req, res) => {
    const { tg_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length===0) throw new Error('User not found');
        const userData = user.rows[0];
        await rechargeEnergy(client, userData.id);
        const energyResult = await client.query('SELECT energy FROM users WHERE id = $1', [userData.id]);
        if (energyResult.rows[0].energy < 1) throw new Error('Недостаточно энергии');
        const classData = await client.query('SELECT * FROM user_classes WHERE user_id = $1 AND class = $2', [userData.id, userData.current_class]);
        if (classData.rows.length===0) throw new Error('Class data not found');
        const inv = await client.query(`SELECT id, name, type, rarity, class_restriction, owner_class, atk_bonus, def_bonus, hp_bonus, agi_bonus, int_bonus, spd_bonus, crit_bonus, crit_dmg_bonus, vamp_bonus, reflect_bonus FROM inventory WHERE user_id = $1 AND equipped = true`, [userData.id]);
        const playerStats = calculateStats(classData.rows[0], inv.rows, userData.subclass);

        const rand = Math.random();
        let opponentData = null;

        if (rand < 0.3) {
            opponentData = await selectPvPOpponent(client, userData.id, classData.rows[0].level);
        } else if (rand < 0.8) {
            opponentData = generateBot(classData.rows[0].level, false);
        } else {
            opponentData = generateBot(Math.min(60, classData.rows[0].level + Math.floor(Math.random()*3)+1), true);
        }

        if (!opponentData || !opponentData.stats) {
            opponentData = generateBot(classData.rows[0].level, false);
        }

        const battleResult = simulateBattle(
            playerStats, opponentData.stats,
            userData.current_class, opponentData.class,
            userData.username, opponentData.username,
            userData.subclass, opponentData.subclass
        );

        let isVictory = battleResult.winner === 'player';
        let newStreak = userData.win_streak || 0;
        let ratingChange = -15;
        if (isVictory) {
            newStreak++;
            const coinReward = getCoinReward(newStreak);
            const ratingGain = getRatingChange(newStreak);
            ratingChange = ratingGain;
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [coinReward, userData.id]);
            await client.query('UPDATE users SET rating = rating + $1, season_rating = season_rating + $1 WHERE id = $2', [ratingGain, userData.id]);
        } else {
            newStreak = 0;
            await client.query('UPDATE users SET rating = GREATEST(0, rating - 15), season_rating = GREATEST(0, season_rating - 15) WHERE id = $1', [userData.id]);
        }
        await client.query('UPDATE users SET win_streak = $1 WHERE id = $2', [newStreak, userData.id]);

        let dailyStreakRes = await client.query('SELECT daily_win_streak FROM users WHERE id = $1', [userData.id]);
        let dailyStreak = dailyStreakRes.rows[0].daily_win_streak || 0;
        if (isVictory) {
            dailyStreak++;
            await client.query('UPDATE users SET daily_win_streak = $1 WHERE id = $2', [dailyStreak, userData.id]);
        } else {
            dailyStreak = 0;
            await client.query('UPDATE users SET daily_win_streak = 0 WHERE id = $1', [userData.id]);
        }

        if (dailyStreak >= 10) {
            const userTasks = await client.query(
                'SELECT daily_tasks_mask, daily_tasks_progress FROM users WHERE id = $1',
                [userData.id]
            );
            let mask = userTasks.rows[0].daily_tasks_mask;
            let progress = userTasks.rows[0].daily_tasks_progress;
            if (!progress) progress = {};
            else if (typeof progress === 'string') progress = JSON.parse(progress);

            for (let taskId of [1, 2, 3]) {
                const bit = 1 << (taskId - 1);
                if (!(mask & bit)) {
                    progress[taskId] = 5;
                }
            }
            await client.query(
                'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
                [JSON.stringify(progress), userData.id]
            );
        }

        const expGain = isVictory ? getExpReward(newStreak) : 3;
        const leveledUp = await addExp(client, userData.id, userData.current_class, expGain);
        if (leveledUp) await updatePlayerPower(client, userData.id, userData.current_class);
        await client.query('UPDATE users SET energy = energy - 1 WHERE id = $1', [userData.id]);
        await client.query('COMMIT');

        const energyQuery = await client.query('SELECT energy FROM users WHERE id = $1', [userData.id]);

        res.json({
            opponent: {
                username: opponentData.username,
                avatar_id: opponentData.avatar_id,
                class: opponentData.class,
                subclass: opponentData.subclass,
                level: opponentData.level,
                is_cybercat: opponentData.is_cybercat||false
            },
            result: {
                winner: battleResult.winner,
                playerHpRemain: battleResult.playerHpRemain,
                enemyHpRemain: battleResult.enemyHpRemain,
                playerMaxHp: battleResult.playerMaxHp,
                enemyMaxHp: battleResult.enemyMaxHp,
                messages: battleResult.messages,
                states: battleResult.states
            },
            reward: {
                exp: expGain,
                coins: isVictory ? getCoinReward(newStreak) : 0,
                leveledUp,
                newStreak
            },
            ratingChange,
            newEnergy: energyQuery.rows[0].energy
        });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

module.exports = router;
module.exports.simulateBattle = simulateBattle;
module.exports.calculateStats = calculateStats;
