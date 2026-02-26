const express = require('express');
const router = express.Router();
const { pool } = require('..db');

 Получить список всех доступных аватаров
router.get('', async (req, res) = {
    try {
        const result = await pool.query('SELECT id, name, filename, is_default FROM avatars ORDER BY is_default DESC, name');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error 'Database error' });
    }
});

module.exports = router;