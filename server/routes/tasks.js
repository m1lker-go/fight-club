const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Вспомогательная функция для получения прогресса
function getProgress(userData, taskId) {
    if (!userData.daily_tasks_progress) return 0;
    const progress = userData.daily_tasks_progress[taskId];
    return progress ? parseInt(progress) : 0;
}

// Получить список доступных заданий для пользователя
router.get('/daily/list', async (req, res) => {
    const { tg_id } = req.query;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });

    const client = await pool.connect();
    try {
        const userRes = await client.query(
            'SELECT id, daily_tasks_mask, daily_tasks_progress, last_daily_reset, last_profile_visit FROM users WHERE tg_id = $1',
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
                'UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = \'{}\', last_daily_reset = $1 WHERE id = $2',
                [today, userId]
            );
            user.daily_tasks_mask = 0;
            user.daily_tasks_progress = {};
        }

        const tasksRes = await client.query('SELECT * FROM daily_tasks ORDER BY id');
        const tasks = tasksRes.rows;

        const result = [];
        for (const task of tasks) {
            const completed = !!(user.daily_tasks_mask & (1 << (task.id - 1)));
            const progress = completed ? task.target_value : (user.daily_tasks_progress[task.id] || 0);
            result.push({
                id: task.id,
                name: task.name,
                description: task.description,
                reward_type: task.reward_type,
                reward_amount: task.reward_amount,
                target_value: task.target_value,
                progress: parseInt(progress),
                completed
            });
        }

        res.json(result);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// Получить награду за задание
router.post('/daily/claim', async (req, res) => {
    const { tg_id, task_id } = req.body;
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

        const progress = user.daily_tasks_progress[task_id] || 0;
        if (parseInt(progress) < task.target_value) {
            throw new Error('Task not completed');
        }

        // Начисляем награду
        if (task.reward_type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [task.reward_amount, userId]);
        } else if (task.reward_type === 'exp') {
            // Опыт начисляем на текущий класс? Или на все? Пока на текущий.
            // Для простоты – позже можно доработать.
            const classRes = await client.query(
                'SELECT level, exp FROM user_classes WHERE user_id = $1 AND class = (SELECT current_class FROM users WHERE id = $1)',
                [userId]
            );
            if (classRes.rows.length > 0) {
                let { level, exp } = classRes.rows[0];
                exp += task.reward_amount;
                const expNeeded = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));
                while (exp >= expNeeded(level)) {
                    exp -= expNeeded(level);
                    level++;
                    await client.query(
                        'UPDATE user_classes SET skill_points = skill_points + 3 WHERE user_id = $1 AND class = $2',
                        [userId, classRes.rows[0].class]
                    );
                }
                await client.query(
                    'UPDATE user_classes SET level = $1, exp = $2 WHERE user_id = $3 AND class = $4',
                    [level, exp, userId, classRes.rows[0].class]
                );
            }
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

// Маршруты для обновления прогресса (будут вызываться из других частей игры)
// Например, после боя, после открытия сундука и т.д.

router.post('/daily/update/battle', async (req, res) => {
    const { tg_id, class_played, is_victory } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query(
            'SELECT id, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        if (user.last_daily_reset !== today) {
            // Сброс произойдёт при следующем запросе списка, пока игнорируем
            await client.query('ROLLBACK');
            return res.json({ success: true }); // ничего не обновляем
        }

        let progress = user.daily_tasks_progress || {};

        // Задание "Сыграть 15 матчей"
        progress[5] = (progress[5] || 0) + 1;

        // Задания на классовые победы
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
    const { tg_id, exp_gained } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query(
            'SELECT id, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        if (user.last_daily_reset !== today) {
            await client.query('ROLLBACK');
            return res.json({ success: true });
        }

        let progress = user.daily_tasks_progress || {};
        progress[4] = (progress[4] || 0) + exp_gained;

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

router.post('/daily/update/chest', async (req, res) => {
    const { tg_id, item_rarity } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query(
            'SELECT id, daily_tasks_progress, last_daily_reset FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        if (user.last_daily_reset !== today) {
            await client.query('ROLLBACK');
            return res.json({ success: true });
        }

        let progress = user.daily_tasks_progress || {};

        // Задание на получение редкого+ предмета
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
        const userRes = await client.query(
            'SELECT id, last_daily_reset, last_profile_visit FROM users WHERE tg_id = $1',
            [tg_id]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        if (user.last_daily_reset !== today) {
            // Сброс позже
            return res.json({ success: true });
        }

        // Если сегодня ещё не заходил в профиль,
