const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { itemNames, fixedBonuses } = require('../data/itemData');

// Функция генерации предмета из сундука
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
        if (r < 0.65) rarity = 'rare';        // 65% редкое
        else if (r < 0.90) rarity = 'uncommon'; // 25% необычное (65+25=90)
        else rarity = 'epic';                   // 10% эпическое
    } else if (chestType === 'epic') {
        const r = Math.random();
        if (r < 0.65) rarity = 'epic';         // 65% эпическое
        else if (r < 0.90) rarity = 'rare';    // 25% редкое (65+25=90)
        else rarity = 'legendary';              // 10% легендарное
    } else if (chestType === 'legendary') {
        const r = Math.random();
        if (r < 0.65) rarity = 'legendary';    // 65% легендарное
        else if (r < 0.90) rarity = 'epic';    // 25% эпическое (65+25=90)
        else rarity = 'rare';                   // 10% редкое
    } else {
        rarity = 'common';
    }

    const namesArray = itemNames[className][type][rarity];
    const name = namesArray[Math.floor(Math.random() * namesArray.length)];

    // Выбираем две характеристики случайно с возможностью повтора
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

// Маршрут покупки сундука
router.post('/buychest', async (req, res) => {
    console.log('=== ПОКУПКА СУНДУКА ===');
    console.log('tg_id:', req.body.tg_id);
    console.log('chestType:', req.body.chestType);

    const { tg_id, chestType } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await client.query('SELECT id, coins, diamonds, last_free_common_chest FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        let coins = user.rows[0].coins;
        const diamonds = user.rows[0].diamonds;
        let lastFree = user.rows[0].last_free_common_chest;

        let price = 0;
        let isFree = false;

        const now = new Date();
        const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowTime.toISOString().split('T')[0];

        if (chestType === 'common') {
            if (!lastFree || new Date(lastFree).toISOString().split('T')[0] !== today) {
                isFree = true;
                price = 0;
            } else {
                price = 100;
            }
        } else if (chestType === 'uncommon') {
            price = 250;
        } else if (chestType === 'rare') {
            price = 800;
        } else if (chestType === 'epic') {
            price = 1800;
        } else if (chestType === 'legendary') {
            price = 3500;
        } else {
            throw new Error('Invalid chest type');
        }

        if (!isFree) {
            if (coins < price) throw new Error('Not enough coins');
            await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price, userId]);
        } else {
            await client.query('UPDATE users SET last_free_common_chest = $1 WHERE id = $2', [moscowTime, userId]);
        }

        const item = generateItemFromChest(chestType);
        console.log('Сгенерирован предмет:', item);
        console.log('Редкость:', item.rarity);

        // Вставляем предмет в таблицу items
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
        console.log('ID созданного предмета в items:', itemId);

        // Добавляем в инвентарь со всеми полями
        await client.query(
            `INSERT INTO inventory (
                user_id, item_id, equipped,
                name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [userId, itemId, false,
             item.name, item.type, item.rarity, 'any', item.owner_class,
             item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
             item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
        );
        console.log('Предмет добавлен в инвентарь пользователя', userId);

        await client.query('COMMIT');
        console.log('=== ТРАНЗАКЦИЯ ЗАВЕРШЕНА, предмет добавлен ===');
        res.json({ success: true, item: { ...item, id: itemId } });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Ошибка при покупке сундука:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
