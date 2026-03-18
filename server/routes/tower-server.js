const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { generateBot } = require('../utils/botGenerator');

console.log('✅ tower-server.js loaded (full version)');

// Группы классов для циклического перебора (9 комбинаций)
const classGroups = [
    { class: 'warrior', subclasses: ['guardian', 'berserker', 'knight'] },
    { class: 'assassin', subclasses: ['assassin', 'venom_blade', 'blood_hunter'] },
    { class: 'mage', subclasses: ['pyromancer', 'cryomancer', 'illusionist'] }
];

// Определяем тип врага для каждого этажа (цикл 1..9)
function getFloorEnemyType(floor) {
    const pos = (floor - 1) % 9;               // 0..8
    const groupIndex = Math.floor(pos / 3);    // 0,1,2
    const subIndex = pos % 3;                  // 0,1,2
    const group = classGroups[groupIndex];
    return {
        class: group.class,
        subclass: group.subclasses[subIndex]
    };
}

// Вспомогательная функция для получения или создания записи прогресса
async function getOrCreateProgress(client, userId) {
    const res = await client.query(
        `SELECT * FROM tower_progress WHERE user_id = $1`,
        [userId]
    );
    if (res.rows.length === 0) {
        await client.query(
            `INSERT INTO tower_progress (user_id, current_floor, max_floor, attempts_today, last_attempt_date)
             VALUES ($1, 1, 0, 0, NULL)`,
            [userId]
        );
        return { current_floor: 1, max_floor: 0, attempts_today: 0, last_attempt_date: null, chosen_class: null, chosen_subclass: null };
    }
    return res.rows[0];
}

// Проверка и сброс счётчика попыток, если прошёл день
async function checkAndResetAttempts(client, userId, progress) {
    const today = new Date().toISOString().split('T')[0];
    if (progress.last_attempt_date !== today) {
        await client.query(
            `UPDATE tower_progress SET attempts_today = 0, last_attempt_date = $1 WHERE user_id = $2`,
            [today, userId]
        );
        progress.attempts_today = 0;
    }
}

// Функция для получения случайного аватара (без учёта дефолтного и алмазных)
async function getRandomAvatar(client) {
    const res = await client.query(
        'SELECT id FROM avatars WHERE price_diamonds = 0 AND id != 1'
    );
    if (res.rows.length === 0) return null;
    const avatars = res.rows;
    const randomIndex = Math.floor(Math.random() * avatars.length);
    return avatars[randomIndex].id;
}

