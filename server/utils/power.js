const { baseStats, importance, clamp, GAME_LIMITS } = require('../game-balance');

async function updatePlayerPower(client, userId, className) {
    const classRes = await client.query('SELECT * FROM user_classes WHERE user_id = $1 AND class = $2', [userId, className]);
    if (classRes.rows.length === 0) return;
    const classData = classRes.rows[0];

    const userRes = await client.query('SELECT subclass FROM users WHERE id = $1', [userId]);
    const subclass = userRes.rows[0]?.subclass || 'guardian';

    const invRes = await client.query(
        `SELECT i.*, it.* FROM inventory i
         JOIN items it ON i.item_id = it.id
         WHERE i.user_id = $1 AND i.equipped = true AND it.owner_class = $2`,
        [userId, className]
    );
    const inventory = invRes.rows;

    const base = baseStats[className] || baseStats.warrior;

    let stats = {
        hp: base.hp + (classData.hp_points || 0) * 5,
        atk: base.atk + (classData.atk_points || 0),
        def: base.def + (classData.def_points || 0),
        agi: base.agi + (classData.dodge_points || 0),
        int: base.int + (classData.int_points || 0),
        spd: base.spd + (classData.spd_points || 0),
        crit: base.crit + (classData.crit_points || 0),
        critDmg: 1.5 + ((classData.crit_dmg_points || 0) / 50), // ✅ Синхронизировано с клиентом
        vamp: base.vamp + (classData.vamp_points || 0),
        reflect: base.reflect + (classData.reflect_points || 0),
        manaRegen: 0 // ✅ Инициализировано, чтобы избежать NaN
    };

    inventory.forEach(item => {
        stats.hp += item.hp_bonus || 0;
        stats.atk += item.atk_bonus || 0;
        stats.def += item.def_bonus || 0;
        stats.agi += item.agi_bonus || 0;
        stats.int += item.int_bonus || 0;
        stats.spd += item.spd_bonus || 0;
        stats.crit += item.crit_bonus || 0;
        stats.critDmg += (item.crit_dmg_bonus || 0) / 100;
        stats.vamp += item.vamp_bonus || 0;
        stats.reflect += item.reflect_bonus || 0;
    });

    // Классовые особенности
    if (className === 'warrior') {
        stats.hp += Math.floor(stats.def / 5) * 5; // ✅ Исправлено: было *3
    }
    if (className === 'assassin') {
        stats.spd += Math.floor(stats.agi / 5);
    }
    if (className === 'mage') {
        stats.agi += Math.floor(stats.int / 5);
        stats.manaRegen += Math.floor(stats.int / 5) * 2;
    }

    // Множители + лимиты через clamp()
    if (className === 'warrior') {
        stats.def = clamp(stats.def * 1.5, GAME_LIMITS.def.min, GAME_LIMITS.def.max);
        stats.hp = Math.floor(stats.hp * 1.1);
    } else if (className === 'assassin') {
        stats.atk = Math.floor(stats.atk * 1.2);
        stats.crit = clamp(stats.crit * 1.25, GAME_LIMITS.crit.min, GAME_LIMITS.crit.max);
        stats.agi = clamp(stats.agi * 1.1, GAME_LIMITS.agi.min, GAME_LIMITS.agi.max);
    } else if (className === 'mage') {
        stats.atk = Math.floor(stats.atk * 1.2);
        stats.int = stats.int * 1.2;
    }

    // Финальные капы
    stats.def = clamp(stats.def, GAME_LIMITS.def.min, GAME_LIMITS.def.max);
    stats.crit = clamp(stats.crit, GAME_LIMITS.crit.min, GAME_LIMITS.crit.max);
    stats.agi = clamp(stats.agi, GAME_LIMITS.agi.min, GAME_LIMITS.agi.max);
    stats.critDmg = clamp(stats.critDmg, GAME_LIMITS.critDmg.min, GAME_LIMITS.critDmg.max);

    // Округление
    stats.hp = Math.round(stats.hp);
    stats.atk = Math.round(stats.atk);
    stats.spd = Math.round(stats.spd);
    stats.def = Math.round(stats.def * 10) / 10;
    stats.agi = Math.round(stats.agi * 10) / 10;
    stats.int = Math.round(stats.int * 10) / 10;
    stats.crit = Math.round(stats.crit * 10) / 10;
    stats.critDmg = Math.round(stats.critDmg * 100) / 100;
    stats.vamp = Math.round(stats.vamp * 10) / 10;
    stats.reflect = Math.round(stats.reflect * 10) / 10;

    const coeff = importance[className] || importance.warrior;
    let power = 0;
    power += stats.hp * coeff.hp;
    power += stats.atk * coeff.atk * 2;
    power += stats.def * coeff.def * 2;
    power += stats.agi * coeff.agi * 2;
    power += stats.int * coeff.int * 2;
    power += stats.spd * coeff.spd * 2;
    power += stats.crit * coeff.crit * 3;
    power += (stats.critDmg - 1.5) * 100 * coeff.critDmg;
    power += stats.vamp * coeff.vamp * 3;
    power += stats.reflect * coeff.reflect * 2;
    power += classData.level * 10;

    await client.query('UPDATE user_classes SET power = $1 WHERE user_id = $2 AND class = $3', [Math.round(power), userId, className]);
}
module.exports = { updatePlayerPower };
