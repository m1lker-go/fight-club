const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { itemNames, fixedBonuses } = require('../data/itemData');

// Импортируем функции из tasks.js (экспортируйте их там!)
const tasksModule = require('./tasks'); // ожидается, что tasks.js экспортирует updateLuckyTask и updateTowerTask

// Функция генерации предмета по редкости и классу
function generateItemByRarity(rarity, ownerClass = null) {
    const classes = ['warrior', 'assassin', 'mage'];
    const chosenClass = ownerClass || classes[Math.floor(Math.random() * classes.length)];
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    const namesArray = itemNames[chosenClass][type][rarity];
    const name = namesArray[Math.floor(Math.random() * namesArray.length)];

    const possibleStats = ['atk', 'def', 'hp', 'spd', 'crit', 'crit_dmg', 'agi', 'int', 'vamp', 'reflect'];
    const stat1 = possibleStats[Math.floor(Math.random() * possibleStats.length)];
    const stat2 = possibleStats[Math.floor(Math.random() * possibleStats.length)];

    const item = {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: chosenClass,
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

    const bonus = fixedBonuses[rarity];

    const addBonus = (stat) => {
        switch (stat) {
            case 'atk': item.atk_bonus += bonus.atk; break;
            case 'def': item.def_bonus += bonus.def; break;
            case 'hp': item.hp_bonus += bonus.hp; break;
            case 'spd': item.spd_bonus += bonus.spd; break;
            case 'crit': item.crit_bonus += bonus.crit; break;
            case 'crit_dmg': item.crit_dmg_bonus += bonus.crit_dmg; break;
            case 'agi': item.agi_bonus += bonus.agi; break;
            case 'int': item.int_bonus += bonus.int; break;
            case 'vamp': item.vamp_bonus += bonus.vamp; break;
            case 'reflect': item.reflect_bonus += bonus.reflect; break;
        }
    };

    addBonus(stat1);
    addBonus(stat2);

    return item;
}

// Добавить предмет в кузницу
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

// Убрать предмет из кузницы
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
            `INSERT INTO inventory (
                user_id, item_id, equipped, in_forge,
                name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            [userId, newItemId, false, false,
             newItem.name, newItem.type, newItem.rarity, 'any', newItem.owner_class,
             newItem.atk_bonus, newItem.def_bonus, newItem.hp_bonus, newItem.spd_bonus,
             newItem.crit_bonus, newItem.crit_dmg_bonus, newItem.agi_bonus, newItem.int_bonus, newItem.vamp_bonus, newItem.reflect_bonus]
        );

        if (newRarity === 'rare' || newRarity === 'epic' || newRarity === 'legendary') {
            if (tasksModule.updateLuckyTask) {
                await tasksModule.updateLuckyTask(client, userId);
            } else {
                console.warn('[forge] updateLuckyTask not found');
            }
        }

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
            const rarity = item.rarity.toLowerCase(); // нормализация
            console.log(`[SMELT] Processing item ${item.id}, rarity=${rarity}, name=${item.name}`);
            switch (rarity) {
                case 'common':
                    coinsGain += Math.floor(Math.random() * 21) + 65; // 65–85
                    break;
                case 'uncommon':
                    coinsGain += Math.floor(Math.random() * 41) + 120; // 120–160
                    break;
                case 'rare':
                    coinsGain += Math.floor(Math.random() * 201) + 400; // 400–600
                    break;
                case 'epic':
                    coinsGain += Math.floor(Math.random() * 501) + 1000; // 1000–1500
                    if (Math.random() < 0.5) diamondsGain += 1;
                    break;
                case 'legendary':
                    coinsGain += Math.floor(Math.random() * 1001) + 2000; // 2000–3000
                    diamondsGain += 2 + Math.floor(Math.random() * 4); // 2–5
                    break;
                default:
                    console.warn(`[SMELT] Unknown rarity: ${item.rarity}`);
            }
        }

        console.log(`[SMELT] Total coinsGain=${coinsGain}, diamondsGain=${diamondsGain}`);
        const updateRes = await client.query(
            'UPDATE users SET coins = coins + $1, diamonds = diamonds + $2 WHERE id = $3 RETURNING coins, diamonds',
            [coinsGain, diamondsGain, userId]
        );
        console.log(`[SMELT] User after update: coins=${updateRes.rows[0].coins}, diamonds=${updateRes.rows[0].diamonds}`);

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
