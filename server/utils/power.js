const { pool } = require('../db');

async function updatePlayerPower(client, userId, className) {
    // Получаем данные класса
    const classRes = await client.query(
        'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
        [userId, className]
    );
    if (classRes.rows.length === 0) return;
    const classData = classRes.rows[0];

    // Получаем подкласс пользователя (из users)
    const userRes = await client.query('SELECT subclass FROM users WHERE id = $1', [userId]);
    const subclass = userRes.rows[0]?.subclass || 'guardian';

    // Получаем инвентарь для этого класса (только надетые предметы)
    const invRes = await client.query(
        `SELECT i.*, it.* FROM inventory i
         JOIN items it ON i.item_id = it.id
         WHERE i.user_id = $1 AND i.equipped = true AND it.owner_class = $2`,
        [userId, className]
    );
    const inventory = invRes.rows;

    // Базовая статистика (копия из клиента)
    const baseStats = {
        warrior: { hp: 28, atk: 3, def: 4, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
        assassin: { hp: 20, atk: 5, def: 1, agi: 5, int: 0, spd: 15, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
        mage: { hp: 18, atk: 2, def: 1, agi: 2, int: 5, spd: 12, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
    };
    const base = baseStats[className] || baseStats.warrior;

    // Расчёт базовых + навыки
    let stats = {
        hp: base.hp + (classData.hp_points || 0) * 2,
        atk: base.atk + (classData.atk_points || 0),
        def: base.def + (classData.def_points || 0),
        agi: base.agi + (classData.dodge_points || 0),
        int: base.int + (classData.int_points || 0),
        spd: base.spd + (classData.spd_points || 0),
        crit: base.crit + (classData.crit_points || 0),
        critDmg: 1.5 + ((classData.crit_dmg_points || 0) / 100),
        vamp: base.vamp + (classData.vamp_points || 0),
        reflect: base.reflect + (classData.reflect_points || 0)
    };

    // Бонусы от экипировки
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

    // Пассивные бонусы подкласса
const rolePassives = {
    knight: { reflect: 20 },
    blood_hunter: { vamp: 20 } 
};
    const roleBonus = rolePassives[subclass] || {};
    if (roleBonus.vamp) stats.vamp += roleBonus.vamp;
    if (roleBonus.reflect) stats.reflect += roleBonus.reflect;

    // Капы
    stats.def = Math.min(100, stats.def);
    stats.agi = Math.min(100, stats.agi);
    stats.crit = Math.min(100, stats.crit);

    // Веса характеристик (importance) – те же, что на клиенте
    const importance = {
        warrior: {
            hp: 2.0, atk: 2.0, def: 2.0,
            crit: 1.5, reflect: 1.5, critDmg: 1.5,
            agi: 1.0, int: 1.0, spd: 1.0, vamp: 0.5
        },
        assassin: {
            atk: 2.0, agi: 2.0, vamp: 2.0,
            hp: 1.5, crit: 1.5, critDmg: 1.5,
            def: 1.0, int: 1.0, spd: 1.0, reflect: 1.0
        },
        mage: {
            atk: 2.0, int: 2.0, agi: 2.0,
            hp: 1.5, crit: 1.5, critDmg: 1.5,
            def: 1.0, spd: 1.0, vamp: 0.5, reflect: 0.5
        }
    };
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

    power = Math.round(power);

    // Сохраняем в базу
    await client.query(
        'UPDATE user_classes SET power = $1 WHERE user_id = $2 AND class = $3',
        [power, userId, className]
    );
}

module.exports = { updatePlayerPower };
