const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { generateBot } = require('../utils/botGenerator');
const tasksModule = require('./tasks'); // добавлено

console.log('✅ tower-server.js loaded (full version)');

// Функция для получения московской даты (YYYY-MM-DD)
function getMoscowDate() {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const result = moscowTime.toISOString().split('T')[0];
    console.log(`[getMoscowDate] now=${now.toISOString()}, moscowTime=${moscowTime}, result=${result}`);
    return result;
}

// Группы классов для циклического перебора (9 комбинаций)
const classGroups = [
    { class: 'warrior', subclasses: ['guardian', 'berserker', 'knight'] },
    { class: 'assassin', subclasses: ['assassin', 'venom_blade', 'blood_hunter'] },
    { class: 'mage', subclasses: ['pyromancer', 'cryomancer', 'illusionist'] }
];

function getFloorEnemyType(floor) {
    const pos = (floor - 1) % 9;
    const groupIndex = Math.floor(pos / 3);
    const subIndex = pos % 3;
    const group = classGroups[groupIndex];
    return {
        class: group.class,
        subclass: group.subclasses[subIndex]
    };
}

async function getOrCreateProgress(client, userId) {
    const res = await client.query(
        'SELECT * FROM tower_progress WHERE user_id = $1',
        [userId]
    );
    if (res.rows.length === 0) {
        await client.query(
            'INSERT INTO tower_progress (user_id, current_floor, max_floor, attempts_today, last_attempt_date) VALUES ($1, 1, 0, 0, NULL)',
            [userId]
        );
        return { current_floor: 1, max_floor: 0, attempts_today: 0, last_attempt_date: null, chosen_class: null, chosen_subclass: null };
    }
    return res.rows[0];
}

async function checkAndResetAttempts(client, userId, progress) {
    const today = getMoscowDate();
    const lastDateStr = progress.last_attempt_date 
        ? new Date(progress.last_attempt_date).toISOString().split('T')[0] 
        : null;
    console.log(`[checkAndResetAttempts] user ${userId}: last_attempt_date=${lastDateStr}, today=${today}`);
    if (lastDateStr !== today) {
        await client.query(
            'UPDATE tower_progress SET attempts_today = 0, last_attempt_date = $1 WHERE user_id = $2',
            [today, userId]
        );
        progress.attempts_today = 0;
        progress.last_attempt_date = today;
        console.log(`[checkAndResetAttempts] user ${userId}: reset to 0 (new day ${today})`);
    } else {
        console.log(`[checkAndResetAttempts] user ${userId}: no reset`);
    }
}

async function getRandomAvatar(client) {
    const res = await client.query(
        'SELECT id FROM avatars WHERE price_diamonds = 0 AND id != 1'
    );
    if (res.rows.length === 0) return null;
    const avatars = res.rows;
    const randomIndex = Math.floor(Math.random() * avatars.length);
    return avatars[randomIndex].id;
}

function getBotLevel(floor) {
    if (floor <= 20) return floor;
    if (floor <= 76) {
        return 20 + Math.round((floor - 20) * (57 - 20) / (76 - 20));
    }
    if (floor <= 80) return 57;
    if (floor <= 86) return 58;
    if (floor <= 91) return 59;
    return 60;
}

