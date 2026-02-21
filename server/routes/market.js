const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Получить список предметов на маркете с фильтрами
router.get('/', async (req, res) => {
  const { class: className, rarity, minPrice, maxPrice } = req.query;
  let query = `
    SELECT m.*, i.name, i.type, i.rarity, i.class_restriction, 
           i.atk_bonus, i.def_bonus, i.hp_bonus, i.image,
           u.username as seller_name
    FROM market m
    JOIN items i ON m.item_id = i.id
    JOIN users u ON m.seller_id = u.id
    WHERE 1=1
  `;
  const params = [];
  if (className && className !== 'any') {
    params.push(className);
    query += ` AND (i.class_restriction = $${params.length} OR i.class_restriction = 'any')`;
  }
  if (rarity && rarity !== 'any') {
    params.push(rarity);
    query += ` AND i.rarity = $${params.length}`;
  }
  if (minPrice) {
    params.push(minPrice);
    query += ` AND m.price >= $${params.length}`;
  }
  if (maxPrice) {
    params.push(maxPrice);
    query += ` AND m.price <= $${params.length}`;
  }
  query += ' ORDER BY m.price';
  
  const result = await pool.query(query, params);
  res.json(result.rows);
});

// Купить предмет
router.post('/buy', async (req, res) => {
  const { tg_id, market_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Получаем запись маркета
    const market = await client.query('SELECT * FROM market WHERE id = $1', [market_id]);
    if (market.rows.length === 0) throw new Error('Item not found');
    const { seller_id, item_id, price } = market.rows[0];
    
    // Получаем покупателя
    const buyer = await client.query('SELECT id, coins FROM users WHERE tg_id = $1', [tg_id]);
    if (buyer.rows[0].coins < price) throw new Error('Not enough coins');
    
    // Переводим монеты продавцу
    await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [price, seller_id]);
    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price, buyer.rows[0].id]);
    
    // Перемещаем предмет в инвентарь покупателя
    await client.query(
      'INSERT INTO inventory (user_id, item_id, equipped) VALUES ($1, $2, false)',
      [buyer.rows[0].id, item_id]
    );
    
    // Удаляем из маркета
    await client.query('DELETE FROM market WHERE id = $1', [market_id]);
    
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