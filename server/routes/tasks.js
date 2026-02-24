const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Ежедневный вход
router.post('/daily', async (req, res) => {
  const { tg_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id, daily_streak, last_daily, coins FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) throw new Error('User not found');
    const userData = user.rows[0];

    const today = new Date().toISOString().split('T')[0];
    let streak = userData.daily_streak;
    let rewardCoins = 10;
    let rewardItem = null;

    if (userData.last_daily === today) {
      throw new Error('Already claimed today');
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (userData.last_daily === yesterdayStr) {
      streak += 1;
    } else {
      streak = 1;
    }

    if (streak === 10) {
      const item = await client.query("SELECT * FROM items WHERE rarity = 'rare' ORDER BY RANDOM() LIMIT 1");
      if (item.rows.length > 0) {
        rewardItem = item.rows[0];
        await client.query('INSERT INTO inventory (user_id, item_id) VALUES ($1, $2)', [userData.id, rewardItem.id]);
      }
    } else if (streak === 20) {
      const item = await client.query("SELECT * FROM items WHERE rarity = 'epic' ORDER BY RANDOM() LIMIT 1");
      if (item.rows.length > 0) {
        rewardItem = item.rows[0];
        await client.query('INSERT INTO inventory (user_id, item_id) VALUES ($1, $2)', [userData.id, rewardItem.id]);
      }
    } else if (streak === 30) {
      const item = await client.query("SELECT * FROM items WHERE rarity = 'legendary' ORDER BY RANDOM() LIMIT 1");
      if (item.rows.length > 0) {
        rewardItem = item.rows[0];
        await client.query('INSERT INTO inventory (user_id, item_id) VALUES ($1, $2)', [userData.id, rewardItem.id]);
      }
      streak = 0;
    }

    await client.query('UPDATE users SET coins = coins + $1, daily_streak = $2, last_daily = $3 WHERE id = $4', [rewardCoins, streak, today, userData.id]);

    await client.query('COMMIT');
    res.json({ streak, rewardCoins, rewardItem });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Реферальная программа
router.post('/referral', async (req, res) => {
  const { tg_id, ref_code } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const newUser = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    if (newUser.rows.length === 0) throw new Error('User not found');
    const newUserId = newUser.rows[0].id;

    const check = await client.query('SELECT referred_by FROM users WHERE id = $1', [newUserId]);
    if (check.rows[0].referred_by) throw new Error('Referral already used');

    const referrer = await client.query('SELECT id FROM users WHERE referral_code = $1', [ref_code]);
    if (referrer.rows.length === 0) throw new Error('Invalid referral code');
    const referrerId = referrer.rows[0].id;

    await client.query('UPDATE users SET referred_by = $1 WHERE id = $2', [referrerId, newUserId]);

    await client.query('UPDATE users SET coins = coins + 50 WHERE id = $1', [referrerId]);

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

// Временный тестовый маршрут: добавить 500 монет
router.post('/testcoins', async (req, res) => {
  const { tg_id } = req.body;
  const client = await pool.connect();
  try {
    const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) throw new Error('User not found');
    const userId = user.rows[0].id;

    await client.query('UPDATE users SET coins = coins + 500 WHERE id = $1', [userId]);

    res.json({ success: true, added: 500 });
  } catch (e) {
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
