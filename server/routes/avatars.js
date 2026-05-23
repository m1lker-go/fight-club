const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Получить список всех доступных аватаров (публичный, без авторизации)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, filename, is_default, price_gold, price_diamonds FROM avatars ORDER BY is_default DESC, name'
        );
        console.log('Avatars fetched:', result.rows);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Получить список купленных аватаров текущего пользователя (требует авторизацию)
router.get('/user', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const client = await pool.connect();
    try {
        const result = await client.query(
            'SELECT avatar_id FROM user_avatars WHERE user_id = $1',
            [userId]
        );
        res.json(result.rows.map(r => r.avatar_id));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// Купить аватар (требует авторизацию)
router.post('/buy', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { avatar_id } = req.body;
    if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userRes = await client.query('SELECT coins, diamonds FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const { coins, diamonds } = userRes.rows[0];

        const avatarRes = await client.query('SELECT price_gold, price_diamonds FROM avatars WHERE id = $1', [avatar_id]);
        if (avatarRes.rows.length === 0) throw new Error('Avatar not found');
        const { price_gold, price_diamonds } = avatarRes.rows[0];

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

// Получить аватар по ID (публичный, без авторизации)
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT id, name, filename FROM avatars WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Avatar not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
