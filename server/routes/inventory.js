const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Надеть предмет
router.post('/equip', async (req, res) => {
    const { tg_id, item_id } = req.body; // item_id теперь это id записи в inventory
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        // Получаем тип предмета из самой записи инвентаря
        const item = await client.query('SELECT type FROM inventory WHERE id = $1 AND user_id = $2', [item_id, userId]);
        if (item.rows.length === 0) throw new Error('Item not found');
        const type = item.rows[0].type;

        // Снимаем все предметы того же типа у пользователя
        await client.query(
            'UPDATE inventory SET equipped = false WHERE user_id = $1 AND type = $2',
            [userId, type]
        );

        // Одеваем новый предмет
        await client.query(
            'UPDATE inventory SET equipped = true WHERE id = $1 AND user_id = $2',
            [item_id, userId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Снять предмет
router.post('/unequip', async (req, res) => {
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
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Выставить на продажу
router.post('/sell', async (req, res) => {
    const { tg_id, item_id, price } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        // Проверяем, что предмет в инвентаре, не надет и не на продаже
        const inv = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND equipped = false AND for_sale = false',
            [item_id, userId]
        );
        if (inv.rows.length === 0) throw new Error('Item not available for sale');

        // Помечаем как на продаже и сохраняем цену
        await client.query(
            'UPDATE inventory SET for_sale = true, price = $1 WHERE id = $2',
            [price, item_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Снять с продажи (вернуть в обычное состояние)
router.post('/unsell', async (req, res) => {
    const { tg_id, item_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        // Проверяем, что предмет действительно на продаже и принадлежит пользователю
        const inv = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2 AND for_sale = true',
            [item_id, userId]
        );
        if (inv.rows.length === 0) throw new Error('Item not found or not for sale');

        // Снимаем пометку
        await client.query(
            'UPDATE inventory SET for_sale = false, price = NULL WHERE id = $1',
            [item_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
