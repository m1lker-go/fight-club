const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Вспомогательная функция для парсинга прогресса
function parseProgress(progress) {
    if (!progress) return {};
    try {
        return typeof progress === 'string' ? JSON.parse(progress) : progress;
    } catch {
        return {};
    }
}

// Вспомогательная функция генерации предмета по редкости (аналог из shop.js)
function generateItemByRarity(rarity, ownerClass = null) {
    const itemNames = {
        common: ['Ржавый меч', 'Деревянный щит', 'Кожаный шлем', 'Тряпичные перчатки', 'Старые сапоги', 'Медное кольцо'],
        uncommon: ['Качественный меч', 'Укреплённый щит', 'Кожаный шлем с заклёпками', 'Перчатки из плотной кожи', 'Сапоги скорохода', 'Кольцо силы'],
        rare: ['Стальной меч', 'Щит рыцаря', 'Шлем с забралом', 'Перчатки воина', 'Сапоги легионера', 'Кольцо защиты'],
        epic: ['Меч героя', 'Эгида', 'Шлем вождя', 'Перчатки титана', 'Сапоги ветра', 'Кольцо мудрости'],
        legendary: ['Экскалибур', 'Щит Ахилла', 'Шлем Одина', 'Перчатки Геракла', 'Сапоги Гермеса', 'Кольцо всевластия']
    };
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    const name = itemNames[rarity][Math.floor(Math.random() * itemNames[rarity].length)];
    
    const bonuses = {
        common: { atk: 1, def: 1, hp: 2 },
        uncommon: { atk: 2, def: 2, hp: 4 },
        rare: { atk: 3, def: 3, hp: 6 },
        epic: { atk: 5, def: 5, hp: 10 },
        legendary: { atk: 7, def: 7, hp: 15 }
    };
    const b = bonuses[rarity];
    
    return {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: ownerClass || ['warrior','assassin','mage'][Math.floor(Math.random()*3)],
        atk_bonus: Math.floor(b.atk * (0.8 + 0.4*Math.random())),
        def_bonus: Math.floor(b.def * (0.8 + 0.4*Math.random())),
        hp_bonus: Math.floor(b.hp * (0.8 + 0.4*Math.random())),
    };
}

// Функция для определения награды по дню
function getAdventReward(day, daysInMonth) {
    const coinExpBase = [50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 100, 100, 120, 120, 150, 150, 200, 200, 250, 250, 300, 300, 400, 400, 500, 500];
    if (day === 7) return { type: 'item', rarity: 'common' };
    if (day === 10) return { type: 'item', rarity: 'uncommon' };
    if (day === 15) return { type: 'item', rarity: 'rare' };
    if (day === 22) return { type: 'item', rarity: 'epic' };
    if (day === 30) return { type: 'item', rarity: 'legendary' };
    if (daysInMonth === 31 && day === 31) return { type: 'item', rarity: 'legendary' };
    const index = day - 1;
    if (index < coinExpBase.length) {
        if (day % 2 === 1) return { type: 'coins', amount: coinExpBase[index] };
        else return { type: 'exp', amount: coinExpBase[index] };
    } else {
        const higher = [300, 300, 400, 400, 500, 500];
        let idx = index - coinExpBase.length;
        if (idx < higher.length) {
            if (day % 2 === 1) return { type: 'coins', amount: higher[idx] };
            else return { type: 'exp', amount: higher[idx] };
        }
    }
    return { type: 'coins', amount: 100 };
}

// Получить состояние календаря
router.get('/advent', async (req, res) => {
    const { tg_id } = req.query;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });
    
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT id, advent_month, advent_year, advent_mask FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        let { advent_month, advent_year, advent_mask } = user.rows[0];
        const userId = user.rows[0].id;
        
        const now = new Date();
        const mskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const currentMonth = mskTime.getMonth() + 1;
        const currentYear = mskTime.getFullYear();
        const currentDay = mskTime.getDate();
        
        if (advent_month !== currentMonth || advent_year !== currentYear) {
            advent_mask = 0;
            advent_month = currentMonth;
            advent_year = currentYear;
            await client.query(
                'UPDATE users SET advent_month = $1, advent_year = $2, advent_mask = $3 WHERE id = $4',
                [currentMonth, currentYear, 0, userId]
            );
        }
        
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        
        res.json({
            currentDay,
            daysInMonth,
            mask: advent_mask,
            month: currentMonth,
            year: currentYear
        });
    } finally {
        client.release();
    }
});

