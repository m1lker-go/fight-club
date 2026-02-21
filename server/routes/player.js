const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Функция восстановления энергии (для использования в других маршрутах)
async function rechargeEnergy(client, userId) {
    const user = await client.query('SELECT energy, last_energy FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return;
    const last = new Date(user.rows[0].last_energy);
    const now = new Date();
    const diffMinutes = Math.floor((now - last) / (1000 * 60));
    if (diffMinutes > 0) {
        const newEnergy = Math.min(20, user.rows[0].energy + diffMinutes);
        await client.query(
            'UPDATE users SET energy = $1, last_energy = $2 WHERE id = $3',
            [newEnergy, now, userId]
        );
    }
}

// Получить данные игрока
router.get('/:tg_id', async (req, res) => {
  const { tg_id } = req.params;
  const client = await pool.connect();
  try {
    const user = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    
    // Восстанавливаем энергию перед отправкой (чтобы клиент видел актуальное значение)
    await rechargeEnergy(client, user.rows[0].id);

    const inventory = await client.query(
      `SELECT i.*, inv.equipped, inv.for_sale, inv.price 
       FROM inventory inv 
       JOIN items i ON inv.item_id = i.id 
       WHERE inv.user_id = $1`,
      [user.rows[0].id]
    );

    const classes = await client.query(
      'SELECT * FROM user_classes WHERE user_id = $1',
      [user.rows[0].id]
    );
    
    res.json({
      user: user.rows[0],
      inventory: inventory.rows,
      classes: classes.rows
    });
  } finally {
    client.release();
  }
});

// Получить данные конкретного класса
router.get('/class/:tg_id/:class', async (req, res) => {
  const { tg_id, class: className } = req.params;
  const client = await pool.connect();
  try {
    const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const classData = await client.query(
      'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
      [user.rows[0].id, className]
    );
    if (classData.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json(classData.rows[0]);
  } finally {
    client.release();
  }
});

// Улучшить характеристику (исправлено)
router.post('/upgrade', async (req, res) => {
  const { tg_id, class: className, stat, points } = req.body; // stat - имя колонки, например 'hp_points'
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) throw new Error('User not found');
    const userId = user.rows[0].id;

    const classData = await client.query(
      'SELECT skill_points FROM user_classes WHERE user_id = $1 AND class = $2',
      [userId, className]
    );
    if (classData.rows.length === 0) throw new Error('Class not found');
    if (classData.rows[0].skill_points < points) throw new Error('Not enough skill points');

    // ВАЖНО: stat уже содержит полное имя колонки, например 'hp_points', поэтому в запросе используем ${stat}
    await client.query(
      `UPDATE user_classes SET ${stat} = ${stat} + $1, skill_points = skill_points - $1 WHERE user_id = $2 AND class = $3`,
      [points, userId, className]
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

// Сменить текущий класс
router.post('/class', async (req, res) => {
  const { tg_id, class: newClass } = req.body;
  try {
    await pool.query('UPDATE users SET current_class = $1 WHERE tg_id = $2', [newClass, tg_id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Сменить подкласс
router.post('/subclass', async (req, res) => {
  const { tg_id, subclass } = req.body;
  try {
    await pool.query('UPDATE users SET subclass = $1 WHERE tg_id = $2', [subclass, tg_id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Старый метод (не используется, оставлен для совместимости)
router.post('/upgrade_old', async (req, res) => {
  const { tg_id, stat, points } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query('SELECT skill_points FROM users WHERE tg_id = $1', [tg_id]);
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

module.exports = router;
