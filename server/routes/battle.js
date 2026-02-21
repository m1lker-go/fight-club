const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Функция симуляции боя (упрощённая, без учёта всех пассивок)
function simulateBattle(player1, player2, inventory1, inventory2) {
  // Здесь должна быть полная логика с учётом характеристик, экипировки, пассивок
  // Возвращаем объект { winner: player1.id, log: [...], hp1, hp2 }
  // Для демо просто случайный результат
  const winner = Math.random() > 0.5 ? player1.id : player2.id;
  return {
    winner,
    player1_hp_remain: Math.floor(Math.random() * 50) + 10,
    player2_hp_remain: Math.floor(Math.random() * 50) + 10,
    log: ['Бой начался', 'Игрок1 нанёс удар', 'Игрок2 ответил']
  };
}

router.post('/start', async (req, res) => {
  const { tg_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Получаем игрока
    const player = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
    if (player.rows.length === 0) throw new Error('User not found');
    const playerData = player.rows[0];
    
    // Проверка энергии
    if (playerData.energy < 1) throw new Error('Not enough energy');
    
    // Ищем соперника (бот на основе другого игрока)
    // Для простоты берём случайного игрока не равного текущему
    const opponents = await client.query(
      'SELECT * FROM users WHERE id != $1 ORDER BY RANDOM() LIMIT 1',
      [playerData.id]
    );
    if (opponents.rows.length === 0) throw new Error('No opponents');
    const opponentData = opponents.rows[0];
    
    // Получаем их инвентарь
    const inv1 = await client.query(
      'SELECT i.* FROM inventory inv JOIN items i ON inv.item_id = i.id WHERE inv.user_id = $1 AND inv.equipped = true',
      [playerData.id]
    );
    const inv2 = await client.query(
      'SELECT i.* FROM inventory inv JOIN items i ON inv.item_id = i.id WHERE inv.user_id = $1 AND inv.equipped = true',
      [opponentData.id]
    );
    
    // Симуляция боя
    const result = simulateBattle(playerData, opponentData, inv1.rows, inv2.rows);
    
    // Определяем победителя
    const winnerId = result.winner === playerData.id ? playerData.id : opponentData.id;
    
    // Обновляем рейтинг (упрощённо)
    const ratingChange = winnerId === playerData.id ? 15 : -15;
    await client.query('UPDATE users SET rating = rating + $1 WHERE id = $2', [ratingChange, playerData.id]);
    await client.query('UPDATE users SET rating = rating + $1 WHERE id = $2', [ratingChange * -1, opponentData.id]);
    
    // Тратим энергию
    await client.query('UPDATE users SET energy = energy - 1 WHERE id = $1', [playerData.id]);
    
    // Записываем бой в историю
    await client.query(
      `INSERT INTO battles (player1_id, player2_id, winner_id, player1_hp_remain, player2_hp_remain, log)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [playerData.id, opponentData.id, winnerId, result.player1_hp_remain, result.player2_hp_remain, JSON.stringify(result.log)]
    );
    
    await client.query('COMMIT');
    res.json({
      opponent: opponentData,
      result,
      ratingChange: ratingChange
    });
  } catch (e) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;