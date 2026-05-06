const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const { generateItemByRarity } = require('../utils/botGenerator');
const dailyTasks = require('../utils/dailyTasks');

// Добавить предмет в кузницу
router.post('/add', async (req, res) => {
    const { tg_id, user_id, item_id, tab } = req.body;
    console.log('[forge/add] Request:', { tg_id, user_id, item_id, tab });
    if (!tab || (tab !== 'forge' && tab !== 'smelt')) {
        return res.status(400).json({ error: 'Invalid tab' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;
        console.log('[forge/add] User ID:', userId);

        const item = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2',
            [item_id, userId]
        );
        console.log('[forge/add] Item query result:', item.rows[0] || 'not found');
        if (item.rows.length === 0) throw new Error('Item not found');
        const invItem = item.rows[0];
        if (invItem.equipped) throw new Error('Item is equipped');
        if (invItem.for_sale) throw new Error('Item is on sale');
        if (invItem.in_forge) throw new Error('Item already in forge');

        await client.query(
            'UPDATE inventory SET in_forge = true, forge_tab = $1 WHERE id = $2',
            [tab, item_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[forge/add] Error:', e.message);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Убрать предмет из кузницы
router.post('/remove', async (req, res) => {
    const { tg_id, user_id, item_id } = req.body;
    if ((!tg_id && !user_id) || !item_id) {
        return res.status(400).json({ error: 'Missing parameters' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

        const item = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2',
            [item_id, userId]
        );
        if (item.rows.length === 0) throw new Error('Item not found');
        if (!item.rows[0].in_forge) throw new Error('Item not in forge');

        await client.query(
            'UPDATE inventory SET in_forge = false, forge_tab = NULL WHERE id = $1',
            [item_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[forge/remove] Error:', e.message);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Получить список ID предметов в указанной вкладке кузницы
router.get('/current', async (req, res) => {
    const { tg_id, user_id, tab } = req.query;
    if ((!tg_id && !user_id)) return res.status(400).json({ error: 'tg_id or user_id required' });
    if (!tab || (tab !== 'forge' && tab !== 'smelt')) {
        return res.status(400).json({ error: 'Invalid tab' });
    }

    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const userId = user.id;

        const result = await client.query(
            'SELECT id FROM inventory WHERE user_id = $1 AND in_forge = true AND forge_tab = $2',
            [userId, tab]
        );
        res.json(result.rows.map(row => row.id));
    } catch (e) {
        console.error('[forge/current] Error:', e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// Ковка (объединение трех предметов одного качества в предмет следующего качества)
router.post('/craft', async (req, res) => {
    const { tg_id, user_id, item_ids, chosen_class } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length !== 3) {
        return res.status(400).json({ error: 'Need exactly 3 items' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

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

        // Завершаем транзакцию до вызова dailyTasks
        await client.query('COMMIT');

        // Теперь безопасно обновляем задание "Счастливчик"
        if (['rare', 'epic', 'legendary'].includes(newRarity)) {
            try {
                await dailyTasks.updateChestProgress(userId, newRarity);
            } catch (e) {
                console.error('[forge/craft] updateChestProgress error:', e);
            }
        }

        res.json({ success: true, item: { ...newItem, id: newItemId } });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[forge/craft] Error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Плавка (разбор предметов на ресурсы)
router.post('/smelt', async (req, res) => {
    const { tg_id, user_id, item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0 || item_ids.length > 5) {
        return res.status(400).json({ error: 'Need 1 to 5 items' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;
        let coinsGain = 0;
        let diamondsGain = 0;

        const items = await client.query(
            'SELECT * FROM inventory WHERE id = ANY($1::int[]) AND user_id = $2 AND equipped = false AND for_sale = false AND in_forge = true',
            [item_ids, userId]
        );
        if (items.rows.length === 0) throw new Error('Items not found');

        await client.query('DELETE FROM inventory WHERE id = ANY($1::int[])', [item_ids]);

        for (const item of items.rows) {
            const rarity = item.rarity.toLowerCase();
            switch (rarity) {
                case 'common': coinsGain += Math.floor(Math.random() * 21) + 65; break;
                case 'uncommon': coinsGain += Math.floor(Math.random() * 41) + 120; break;
                case 'rare': coinsGain += Math.floor(Math.random() * 201) + 400; break;
                case 'epic':
                    coinsGain += Math.floor(Math.random() * 501) + 1000;
                    if (Math.random() < 0.5) diamondsGain += 1;
                    break;
                case 'legendary':
                    coinsGain += Math.floor(Math.random() * 1001) + 2000;
                    diamondsGain += 2 + Math.floor(Math.random() * 4);
                    break;
                default: console.warn(`Unknown rarity: ${item.rarity}`);
            }
        }

        await client.query(
            'UPDATE users SET coins = coins + $1, diamonds = diamonds + $2 WHERE id = $3',
            [coinsGain, diamondsGain, userId]
        );

        await client.query('COMMIT');
        res.json({ success: true, coins: coinsGain, diamonds: diamondsGain });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[forge/smelt] Error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
