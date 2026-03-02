const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Вспомогательная функция генерации предмета (копия из shop.js)
function generateItemByRarity(rarity, ownerClass = null) {
    const itemNames = {
        common: ['Ржавый меч', 'Деревянный щит', 'Кожаный шлем', 'Тряпичные перчатки', 'Старые сапоги', 'Медное кольцо'],
        uncommon: ['Качественный меч', 'Укреплённый щит', 'Кожаный шлем с заклёпками', 'Перчатки из плотной кожи', 'Сапоги скорохода', 'Кольцо силы'],
        rare: ['Стальной меч', 'Щит рыцаря', 'Шлем с забралом', 'Перчатки воина', 'Сапоги легионера', 'Кольцо защиты'],
        epic: ['Меч героя', 'Эгида', 'Шлем вождя', 'Перчатки титана', 'Сапоги ветра', 'Кольцо мудрости'],
        legendary: ['Экскалибур', 'Щит Ахилла', 'Шлем Одина', 'Перчатки Геракла', 'Сапоги Гермеса', 'Кольцо всевластия']
    };
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    const name = itemNames[rarity][Math.floor(Math.random() * itemNames[rarity].length)];

    const bonuses = {
        common: { atk: 1, def: 1, hp: 2 },
        uncommon: { atk: 2, def: 2, hp: 4 },
        rare: { atk: 3, def: 3, hp: 6 },
        epic: { atk: 5, def: 5, hp: 10 },
        legendary: { atk: 7, def: 7, hp: 15 }
    };
    const b = bonuses[rarity];

    const possibleStats = ['atk', 'def', 'hp', 'spd', 'crit', 'crit_dmg', 'agi', 'int', 'vamp', 'reflect'];
    const selected = [];
    while (selected.length < 2) {
        const stat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
        if (!selected.includes(stat)) selected.push(stat);
    }

    const item = {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: ownerClass || ['warrior','assassin','mage'][Math.floor(Math.random()*3)],
        atk_bonus: 0,
        def_bonus: 0,
        hp_bonus: 0,
        spd_bonus: 0,
        crit_bonus: 0,
        crit_dmg_bonus: 0,
        agi_bonus: 0,
        int_bonus: 0,
        vamp_bonus: 0,
        reflect_bonus: 0
    };

    selected.forEach(stat => {
        if (stat === 'atk') item.atk_bonus = Math.floor(b.atk * (0.8 + 0.4 * Math.random()));
        else if (stat === 'def') item.def_bonus = Math.floor(b.def * (0.8 + 0.4 * Math.random()));
        else if (stat === 'hp') item.hp_bonus = Math.floor(b.hp * (0.8 + 0.4 * Math.random()));
        else if (stat === 'spd') item.spd_bonus = Math.floor(b.atk * 0.5 + 1);
        else if (stat === 'crit') item.crit_bonus = Math.floor(b.atk * 2);
        else if (stat === 'crit_dmg') item.crit_dmg_bonus = Math.floor(b.atk * 5);
        else if (stat === 'agi') item.agi_bonus = Math.floor(b.atk * 2);
        else if (stat === 'int') item.int_bonus = Math.floor(b.atk * 2);
        else if (stat === 'vamp') item.vamp_bonus = Math.floor(b.atk * 2);
        else if (stat === 'reflect') item.reflect_bonus = Math.floor(b.atk * 2);
    });

    return item;
}

