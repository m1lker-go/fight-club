const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Надеть предмет
router.post('/equip', async (req, res) => {
  const { tg_id, item_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    const userId = user.rows[0].id;
    
    const item = await client.query('SELECT type FROM items WHERE id = $1', [item_id]);
    const type = item.rows[0].type;
    
    await client.query(
      `UPDATE inventory SET equipped = false 
       WHERE user_id = $1 AND item_id IN (SELECT id FROM items WHERE type = $2)`,
      [userId, type]
    );
    
    await client.query(
      `UPDATE inventory SET equipped = true WHERE user_id = $1 AND item_id = $2`,
      [userId, item_id]
    );
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
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

    await client.query(
      'UPDATE inventory SET equipped = false WHERE user_id = $1 AND item_id = $2',
      [userId, item_id]
    );
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
    const userId = user.rows[0].id;

    const inv = await client.query(
      'SELECT * FROM inventory WHERE user_id = $1 AND item_id = $2 AND equipped = false',
      [userId, item_id]
    );
    if (inv.rows.length === 0) throw new Error('Item not available for sale');

    await client.query(
      'INSERT INTO market (seller_id, item_id, price) VALUES ($1, $2, $3)',
      [userId, item_id, price]
    );

    await client.query('DELETE FROM inventory WHERE user_id = $1 AND item_id = $2', [userId, item_id]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Снять с продажи (вернуть в инвентарь)
router.post('/unsell', async (req, res) => {
  const { tg_id, item_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    const userId = user.rows[0].id;

    // Находим запись в маркете
    const marketRes = await client.query(
      'SELECT * FROM market WHERE seller_id = $1 AND item_id = $2',
      [userId, item_id]
    );
    if (marketRes.rows.length === 0) throw new Error('Item not found in market');

    // Удаляем из маркета
    await client.query('DELETE FROM market WHERE seller_id = $1 AND item_id = $2', [userId, item_id]);

    // Возвращаем в инвентарь (for_sale = false)
    await client.query(
      'INSERT INTO inventory (user_id, item_id, equipped, for_sale) VALUES ($1, $2, false, false)',
      [userId, item_id]
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
