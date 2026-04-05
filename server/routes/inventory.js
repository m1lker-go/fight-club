const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Надеть предмет
router.post('/equip', async (req, res) => {
    const { tg_id, item_id, target_class } = req.body;
    console.log('[equip] Request body:', { tg_id, item_id, target_class });
    if (!tg_id || !item_id || !target_class) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const userRes = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const userId = userRes.rows[0].id;
        console.log('[equip] User ID:', userId);
        
        // Получаем предмет по inventory.id
        const itemRes = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2',
            [item_id, userId]
        );
        console.log('[equip] Item query result:', itemRes.rows[0] || 'not found');
        if (itemRes.rows.length === 0) throw new Error('Item not found');
        const item = itemRes.rows[0];
        
        // Проверяем, что предмет не экипирован, не в кузнице, не на продаже
        if (item.equipped) throw new Error('Item is already equipped');
        if (item.in_forge) throw new Error('Item is in forge');
        if (item.for_sale) throw new Error('Item is on sale');
        
        // Проверка класса
        if (item.owner_class && item.owner_class !== target_class && item.class_restriction !== 'any') {
            throw new Error('Item class mismatch');
        }
        
        // Снимаем текущий предмет в этом слоте для этого класса
        await client.query(
            'UPDATE inventory SET equipped = false WHERE user_id = $1 AND equipped = true AND type = $2 AND owner_class = $3',
            [userId, item.type, target_class]
        );
        
        // Надеваем новый
        await client.query(
            'UPDATE inventory SET equipped = true WHERE id = $1',
            [item_id]
        );
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[equip] Error:', e.message);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Снять предмет
router.post('/unequip', async (req, res) => {
    const { tg_id, item_id } = req.body;
    if (!tg_id || !item_id) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const userId = userRes.rows[0].id;
        
        const itemRes = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2',
            [item_id, userId]
        );
        if (itemRes.rows.length === 0) throw new Error('Item not found');
        const item = itemRes.rows[0];
        if (!item.equipped) throw new Error('Item is not equipped');
        
        await client.query('UPDATE inventory SET equipped = false WHERE id = $1', [item_id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[unequip] Error:', e.message);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Выставить на продажу
router.post('/sell', async (req, res) => {
    const { tg_id, item_id, price } = req.body;
    if (!tg_id || !item_id || !price || price <= 0) {
        return res.status(400).json({ error: 'Invalid price' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const userId = userRes.rows[0].id;
        
        const itemRes = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2',
            [item_id, userId]
        );
        if (itemRes.rows.length === 0) throw new Error('Item not found');
        const item = itemRes.rows[0];
        if (item.equipped) throw new Error('Cannot sell equipped item');
        if (item.in_forge) throw new Error('Item is in forge');
        if (item.for_sale) throw new Error('Item already on sale');
        
        await client.query(
            'UPDATE inventory SET for_sale = true, price = $1 WHERE id = $2',
            [price, item_id]
        );
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[sell] Error:', e.message);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Снять с продажи
router.post('/unsell', async (req, res) => {
    const { tg_id, item_id } = req.body;
    if (!tg_id || !item_id) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const userId = userRes.rows[0].id;
        
        const itemRes = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2',
            [item_id, userId]
        );
        if (itemRes.rows.length === 0) throw new Error('Item not found');
        if (!itemRes.rows[0].for_sale) throw new Error('Item is not on sale');
        
        await client.query('UPDATE inventory SET for_sale = false, price = NULL WHERE id = $1', [item_id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[unsell] Error:', e.message);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
