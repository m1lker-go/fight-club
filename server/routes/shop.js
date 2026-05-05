const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const { itemNames, fixedBonuses } = require('../data/itemData');
const dailyTasks = require('../utils/dailyTasks');

// Единая функция получения московской даты (синхронизирована со сбросом заданий)
const getMoscowDate = () => dailyTasks.getMoscowDate();

// Преобразует дату из БД в строку 'YYYY-MM-DD' по московскому времени
// Важно: должна быть объявлена до использования в маршрутах
function toMoscowDateString(dbDate) {
    if (!dbDate) return null;
    const d = new Date(dbDate);
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

function generateItemFromChest(chestType) {
    const classes = ['warrior', 'assassin', 'mage'];
    const className = classes[Math.floor(Math.random() * classes.length)];
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];

    let rarity;
    if (chestType === 'common') {
        const r = Math.random();
        if (r < 0.85) rarity = 'common';
        else rarity = 'uncommon';
    } else if (chestType === 'uncommon') {
        const r = Math.random();
        if (r < 0.25) rarity = 'common';
        else if (r < 0.90) rarity = 'uncommon';
        else rarity = 'rare';
    } else if (chestType === 'rare') {
        const r = Math.random();
        if (r < 0.65) rarity = 'rare';
        else if (r < 0.90) rarity = 'uncommon';
        else rarity = 'epic';
    } else if (chestType === 'epic') {
        const r = Math.random();
        if (r < 0.65) rarity = 'epic';
        else if (r < 0.90) rarity = 'rare';
        else rarity = 'legendary';
    } else if (chestType === 'legendary') {
        const r = Math.random();
        if (r < 0.70) rarity = 'legendary';
        else rarity = 'epic';
    } else {
        rarity = 'common';
    }

    const namesArray = itemNames[className][type][rarity];
    const name = namesArray[Math.floor(Math.random() * namesArray.length)];

    const possibleStats = ['atk', 'def', 'hp', 'spd', 'crit', 'crit_dmg', 'agi', 'int', 'vamp', 'reflect'];
    const stat1 = possibleStats[Math.floor(Math.random() * possibleStats.length)];
    const stat2 = possibleStats[Math.floor(Math.random() * possibleStats.length)];

    const item = {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: className,
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

router.post('/buychest', async (req, res) => {
    const { tg_id, user_id, chestType } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;
        let coins = user.coins;
        let diamonds = user.diamonds;
        let lastFree = user.last_free_common_chest;

        const today = getMoscowDate();

        let priceCoins = 0;
        let priceDiamonds = 0;
        let isFree = false;

        switch (chestType) {
            case 'common':
                // используем toMoscowDateString для корректного сравнения
                if (toMoscowDateString(lastFree) !== today) {
                    isFree = true;
                } else {
                    priceCoins = 100;
                }
                break;
            case 'uncommon':
                priceCoins = 500;
                break;
            case 'rare':
                priceCoins = 1500;
                break;
            case 'epic':
                priceDiamonds = 300;
                break;
            case 'legendary':
                priceDiamonds = 1000;
                break;
            default:
                throw new Error('Invalid chest type');
        }

        if (!isFree) {
            if (priceCoins > 0 && coins < priceCoins) throw new Error('Not enough coins');
            if (priceDiamonds > 0 && diamonds < priceDiamonds) throw new Error('Not enough diamonds');
            if (priceCoins > 0) await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [priceCoins, userId]);
            if (priceDiamonds > 0) await client.query('UPDATE users SET diamonds = diamonds - $1 WHERE id = $2', [priceDiamonds, userId]);
        } else {
            await client.query('UPDATE users SET last_free_common_chest = $1 WHERE id = $2', [today, userId]);
        }

        const item = generateItemFromChest(chestType);
        const itemRes = await client.query(
            `INSERT INTO items (name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
            [item.name, item.type, item.rarity, 'any', item.owner_class,
             item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
             item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
        );
        const itemId = itemRes.rows[0].id;

        await client.query(
            `INSERT INTO inventory (user_id, item_id, equipped, name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [userId, itemId, false, item.name, item.type, item.rarity, 'any', item.owner_class,
             item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
             item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
        );

        if (item.rarity === 'rare' || item.rarity === 'epic' || item.rarity === 'legendary') {
            await dailyTasks.updateChestProgress(userId, item.rarity);
        }

        await client.query('COMMIT');
        res.json({ success: true, item: { ...item, id: itemId } });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Ошибка при покупке сундука:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/buy-coins', async (req, res) => {
    const { tg_id, user_id, coins, price } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    if (!coins || !price) return res.status(400).json({ error: 'Missing coins or price' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        if (user.diamonds < price) throw new Error('Not enough diamonds');
        await client.query('UPDATE users SET diamonds = diamonds - $1, coins = coins + $2 WHERE id = $3', [price, coins, user.id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Buy coins error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ========== МОНЕТНЫЙ ДВОР ==========

router.get('/freecoal', async (req, res) => {
    const { tg_id, user_id } = req.query;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const today = getMoscowDate();
        const lastFreeMsk = toMoscowDateString(user.last_free_coal_date);
        const freeAvailable = lastFreeMsk !== today;
        res.json({ freeAvailable });
    } catch (e) {
        console.error('Error checking free coal:', e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/buy-coal', async (req, res) => {
    console.log('[buy-coal] START', req.body);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { tg_id, user_id, amount, price, free } = req.body;
        if (!tg_id && !user_id) {
            throw new Error('tg_id or user_id required');
        }
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const today = getMoscowDate();
        if (free) {
            const lastFreeMsk = toMoscowDateString(user.last_free_coal_date);
            if (lastFreeMsk === today) throw new Error('Бесплатный уголь уже получен сегодня');
            await client.query('UPDATE users SET coal = coal + $1, last_free_coal_date = $2 WHERE id = $3', [amount, today, user.id]);
        } else {
            if (user.diamonds < price) throw new Error('Not enough diamonds');
            await client.query('UPDATE users SET diamonds = diamonds - $1, coal = coal + $2 WHERE id = $3', [price, amount, user.id]);
        }
        await client.query('COMMIT');
        console.log('[buy-coal] SUCCESS');

        try {
            await dailyTasks.updateCoalGainProgress(user.id, amount);
        } catch (e) {
            console.error('[buy-coal] updateCoalGainProgress error:', e);
        }

        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[buy-coal] ERROR:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/buy-coal-coins', async (req, res) => {
    const { user_id, amount } = req.body;
    if (!user_id || !amount) return res.status(400).json({ error: 'Missing user_id or amount' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        const priceCoins = (amount / 10) * 100;
        const maxDaily = 1000;
        const purchasedToday = user.coal_purchased_today || 0;
        if (purchasedToday + amount > maxDaily) throw new Error(`Daily limit exceeded (max ${maxDaily} coal)`);
        if (user.coins < priceCoins) throw new Error('Not enough coins');
        await client.query(
            `UPDATE users SET coins = coins - $1, coal = coal + $2, coal_purchased_today = coal_purchased_today + $2 WHERE id = $3`,
            [priceCoins, amount, user.id]
        );
        await client.query('COMMIT');
        try {
            await dailyTasks.updateCoalGainProgress(user.id, amount);
        } catch (e) {
            console.error('[buy-coal-coins] updateCoalGainProgress error:', e);
        }
        res.json({ success: true, newCoal: user.coal + amount });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Buy coal with coins error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.get('/coal-limit', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        const purchasedToday = user.coal_purchased_today || 0;
        const maxDaily = 1000;
        res.json({ purchasedToday, maxDaily });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/buy-gold', async (req, res) => {
    const { tg_id, user_id, amount, price } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    if (!amount || !price) return res.status(400).json({ error: 'Missing amount or price' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        if (user.diamonds < price) throw new Error('Not enough diamonds');
        await client.query('UPDATE users SET diamonds = diamonds - $1, coins = coins + $2 WHERE id = $3', [price, amount, user.id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Buy gold error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ========== ПОДПИСКА VIP SILVER ==========
router.get('/subscription/free-coin-status', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        const today = getMoscowDate();
        const lastMsk = toMoscowDateString(user.last_free_sub_coin);
        const available = lastMsk !== today;
        res.json({ available });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/subscription/claim-free-coin', async (req, res) => {
    console.log('[claim-free-coin] START', req.body);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { user_id } = req.body;
        if (!user_id) throw new Error('user_id required');
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        const today = getMoscowDate();
        const lastMsk = toMoscowDateString(user.last_free_sub_coin);
        if (lastMsk === today) throw new Error('Already claimed today');
        await client.query('UPDATE users SET coins = coins + 20, last_free_sub_coin = $1 WHERE id = $2', [today, user.id]);
        await client.query('COMMIT');
        console.log('[claim-free-coin] SUCCESS');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[claim-free-coin] ERROR:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
