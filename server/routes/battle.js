const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Расчёт характеристик (как было)
function calculateStats(user, inventory) {
  let stats = {
    hp: 10 + (user.hp_points || 0) * 2,
    atk: (user.atk_points || 0) + 5,
    def: (user.def_points || 0),
    res: (user.res_points || 0),
    spd: (user.spd_points || 0) + 10,
    crit: (user.crit_points || 0),
    critDmg: 2.0 + ((user.crit_dmg_points || 0) / 100),
    dodge: (user.dodge_points || 0),
    acc: (user.acc_points || 0) + 100,
  };

  inventory.forEach(item => {
    stats.hp += item.hp_bonus || 0;
    stats.atk += item.atk_bonus || 0;
    stats.def += item.def_bonus || 0;
    stats.res += item.res_bonus || 0;
    stats.spd += item.spd_bonus || 0;
    stats.crit += item.crit_bonus || 0;
    stats.critDmg += (item.crit_dmg_bonus || 0) / 100;
    stats.dodge += item.dodge_bonus || 0;
    stats.acc += item.acc_bonus || 0;
  });

  if (user.class === 'warrior') {
    stats.def = Math.min(80, stats.def * 1.5);
  } else if (user.class === 'assassin') {
    stats.crit = Math.min(75, stats.crit * 1.25);
  }

  stats.def = Math.min(80, stats.def);
  stats.res = Math.min(80, stats.res);
  stats.crit = Math.min(75, stats.crit);
  stats.dodge = Math.min(70, stats.dodge);
  stats.acc = Math.min(100, stats.acc);

  return stats;
}

// Симуляция одного удара (возвращает урон и сообщение)
function performAttack(attackerStats, defenderStats) {
  const hitChance = Math.min(100, Math.max(5, attackerStats.acc - defenderStats.dodge));
  if (Math.random() * 100 > hitChance) {
    return { damage: 0, log: 'промах' };
  }
  let damage = attackerStats.atk;
  const isCrit = Math.random() * 100 < attackerStats.crit;
  if (isCrit) {
    damage *= attackerStats.critDmg;
  }
  damage = damage * (1 - defenderStats.def / 100);
  damage = Math.max(1, Math.floor(damage));
  return { damage, log: `наносит ${damage} урона${isCrit ? ' (крит)' : ''}` };
}

// Симуляция боя с пошаговым логом
function simulateBattle(playerStats, enemyStats) {
  let playerHp = playerStats.hp;
  let enemyHp = enemyStats.hp;
  const steps = [];
  let turn = playerStats.spd >= enemyStats.spd ? 'player' : 'enemy';

  while (playerHp > 0 && enemyHp > 0) {
    if (turn === 'player') {
      const result = performAttack(playerStats, enemyStats);
      if (result.damage > 0) {
        enemyHp = Math.max(0, enemyHp - result.damage);
      }
      steps.push({
        attacker: 'player',
        damage: result.damage,
        playerHp: playerHp,
        enemyHp: enemyHp,
        message: `Игрок ${result.log}`
      });
      turn = 'enemy';
    } else {
      const result = performAttack(enemyStats, playerStats);
      if (result.damage > 0) {
        playerHp = Math.max(0, playerHp - result.damage);
      }
      steps.push({
        attacker: 'enemy',
        damage: result.damage,
        playerHp: playerHp,
        enemyHp: enemyHp,
        message: `Противник ${result.log}`
      });
      turn = 'player';
    }
  }

  // Определяем победителя
  let winner = null;
  if (playerHp <= 0 && enemyHp <= 0) winner = 'draw';
  else if (playerHp <= 0) winner = 'enemy';
  else if (enemyHp <= 0) winner = 'player';

  return {
    steps,
    winner,
    playerFinalHp: playerHp,
    enemyFinalHp: enemyHp,
    playerMaxHp: playerStats.hp,
    enemyMaxHp: enemyStats.hp
  };
}

