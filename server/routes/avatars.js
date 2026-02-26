const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Получить список всех доступных аватаров
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, filename, is_default FROM avatars ORDER BY is_default DESC, name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;

// Получить список купленных аватаров пользователя
router.get('/user/:tg_id', async (req, res) => {
    const { tg_id } = req.params;
    try {
        const user = await pool.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userId = user.rows[0].id;

        const result = await pool.query(
            'SELECT avatar_id FROM user_avatars WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows.map(r => r.avatar_id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});
