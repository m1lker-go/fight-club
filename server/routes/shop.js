const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Покупка сундука
router.post('/buychest', async (req, res) => {
  const { tg_id, chestType } = req.body; // chestType: 'rare', 'epic', 'legendary'
  const prices = { rare: 100, epic: 500, legendary: 2000 };
  const price = prices[chestType];
  if (!price) return res.status(400).json({ error: 'Invalid chest type' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id, coins FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows[0].coins < price) throw new Error('Not enough coins');
    
    // Уменьшаем монеты
    await client.query('UPDATE users SET coins = coins - $1 WHERE tg_id = $2', [price, tg_id]);
    
    // Генерируем случайный предмет (здесь заглушка)
    const items = await client.query(
      'SELECT * FROM items WHERE rarity = $1 ORDER BY RANDOM() LIMIT 1',
      [chestType]
    );
    if (items.rows.length === 0) throw new Error('No items of this rarity');
    
    const item = items.rows[0];
    // Добавляем в инвентарь
    await client.query(
      'INSERT INTO inventory (user_id, item_id, equipped) VALUES ($1, $2, false)',
      [user.rows[0].id, item.id]
    );
    
    await client.query('COMMIT');
    res.json({ item });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;