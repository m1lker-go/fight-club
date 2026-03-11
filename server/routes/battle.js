// server/routes/battle.js

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

function applyIntBonus(damage, int) {
    return Math.floor(damage * (1 + int / 100));
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
                .replace('%s', defenderName).replace('%s', attackerName);
            return { hit: false, damage: 0, isCrit: false, log: phrase, reflectDamage: 0, vampHeal: 0, stateChanges: { mirageCounter: 0 }, extraLogs };
        }
    }

    const hitChance = Math.min(100, Math.max(5, 100 - defenderStats.agi));
    const isDodge = Math.random() * 100 > hitChance;
    if (isDodge) {
        const phrase = dodgePhrases[Math.floor(Math.random() * dodgePhrases.length)]
            .replace('%s', defenderName).replace('%s', attackerName);
        return { hit: false, damage: 0, isCrit: false, log: phrase, reflectDamage: 0, vampHeal: 0, stateChanges: {}, extraLogs };
    }

    let damage = attackerStats.atk;
    if (attackerClass === 'mage') damage += Math.floor(attackerStats.int / 5) * 2;

    let berserkerBonus = 0;
    if (attackerSubclass === 'berserker' && rolePassives.berserker?.rage) {
        const bonus = getBerserkerAtkBonus(attackerState.hp, attackerStats.hp, attackerStats.atk);
        damage += bonus;
        berserkerBonus = bonus;
    }

    let isCrit = false;
    let critMultiplier = attackerStats.critDmg;
    if (attackerSubclass === 'assassin' && rolePassives.assassin.critMultiplier) critMultiplier = rolePassives.assassin.critMultiplier;
    if (Math.random() * 100 < attackerStats.crit) {
        isCrit = true;
        damage *= critMultiplier;
    }

    if (defenderSubclass === 'cryomancer' && rolePassives.cryomancer.physReduction)
        damage = Math.floor(damage * (1 - rolePassives.cryomancer.physReduction / 100));

    damage = damage * (1 - defenderStats.def / 100);
    damage = Math.max(1, Math.floor(damage));

    let vampHeal = 0;
    if (attackerVamp > 0) vampHeal = Math.floor(damage * attackerVamp / 100);

    let reflectDamage = 0;
    if (defenderReflect > 0) reflectDamage = Math.floor(damage * defenderReflect / 100);

    // Накопление яда
    if (attackerSubclass === 'venom_blade' && rolePassives.venom_blade.poison) {
        if (!defenderState.poisonStacks) defenderState.poisonStacks = 0;
        const oldStacks = defenderState.poisonStacks;
        defenderState.poisonStacks = Math.min(5, defenderState.poisonStacks + 1);
        if (defenderState.poisonStacks > oldStacks) {
            extraLogs.push(poisonStackPhrase.replace('%d', defenderState.poisonStacks));
        }
    }

    // Накопление огня
    if (attackerSubclass === 'pyromancer' && rolePassives.pyromancer.burn) {
        if (!defenderState.burnStacks) defenderState.burnStacks = 0;
        const oldStacks = defenderState.burnStacks;
        defenderState.burnStacks = Math.min(5, defenderState.burnStacks + 1);
        if (defenderState.burnStacks > oldStacks) {
            extraLogs.push(burnStackPhrase.replace('%d', defenderState.burnStacks));
        }
    }

    // Накопление заморозки
    if (attackerSubclass === 'cryomancer') {
        if (!defenderState.freezeStacks) defenderState.freezeStacks = 0;
        if (defenderState.frozen > 0) {
            extraLogs.push(frozenAlreadyPhrase.replace('%s', defenderName));
        } else {
            defenderState.freezeStacks++;
            if (defenderState.freezeStacks >= 3) {
                defenderState.frozen = 2;
                defenderState.freezeStacks = 0;
                extraLogs.push(frozenPhrase.replace('%s', defenderName));
            } else {
                extraLogs.push(freezeStackPhrase.replace('%s', defenderName).replace('%d', defenderState.freezeStacks));
            }
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
    let damage = 0, selfDamage = 0, heal = 0, log = '', stateChanges = {};
    const intBonus = 1 + attackerStats.int / 100;

    switch (attackerSubclass) {
        case 'guardian':
            heal = Math.floor(attackerStats.hp * 0.2);
            log = ultPhrases.guardian.replace('%s', attackerName).replace('%d', heal);
            attackerState.poisonStacks = attackerState.burnStacks = attackerState.freezeStacks = attackerState.frozen = 0;
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
            attackerState.poisonStacks = attackerState.burnStacks = attackerState.freezeStacks = attackerState.frozen = 0;
            break;
        case 'assassin':
            damage = applyIntBonus(attackerStats.atk * 3.0, attackerStats.int);
            log = ultPhrases.assassin.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            break;
        case 'venom_blade':
            damage = (defenderState.poisonStacks || 0) * 5;
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
            damage = Math.floor(attackerStats.int * 2.0) + ((defenderState.burnStacks || 0) * 2);
            log = ultPhrases.pyromancer.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            defenderState.burnStacks = 0;
            break;
        case 'cryomancer':
            damage = Math.round(attackerStats.int * (defenderState.frozen ? 3 : 2));
            defenderState.frozen = 2;
            defenderState.freezeStacks = 0;
            log = ultPhrases.cryomancer.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            break;
        case 'illusionist':
            damage = applyIntBonus(defenderStats.atk * 2, defenderStats.int);
            log = ultPhrases.illusionist.replace('%s', attackerName).replace('%s', defenderName).replace('%d', damage);
            break;
        default: return { damage:0, heal:0, log: 'ничего не произошло', selfDamage:0, stateChanges:{} };
    }
    return { damage, heal, log, selfDamage, stateChanges };
}

function applyDotDamage(state, name) {
    let totalDamage = 0, logs = [];
    if (state.poisonStacks > 0) {
        const dmg = state.poisonStacks * 2;
        totalDamage += dmg;
        logs.push(poisonDamagePhrase.replace('%s', name).replace('%d', dmg));
    }
    if (state.burnStacks > 0) {
        const dmg = state.burnStacks * 2;
        totalDamage += dmg;
        logs.push(burnDamagePhrase.replace('%s', name).replace('%d', dmg));
    }
    return { damage: totalDamage, logs };
}

function simulateBattle(playerStats, enemyStats, playerClass, enemyClass, playerName, enemyName, playerSubclass, enemySubclass) {
    if (!playerStats || !enemyStats) throw new Error('playerStats or enemyStats is undefined');

    let playerHp = playerStats.hp, enemyHp = enemyStats.hp;
    let playerMana = 0, enemyMana = 0;
    const messages = []; // теперь массив строк (потом клиент сам разберёт анимации)
    const states = [];

    let playerState = { poisonStacks:0, burnStacks:0, freezeStacks:0, frozen:0, reflectBuff:0, reflectBonus:0, vampBuff:0, vampBonus:0, hp: playerHp, mirageCounter:0 };
    let enemyState = { poisonStacks:0, burnStacks:0, freezeStacks:0, frozen:0, reflectBuff:0, reflectBonus:0, vampBuff:0, vampBonus:0, hp: enemyHp, mirageCounter:0 };

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

    while (playerHp>0 && enemyHp>0 && t<maxTurns) {
        t++;

        // Ход игрока
        if (turn === 'player') {
            if (playerState.frozen > 0) {
                const frozenLeft = playerState.frozen;
                playerState.frozen--;
                let msg;
                if (playerState.frozen === 0) msg = frozenEndPhrase.replace('%s', playerName);
                else msg = frozenContinuePhrase.replace('%s', playerName).replace('%d', frozenLeft);
                messages.push(msg);
                pushState();
                turn = 'enemy';
                continue;
            }
            playerState.hp = playerHp; enemyState.hp = enemyHp;
            playerMana = Math.min(100, playerMana + playerStats.manaRegen);
            let actionLog = '';

            if (playerMana >= 100) {
                const skill = performActiveSkill(playerStats, enemyStats, playerState, enemyState, playerName, enemyName, playerSubclass, enemySubclass);
                if (skill.damage) enemyHp -= skill.damage;
                if (skill.heal) playerHp += skill.heal;
                if (skill.selfDamage) playerHp -= skill.selfDamage;
                if (playerHp<0) playerHp=0; if (enemyHp<0) enemyHp=0;
                actionLog = skill.log;
                playerMana -= 100;
                if (skill.stateChanges) Object.assign(enemyState, skill.stateChanges);
            } else {
                const attackResult = performAttack(
                    playerStats, enemyStats,
                    playerStats.vamp + (playerState.vampBuff>0 ? playerState.vampBonus : 0),
                    enemyStats.reflect + (enemyState.reflectBuff>0 ? enemyState.reflectBonus : 0),
                    playerName, enemyName,
                    playerClass, playerSubclass, enemySubclass,
                    playerState, enemyState
                );
                if (attackResult.hit) {
                    enemyHp -= attackResult.damage;
                    playerHp += attackResult.vampHeal;
                    playerHp -= attackResult.reflectDamage;
                    if (playerHp<0) playerHp=0; if (enemyHp<0) enemyHp=0;
                    actionLog = attackResult.log;
                    if (attackResult.berserkerBonus>0) actionLog += ` <span style="color:#f39c12;">(Ярость +${attackResult.berserkerBonus})</span>`;
                    if (attackResult.vampHeal>0) actionLog += ' ' + vampPhrase.replace('%s', playerName).replace('%d', attackResult.vampHeal);
                    if (attackResult.reflectDamage>0) actionLog += ' ' + reflectPhrase.replace('%s', enemyName).replace('%d', attackResult.reflectDamage).replace('%s', playerName);
                } else {
                    actionLog = attackResult.log;
                }
                // Основное действие
                messages.push(actionLog);
                pushState();

                // Стаки
                if (attackResult.extraLogs && attackResult.extraLogs.length>0) {
                    attackResult.extraLogs.forEach(extra => messages.push(extra));
                    pushState();
                }
                if (attackResult.stateChanges) Object.assign(enemyState, attackResult.stateChanges);
            }
            turn = 'enemy';
        }

        // Ход противника
        else {
            if (enemyState.frozen > 0) {
                const frozenLeft = enemyState.frozen;
                enemyState.frozen--;
                let msg;
                if (enemyState.frozen === 0) msg = frozenEndPhrase.replace('%s', enemyName);
                else msg = frozenContinuePhrase.replace('%s', enemyName).replace('%d', frozenLeft);
                messages.push(msg);
                pushState();
                turn = 'player';
                continue;
            }
            playerState.hp = playerHp; enemyState.hp = enemyHp;
            enemyMana = Math.min(100, enemyMana + enemyStats.manaRegen);
            let actionLog = '';

            if (enemyMana >= 100) {
                const skill = performActiveSkill(enemyStats, playerStats, enemyState, playerState, enemyName, playerName, enemySubclass, playerSubclass);
                if (skill.damage) playerHp -= skill.damage;
                if (skill.heal) enemyHp += skill.heal;
                if (skill.selfDamage) enemyHp -= skill.selfDamage;
                if (playerHp<0) playerHp=0; if (enemyHp<0) enemyHp=0;
                actionLog = skill.log;
                enemyMana -= 100;
                if (skill.stateChanges) Object.assign(playerState, skill.stateChanges);
            } else {
                const attackResult = performAttack(
                    enemyStats, playerStats,
                    enemyStats.vamp + (enemyState.vampBuff>0 ? enemyState.vampBonus : 0),
                    playerStats.reflect + (playerState.reflectBuff>0 ? playerState.reflectBonus : 0),
                    enemyName, playerName,
                    enemyClass, enemySubclass, playerSubclass,
                    enemyState, playerState
                );
                if (attackResult.hit) {
                    playerHp -= attackResult.damage;
                    enemyHp += attackResult.vampHeal;
                    enemyHp -= attackResult.reflectDamage;
                    if (playerHp<0) playerHp=0; if (enemyHp<0) enemyHp=0;
                    actionLog = attackResult.log;
                    if (attackResult.berserkerBonus>0) actionLog += ` <span style="color:#f39c12;">(Ярость +${attackResult.berserkerBonus})</span>`;
                    if (attackResult.vampHeal>0) actionLog += ' ' + vampPhrase.replace('%s', enemyName).replace('%d', attackResult.vampHeal);
                    if (attackResult.reflectDamage>0) actionLog += ' ' + reflectPhrase.replace('%s', playerName).replace('%d', attackResult.reflectDamage).replace('%s', enemyName);
                } else {
                    actionLog = attackResult.log;
                }

                messages.push(actionLog);
                pushState();

                if (attackResult.extraLogs && attackResult.extraLogs.length>0) {
                    attackResult.extraLogs.forEach(extra => messages.push(extra));
                    pushState();
                }
                if (attackResult.stateChanges) Object.assign(playerState, attackResult.stateChanges);
            }
            turn = 'player';
        }

        // Урон от стаков в конце раунда
        const playerDot = applyDotDamage(playerState, playerName);
        const enemyDot = applyDotDamage(enemyState, enemyName);
        if (playerDot.damage>0) {
            playerHp -= playerDot.damage;
            if (playerHp<0) playerHp=0;
            playerDot.logs.forEach(entry => messages.push(entry));
            pushState();
        }
        if (enemyDot.damage>0) {
            enemyHp -= enemyDot.damage;
            if (enemyHp<0) enemyHp=0;
            enemyDot.logs.forEach(entry => messages.push(entry));
            pushState();
        }
        if (playerHp<=0 || enemyHp<=0) break;
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
    messages.push(finalPhrase);
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

// --- Вспомогательные функции ---
function expNeeded(level) { return Math.floor(80 * Math.pow(level, 1.5)); }
async function addExp(client, userId, className, expGain) { /* ... (полная версия из предыдущих файлов) */ }
function getCoinReward(streak) { return streak>=25 ? 20 : streak>=10 ? 10 : streak>=5 ? 7 : 5; }
function getRatingChange(streak) { return streak>=20 ? 30 : streak>=10 ? 25 : streak>=5 ? 20 : 15; }
async function rechargeEnergy(client, userId) { /* ... */ }
async function getPlayerRatingPosition(client, userId) { /* ... */ }
async function selectPvPOpponent(client, currentUserId, currentPosition, allPlayers) { /* ... */ }

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
        if (rand < 0.25) opponentData = generateBot(Math.min(60, classData.rows[0].level + Math.floor(Math.random()*3)+1), true);
        else if (rand < 0.70) opponentData = generateBot(classData.rows[0].level, false);
        else { /* PvP logic */ if (!opponentData) opponentData = generateBot(classData.rows[0].level, false); }

        if (!opponentData || !opponentData.stats) throw new Error('Failed to generate opponent');

        const battleResult = simulateBattle(playerStats, opponentData.stats, userData.current_class, opponentData.class, userData.username, opponentData.username, userData.subclass, opponentData.subclass);

        let isVictory = battleResult.winner === 'player';
        let expGain = isVictory ? 10 : 3;
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
        const leveledUp = await addExp(client, userData.id, userData.current_class, expGain);
        if (leveledUp) await updatePlayerPower(client, userData.id, userData.current_class);
        await client.query('UPDATE users SET energy = energy - 1 WHERE id = $1', [userData.id]);
        await client.query('COMMIT');

        const energyQuery = await client.query('SELECT energy FROM users WHERE id = $1', [userData.id]);

        res.json({
            opponent: { username: opponentData.username, avatar_id: opponentData.avatar_id, class: opponentData.class, subclass: opponentData.subclass, level: opponentData.level, is_cybercat: opponentData.is_cybercat||false },
            result: { winner: battleResult.winner, playerHpRemain: battleResult.playerHpRemain, enemyHpRemain: battleResult.enemyHpRemain, playerMaxHp: battleResult.playerMaxHp, enemyMaxHp: battleResult.enemyMaxHp, messages: battleResult.messages, states: battleResult.states },
            reward: { exp: expGain, coins: isVictory ? getCoinReward(newStreak) : 0, leveledUp, newStreak },
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
