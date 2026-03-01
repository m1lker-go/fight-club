const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.get('/', async (req, res) => {
    const { class: className, rarity, minPrice, maxPrice, stat } = req.query;
    try {
        let query = `
            SELECT i.*, u.username as seller_name, u.id as seller_id
            FROM inventory i
            JOIN users u ON i.user_id = u.id
            WHERE i.for_sale = true
        `;
        const params = [];
        if (className && className !== 'any') {
            params.push(className);
            // Фильтруем по owner_class, а не по class_restriction
            query += ` AND i.owner_class = $${params.length}`;
        }
        if (rarity && rarity !== 'any') {
            params.push(rarity);
            query += ` AND i.rarity = $${params.length}`;
        }
        if (minPrice) {
            params.push(minPrice);
            query += ` AND i.price >= $${params.length}`;
        }
        if (maxPrice) {
            params.push(maxPrice);
            query += ` AND i.price <= $${params.length}`;
        }
        if (stat && stat !== 'any') {
            query += ` AND i.${stat} > 0`; // параметр не добавляем
        }
        query += ' ORDER BY i.price';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (e) {
        console.error('Market error:', e);
        res.status(500).json({ error: e.message, rows: [] });
    }
});

router.post('/buy', async (req, res) => {
    const { tg_id, item_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const buyer = await client.query('SELECT id, coins FROM users WHERE tg_id = $1', [tg_id]);
        if (buyer.rows.length === 0) throw new Error('Buyer not found');
        const buyerId = buyer.rows[0].id;
        const buyerCoins = buyer.rows[0].coins;

        const itemRes = await client.query('SELECT * FROM inventory WHERE id = $1 AND for_sale = true', [item_id]);
        if (itemRes.rows.length === 0) throw new Error('Item not found or not for sale');
        const item = itemRes.rows[0];
        const sellerId = item.user_id;
        const price = item.price;

        if (sellerId === buyerId) throw new Error('Cannot buy your own item');
        if (buyerCoins < price) throw new Error('Not enough coins');

        await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price, buyerId]);
        await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [price, sellerId]);
        await client.query('UPDATE inventory SET user_id = $1, for_sale = false, price = NULL WHERE id = $2', [buyerId, item_id]);

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

router.post('/remove', async (req, res) => {
    const { tg_id, item_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const itemRes = await client.query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND for_sale = true', [item_id, userId]);
        if (itemRes.rows.length === 0) throw new Error('Item not found or not yours');

        await client.query('UPDATE inventory SET for_sale = false, price = NULL WHERE id = $1', [item_id]);

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

router.post('/update-price', async (req, res) => {
    const { tg_id, item_id, new_price } = req.body;
    if (!new_price || new_price <= 0) return res.status(400).json({ error: 'Invalid price' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const itemRes = await client.query('SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND for_sale = true', [item_id, userId]);
        if (itemRes.rows.length === 0) throw new Error('Item not found or not yours');

        await client.query('UPDATE inventory SET price = $1 WHERE id = $2', [new_price, item_id]);

        await client.query('COMMIT');
        res.json({ success: true, new_price });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