// Генерация бота (как было)
function generateBot(playerLevel) {
  const botTemplates = [
    { name: 'Деревянный манекен', class: 'warrior', subclass: 'guardian' },
    { name: 'Деревянный манекен', class: 'warrior', subclass: 'berserker' },
    { name: 'Деревянный манекен', class: 'warrior', subclass: 'knight' },
    { name: 'Серебряный защитник', class: 'assassin', subclass: 'assassin' },
    { name: 'Серебряный защитник', class: 'assassin', subclass: 'venom_blade' },
    { name: 'Серебряный защитник', class: 'assassin', subclass: 'blood_hunter' },
    { name: 'Золотой защитник', class: 'mage', subclass: 'pyromancer' },
    { name: 'Золотой защитник', class: 'mage', subclass: 'cryomancer' },
    { name: 'Золотой защитник', class: 'mage', subclass: 'illusionist' },
    { name: 'Изумрудный защитник', class: 'warrior', subclass: 'guardian' },
    { name: 'Изумрудный защитник', class: 'warrior', subclass: 'berserker' },
    { name: 'Изумрудный защитник', class: 'warrior', subclass: 'knight' },
    { name: 'Изумрудный защитник', class: 'assassin', subclass: 'assassin' },
    { name: 'Изумрудный защитник', class: 'assassin', subclass: 'venom_blade' },
    { name: 'Изумрудный защитник', class: 'assassin', subclass: 'blood_hunter' },
    { name: 'Изумрудный защитник', class: 'mage', subclass: 'pyromancer' },
    { name: 'Изумрудный защитник', class: 'mage', subclass: 'cryomancer' },
    { name: 'Изумрудный защитник', class: 'mage', subclass: 'illusionist' },
    { name: 'Защитник королевства', class: 'warrior', subclass: 'guardian' },
    { name: 'Защитник королевства', class: 'warrior', subclass: 'berserker' },
    { name: 'Защитник королевства', class: 'warrior', subclass: 'knight' },
    { name: 'Защитник королевства', class: 'assassin', subclass: 'assassin' },
    { name: 'Защитник королевства', class: 'assassin', subclass: 'venom_blade' },
    { name: 'Защитник королевства', class: 'assassin', subclass: 'blood_hunter' },
    { name: 'Защитник королевства', class: 'mage', subclass: 'pyromancer' },
    { name: 'Защитник королевства', class: 'mage', subclass: 'cryomancer' },
    { name: 'Защитник королевства', class: 'mage', subclass: 'illusionist' }
  ];
  const template = botTemplates[Math.floor(Math.random() * botTemplates.length)];
  const level = Math.max(1, playerLevel - 2 + Math.floor(Math.random() * 5));

  const baseHP = 10 + level * 2;
  const baseATK = 5 + level;
  const baseDEF = Math.min(40, level * 2);
  const baseRES = Math.min(40, level * 2);
  const baseSPD = 10 + level;
  const baseCRIT = Math.min(30, level * 1.5);
  const baseDODGE = Math.min(30, level * 1.5);

  let hp = baseHP, atk = baseATK, def = baseDEF, res = baseRES, spd = baseSPD, crit = baseCRIT, dodge = baseDODGE;
  if (template.class === 'warrior') {
    hp = Math.floor(baseHP * 1.5);
    def = Math.floor(baseDEF * 1.2);
  } else if (template.class === 'assassin') {
    atk = Math.floor(baseATK * 1.2);
    crit = Math.floor(baseCRIT * 1.5);
    dodge = Math.floor(baseDODGE * 1.3);
  } else if (template.class === 'mage') {
    atk = Math.floor(baseATK * 1.3);
    res = Math.floor(baseRES * 1.3);
  }

  return {
    id: `bot_${Date.now()}_${Math.random()}`,
    username: template.name,
    class: template.class,
    subclass: template.subclass,
    level: level,
    stats: {
      hp: hp,
      atk: atk,
      def: def,
      res: res,
      spd: spd,
      crit: crit,
      critDmg: 2.0,
      dodge: dodge,
      acc: 100
    }
  };
}

router.post('/start', async (req, res) => {
  const { tg_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const player = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
    if (player.rows.length === 0) throw new Error('User not found');
    const playerData = player.rows[0];

    if (playerData.energy < 1) throw new Error('Not enough energy');

    const inv = await client.query(
      `SELECT i.* FROM inventory inv 
       JOIN items i ON inv.item_id = i.id 
       WHERE inv.user_id = $1 AND inv.equipped = true`,
      [playerData.id]
    );
    const playerInventory = inv.rows;

    const playerStats = calculateStats(playerData, playerInventory);
    const bot = generateBot(playerData.level);

    const battleResult = simulateBattle(playerStats, bot.stats);

    let winnerId = null;
    let ratingChange = 0;
    if (battleResult.winner === 'player') {
      winnerId = playerData.id;
      ratingChange = 15;
    } else if (battleResult.winner === 'enemy') {
      winnerId = null;
      ratingChange = -15;
    }

    if (winnerId === playerData.id || battleResult.winner === 'enemy') {
      await client.query('UPDATE users SET rating = rating + $1 WHERE id = $2', [ratingChange, playerData.id]);
    }

    await client.query('UPDATE users SET energy = energy - 1 WHERE id = $1', [playerData.id]);

    await client.query('COMMIT');

    res.json({
      opponent: {
        username: bot.username,
        class: bot.class,
        subclass: bot.subclass,
        level: bot.level
      },
      result: {
        steps: battleResult.steps,
        winner: battleResult.winner,
        playerFinalHp: battleResult.playerFinalHp,
        enemyFinalHp: battleResult.enemyFinalHp,
        playerMaxHp: battleResult.playerMaxHp,
        enemyMaxHp: battleResult.enemyMaxHp
      },
      ratingChange: ratingChange
    });

  } catch (e) {
    await client.query('ROLLBACK');
    console.error(e);
    res.status(400).json({ error: e.message });
  } finally {
    client.release();
  }
});

module.exports = router;
