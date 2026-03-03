const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Топ по рейтингу (обычному)
router.get('/rating', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.username,
                u.rating as rating,
                u.current_class as class
            FROM users u
            WHERE (SELECT COUNT(*) FROM battles WHERE player1_id = u.id OR player2_id = u.id) > 0
            ORDER BY u.rating DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (e) {
        console.error('Ошибка получения рейтинга:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

// Топ по силе (максимальная сила среди классов игрока)
router.get('/power', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.username,
                (SELECT power FROM user_classes uc WHERE uc.user_id = u.id ORDER BY power DESC LIMIT 1) as power,
                u.current_class as class
            FROM users u
            WHERE (SELECT COUNT(*) FROM battles WHERE player1_id = u.id OR player2_id = u.id) > 0
            ORDER BY power DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (e) {
        console.error('Ошибка получения силы:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
