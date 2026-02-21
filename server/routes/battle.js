const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Вспомогательная функция для расчёта итоговых характеристик героя
function calculateStats(classData, inventory) {
  // База от очков характеристик
  let stats = {
    hp: 10 + (classData.hp_points || 0) * 2,
    atk: (classData.atk_points || 0) + 5,
    def: (classData.def_points || 0),
    res: (classData.res_points || 0),
    spd: (classData.spd_points || 0) + 10,
    crit: (classData.crit_points || 0),
    critDmg: 2.0 + ((classData.crit_dmg_points || 0) / 100),
    dodge: (classData.dodge_points || 0),
    acc: (classData.acc_points || 0) + 100,
    manaMax: 100,
    manaRegen: classData.class === 'warrior' ? 15 : (classData.class === 'assassin' ? 18 : 25)
  };

  // Добавляем бонусы от экипировки
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

  // Применяем особенности класса
  if (classData.class === 'warrior') {
    stats.hp = Math.floor(stats.hp * 1.5);      // +50% здоровья
    stats.def = Math.min(80, stats.def * 1.5); // +50% защиты
  } else if (classData.class === 'assassin') {
    stats.atk = Math.floor(stats.atk * 1.2);    // +20% атаки
    stats.crit = Math.min(75, stats.crit * 1.25); // +25% шанса крита
  } else if (classData.class === 'mage') {
    stats.atk = Math.floor(stats.atk * 1.2);    // +20% атаки (магической, но пока так)
    // позже можно добавить бонус к регенерации маны или сопротивлению
  }

  // Ограничиваем проценты
  stats.def = Math.min(80, stats.def);
  stats.res = Math.min(80, stats.res);
  stats.crit = Math.min(75, stats.crit);
  stats.dodge = Math.min(70, stats.dodge);
  stats.acc = Math.min(100, stats.acc);

  return stats;
}

// Симуляция одного удара (автоатака)
function performAttack(attackerStats, defenderStats) {
  const hitChance = Math.min(100, Math.max(5, attackerStats.acc - defenderStats.dodge));
  if (Math.random() * 100 > hitChance) {
    return { hit: false, damage: 0, isCrit: false, log: 'промах' };
  }

  let damage = attackerStats.atk;
  const isCrit = Math.random() * 100 < attackerStats.crit;
  if (isCrit) {
    damage *= attackerStats.critDmg;
  }

  damage = damage * (1 - defenderStats.def / 100);
  damage = Math.max(1, Math.floor(damage));

  return { hit: true, damage, isCrit, log: `наносит ${damage} урона${isCrit ? ' (крит)' : ''}` };
}

// Симуляция боя с учётом маны
function simulateBattle(playerStats, enemyStats) {
  let playerHp = playerStats.hp;
  let enemyHp = enemyStats.hp;
  let playerMana = 0;
  let enemyMana = 0;
  const log = [];
  const turns = [];

  let turn = playerStats.spd >= enemyStats.spd ? 'player' : 'enemy';
  let maxTurns = 100;
  let t = 0;

  while (playerHp > 0 && enemyHp > 0 && t < maxTurns) {
    t++;
    const turnState = {
      turn,
      playerHp,
      enemyHp,
      playerMana,
      enemyMana,
      action: null
    };

    if (turn === 'player') {
      playerMana = Math.min(100, playerMana + playerStats.manaRegen);
      const result = performAttack(playerStats, enemyStats);
      if (result.hit) enemyHp -= result.damage;
      log.push(`Игрок ${result.log}`);
      turnState.action = `Игрок ${result.log}`;
      turn = 'enemy';
    } else {
      enemyMana = Math.min(100, enemyMana + enemyStats.manaRegen);
      const result = performAttack(enemyStats, playerStats);
      if (result.hit) playerHp -= result.damage;
      log.push(`Противник ${result.log}`);
      turnState.action = `Противник ${result.log}`;
      turn = 'player';
    }
    turns.push(turnState);
  }

  let winner = null;
  if (playerHp <= 0 && enemyHp <= 0) winner = 'draw';
  else if (playerHp <= 0) winner = 'enemy';
  else if (enemyHp <= 0) winner = 'player';

  return {
    winner,
    playerHpRemain: Math.max(0, playerHp),
    enemyHpRemain: Math.max(0, enemyHp),
    log,
    turns,
    playerMaxHp: playerStats.hp,
    enemyMaxHp: enemyStats.hp
  };
}

