const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

function validateTelegramWebAppData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  return calculatedHash === hash;
}

router.post('/login', async (req, res) => {
  const { initData } = req.body;
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    return res.status(500).json({ error: 'BOT_TOKEN not set' });
  }

  if (!validateTelegramWebAppData(initData, botToken)) {
    return res.status(401).json({ error: 'Invalid Telegram data' });
  }

  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));
  const tgId = user.id;
  const username = user.username || `user_${tgId}`;

  const client = await pool.connect();
  try {
    let userRes = await client.query('SELECT * FROM users WHERE tg_id = $1', [tgId]);
    if (userRes.rows.length === 0) {
      const referralCode = Math.random().toString(36).substring(2, 10);
      const newUser = await client.query(
        `INSERT INTO users (tg_id, username, referral_code, current_class) 
         VALUES ($1, $2, $3, 'warrior') RETURNING *`,
        [tgId, username, referralCode]
      );
      userRes = newUser;
      const userId = newUser.rows[0].id;
      const classes = ['warrior', 'assassin', 'mage'];
      for (let cls of classes) {
        await client.query(
          `INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT (user_id, class) DO NOTHING`,
          [userId, cls]
        );
      }
    }

    const userData = userRes.rows[0];
    const classes = await client.query(
      'SELECT * FROM user_classes WHERE user_id = $1',
      [userData.id]
    );

    // Получаем инвентарь пользователя
    const inventory = await client.query(
      `SELECT i.*, inv.equipped, inv.for_sale, inv.price 
       FROM inventory inv 
       JOIN items i ON inv.item_id = i.id 
       WHERE inv.user_id = $1`,
      [userData.id]
    );

    res.json({
      user: userData,
      classes: classes.rows,
      inventory: inventory.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

module.exports = router;
