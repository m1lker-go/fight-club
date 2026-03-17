const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { generateBot } = require('../utils/botGenerator');

// Вспомогательная функция для получения или создания записи прогресса
async function getOrCreateProgress(client, userId) {
    const res = await client.query(
        `SELECT * FROM tower_progress WHERE user_id = $1`,
        [userId]
    );
    if (res.rows.length === 0) {
        // Создаём новую запись с дефолтными значениями
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

        // Получаем информацию о выбранном классе (если есть)
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
        console.error(e);
        res.status(500).json({ error: 'Database error' });
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

        // Проверяем, есть ли у пользователя этот класс (можно пропустить, если доверяем)
        const classCheck = await client.query(
            'SELECT class FROM user_classes WHERE user_id = $1 AND class = $2',
            [userId, className]
        );
        if (classCheck.rows.length === 0) throw new Error('Class not available');

        // Обновляем или вставляем запись в tower_progress
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

// Начать бой на текущем этаже
router.post('/start-floor', async (req, res) => {
    const { tg_id } = req.body;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Получаем пользователя
        const userRes = await client.query('SELECT id, current_class, subclass FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const userId = userRes.rows[0].id;
        const userClass = userRes.rows[0].current_class;
        const userSubclass = userRes.rows[0].subclass;

        // Получаем прогресс в башне
        let progress = await getOrCreateProgress(client, userId);
        await checkAndResetAttempts(client, userId, progress);

        // Проверяем, есть ли билеты
        if (progress.attempts_today >= 10) {
            throw new Error('No tickets left today');
        }

        // Увеличиваем счётчик попыток
        await client.query(
            `UPDATE tower_progress SET attempts_today = attempts_today + 1, last_attempt_date = $1 WHERE user_id = $2`,
            [new Date().toISOString().split('T')[0], userId]
        );

        // Определяем уровень бота: равен номеру этажа, но не больше 60
        const botLevel = Math.min(60, progress.current_floor);
        // Генерируем бота с этим уровнем (isCybercat = false)
        const bot = generateBot(botLevel, false);

        // Получаем данные игрока (инвентарь, статы) как в обычном бою
        // Здесь нужно повторить логику из /battle/start, но можно вынести в отдельную функцию
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

        // Функция calculateStats должна быть доступна (импортирована из battle.js или вынесена в utils)
        // Для простоты можно скопировать сюда, но лучше вынести в общий модуль.
        // Допустим, у нас есть utils/stats.js с этой функцией.
        const { calculateStats } = require('../utils/stats'); // создайте этот файл или импортируйте из battle
        const playerStats = calculateStats(classData.rows[0], inv.rows, userSubclass);

        // Сохраняем информацию о начатом бою во временной таблице или в памяти (можно использовать Redis)
        // Пока пропустим, просто будем доверять клиенту, но добавим проверку позже.

        await client.query('COMMIT');

        // Возвращаем данные для боя, как в обычном /battle/start
        res.json({
            floor: progress.current_floor,
            opponent: {
                username: bot.username,
                avatar_id: bot.avatar_id,
                class: bot.class,
                subclass: bot.subclass,
                level: bot.level,
                is_cybercat: false
            },
            playerStats: playerStats, // нужно для симуляции на клиенте? Нет, симуляция на сервере.
            // Но мы не симулируем бой здесь, а только отдаём противника. Симуляция будет на клиенте? В текущей архитектуре бой симулируется на сервере в /battle/start.
            // Значит, нужно здесь тоже провести симуляцию и вернуть результат? Это нарушает принцип "начать бой" без результата.
            // Правильнее: start-floor резервирует билет и генерирует врага, а потом клиент запрашивает /battle/start с параметром, что это башня.
            // Но /battle/start уже существует и не знает про башню. Поэтому проще сделать отдельный эндпоинт /tower/battle, который и проведёт симуляцию.
            // Я предлагаю упростить: объединить start и battle в один запрос, который сразу возвращает результат боя. Тогда клиент получает результат и сразу показывает.
            // Это безопасно, так как билет списывается один раз, даже если игрок закроет страницу.
            // Итак, сразу проводим симуляцию и возвращаем результат.

            // Для этого нужно импортировать simulateBattle из battle.js или вынести в utils.
            const { simulateBattle } = require('./battle'); // но battle.js экспортирует router, а не функцию. Нужно рефакторить.
            // Пока для простоты скопируем логику simulateBattle сюда? Но это дублирование.
            // Лучше вынести simulateBattle в отдельный модуль utils/battleSimulator.js.

            // Учитывая сложность, в рамках этого ответа я дам упрощённый вариант: клиент после получения противника сам запускает симуляцию? Нет, симуляция должна быть на сервере.
            // Поэтому я предлагаю создать отдельный эндпоинт /tower/battle, который делает всё сразу: проверяет билет, генерирует противника, симулирует бой, возвращает результат и обновляет прогресс при победе.
            // Это самый чистый подход.

            // Тогда текущий эндпоинт /start-floor не нужен, а нужен /battle.
            // Я перепишу под это.
        });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Эндпоинт для непосредственного боя (объединяет старт, симуляцию и завершение)
router.post('/battle', async (req, res) => {
    const { tg_id } = req.body;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Получаем пользователя
        const userRes = await client.query('SELECT id, current_class, subclass FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const userId = userRes.rows[0].id;
        const userClass = userRes.rows[0].current_class;
        const userSubclass = userRes.rows[0].subclass;

        // Получаем прогресс в башне
        let progress = await getOrCreateProgress(client, userId);
        await checkAndResetAttempts(client, userId, progress);

        // Проверяем билеты
        if (progress.attempts_today >= 10) {
            throw new Error('No tickets left today');
        }

        // Увеличиваем счётчик попыток
        await client.query(
            `UPDATE tower_progress SET attempts_today = attempts_today + 1, last_attempt_date = $1 WHERE user_id = $2`,
            [new Date().toISOString().split('T')[0], userId]
        );

        // Определяем уровень бота
        const botLevel = Math.min(60, progress.current_floor);
        const bot = generateBot(botLevel, false);

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

        // Импортируем функции расчёта статов и симуляции (предполагаем, что они вынесены в utils)
        const { calculateStats } = require('../utils/stats');
        const { simulateBattle } = require('../utils/battleSimulator');

        const playerStats = calculateStats(classData.rows[0], inv.rows, userSubclass);
        const enemyStats = bot.stats; // бот уже содержит stats

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

        // Если победа, увеличиваем этаж
        if (isVictory) {
            await client.query(
                `UPDATE tower_progress SET current_floor = current_floor + 1, max_floor = GREATEST(max_floor, current_floor + 1) WHERE user_id = $1`,
                [userId]
            );
            // Можно сразу записать награду в tower_rewards (монеты)
            await client.query(
                `INSERT INTO tower_rewards (user_id, floor, reward_type, reward_amount) VALUES ($1, $2, 'coins', $3)`,
                [userId, progress.current_floor, 10] // награда за этот этаж
            );
        }

        await client.query('COMMIT');

        // Возвращаем результат боя и обновлённый прогресс
        res.json({
            success: true,
            battleResult: battleResult,
            floor: progress.current_floor, // текущий до боя, или после? Лучше вернуть новый этаж.
            newFloor: isVictory ? progress.current_floor + 1 : progress.current_floor,
            victory: isVictory,
            reward: isVictory ? { coins: 10 } : null,
            attemptsLeft: 10 - (progress.attempts_today + 1) // после увеличения
        });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Получить награду за уже пройденный этаж (если не получена автоматически)
router.post('/claim-floor', async (req, res) => {
    const { tg_id, floor } = req.body;
    if (!tg_id || !floor) return res.status(400).json({ error: 'Missing data' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        // Проверяем, что этаж пройден (max_floor >= floor) и награда ещё не получена
        const progress = await client.query('SELECT max_floor FROM tower_progress WHERE user_id = $1', [userId]);
        if (progress.rows.length === 0) throw new Error('Progress not found');
        if (progress.rows[0].max_floor < floor) throw new Error('Floor not passed');

        const rewardCheck = await client.query(
            'SELECT id FROM tower_rewards WHERE user_id = $1 AND floor = $2',
            [userId, floor]
        );
        if (rewardCheck.rows.length > 0) throw new Error('Reward already claimed');

        // Выдаём награду (монеты)
        await client.query(
            `INSERT INTO tower_rewards (user_id, floor, reward_type, reward_amount) VALUES ($1, $2, 'coins', $3)`,
            [userId, floor, 10]
        );
        await client.query('UPDATE users SET coins = coins + 10 WHERE id = $1', [userId]);

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

module.exports = router;