// Получить состояние башни
router.get('/status', async (req, res) => {
    const { tg_id } = req.query;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });

    const client = await pool.connect();
    try {
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userId = user.rows[0].id;

        let progress = await getOrCreateProgress(client, userId);
        await checkAndResetAttempts(client, userId, progress);

        console.log(`[STATUS] user ${userId}: attempts_today=${progress.attempts_today}, last_attempt_date=${progress.last_attempt_date}, attemptsLeft=${10 - progress.attempts_today}`);

        res.json({
            currentFloor: progress.current_floor,
            maxFloor: progress.max_floor,
            attemptsLeft: 10 - progress.attempts_today,
            chosenClass: progress.chosen_class,
            chosenSubclass: progress.chosen_subclass
        });
    } catch (e) {
        console.error('ERROR in /status:', e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Выбор класса на сезон
router.post('/select-class', async (req, res) => {
    const { tg_id, class: className, subclass } = req.body;
    if (!tg_id || !className || !subclass) return res.status(400).json({ error: 'Missing data' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const classCheck = await client.query(
            'SELECT class FROM user_classes WHERE user_id = $1 AND class = $2',
            [userId, className]
        );
        if (classCheck.rows.length === 0) throw new Error('Class not available');

        await client.query(
            'INSERT INTO tower_progress (user_id, chosen_class, chosen_subclass) VALUES ($1, $2, $3) ON CONFLICT (user_id) DO UPDATE SET chosen_class = EXCLUDED.chosen_class, chosen_subclass = EXCLUDED.chosen_subclass',
            [userId, className, subclass]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Эндпоинт для боя в башне
router.post('/battle', async (req, res) => {
    const { tg_id } = req.body;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT id, username FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const userId = userRes.rows[0].id;
        const username = userRes.rows[0].username || 'Player';

        let progress = await getOrCreateProgress(client, userId);
        await checkAndResetAttempts(client, userId, progress);

        // Проверяем, что класс для башни выбран
        if (!progress.chosen_class || !progress.chosen_subclass) {
            throw new Error('Class not selected for tower. Please select a class first.');
        }

        const chosenClass = progress.chosen_class;
        const chosenSubclass = progress.chosen_subclass;

        const today = getMoscowDate();
        console.log(`[BATTLE] before update: attempts_today=${progress.attempts_today}, last_attempt_date=${progress.last_attempt_date}, today=${today}`);
        const updateRes = await client.query(
            'UPDATE tower_progress SET attempts_today = attempts_today + 1, last_attempt_date = $1 WHERE user_id = $2 AND attempts_today < 10 RETURNING attempts_today',
            [today, userId]
        );

        if (updateRes.rowCount === 0) {
            throw new Error('No tickets left today');
        }

        const newAttemptsToday = updateRes.rows[0].attempts_today;
        progress.attempts_today = newAttemptsToday;
        console.log(`[BATTLE UPDATE] user ${userId}: newAttemptsToday=${newAttemptsToday}, date=${today}`);

        // Обновляем задание "Башня" (если функция существует)
        if (tasksModule.updateTowerTask) {
            await tasksModule.updateTowerTask(client, userId);
        } else {
            console.warn('[tower] updateTowerTask not found');
        }

        const dateCheck = await client.query('SELECT last_attempt_date FROM tower_progress WHERE user_id = $1', [userId]);
        console.log(`[BATTLE] after update, DB last_attempt_date = ${dateCheck.rows[0].last_attempt_date}`);

        const botLevel = getBotLevel(progress.current_floor);
        const enemyType = getFloorEnemyType(progress.current_floor);

        const botRes = await client.query(
            'SELECT bot_data FROM tower_bots WHERE user_id = $1 AND floor = $2',
            [userId, progress.current_floor]
        );

        let bot;
        if (botRes.rows.length > 0) {
            bot = botRes.rows[0].bot_data;
        } else {
            bot = generateBot(botLevel, false, enemyType.class, enemyType.subclass);
            await client.query(
                'INSERT INTO tower_bots (user_id, floor, bot_data) VALUES ($1, $2, $3)',
                [userId, progress.current_floor, bot]
            );
        }

        const opponent = {
            username: bot.username,
            avatar_id: bot.avatar_id,
            class: bot.class,
            subclass: bot.subclass,
            level: bot.level,
            is_cybercat: false
        };

        // Получаем данные для ВЫБРАННОГО класса (chosenClass)
        const classData = await client.query(
            'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
            [userId, chosenClass]
        );
        if (classData.rows.length === 0) throw new Error('Class data not found for chosen class');

        // Инвентарь – все надетые предметы, calculateStats сам отфильтрует по owner_class
        const inv = await client.query(
            `SELECT id, name, type, rarity, class_restriction, owner_class, 
                    atk_bonus, def_bonus, hp_bonus, agi_bonus, int_bonus, spd_bonus,
                    crit_bonus, crit_dmg_bonus, vamp_bonus, reflect_bonus
             FROM inventory WHERE user_id = $1 AND equipped = true`,
            [userId]
        );

        const battleModule = require('./battle');
        const simulateBattle = battleModule.simulateBattle;
        const calculateStats = battleModule.calculateStats;

        const playerStats = calculateStats(classData.rows[0], inv.rows, chosenSubclass);
        const enemyStats = bot.stats;

        const battleResult = simulateBattle(
            playerStats,
            enemyStats,
            chosenClass,
            bot.class,
            username,
            bot.username,
            chosenSubclass,
            bot.subclass
        );

        const isVictory = battleResult.winner === 'player';

        let coinsReward = 0;
        let avatarReward = null;
        let rewardType = 'coins';
        let rewardAmount = 0;

        if (isVictory) {
            const floor = progress.current_floor;

            if (floor % 20 === 0) {
                const avatarId = await getRandomAvatar(client);
                if (avatarId) {
                    const owned = await client.query(
                        'SELECT id FROM user_avatars WHERE user_id = $1 AND avatar_id = $2',
                        [userId, avatarId]
                    );
                    if (owned.rows.length > 0) {
                        coinsReward = 1500;
                        rewardType = 'coins';
                        rewardAmount = 1500;
                    } else {
                        await client.query(
                            'INSERT INTO user_avatars (user_id, avatar_id) VALUES ($1, $2)',
                            [userId, avatarId]
                        );
                        avatarReward = avatarId;
                        rewardType = 'avatar';
                        rewardAmount = avatarId;
                    }
                } else {
                    coinsReward = 1500;
                    rewardType = 'coins';
                    rewardAmount = 1500;
                }
            } else {
                if (floor <= 5) coinsReward = 30;
                else if (floor <= 10) coinsReward = 40;
                else if (floor <= 40) coinsReward = 50;
                else if (floor <= 60) coinsReward = 100;
                else if (floor <= 80) coinsReward = 250;
                else if (floor <= 99) coinsReward = 500;
                else if (floor === 100) coinsReward = 2000;
                rewardType = 'coins';
                rewardAmount = coinsReward;
            }

            if (coinsReward > 0) {
                await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [coinsReward, userId]);
                await client.query(
                    'INSERT INTO tower_rewards (user_id, floor, reward_type, reward_amount) VALUES ($1, $2, $3, $4)',
                    [userId, floor, 'coins', coinsReward]
                );
                console.log(`[REWARD] user ${userId} floor ${floor} +${coinsReward} coins`);
            } else if (avatarReward) {
                await client.query(
                    'INSERT INTO tower_rewards (user_id, floor, reward_type, reward_amount) VALUES ($1, $2, $3, $4)',
                    [userId, floor, 'avatar', avatarReward]
                );
                console.log(`[REWARD] user ${userId} floor ${floor} received avatar ${avatarReward}`);
            }

            await client.query(
                'UPDATE tower_progress SET current_floor = current_floor + 1, max_floor = GREATEST(max_floor, current_floor + 1) WHERE user_id = $1',
                [userId]
            );

            // Обновляем рекорд в лидерборде башни (только если новый этаж больше предыдущего)
            await client.query(
                `INSERT INTO tower_leaderboard (user_id, floor, achieved_at)
                 VALUES ($1, $2, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET
                    floor = EXCLUDED.floor,
                    achieved_at = EXCLUDED.achieved_at
                 WHERE tower_leaderboard.floor < EXCLUDED.floor`,
                [userId, progress.current_floor]
            );
        }

        await client.query('COMMIT');
        console.log(`[BATTLE COMMIT] user ${userId} success, attemptsLeft in response: ${10 - newAttemptsToday}`);

        let responseReward = null;
        if (isVictory) {
            responseReward = rewardType === 'coins' 
                ? { type: 'coins', amount: rewardAmount } 
                : { type: 'avatar', avatarId: rewardAmount };
        }

        res.json({
            success: true,
            opponent: opponent,
            result: {
                winner: battleResult.winner,
                playerHpRemain: battleResult.playerHpRemain,
                enemyHpRemain: battleResult.enemyHpRemain,
                playerMaxHp: battleResult.playerMaxHp,
                enemyMaxHp: battleResult.enemyMaxHp,
                messages: battleResult.messages,
                states: battleResult.states
            },
            floor: progress.current_floor,
            newFloor: isVictory ? progress.current_floor + 1 : progress.current_floor,
            victory: isVictory,
            reward: responseReward,
            attemptsLeft: 10 - newAttemptsToday
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
