const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const { generateItemByRarity } = require('../utils/botGenerator');
const dailyTasks = require('../utils/dailyTasks');

// ========== ВСПОМОГАТЕЛЬНЫЕ ДАННЫЕ ==========
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// Шансы успеха при ковке (без свитка)
const BASE_CRAFT_CHANCES = {
    common: 1.0,       // не используется
    uncommon: 0.95,
    rare: 0.85,
    epic: 0.75,
    legendary: 0.65
};

// Бонусы свитков
const SCROLL_BONUS = {
    rare: 0.10,        // +10%
    epic: 0.20,        // +20%
    legendary: 0.30    // +30%
};

// Стоимость ковки (монеты, уголь) для каждого уровня результата
const CRAFT_COST = {
    uncommon: { coins: 50,  coal: 20 },
    rare:      { coins: 350, coal: 50 },
    epic:      { coins: 1000, coal: 200 },
    legendary: { coins: 2500, coal: 500 }
};

// Диапазоны угля при плавке
const SMELT_COAL = {
    common:    { min: 1,  max: 5 },
    uncommon:  { min: 10, max: 15 },
    rare:      { min: 25, max: 45 },
    epic:      { min: 75, max: 150 },
    legendary: { min: 350, max: 550 }
};

// ========== МАРШРУТЫ ==========

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

        const item = await client.query(
            'SELECT * FROM inventory WHERE id = $1 AND user_id = $2',
            [item_id, userId]
        );
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

// Получить список свитков пользователя (для модального окна)
router.get('/scrolls', async (req, res) => {
    const { tg_id, user_id } = req.query;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');

        const result = await client.query(
            `SELECT i.id as inv_id, i.item_id, it.name, it.rarity, i.equipped
             FROM inventory i
             JOIN items it ON i.item_id = it.id
             WHERE i.user_id = $1 AND it.type = 'scroll' AND i.equipped = false`,
            [user.id]
        );
        // Добавляем бонус свитка
        const scrolls = result.rows.map(row => ({
            inv_id: row.inv_id,
            item_id: row.item_id,
            name: row.name,
            rarity: row.rarity,
            bonus: SCROLL_BONUS[row.rarity] || 0
        }));
        res.json(scrolls);
    } catch (e) {
        console.error('[forge/scrolls] Error:', e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Ковка
router.post('/craft', async (req, res) => {
    const { tg_id, user_id, item_ids, chosen_class, scroll_id } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length !== 3) {
        return res.status(400).json({ error: 'Need exactly 3 items' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

        // 1. Проверка предметов
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
        const sourceRarity = firstRarity; // например 'common'
        const currentIndex = RARITY_ORDER.indexOf(sourceRarity);
        if (currentIndex === -1 || currentIndex === RARITY_ORDER.length - 1) {
            throw new Error('Cannot upgrade this rarity');
        }
        const resultRarity = RARITY_ORDER[currentIndex + 1]; // то, что пытаемся получить

        // 2. Проверка свитка (если есть)
        let scrollBonus = 0;
        if (scroll_id) {
            const scrollItem = await client.query(
                'SELECT * FROM inventory WHERE id = $1 AND user_id = $2',
                [scroll_id, userId]
            );
            if (scrollItem.rows.length === 0) throw new Error('Scroll not found');
            if (scrollItem.rows[0].type !== 'scroll') throw new Error('Not a scroll');
            scrollBonus = SCROLL_BONUS[scrollItem.rows[0].rarity] || 0;
        }

        // 3. Списание стоимости
        const cost = CRAFT_COST[resultRarity];
        if (!cost) throw new Error('Invalid craft rarity');
        if (user.coins < cost.coins) throw new Error('Not enough coins');
        if ((user.coal || 0) < cost.coal) throw new Error('Not enough coal');

        await client.query('UPDATE users SET coins = coins - $1, coal = coal - $2 WHERE id = $3',
            [cost.coins, cost.coal, userId]);

        // 4. Определяем успех
        const baseChance = BASE_CRAFT_CHANCES[resultRarity] || 0.5;
        const finalChance = Math.min(1.0, baseChance + scrollBonus);
        const success = Math.random() < finalChance;

        if (success) {
            // Удаляем 3 предмета и свиток (если был)
            await client.query('DELETE FROM inventory WHERE id = ANY($1::int[])', [item_ids]);
            if (scroll_id) {
                await client.query('DELETE FROM inventory WHERE id = $1', [scroll_id]);
            }

            // Создаём новый предмет
            const newItem = generateItemByRarity(resultRarity, chosen_class || null);
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

            await client.query('COMMIT');

            // Обновление задания "Счастливчик"
            if (['rare', 'epic', 'legendary'].includes(resultRarity)) {
                try {
                    await dailyTasks.updateChestProgress(userId, resultRarity);
                } catch (e) {
                    console.error('[forge/craft] updateChestProgress error:', e);
                }
            }

            res.json({ success: true, item: { ...newItem, id: newItemId }, message: 'Ковка успешна!' });
        } else {
            // Неудача: удаляем предметы и свиток
            await client.query('DELETE FROM inventory WHERE id = ANY($1::int[])', [item_ids]);
            if (scroll_id) {
                await client.query('DELETE FROM inventory WHERE id = $1', [scroll_id]);
            }
            await client.query('COMMIT');
            res.json({ success: false, message: 'Ковка провалилась. Предметы и свиток потеряны.' });
        }
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[forge/craft] Error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Плавка (с добавлением угля)
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
        let coalGain = 0;

        const items = await client.query(
            'SELECT * FROM inventory WHERE id = ANY($1::int[]) AND user_id = $2 AND equipped = false AND for_sale = false AND in_forge = true',
            [item_ids, userId]
        );
        if (items.rows.length === 0) throw new Error('Items not found');

        await client.query('DELETE FROM inventory WHERE id = ANY($1::int[])', [item_ids]);

        for (const item of items.rows) {
            const rarity = item.rarity.toLowerCase();
            switch (rarity) {
                case 'common':
                    coinsGain += Math.floor(Math.random() * 21) + 65;
                    break;
                case 'uncommon':
                    coinsGain += Math.floor(Math.random() * 41) + 120;
                    break;
                case 'rare':
                    coinsGain += Math.floor(Math.random() * 201) + 400;
                    break;
                case 'epic':
                    coinsGain += Math.floor(Math.random() * 501) + 1000;
                    if (Math.random() < 0.5) diamondsGain += 1;
                    break;
                case 'legendary':
                    coinsGain += Math.floor(Math.random() * 1001) + 2000;
                    diamondsGain += 2 + Math.floor(Math.random() * 4);
                    break;
            }
            // Уголь
            const coalRange = SMELT_COAL[rarity];
            if (coalRange) {
                coalGain += Math.floor(Math.random() * (coalRange.max - coalRange.min + 1)) + coalRange.min;
            }
        }

        await client.query(
            'UPDATE users SET coins = coins + $1, diamonds = diamonds + $2, coal = coal + $3 WHERE id = $4',
            [coinsGain, diamondsGain, coalGain, userId]
        );

        await client.query('COMMIT');
        res.json({ success: true, coins: coinsGain, diamonds: diamondsGain, coal: coalGain });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[forge/smelt] Error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
