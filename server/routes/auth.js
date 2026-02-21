const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');

// Функция проверки данных от Telegram Web App
function validateTelegramWebAppData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  urlParams.delete('hash');

  // Сортируем ключи и создаём строку data_check_string
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  // Создаём секретный ключ из токена бота
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

  // Вычисляем HMAC-SHA-256 от dataCheckString
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

  // Извлекаем данные пользователя
  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));
  const tgId = user.id;
  const username = user.username || `user_${tgId}`;

  const client = await pool.connect();
  try {
    // Ищем пользователя в базе
    let dbUser = await client.query('SELECT * FROM users WHERE tg_id = $1', [tgId]);
    if (dbUser.rows.length === 0) {
      // Создаём нового пользователя
      const referralCode = Math.random().toString(36).substring(2, 10);
      const newUser = await client.query(
        `INSERT INTO users (tg_id, username, referral_code) 
         VALUES ($1, $2, $3) RETURNING *`,
        [tgId, username, referralCode]
      );
      dbUser = newUser;
    }
    res.json({ user: dbUser.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

module.exports = router;
