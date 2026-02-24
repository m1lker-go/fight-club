const express = require('express');
const router = express.Router();
const { pool } = require('../db');

const prices = { rare: 100, epic: 500, legendary: 2000 };

// Фиксированные значения бонусов по редкости (10 характеристик)
const fixedStats = {
    common: {
        atk_bonus: 1,
        def_bonus: 1,
        hp_bonus: 2,
        agi_bonus: 0,
        int_bonus: 0,
        spd_bonus: 0,
        crit_bonus: 1,
        crit_dmg_bonus: 3,
        vamp_bonus: 0,
        reflect_bonus: 0
    },
    uncommon: {
        atk_bonus: 2,
        def_bonus: 2,
        hp_bonus: 4,
        agi_bonus: 1,
        int_bonus: 1,
        spd_bonus: 1,
        crit_bonus: 2,
        crit_dmg_bonus: 5,
        vamp_bonus: 1,
        reflect_bonus: 1
    },
    rare: {
        atk_bonus: 3,
        def_bonus: 3,
        hp_bonus: 6,
        agi_bonus: 2,
        int_bonus: 2,
        spd_bonus: 2,
        crit_bonus: 3,
        crit_dmg_bonus: 8,
        vamp_bonus: 2,
        reflect_bonus: 2
    },
    epic: {
        atk_bonus: 5,
        def_bonus: 5,
        hp_bonus: 10,
        agi_bonus: 3,
        int_bonus: 3,
        spd_bonus: 3,
        crit_bonus: 5,
        crit_dmg_bonus: 12,
        vamp_bonus: 3,
        reflect_bonus: 3
    },
    legendary: {
        atk_bonus: 7,
        def_bonus: 7,
        hp_bonus: 15,
        agi_bonus: 4,
        int_bonus: 4,
        spd_bonus: 4,
        crit_bonus: 7,
        crit_dmg_bonus: 18,
        vamp_bonus: 4,
        reflect_bonus: 4
    }
};

const allFields = [
    'atk_bonus', 'def_bonus', 'hp_bonus', 'agi_bonus', 'int_bonus',
    'spd_bonus', 'crit_bonus', 'crit_dmg_bonus', 'vamp_bonus', 'reflect_bonus'
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
        agi_bonus: 0,
        int_bonus: 0,
        spd_bonus: 0,
        crit_bonus: 0,
        crit_dmg_bonus: 0,
        vamp_bonus: 0,
        reflect_bonus: 0
    };

    const possibleFields = allFields.filter(field => fixedStats[rarity][field] > 0);
    const shuffled = [...possibleFields].sort(() => Math.random() - 0.5);
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
        const user = await client.query('SELECT id, current_class, coins FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        const userClass = user.rows[0].current_class;
        if (user.rows[0].coins < price) throw new Error('Not enough coins');

        const targetRarity = Math.random() < 0.7 ? chestType : getLowerRarity(chestType);

        const templates = await client.query(
            'SELECT * FROM item_templates WHERE base_rarity = $1 ORDER BY RANDOM() LIMIT 1',
            [targetRarity]
        );
        if (templates.rows.length === 0) throw new Error('No templates for this rarity');
        const template = templates.rows[0];

        const stats = generateStats(targetRarity);

        let ownerClass;
        if (template.class_restriction && template.class_restriction !== 'any') {
            ownerClass = template.class_restriction;
        } else {
            ownerClass = userClass;
        }

        const insertRes = await client.query(
            `INSERT INTO inventory 
             (user_id, owner_class, name, type, rarity, class_restriction,
              atk_bonus, def_bonus, hp_bonus, agi_bonus, int_bonus, spd_bonus,
              crit_bonus, crit_dmg_bonus, vamp_bonus, reflect_bonus,
              equipped, for_sale)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, false, false)
             RETURNING id`,
            [userId, ownerClass, template.name, template.type, targetRarity, template.class_restriction,
             stats.atk_bonus, stats.def_bonus, stats.hp_bonus, stats.agi_bonus, stats.int_bonus, stats.spd_bonus,
             stats.crit_bonus, stats.crit_dmg_bonus, stats.vamp_bonus, stats.reflect_bonus]
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
                owner_class: ownerClass,
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
