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
  console.log('=== LOGIN ATTEMPT ===');
  const { initData } = req.body;
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    console.error('BOT_TOKEN not set');
    return res.status(500).json({ error: 'BOT_TOKEN not set' });
  }

  if (!validateTelegramWebAppData(initData, botToken)) {
    console.error('Invalid Telegram data');
    return res.status(401).json({ error: 'Invalid Telegram data' });
  }

  const urlParams = new URLSearchParams(initData);
  const user = JSON.parse(urlParams.get('user'));
  const tgId = user.id;
  const username = user.username || `user_${tgId}`;

  console.log('Connecting to database...');
  const client = await pool.connect();
  console.log('Database connected');

  try {
    console.log('Checking existing user...');
    let userRes = await client.query('SELECT * FROM users WHERE tg_id = $1', [tgId]);
    console.log('User query executed');

    if (userRes.rows.length === 0) {
      console.log('Creating new user...');
      const referralCode = Math.random().toString(36).substring(2, 10);
      const newUser = await client.query(
        `INSERT INTO users 
         (tg_id, username, referral_code, current_class, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
        [tgId, username, referralCode, 'warrior', 1, 0, 0, 1000, 20, new Date(), 0]
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
      console.log('New user created');
    }

    const userData = userRes.rows[0];
    console.log('Fetching classes...');
    const classes = await client.query(
      'SELECT * FROM user_classes WHERE user_id = $1',
      [userData.id]
    );

    console.log('Fetching inventory...');
    // ИСПРАВЛЕННЫЙ ЗАПРОС С JOIN
    const inventory = await client.query(
      `SELECT 
         i.id,
         it.name,
         it.type,
         it.rarity,
         it.class_restriction,
         it.owner_class,
         it.atk_bonus,
         it.def_bonus,
         it.hp_bonus,
         it.spd_bonus,
         it.crit_bonus,
         it.crit_dmg_bonus,
         it.agi_bonus,
         it.int_bonus,
         it.vamp_bonus,
         it.reflect_bonus,
         i.equipped,
         i.for_sale,
         i.price
       FROM inventory i
       JOIN items it ON i.item_id = it.id
       WHERE i.user_id = $1`,
      [userData.id]
    );

    console.log('Sending response...');
    res.json({
      user: userData,
      classes: classes.rows,
      inventory: inventory.rows,
      bot_username: process.env.BOT_USERNAME || ''
    });
    console.log('=== LOGIN SUCCESS ===');
  } catch (err) {
    console.error('=== LOGIN ERROR ===');
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
    console.log('Database connection released');
  }
});

router.post('/refresh', async (req, res) => {
  const { tg_id } = req.body;
  if (!tg_id) {
    return res.status(400).json({ error: 'tg_id is required' });
  }

  const client = await pool.connect();
  try {
    const userRes = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userRes.rows[0];

    const classes = await client.query(
      'SELECT * FROM user_classes WHERE user_id = $1',
      [userData.id]
    );

    const inventory = await client.query(
      `SELECT 
         i.id,
         it.name,
         it.type,
         it.rarity,
         it.class_restriction,
         it.owner_class,
         it.atk_bonus,
         it.def_bonus,
         it.hp_bonus,
         it.spd_bonus,
         it.crit_bonus,
         it.crit_dmg_bonus,
         it.agi_bonus,
         it.int_bonus,
         it.vamp_bonus,
         it.reflect_bonus,
         i.equipped,
         i.for_sale,
         i.price
       FROM inventory i
       JOIN items it ON i.item_id = it.id
       WHERE i.user_id = $1`,
      [userData.id]
    );

    res.json({
      user: userData,
      classes: classes.rows,
      inventory: inventory.rows,
      bot_username: process.env.BOT_USERNAME || ''
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  } finally {
    client.release();
  }
});

module.exports = router;