// Добавить предмет в кузницу (in_forge = true, forge_tab = tab)
router.post('/add', async (req, res) => {
    const { tg_id, item_id, tab } = req.body;
    if (!tab || (tab !== 'forge' && tab !== 'smelt')) {
        return res.status(400).json({ error: 'Invalid tab' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const item = await client.query(
            'SELECT id FROM inventory WHERE id = $1 AND user_id = $2 AND equipped = false AND for_sale = false AND in_forge = false',
            [item_id, userId]
        );
        if (item.rows.length === 0) throw new Error('Item not available');

        await client.query(
            'UPDATE inventory SET in_forge = true, forge_tab = $1 WHERE id = $2',
            [tab, item_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Убрать предмет из кузницы (in_forge = false, forge_tab = NULL)
router.post('/remove', async (req, res) => {
    const { tg_id, item_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const item = await client.query(
            'SELECT id FROM inventory WHERE id = $1 AND user_id = $2 AND in_forge = true',
            [item_id, userId]
        );
        if (item.rows.length === 0) throw new Error('Item not in forge');

        await client.query(
            'UPDATE inventory SET in_forge = false, forge_tab = NULL WHERE id = $1',
            [item_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Получить список ID предметов в указанной вкладке кузницы
router.get('/current', async (req, res) => {
    const { tg_id, tab } = req.query;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });
    if (!tab || (tab !== 'forge' && tab !== 'smelt')) {
        return res.status(400).json({ error: 'Invalid tab' });
    }

    try {
        const user = await pool.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userId = user.rows[0].id;

        const result = await pool.query(
            'SELECT id FROM inventory WHERE user_id = $1 AND in_forge = true AND forge_tab = $2',
            [userId, tab]
        );
        res.json(result.rows.map(row => row.id));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    }
});

// Ковка: объединение 3 предметов в один более высокой редкости
router.post('/craft', async (req, res) => {
    const { tg_id, item_ids, chosen_class } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length !== 3) {
        return res.status(400).json({ error: 'Need exactly 3 items' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const items = await client.query(
            'SELECT * FROM inventory WHERE id = ANY($1::int[]) AND user_id = $2 AND equipped = false AND for_sale = false AND in_forge = true',
            [item_ids, userId]
        );
        if (items.rows.length !== 3) throw new Error('Items not found or not available');

        const rarities = items.rows.map(i => i.rarity);
        const firstRarity = rarities[0];
        if (!rarities.every(r => r === firstRarity)) {
            throw new Error('Items must have the same rarity');
        }

        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const currentIndex = rarityOrder.indexOf(firstRarity);
        if (currentIndex === -1 || currentIndex === rarityOrder.length - 1) {
            throw new Error('Cannot upgrade this rarity');
        }
        const newRarity = rarityOrder[currentIndex + 1];

        await client.query('DELETE FROM inventory WHERE id = ANY($1::int[])', [item_ids]);

        const newItem = generateItemByRarity(newRarity, chosen_class || null);
        const itemRes = await client.query(
            `INSERT INTO items (name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
            [newItem.name, newItem.type, newItem.rarity, 'any', newItem.owner_class,
             newItem.atk_bonus, newItem.def_bonus, newItem.hp_bonus, newItem.spd_bonus,
             newItem.crit_bonus, newItem.crit_dmg_bonus, newItem.agi_bonus, newItem.int_bonus, newItem.vamp_bonus, newItem.reflect_bonus]
        );
        const newItemId = itemRes.rows[0].id;

        await client.query(
            'INSERT INTO inventory (user_id, item_id, equipped, in_forge) VALUES ($1, $2, false, false)',
            [userId, newItemId]
        );

        await client.query('COMMIT');
        res.json({ success: true, item: { ...newItem, id: newItemId } });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Плавка: превращение предметов в ресурсы (можно от 1 до 5 предметов)
router.post('/smelt', async (req, res) => {
    const { tg_id, item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0 || item_ids.length > 5) {
        return res.status(400).json({ error: 'Need 1 to 5 items' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id, coins, diamonds FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        let coinsGain = 0;
        let diamondsGain = 0;

        const items = await client.query(
            'SELECT * FROM inventory WHERE id = ANY($1::int[]) AND user_id = $2 AND equipped = false AND for_sale = false AND in_forge = true',
            [item_ids, userId]
        );
        if (items.rows.length === 0) throw new Error('Items not found');

        await client.query('DELETE FROM inventory WHERE id = ANY($1::int[])', [item_ids]);

        for (const item of items.rows) {
            switch (item.rarity) {
                case 'common':
                    coinsGain += Math.floor(Math.random() * 16) + 35; // 35-50
                    break;
                case 'uncommon':
                    coinsGain += Math.floor(Math.random() * 51) + 150; // 150-200
                    break;
                case 'rare':
                    coinsGain += Math.floor(Math.random() * 201) + 600; // 600-800
                    break;
                case 'epic':
                    coinsGain += Math.floor(Math.random() * 501) + 1500; // 1500-2000
                    if (Math.random() < 0.5) diamondsGain += 1;
                    break;
                case 'legendary':
                    coinsGain += Math.floor(Math.random() * 1301) + 2500; // 2500-3800
                    diamondsGain += 2 + Math.floor(Math.random() * 4); // 2-5
                    break;
            }
        }

        await client.query('UPDATE users SET coins = coins + $1, diamonds = diamonds + $2 WHERE id = $3',
            [coinsGain, diamondsGain, userId]);

        await client.query('COMMIT');
        res.json({ success: true, coins: coinsGain, diamonds: diamondsGain });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