// Забрать награду за конкретный день
router.post('/advent/claim', async (req, res) => {
    const { tg_id, day, classChoice } = req.body;
    if (!tg_id || !day) return res.status(400).json({ error: 'Missing data' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const user = await client.query('SELECT id, advent_month, advent_year, advent_mask FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        let { advent_month, advent_year, advent_mask } = user.rows[0];
        
        const now = new Date();
        const mskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const currentMonth = mskTime.getMonth() + 1;
        const currentYear = mskTime.getFullYear();
        const currentDay = mskTime.getDate();
        
        if (advent_month !== currentMonth || advent_year !== currentYear) {
            advent_mask = 0;
            advent_month = currentMonth;
            advent_year = currentYear;
        }
        
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        if (day > currentDay || day > daysInMonth) {
            throw new Error('This day is not available yet');
        }
        
        if (advent_mask & (1 << (day-1))) {
            throw new Error('Reward already claimed');
        }
        
        // Проверка, что все предыдущие дни получены
        if (day > 1) {
            const expectedMask = (1 << (day-1)) - 1;
            if ((advent_mask & expectedMask) !== expectedMask) {
                throw new Error('You must claim previous days first');
            }
        }
        
        const reward = getAdventReward(day, daysInMonth);
        let rewardDescription = '';
        
        if (reward.type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [reward.amount, userId]);
            rewardDescription = `${reward.amount} монет`;
        } else if (reward.type === 'exp') {
            if (!classChoice) throw new Error('Class choice required for exp');
            const classRes = await client.query('SELECT level, exp FROM user_classes WHERE user_id = $1 AND class = $2', [userId, classChoice]);
            if (classRes.rows.length === 0) throw new Error('Class not found');
            let { level, exp } = classRes.rows[0];
            exp += reward.amount;
            let leveledUp = false;
            const expNeeded = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));
            while (exp >= expNeeded(level)) {
                exp -= expNeeded(level);
                level++;
                leveledUp = true;
                await client.query('UPDATE user_classes SET skill_points = skill_points + 3 WHERE user_id = $1 AND class = $2', [userId, classChoice]);
            }
            await client.query('UPDATE user_classes SET level = $1, exp = $2 WHERE user_id = $3 AND class = $4', [level, exp, userId, classChoice]);
            rewardDescription = `${reward.amount} опыта для класса ${classChoice}`;
        } else if (reward.type === 'item') {
            const item = generateItemByRarity(reward.rarity, null);
            const itemRes = await client.query(
                `INSERT INTO items (name, type, rarity, class_restriction, owner_class, atk_bonus, def_bonus, hp_bonus) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [item.name, item.type, item.rarity, 'any', item.owner_class, item.atk_bonus, item.def_bonus, item.hp_bonus]
            );
            const itemId = itemRes.rows[0].id;
            await client.query('INSERT INTO inventory (user_id, item_id, equipped) VALUES ($1, $2, false)', [userId, itemId]);
            rewardDescription = `Предмет: ${item.name} (${item.rarity})`;
        }
        
        advent_mask |= (1 << (day-1));
        await client.query('UPDATE users SET advent_mask = $1, advent_month = $2, advent_year = $3 WHERE id = $4', 
            [advent_mask, currentMonth, currentYear, userId]);
        
        await client.query('COMMIT');
        
        res.json({ success: true, reward: rewardDescription, mask: advent_mask });
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// -------------------- ЕЖЕДНЕВНЫЕ ЗАДАНИЯ --------------------

// Получить список доступных заданий для пользователя
router.get('/daily/list', async (req, res) => {
    console.log('=== /daily/list called ===');
    console.log('tg_id:', req.query.tg_id);
    const { tg_id } = req.query;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });

    const client = await pool.connect();
    try {
        const userRes = await client.query(
            'SELECT id, daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        // Сброс, если новый день
        if (user.last_daily_reset !== today) {
            await client.query(
                'UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = $1, last_daily_reset = $2 WHERE id = $3',
                ['{}', today, userId]
            );
            user.daily_tasks_mask = 0;
            user.daily_tasks_progress = '{}';
        }

        // Парсим прогресс
        let progressObj = parseProgress(user.daily_tasks_progress);

        const tasksRes = await client.query('SELECT * FROM daily_tasks ORDER BY id');
        const tasks = tasksRes.rows;

        const result = [];
        for (const task of tasks) {
            const completed = !!(user.daily_tasks_mask & (1 << (task.id - 1)));
            const progress = completed ? task.target_value : (progressObj[task.id] || 0);
            result.push({
                id: task.id,
                name: task.name,
                description: task.description,
                reward_type: task.reward_type,
                reward_amount: task.reward_amount,
                target_type: task.target_type,
                target_value: task.target_value,
                progress: parseInt(progress),
                completed
            });
        }

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// Получить награду за задание (с возможностью выбора класса для EXP)
router.post('/daily/claim', async (req, res) => {
    const { tg_id, task_id, class_choice } = req.body;
    if (!tg_id || !task_id) return res.status(400).json({ error: 'Missing data' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query(
            'SELECT id, coins, daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        if (user.last_daily_reset !== today) {
            throw new Error('Daily reset needed, please refresh');
        }

        if (user.daily_tasks_mask & (1 << (task_id - 1))) {
            throw new Error('Task already claimed');
        }

        const taskRes = await client.query('SELECT * FROM daily_tasks WHERE id = $1', [task_id]);
        if (taskRes.rows.length === 0) throw new Error('Task not found');
        const task = taskRes.rows[0];

        let progressObj = parseProgress(user.daily_tasks_progress);
        const progress = progressObj[task_id] || 0;
        if (parseInt(progress) < task.target_value) {
            throw new Error('Task not completed');
        }

        // Начисляем награду
        if (task.reward_type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [task.reward_amount, userId]);
        } else if (task.reward_type === 'exp') {
            if (!class_choice) {
                throw new Error('class_choice required for exp reward');
            }
            const classRes = await client.query(
                'SELECT level, exp FROM user_classes WHERE user_id = $1 AND class = $2',
                [userId, class_choice]
            );
            if (classRes.rows.length === 0) throw new Error('Class not found');
            let { level, exp } = classRes.rows[0];
            exp += task.reward_amount;
            const expNeeded = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));
            while (exp >= expNeeded(level)) {
                exp -= expNeeded(level);
                level++;
                await client.query(
                    'UPDATE user_classes SET skill_points = skill_points + 3 WHERE user_id = $1 AND class = $2',
                    [userId, class_choice]
                );
            }
            await client.query(
                'UPDATE user_classes SET level = $1, exp = $2 WHERE user_id = $3 AND class = $4',
                [level, exp, userId, class_choice]
            );
        }

        // Отмечаем задание выполненным
        await client.query(
            'UPDATE users SET daily_tasks_mask = daily_tasks_mask | $1 WHERE id = $2',
            [1 << (task_id - 1), userId]
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

// Маршруты для обновления прогресса

router.post('/daily/update/battle', async (req, res) => {
    console.log('=== /daily/update/battle called ===');
    console.log('req.body:', req.body);
    const { tg_id, class_played, is_victory } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query(
            'SELECT id, daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        let progress = {};
        let mask = user.daily_tasks_mask;

        // Если дата не совпадает – сбрасываем прогресс и маску
       const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
if (lastResetStr !== today) {
    console.log('New day detected, resetting progress');
    progress = {};
    mask = 0;
    await client.query(
        'UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = $1, last_daily_reset = $2 WHERE id = $3',
        ['{}', today, userId]
    );
} else {
    progress = parseProgress(user.daily_tasks_progress);
}

        // Задание 5: сыграть 15 матчей
        progress[5] = (progress[5] || 0) + 1;

        // Классовые победы (задания 1-3)
        if (is_victory) {
            if (class_played === 'warrior') progress[1] = (progress[1] || 0) + 1;
            if (class_played === 'assassin') progress[2] = (progress[2] || 0) + 1;
            if (class_played === 'mage') progress[3] = (progress[3] || 0) + 1;
        }

        await client.query(
            'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
            [JSON.stringify(progress), userId]
        );

        await client.query('COMMIT');
        console.log('Прогресс обновлён:', progress);
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/daily/update/exp', async (req, res) => {
    console.log('=== /daily/update/exp called ===');
    console.log('req.body:', req.body);
    const { tg_id, exp_gained } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query(
            'SELECT id, daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        let progress = {};
        let mask = user.daily_tasks_mask;

        if (user.last_daily_reset !== today) {
            console.log('New day detected, resetting progress');
            progress = {};
            mask = 0;
            await client.query(
                'UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = $1, last_daily_reset = $2 WHERE id = $3',
                ['{}', today, userId]
            );
        } else {
            progress = parseProgress(user.daily_tasks_progress);
        }

        // Задание 4: набор опыта
        progress[4] = (progress[4] || 0) + exp_gained;

        await client.query(
            'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
            [JSON.stringify(progress), userId]
        );

        await client.query('COMMIT');
        console.log('Прогресс обновлён:', progress);
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/daily/update/chest', async (req, res) => {
    const { tg_id, item_rarity } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query(
            'SELECT id, daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        let progress = {};
        let mask = user.daily_tasks_mask;

        if (user.last_daily_reset !== today) {
            console.log('New day detected, resetting progress');
            progress = {};
            mask = 0;
            await client.query(
                'UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = $1, last_daily_reset = $2 WHERE id = $3',
                ['{}', today, userId]
            );
        } else {
            progress = parseProgress(user.daily_tasks_progress);
        }

        // Задание 7: счастливчик (редкий+ предмет)
        if (['rare', 'epic', 'legendary'].includes(item_rarity)) {
            progress[7] = (progress[7] || 0) + 1;
        }

        await client.query(
            'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
            [JSON.stringify(progress), userId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/daily/update/profile', async (req, res) => {
    const { tg_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query(
            'SELECT id, daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        let progress = {};
        let mask = user.daily_tasks_mask;

        if (user.last_daily_reset !== today) {
            console.log('New day detected, resetting progress');
            progress = {};
            mask = 0;
            await client.query(
                'UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = $1, last_daily_reset = $2 WHERE id = $3',
                ['{}', today, userId]
            );
        } else {
            progress = parseProgress(user.daily_tasks_progress);
        }

        // Задание 6: любознательный
        progress[6] = (progress[6] || 0) + 1;

        await client.query(
            'UPDATE users SET daily_tasks_progress = $1, last_profile_visit = $2 WHERE id = $3',
            [JSON.stringify(progress), moscowNow, userId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
