const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Надеть предмет
router.post('/equip', async (req, res) => {
  const { tg_id, item_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Сначала снимаем все предметы такого же типа у игрока
    const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    const userId = user.rows[0].id;
    
    // Получаем тип предмета
    const item = await client.query('SELECT type FROM items WHERE id = $1', [item_id]);
    const type = item.rows[0].type;
    
    // Снимаем все того же типа
    await client.query(
      `UPDATE inventory SET equipped = false 
       WHERE user_id = $1 AND item_id IN (SELECT id FROM items WHERE type = $2)`,
      [userId, type]
    );
    
    // Одеваем новый
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

// Продать предмет (выставить на маркет)
router.post('/sell', async (req, res) => {
  const { tg_id, item_id, price } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    const userId = user.rows[0].id;
// Снять предмет
router.post('/unequip', async (req, res) => {
  const { tg_id, item_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) throw new Error('User not found');
    const userId = user.rows[0].id;

    await client.query(
      'UPDATE inventory SET equipped = false WHERE user_id = $1 AND item_id = $2',
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
    
    // Проверяем, что предмет в инвентаре и не надет
    const inv = await client.query(
      'SELECT * FROM inventory WHERE user_id = $1 AND item_id = $2 AND equipped = false',
      [userId, item_id]
    );
    if (inv.rows.length === 0) throw new Error('Item not available for sale');
    
    // Добавляем в маркет
    await client.query(
      'INSERT INTO market (seller_id, item_id, price) VALUES ($1, $2, $3)',
      [userId, item_id, price]
    );
    
    // Удаляем из инвентаря (или помечаем for_sale)
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

module.exports = router;
