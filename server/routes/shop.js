const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const prices = { rare: 100, epic: 500, legendary: 2000 };

function getLowerRarity(rarity) {
    const map = { rare: 'common', epic: 'rare', legendary: 'epic' };
    return map[rarity] || 'common';
}

function randomInRange(min, max) {
    if (min >= max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createItemFromTemplate(template, rarity) {
    return {
        name: template.name,
        type: template.type,
        rarity: rarity,
        class_restriction: template.class_restriction,
        atk_bonus: randomInRange(template.min_atk, template.max_atk),
        def_bonus: randomInRange(template.min_def, template.max_def),
        hp_bonus: randomInRange(template.min_hp, template.max_hp),
        spd_bonus: randomInRange(template.min_spd, template.max_spd),
        crit_bonus: randomInRange(template.min_crit, template.max_crit),
        crit_dmg_bonus: randomInRange(template.min_crit_dmg, template.max_crit_dmg),
        dodge_bonus: randomInRange(template.min_dodge, template.max_dodge),
        acc_bonus: randomInRange(template.min_acc, template.max_acc),
        res_bonus: randomInRange(template.min_res, template.max_res),
        mana_bonus: randomInRange(template.min_mana, template.max_mana)
    };
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

        const targetRarity = Math.random() < 0.7 ? chestType : getLowerRarity(chestType);

        // Получаем шаблон
        const templates = await client.query(
            'SELECT * FROM item_templates WHERE base_rarity = $1 ORDER BY RANDOM() LIMIT 1',
            [targetRarity]
        );
        if (templates.rows.length === 0) {
            // Если нет шаблонов для этой редкости, пробуем для базовой (например, rare)
            const fallback = await client.query(
                'SELECT * FROM item_templates WHERE base_rarity = $1 ORDER BY RANDOM() LIMIT 1',
                ['rare']
            );
            if (fallback.rows.length === 0) throw new Error('No templates at all');
            templates.rows[0] = fallback.rows[0];
        }

        const template = templates.rows[0];
        const newItem = createItemFromTemplate(template, targetRarity);

        // Вставляем в инвентарь
        await client.query(
            `INSERT INTO inventory 
             (user_id, name, type, rarity, class_restriction,
              atk_bonus, def_bonus, hp_bonus, spd_bonus, crit_bonus, crit_dmg_bonus,
              dodge_bonus, acc_bonus, res_bonus, mana_bonus, equipped, for_sale)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, false, false)`,
            [user.rows[0].id, newItem.name, newItem.type, newItem.rarity, newItem.class_restriction,
             newItem.atk_bonus, newItem.def_bonus, newItem.hp_bonus, newItem.spd_bonus,
             newItem.crit_bonus, newItem.crit_dmg_bonus, newItem.dodge_bonus,
             newItem.acc_bonus, newItem.res_bonus, newItem.mana_bonus]
        );

        await client.query('UPDATE users SET coins = coins - $1 WHERE tg_id = $2', [price, tg_id]);

        await client.query('COMMIT');

        res.json({ success: true, item: newItem });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
