const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

// Проверка данных от Telegram (WebApp)
function validateTelegramWebAppData(initData, botToken) {
  // Реализация проверки подписи (пропустим для краткости)
  // Возвращает объект пользователя, если всё ок
  return { id: 123456, username: 'test' }; // заглушка
}

router.post('/login', async (req, res) => {
  const { initData } = req.body;
  const userData = validateTelegramWebAppData(initData, process.env.BOT_TOKEN);
  if (!userData) return res.status(401).json({ error: 'Invalid data' });

  const client = await pool.connect();
  try {
    // Ищем пользователя
    let user = await client.query('SELECT * FROM users WHERE tg_id = $1', [userData.id]);
    if (user.rows.length === 0) {
      // Создаём нового
      const referralCode = Math.random().toString(36).substring(2, 10);
      const newUser = await client.query(
        `INSERT INTO users (tg_id, username, referral_code) 
         VALUES ($1, $2, $3) RETURNING *`,
        [userData.id, userData.username, referralCode]
      );
      user = newUser;
    }
    res.json({ user: user.rows[0] });
  } finally {
    client.release();
  }
});

module.exports = router;