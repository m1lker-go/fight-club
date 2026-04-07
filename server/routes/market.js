const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');

// GET /market – публичный список предметов, без авторизации
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
            query += ` AND i.${stat} > 0`;
        }
        query += ' ORDER BY i.price';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (e) {
        console.error('Market error:', e);
        res.status(500).json({ error: e.message, rows: [] });
    }
});

// POST /buy – покупка предмета
router.post('/buy', async (req, res) => {
    const { tg_id, user_id, item_id } = req.body;
    if ((!tg_id && !user_id) || !item_id) {
        return res.status(400).json({ error: 'Missing buyer identifier or item_id' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const buyer = await getUserByIdentifier(client, tg_id, user_id);
        if (!buyer) throw new Error('Buyer not found');
        const buyerId = buyer.id;
        const buyerCoins = buyer.coins;

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

// POST /remove – снять свой предмет с продажи
router.post('/remove', async (req, res) => {
    const { tg_id, user_id, item_id } = req.body;
    if ((!tg_id && !user_id) || !item_id) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

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

// POST /update-price – изменить цену своего предмета в маркете
router.post('/update-price', async (req, res) => {
    const { tg_id, user_id, item_id, new_price } = req.body;
    if ((!tg_id && !user_id) || !item_id || !new_price || new_price <= 0) {
        return res.status(400).json({ error: 'Invalid price or missing parameters' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

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