// Генерация бота
function generateBot(playerLevel) {
  const names = [
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

  const template = names[Math.floor(Math.random() * names.length)];
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
      acc: 100,
      manaMax: 100,
      manaRegen: template.class === 'warrior' ? 15 : (template.class === 'assassin' ? 18 : 25)
    }
  };
}

// Расчёт требуемого опыта для уровня
function expNeeded(level) {
  return Math.floor(80 * Math.pow(level, 1.5));
}

// Начисление опыта и проверка повышения уровня
async function addExp(client, userId, className, expGain) {
  const classRes = await client.query(
    'SELECT level, exp FROM user_classes WHERE user_id = $1 AND class = $2',
    [userId, className]
  );
  let { level, exp } = classRes.rows[0];
  exp += expGain;
  let leveledUp = false;
  while (exp >= expNeeded(level)) {
    exp -= expNeeded(level);
    level++;
    leveledUp = true;
    await client.query(
      'UPDATE user_classes SET skill_points = skill_points + 3 WHERE user_id = $1 AND class = $2',
      [userId, className]
    );
  }
  await client.query(
    'UPDATE user_classes SET level = $1, exp = $2 WHERE user_id = $3 AND class = $4',
    [level, exp, userId, className]
  );
  return leveledUp;
}

// Награда за победу в зависимости от серии
function getCoinReward(streak) {
  if (streak >= 25) return 20;
  if (streak >= 10) return 10;
  if (streak >= 5) return 7;
  return 5;
}

router.post('/start', async (req, res) => {
  const { tg_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
    if (user.rows.length === 0) throw new Error('User not found');
    const userData = user.rows[0];

    if (userData.energy < 1) throw new Error('Not enough energy');

    const classData = await client.query(
      'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
      [userData.id, userData.current_class]
    );
    if (classData.rows.length === 0) throw new Error('Class data not found');

    const inv = await client.query(
      `SELECT i.* FROM inventory inv 
       JOIN items i ON inv.item_id = i.id 
       WHERE inv.user_id = $1 AND inv.equipped = true`,
      [userData.id]
    );
    const playerInventory = inv.rows;

    const playerStats = calculateStats(classData.rows[0], playerInventory);
    const bot = generateBot(classData.rows[0].level);

    const battleResult = simulateBattle(playerStats, bot.stats);

    let isVictory = false;
    if (battleResult.winner === 'player') isVictory = true;
    else if (battleResult.winner === 'enemy') isVictory = false;
    else isVictory = false;

    let expGain = isVictory ? 10 : 3;
    let coinReward = 0;
    let newStreak = userData.win_streak || 0;

    if (isVictory) {
      newStreak++;
      coinReward = getCoinReward(newStreak);
      await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [coinReward, userData.id]);
    } else {
      newStreak = 0;
    }

    await client.query('UPDATE users SET win_streak = $1 WHERE id = $2', [newStreak, userData.id]);

    const leveledUp = await addExp(client, userData.id, userData.current_class, expGain);

    await client.query('UPDATE users SET energy = energy - 1 WHERE id = $1', [userData.id]);

    await client.query('COMMIT');

    res.json({
      opponent: {
        username: bot.username,
        class: bot.class,
        subclass: bot.subclass,
        level: bot.level
      },
      result: {
        winner: battleResult.winner,
        playerHpRemain: battleResult.playerHpRemain,
        enemyHpRemain: battleResult.enemyHpRemain,
        playerMaxHp: battleResult.playerMaxHp,
        enemyMaxHp: battleResult.enemyMaxHp,
        log: battleResult.log,
        turns: battleResult.turns
      },
      reward: {
        exp: expGain,
        coins: coinReward,
        leveledUp
      },
      ratingChange: isVictory ? 15 : -15
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
