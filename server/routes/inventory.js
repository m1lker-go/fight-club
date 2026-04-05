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
        
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        console.log('[equip] User ID:', userId);
        
        // Проверяем, что предмет существует, принадлежит пользователю и не экипирован, не в кузнице, не на продаже
        const item = await client.query(
            `SELECT * FROM inventory 
             WHERE id = $1 AND user_id = $2 AND equipped = false AND in_forge = false AND for_sale = false`,
            [item_id, userId]
        );
        console.log('[equip] Item query result:', item.rows[0] || 'not found');
        if (item.rows.length === 0) throw new Error('Item not available');
        const invItem = item.rows[0];
        
        // Проверка класса
        if (invItem.owner_class && invItem.owner_class !== target_class && invItem.class_restriction !== 'any') {
            throw new Error('Item class mismatch');
        }
        
        // Снимаем текущий предмет в том же слоте для этого класса
        await client.query(
            `UPDATE inventory SET equipped = false 
             WHERE user_id = $1 AND equipped = true AND type = $2 AND owner_class = $3`,
            [userId, invItem.type, target_class]
        );
        
        // Надеваем новый
        await client.query(
            `UPDATE inventory SET equipped = true WHERE id = $1`,
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
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        
        const item = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND equipped = true',
            [item_id, userId]
        );
        if (item.rows.length === 0) throw new Error('Item not equipped');
        
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
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        
        const item = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND equipped = false AND in_forge = false AND for_sale = false',
            [item_id, userId]
        );
        if (item.rows.length === 0) throw new Error('Item not available');
        
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
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        
        const item = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND for_sale = true',
            [item_id, userId]
        );
        if (item.rows.length === 0) throw new Error('Item not on sale');
        
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
