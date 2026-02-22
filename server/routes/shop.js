const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const prices = { rare: 100, epic: 500, legendary: 2000 };

// Фиксированные значения бонусов по редкости
const fixedStats = {
    common: {
        atk_bonus: 2,
        def_bonus: 2,
        hp_bonus: 3,
        spd_bonus: 1,
        crit_bonus: 1,
        crit_dmg_bonus: 5,
        dodge_bonus: 1,
        acc_bonus: 1,
        res_bonus: 1,
        mana_bonus: 1
    },
    uncommon: {
        atk_bonus: 4,
        def_bonus: 4,
        hp_bonus: 6,
        spd_bonus: 2,
        crit_bonus: 2,
        crit_dmg_bonus: 10,
        dodge_bonus: 2,
        acc_bonus: 2,
        res_bonus: 2,
        mana_bonus: 2
    },
    rare: {
        atk_bonus: 7,
        def_bonus: 7,
        hp_bonus: 12,
        spd_bonus: 3,
        crit_bonus: 4,
        crit_dmg_bonus: 20,
        dodge_bonus: 3,
        acc_bonus: 3,
        res_bonus: 4,
        mana_bonus: 4
    },
    epic: {
        atk_bonus: 12,
        def_bonus: 12,
        hp_bonus: 20,
        spd_bonus: 5,
        crit_bonus: 7,
        crit_dmg_bonus: 30,
        dodge_bonus: 5,
        acc_bonus: 5,
        res_bonus: 7,
        mana_bonus: 7
    },
    legendary: {
        atk_bonus: 18,
        def_bonus: 18,
        hp_bonus: 35,
        spd_bonus: 8,
        crit_bonus: 12,
        crit_dmg_bonus: 45,
        dodge_bonus: 8,
        acc_bonus: 8,
        res_bonus: 12,
        mana_bonus: 12
    }
};

const statFields = [
    'atk_bonus', 'def_bonus', 'hp_bonus', 'spd_bonus',
    'crit_bonus', 'crit_dmg_bonus', 'dodge_bonus', 'acc_bonus', 'res_bonus', 'mana_bonus'
];

function getLowerRarity(rarity) {
    const map = { legendary: 'epic', epic: 'rare', rare: 'uncommon', uncommon: 'common' };
    return map[rarity] || 'common';
}

function generateStats(rarity) {
    const stats = {
        atk_bonus: 0,
        def_bonus: 0,
        hp_bonus: 0,
        spd_bonus: 0,
        crit_bonus: 0,
        crit_dmg_bonus: 0,
        dodge_bonus: 0,
        acc_bonus: 0,
        res_bonus: 0,
        mana_bonus: 0
    };
    const shuffled = [...statFields].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 2);
    selected.forEach(field => {
        stats[field] = fixedStats[rarity][field];
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

        const targetRarity = Math.random() < 0.7 ? chestType : getLowerRarity(chestType);

        const templates = await client.query(
            'SELECT * FROM item_templates WHERE base_rarity = $1 ORDER BY RANDOM() LIMIT 1',
            [targetRarity]
        );
        if (templates.rows.length === 0) throw new Error('No templates for this rarity');
        const template = templates.rows[0];

        const stats = generateStats(targetRarity);

        const insertRes = await client.query(
            `INSERT INTO inventory 
             (user_id, name, type, rarity, class_restriction,
              atk_bonus, def_bonus, hp_bonus, spd_bonus,
              crit_bonus, crit_dmg_bonus, dodge_bonus, acc_bonus, res_bonus, mana_bonus,
              equipped, for_sale)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, false, false)
             RETURNING id`,
            [user.rows[0].id, template.name, template.type, targetRarity, template.class_restriction,
             stats.atk_bonus, stats.def_bonus, stats.hp_bonus, stats.spd_bonus,
             stats.crit_bonus, stats.crit_dmg_bonus, stats.dodge_bonus,
             stats.acc_bonus, stats.res_bonus, stats.mana_bonus]
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
        console.error('Buy chest error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
