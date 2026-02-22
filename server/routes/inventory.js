const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Надеть предмет
router.post('/equip', async (req, res) => {
    console.log('Equip request:', req.body);
    const { tg_id, item_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Получаем пользователя и его текущий класс
        const user = await client.query('SELECT id, current_class FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        const userClass = user.rows[0].current_class;

        // Получаем предмет
        const item = await client.query('SELECT type, class_restriction, owner_class FROM inventory WHERE id = $1 AND user_id = $2', [item_id, userId]);
        if (item.rows.length === 0) throw new Error('Item not found');
        const type = item.rows[0].type;
        const itemClass = item.rows[0].class_restriction;
        const ownerClass = item.rows[0].owner_class;

        // Проверяем, что предмет подходит по ограничению класса (если есть)
        if (itemClass && itemClass !== 'any' && itemClass !== userClass) {
            throw new Error('Предмет не подходит для вашего класса');
        }

        // Снимаем все предметы того же типа, принадлежащие текущему классу
        await client.query(
            'UPDATE inventory SET equipped = false WHERE user_id = $1 AND type = $2 AND owner_class = $3',
            [userId, type, userClass]
        );

        // Одеваем выбранный
        const updateRes = await client.query(
            'UPDATE inventory SET equipped = true WHERE id = $1 AND user_id = $2 RETURNING id',
            [item_id, userId]
        );
        if (updateRes.rowCount === 0) throw new Error('Failed to equip item');

        await client.query('COMMIT');
        console.log('Equip success for item', item_id);
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Equip error:', e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Снять предмет
router.post('/unequip', async (req, res) => {
    console.log('Unequip request:', req.body);
    const { tg_id, item_id } = req.body;
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const result = await client.query(
            'UPDATE inventory SET equipped = false WHERE id = $1 AND user_id = $2 RETURNING id',
            [item_id, userId]
        );
        if (result.rowCount === 0) throw new Error('Item not found or not yours');
        console.log('Unequip success for item', item_id);
        res.json({ success: true });
    } catch (e) {
        console.error('Unequip error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Продать (выставить на продажу)
router.post('/sell', async (req, res) => {
    console.log('Sell request:', req.body);
    const { tg_id, item_id, price } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const inv = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND equipped = false AND for_sale = false',
            [item_id, userId]
        );
        if (inv.rows.length === 0) throw new Error('Item not available for sale');

        await client.query(
            'UPDATE inventory SET for_sale = true, price = $1 WHERE id = $2',
            [price, item_id]
        );

        await client.query('COMMIT');
        console.log('Sell success for item', item_id);
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Sell error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Снять с продажи
router.post('/unsell', async (req, res) => {
    console.log('Unsell request:', req.body);
    const { tg_id, item_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const inv = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND for_sale = true',
            [item_id, userId]
        );
        if (inv.rows.length === 0) throw new Error('Item not found or not for sale');

        await client.query(
            'UPDATE inventory SET for_sale = false, price = NULL WHERE id = $1',
            [item_id]
        );

        await client.query('COMMIT');
        console.log('Unsell success for item', item_id);
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Unsell error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
