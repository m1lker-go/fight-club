const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Получить список всех доступных аватаров
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, filename, is_default, price_gold, price_diamonds FROM avatars ORDER BY is_default DESC, name'
        );
        console.log('Avatars fetched:', result.rows); // для отладки
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

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

// Купить аватар
router.post('/buy', async (req, res) => {
    const { tg_id, avatar_id } = req.body;
    if (!tg_id || !avatar_id) return res.status(400).json({ error: 'Missing data' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await client.query('SELECT id, coins, diamonds FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        let { coins, diamonds } = user.rows[0];

        const avatar = await client.query('SELECT price_gold, price_diamonds FROM avatars WHERE id = $1', [avatar_id]);
        if (avatar.rows.length === 0) throw new Error('Avatar not found');
        const { price_gold, price_diamonds } = avatar.rows[0];

        if (price_gold > 0 && coins < price_gold) throw new Error('Not enough coins');
        if (price_diamonds > 0 && diamonds < price_diamonds) throw new Error('Not enough diamonds');

        const owned = await client.query(
            'SELECT id FROM user_avatars WHERE user_id = $1 AND avatar_id = $2',
            [userId, avatar_id]
        );
        if (owned.rows.length > 0) throw new Error('Already owned');

        if (price_gold > 0) {
            await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price_gold, userId]);
        }
        if (price_diamonds > 0) {
            await client.query('UPDATE users SET diamonds = diamonds - $1 WHERE id = $2', [price_diamonds, userId]);
        }

        await client.query(
            'INSERT INTO user_avatars (user_id, avatar_id) VALUES ($1, $2)',
            [userId, avatar_id]
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

module.exports = router;
