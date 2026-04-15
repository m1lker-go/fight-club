const { pool } = require('../db');

async function updatePlayerPower(client, userId, className) {
  const classRes = await client.query('SELECT * FROM user_classes WHERE user_id = $1 AND class = $2', [userId, className]);
  if (classRes.rows.length === 0) return;
  const classData = classRes.rows[0];
  const userRes = await client.query('SELECT subclass FROM users WHERE id = $1', [userId]);
  const subclass = userRes.rows[0]?.subclass || 'guardian';
  const invRes = await client.query(`SELECT i.*, it.* FROM inventory i JOIN items it ON i.item_id = it.id WHERE i.user_id = $1 AND i.equipped = true AND it.owner_class = $2`, [userId, className]);

  const baseStats = {
    warrior: { hp: 30, atk: 3, def: 5, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 18, atk: 4, def: 1, agi: 5, int: 0, spd: 14, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 18, atk: 3, def: 1, agi: 3, int: 6, spd: 14, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
  };
  const base = baseStats[className] || baseStats.warrior;

  // ✅ Инициализируем manaRegen, чтобы избежать NaN
  let stats = {
    hp: base.hp + (classData.hp_points || 0) * 5,
    atk: base.atk + (classData.atk_points || 0),
    def: base.def + (classData.def_points || 0),
    agi: base.agi + (classData.dodge_points || 0),
    int: base.int + (classData.int_points || 0),
    spd: base.spd + (classData.spd_points || 0),
    crit: base.crit + (classData.crit_points || 0),
    critDmg: 1.5 + ((classData.crit_dmg_points || 0) / 50), // ✅ Синхронизировано с клиентом (/50)
    vamp: base.vamp + (classData.vamp_points || 0),
    reflect: base.reflect + (classData.reflect_points || 0),
    manaRegen: 0
  };

  invRes.rows.forEach(item => {
    stats.hp += item.hp_bonus || 0; stats.atk += item.atk_bonus || 0; stats.def += item.def_bonus || 0;
    stats.agi += item.agi_bonus || 0; stats.int += item.int_bonus || 0; stats.spd += item.spd_bonus || 0;
    stats.crit += item.crit_bonus || 0; stats.critDmg += (item.crit_dmg_bonus || 0) / 100;
    stats.vamp += item.vamp_bonus || 0; stats.reflect += item.reflect_bonus || 0;
  });

  // Классовые особенности
  if (className === 'warrior') {
    stats.hp += Math.floor(stats.def / 5) * 5; // ✅ Исправлено: было *3
  } else if (className === 'assassin') {
    stats.spd += Math.floor(stats.agi / 5);
  } else if (className === 'mage') {
    stats.agi += Math.floor(stats.int / 5);
    stats.manaRegen += Math.floor(stats.int / 5) * 2;
  }

  // Множители
  if (className === 'warrior') stats.def = Math.min(70, stats.def * 1.5);
  else if (className === 'assassin') { stats.atk = Math.floor(stats.atk * 1.2); stats.crit = Math.min(100, stats.crit * 1.25); stats.agi = Math.min(100, stats.agi * 1.1); }
  else if (className === 'mage') { stats.atk = Math.floor(stats.atk * 1.2); stats.int = stats.int * 1.2; }

  stats.def = Math.min(70, stats.def); stats.crit = Math.min(100, stats.crit); stats.agi = Math.min(100, stats.agi);

  const importance = {
    warrior: { hp: 2.0, atk: 2.0, def: 2.0, crit: 1.5, reflect: 1.5, critDmg: 1.5, agi: 1.0, int: 1.0, spd: 1.0, vamp: 0.5 },
    assassin: { atk: 2.0, agi: 2.0, vamp: 2.0, hp: 1.5, crit: 1.5, critDmg: 1.5, def: 1.0, int: 1.0, spd: 1.0, reflect: 1.0 },
    mage: { atk: 2.0, int: 2.0, agi: 2.0, hp: 1.5, crit: 1.5, critDmg: 1.5, def: 1.0, spd: 1.0, vamp: 0.5, reflect: 0.5 }
  };
  const coeff = importance[className] || importance.warrior;

  let power = stats.hp * coeff.hp + stats.atk * coeff.atk * 2 + stats.def * coeff.def * 2 +
              stats.agi * coeff.agi * 2 + stats.int * coeff.int * 2 + stats.spd * coeff.spd * 2 +
              stats.crit * coeff.crit * 3 + (stats.critDmg - 1.5) * 100 * coeff.critDmg +
              stats.vamp * coeff.vamp * 3 + stats.reflect * coeff.reflect * 2 + classData.level * 10;

  await client.query('UPDATE user_classes SET power = $1 WHERE user_id = $2 AND class = $3', [Math.round(power), userId, className]);
}
module.exports = { updatePlayerPower };
