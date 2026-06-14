const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Получить список всех достижений
router.get('/list', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM achievements ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получить список достижений текущего пользователя (id)
router.get('/user', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const result = await pool.query(
            'SELECT achievement_id FROM user_achievements WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows.map(r => r.achievement_id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Проверка и выдача достижения "Основатель" (вызывается после авторизации)
router.post('/check-founder', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Получаем id пользователя (проверяем, не зарегистрирован ли он уже)
        const userRes = await client.query('SELECT id, username FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];

        // Проверяем, нужно ли выдавать достижение (id <= 140 и ещё не выдано)
        let awarded = false;
        if (user.id <= 140) {
            const existing = await client.query(
                'SELECT 1 FROM user_achievements WHERE user_id = $1 AND achievement_id = 1',
                [user.id]
            );
            if (existing.rowCount === 0) {
                // Выдаём достижение
                await client.query(
                    'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, 1)',
                    [user.id]
                );
                // Отправляем системное сообщение
                await client.query(
                    `INSERT INTO user_messages (user_id, from_text, subject, body) 
                     VALUES ($1, 'Система', 'Новое достижение!', 
                     'Вы получили достижение "Основатель"! Оно доступно в настройках в разделе Достижения.')`,
                    [user.id]
                );
                awarded = true;
            }
        }
        await client.query('COMMIT');
        res.json({ awarded, achievement_id: awarded ? 1 : null });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Получить список достижений с прогрессом пользователя
router.get('/user-progress', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT total_wins FROM users WHERE id = $1', [userId]);
        const totalWins = userRes.rows[0]?.total_wins || 0;
        
        const achievementsRes = await client.query('SELECT id, name, description, icon, target_type, target_value FROM achievements ORDER BY id');
        const userAchRes = await client.query('SELECT achievement_id FROM user_achievements WHERE user_id = $1', [userId]);
        const earnedSet = new Set(userAchRes.rows.map(r => r.achievement_id));

        const result = achievementsRes.rows.map(ach => {
            const earned = earnedSet.has(ach.id);
            let progress = null;
            if (ach.target_type === 'wins' && ach.target_value !== null) {
                progress = { current: totalWins, required: ach.target_value };
            }
            return { ...ach, earned, progress };
        });
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

module.exports = router;
