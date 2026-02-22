const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const prices = { rare: 100, epic: 500, legendary: 2000 };

function getLowerRarity(rarity) {
    const map = { rare: 'common', epic: 'rare', legendary: 'epic' };
    return map[rarity] || 'common';
}

// Список всех возможных характеристик
const statFields = [
    'atk_bonus', 'def_bonus', 'hp_bonus', 'spd_bonus',
    'crit_bonus', 'crit_dmg_bonus', 'dodge_bonus', 'acc_bonus', 'res_bonus', 'mana_bonus'
];

// Генерация случайного числа в диапазоне
function randomInRange(min, max) {
    if (min >= max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Выбор двух случайных характеристик и генерация их значений
function generateStats(template) {
    const stats = {};
    // Перемешиваем массив и берём первые два
    const shuffled = [...statFields].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 2);
    
    selected.forEach(field => {
        const min = template[`min_${field}`] || 0;
        const max = template[`max_${field}`] || 0;
        stats[field] = randomInRange(min, max);
    });
    return stats;
}

router.post('/buychest', async (req, res) => {
    const { tg_id, chestType } = req.body;
    const price = prices[chestType];
    if (!price) return res.status(400).json({ error: 'Invalid chest type' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id, coins FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        if (user.rows[0].coins < price) throw new Error('Not enough coins');

        // Редкость: 70% основная, 30% предыдущая
        const targetRarity = Math.random() < 0.7 ? chestType : getLowerRarity(chestType);

        // Выбираем случайный шаблон нужной редкости
        const templates = await client.query(
            'SELECT * FROM item_templates WHERE base_rarity = $1 ORDER BY RANDOM() LIMIT 1',
            [targetRarity]
        );
        if (templates.rows.length === 0) throw new Error('No templates for this rarity');
        const template = templates.rows[0];

        // Генерируем две случайные характеристики
        const stats = generateStats(template);

        // Вставляем предмет в инвентарь
        const insertRes = await client.query(
            `INSERT INTO inventory 
             (user_id, name, type, rarity, class_restriction,
              atk_bonus, def_bonus, hp_bonus, spd_bonus,
              crit_bonus, crit_dmg_bonus, dodge_bonus, acc_bonus, res_bonus, mana_bonus,
              equipped, for_sale)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, false, false)
             RETURNING id`,
            [user.rows[0].id, template.name, template.type, targetRarity, template.class_restriction,
             stats.atk_bonus || 0, stats.def_bonus || 0, stats.hp_bonus || 0, stats.spd_bonus || 0,
             stats.crit_bonus || 0, stats.crit_dmg_bonus || 0, stats.dodge_bonus || 0,
             stats.acc_bonus || 0, stats.res_bonus || 0, stats.mana_bonus || 0]
        );

        await client.query('UPDATE users SET coins = coins - $1 WHERE tg_id = $2', [price, tg_id]);
        await client.query('COMMIT');

        res.json({
            success: true,
            item: {
                id: insertRes.rows[0].id,
                name: template.name,
                type: template.type,
                rarity: targetRarity,
                class_restriction: template.class_restriction,
                ...stats
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
