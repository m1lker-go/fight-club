const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Получить список предметов на продаже (for_sale = true)
router.get('/', async (req, res) => {
  const { class: className, rarity, minPrice, maxPrice } = req.query;
  let query = `
    SELECT i.*, u.username as seller_name
    FROM inventory i
    JOIN users u ON i.user_id = u.id
    WHERE i.for_sale = true
  `;
  const params = [];
  if (className && className !== 'any') {
    params.push(className);
    query += ` AND i.class_restriction = $${params.length}`;
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
  query += ' ORDER BY i.price';
  
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// Купить предмет
router.post('/buy', async (req, res) => {
  const { tg_id, item_id } = req.body; // tg_id покупателя, item_id предмета
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Получаем покупателя
    const buyer = await client.query('SELECT id, coins FROM users WHERE tg_id = $1', [tg_id]);
    if (buyer.rows.length === 0) throw new Error('Buyer not found');
    const buyerId = buyer.rows[0].id;
    const buyerCoins = buyer.rows[0].coins;

    // Получаем предмет и продавца
    const itemRes = await client.query(
      'SELECT * FROM inventory WHERE id = $1 AND for_sale = true',
      [item_id]
    );
    if (itemRes.rows.length === 0) throw new Error('Item not found or not for sale');
    const item = itemRes.rows[0];
    const sellerId = item.user_id;
    const price = item.price;

    // Нельзя купить свой предмет
    if (sellerId === buyerId) throw new Error('Cannot buy your own item');

    // Проверяем баланс покупателя
    if (buyerCoins < price) throw new Error('Not enough coins');

    // Списать монеты у покупателя
    await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price, buyerId]);
    // Добавить монеты продавцу
    await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [price, sellerId]);
    // Передать предмет: меняем user_id, сбрасываем for_sale и price
    await client.query(
      'UPDATE inventory SET user_id = $1, for_sale = false, price = NULL WHERE id = $2',
      [buyerId, item_id]
    );

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

module.exports = router;
