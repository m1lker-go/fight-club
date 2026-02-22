const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Маппинг редкостей: common, rare, epic, legendary
const rarityLevel = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4
};

// Функция для получения редкости на уровень ниже
function getLowerRarity(rarity) {
    const level = rarityLevel[rarity];
    if (level <= 1) return 'common';
    const lower = Object.keys(rarityLevel).find(key => rarityLevel[key] === level - 1);
    return lower || 'common';
}

// Покупка сундука
router.post('/buychest', async (req, res) => {
    const { tg_id, chestType } = req.body; // chestType: 'rare', 'epic', 'legendary'
    const prices = { rare: 100, epic: 500, legendary: 2000 };
    const price = prices[chestType];
    if (!price) return res.status(400).json({ error: 'Invalid chest type' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id, coins FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        if (user.rows[0].coins < price) throw new Error('Not enough coins');

        // Определяем редкость выпавшего предмета: 70% на основную, 30% на предыдущую
        let targetRarity;
        const rand = Math.random();
        if (rand < 0.7) {
            targetRarity = chestType; // основная редкость
        } else {
            targetRarity = getLowerRarity(chestType); // на уровень ниже
        }

        // Выбираем случайный предмет указанной редкости (без ограничения по классу)
        const items = await client.query(
            'SELECT * FROM items WHERE rarity = $1 ORDER BY RANDOM() LIMIT 1',
            [targetRarity]
        );
        if (items.rows.length === 0) throw new Error('No items of this rarity');

        const item = items.rows[0];
        
        // Уменьшаем монеты
        await client.query('UPDATE users SET coins = coins - $1 WHERE tg_id = $2', [price, tg_id]);

        // Добавляем предмет в инвентарь
        await client.query(
            'INSERT INTO inventory (user_id, item_id, equipped) VALUES ($1, $2, false)',
            [user.rows[0].id, item.id]
        );

        await client.query('COMMIT');

        // Возвращаем информацию о полученном предмете
        res.json({
            success: true,
            item: {
                id: item.id,
                name: item.name,
                type: item.type,
                rarity: item.rarity,
                class_restriction: item.class_restriction,
                atk_bonus: item.atk_bonus,
                def_bonus: item.def_bonus,
                hp_bonus: item.hp_bonus,
                spd_bonus: item.spd_bonus,
                crit_bonus: item.crit_bonus,
                crit_dmg_bonus: item.crit_dmg_bonus,
                dodge_bonus: item.dodge_bonus,
                acc_bonus: item.acc_bonus,
                res_bonus: item.res_bonus,
                mana_bonus: item.mana_bonus
            }
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
