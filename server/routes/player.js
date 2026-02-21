const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Получить данные игрока
router.get('/:tg_id', async (req, res) => {
  const { tg_id } = req.params;
  const client = await pool.connect();
  try {
    const user = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // Получаем инвентарь
    const inventory = await client.query(
      `SELECT i.*, inv.equipped, inv.for_sale, inv.price 
       FROM inventory inv 
       JOIN items i ON inv.item_id = i.id 
       WHERE inv.user_id = $1`,
      [user.rows[0].id]
    );
    
    res.json({
      user: user.rows[0],
      inventory: inventory.rows
    });
  } finally {
    client.release();
  }
});

// Распределить очки навыков
router.post('/upgrade', async (req, res) => {
  const { tg_id, stat, points } = req.body; // stat - название поля (hp_points и т.д.)
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT skill_points, level FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) throw new Error('User not found');
    if (user.rows[0].skill_points < points) throw new Error('Not enough skill points');
    
    await client.query(
      `UPDATE users SET ${stat}_points = ${stat}_points + $1, skill_points = skill_points - $1 WHERE tg_id = $2`,
      [points, tg_id]
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

// Сменить подкласс
router.post('/subclass', async (req, res) => {
  const { tg_id, subclass } = req.body;
  await pool.query('UPDATE users SET subclass = $1 WHERE tg_id = $2', [subclass, tg_id]);
  res.json({ success: true });
});

module.exports = router;