// Функция уровня бота в зависимости от этажа
function getBotLevel(floor) {
    if (floor <= 20) return floor;
    if (floor <= 76) {
        // Плавный рост с 20 до 57 на этажах 21–76
        return 20 + Math.round((floor - 20) * (57 - 20) / (76 - 20));
    }
    if (floor <= 80) return 57;   // 77–80: 57
    if (floor <= 86) return 58;   // 81–86: 58
    if (floor <= 91) return 59;   // 87–91: 59
    return 60;                     // 92–100: 60
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

        const userClass = await client.query(
            'SELECT current_class, subclass FROM users WHERE id = $1',
            [userId]
        );

        res.json({
            currentFloor: progress.current_floor,
            maxFloor: progress.max_floor,
            attemptsLeft: 10 - progress.attempts_today,
            chosenClass: progress.chosen_class || userClass.rows[0].current_class,
            chosenSubclass: progress.chosen_subclass || userClass.rows[0].subclass
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
            `INSERT INTO tower_progress (user_id, chosen_class, chosen_subclass)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id) DO UPDATE SET chosen_class = EXCLUDED.chosen_class, chosen_subclass = EXCLUDED.chosen_subclass`,
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

// Эндпоинт для боя в башне (реальная симуляция, фиксированные враги)
router.post('/battle', async (req, res) => {
    const { tg_id } = req.body;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT id, current_class, subclass FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const userId = userRes.rows[0].id;
        const userClass = userRes.rows[0].current_class;
        const userSubclass = userRes.rows[0].subclass;

        let progress = await getOrCreateProgress(client, userId);
        await checkAndResetAttempts(client, userId, progress);

        if (progress.attempts_today >= 10) {
            throw new Error('No tickets left today');
        }

        await client.query(
            `UPDATE tower_progress SET attempts_today = attempts_today + 1, last_attempt_date = $1 WHERE user_id = $2`,
            [new Date().toISOString().split('T')[0], userId]
        );

        const botLevel = getBotLevel(progress.current_floor);
        const enemyType = getFloorEnemyType(progress.current_floor);

        // Проверяем, есть ли уже сохранённый бот для этого этажа
        const botRes = await client.query(
            'SELECT bot_data FROM tower_bots WHERE user_id = $1 AND floor = $2',
            [userId, progress.current_floor]
        );

        let bot;
        if (botRes.rows.length > 0) {
            bot = botRes.rows[0].bot_data;
        } else {
            // Генерируем нового бота с фиксированным классом и подклассом
            bot = generateBot(botLevel, false, enemyType.class, enemyType.subclass);
            // Сохраняем в БД
            await client.query(
                `INSERT INTO tower_bots (user_id, floor, bot_data) VALUES ($1, $2, $3)`,
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

        // Получаем данные игрока
        const classData = await client.query(
            'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
            [userId, userClass]
        );
        if (classData.rows.length === 0) throw new Error('Class data not found');

        const inv = await client.query(
            `SELECT id, name, type, rarity, class_restriction, owner_class, 
                    atk_bonus, def_bonus, hp_bonus, agi_bonus, int_bonus, spd_bonus,
                    crit_bonus, crit_dmg_bonus, vamp_bonus, reflect_bonus
             FROM inventory WHERE user_id = $1 AND equipped = true`,
            [userId]
        );

        // Импортируем функции из battle.js
        const battleModule = require('./battle');
        const simulateBattle = battleModule.simulateBattle;
        const calculateStats = battleModule.calculateStats;

        const playerStats = calculateStats(classData.rows[0], inv.rows, userSubclass);
        const enemyStats = bot.stats;

        // Симулируем бой
        const battleResult = simulateBattle(
            playerStats,
            enemyStats,
            userClass,
            bot.class,
            userRes.rows[0].username || 'Player',
            bot.username,
            userSubclass,
            bot.subclass
        );

        const isVictory = battleResult.winner === 'player';

        // Переменные для награды
        let coinsReward = 0;
        let avatarReward = null;
        let rewardType = 'coins';
        let rewardAmount = 0;

        if (isVictory) {
            const floor = progress.current_floor;

            // Определяем награду в зависимости от этажа
            if (floor % 20 === 0) { // 20,40,60,80,100
                const avatarId = await getRandomAvatar(client);
                if (avatarId) {
                    // Проверяем, есть ли уже у пользователя
                    const owned = await client.query(
                        'SELECT id FROM user_avatars WHERE user_id = $1 AND avatar_id = $2',
                        [userId, avatarId]
                    );
                    if (owned.rows.length > 0) {
                        // Уже есть – выдаём 1500 монет
                        coinsReward = 1500;
                        rewardType = 'coins';
                        rewardAmount = 1500;
                    } else {
                        // Выдаём аватар
                        await client.query(
                            'INSERT INTO user_avatars (user_id, avatar_id) VALUES ($1, $2)',
                            [userId, avatarId]
                        );
                        avatarReward = avatarId;
                        rewardType = 'avatar';
                        rewardAmount = avatarId;
                    }
                } else {
                    // Если аватары отсутствуют (маловероятно), выдаём монеты
                    coinsReward = 1500;
                    rewardType = 'coins';
                    rewardAmount = 1500;
                }
            } else {
                // Обычные этажи – монеты по таблице
                if (floor <= 5) coinsReward = 30;
                else if (floor <= 10) coinsReward = 40;
                else if (floor <= 40) coinsReward = 50;
                else if (floor <= 60) coinsReward = 100;
                else if (floor <= 80) coinsReward = 250;
                else if (floor <= 99) coinsReward = 500;
                else if (floor === 100) coinsReward = 2000; // на случай, если 100 не особый
                rewardType = 'coins';
                rewardAmount = coinsReward;
            }

            // Начисляем монеты, если есть
            if (coinsReward > 0) {
                await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [coinsReward, userId]);
                // Записываем награду в tower_rewards
                await client.query(
                    `INSERT INTO tower_rewards (user_id, floor, reward_type, reward_amount) VALUES ($1, $2, $3, $4)`,
                    [userId, floor, 'coins', coinsReward]
                );
            } else if (avatarReward) {
                // Записываем награду-аватар
                await client.query(
                    `INSERT INTO tower_rewards (user_id, floor, reward_type, reward_amount) VALUES ($1, $2, $3, $4)`,
                    [userId, floor, 'avatar', avatarReward]
                );
            }

            // Обновляем прогресс этажа
            await client.query(
                `UPDATE tower_progress SET current_floor = current_floor + 1, max_floor = GREATEST(max_floor, current_floor + 1) WHERE user_id = $1`,
                [userId]
            );
        }

        await client.query('COMMIT');

        // Формируем ответ
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
            reward: rewardType === 'coins' 
                ? { type: 'coins', amount: rewardAmount } 
                : { type: 'avatar', avatarId: rewardAmount },
            attemptsLeft: 10 - (progress.attempts_today + 1)
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
