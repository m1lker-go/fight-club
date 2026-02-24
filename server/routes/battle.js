const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Базовые характеристики для каждого класса (на 1 уровне)
const baseStats = {
    warrior: { hp: 28, atk: 3, def: 4, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 20, atk: 5, def: 1, agi: 5, int: 0, spd: 15, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 18, atk: 2, def: 1, agi: 2, int: 5, spd: 12, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
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

const vampPhrase = '<span style="color:#2ecc71;">%s восстанавливает %d HP благодаря вампиризму.</span>';
const reflectPhrase = '<span style="color:#e74c3c;">%s отражает %d урона обратно в %s!</span>';
const ultPhrases = {
    warrior: '<span style="color:#3498db;">%s использует НЕСОКРУШИМОСТЬ и восстанавливает %d HP!</span>',
    assassin: '<span style="color:#3498db;">%s применяет ТАНЕЦ СМЕРТИ, нанося %d урона и восстанавливая %d HP!</span>',
    mage: '<span style="color:#3498db;">%s активирует ЧИСТУЮ ЭНЕРГИЮ, нанося %d магического урона!</span>'
};

function calculateStats(classData, inventory, subclass) {
    const base = baseStats[classData.class] || baseStats.warrior;

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

    inventory.forEach(item => {
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

    // Выбираем фразу для атаки
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

function simulateBattle(playerStats, enemyStats, playerClass, enemyClass, playerSubclass, enemySubclass, playerName, enemyName) {
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

function generateBot(playerLevel) {
    // ... (ваша существующая функция, без изменений)
    // Я не копирую её сюда для краткости, но она должна быть такой же, как в вашем файле.
}

// Остальные функции (expNeeded, addExp, getCoinReward, rechargeEnergy) без изменений

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

        const battleResult = simulateBattle(playerStats, bot.stats, userData.current_class, bot.class, userData.subclass, bot.subclass, userData.username, bot.username);

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
