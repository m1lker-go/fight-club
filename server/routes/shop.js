const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Вспомогательная функция для генерации предмета по типу сундука
function generateItemFromChest(chestType) {
    // Массивы возможных имён (можно расширить)
    const itemNames = {
        common: ['Ржавый меч', 'Деревянный щит', 'Кожаный шлем', 'Тряпичные перчатки', 'Старые сапоги', 'Медное кольцо'],
        uncommon: ['Качественный меч', 'Укреплённый щит', 'Кожаный шлем с заклёпками', 'Перчатки из плотной кожи', 'Сапоги скорохода', 'Кольцо силы'],
        rare: ['Стальной меч', 'Щит рыцаря', 'Шлем с забралом', 'Перчатки воина', 'Сапоги легионера', 'Кольцо защиты'],
        epic: ['Меч героя', 'Эгида', 'Шлем вождя', 'Перчатки титана', 'Сапоги ветра', 'Кольцо мудрости'],
        legendary: ['Экскалибур', 'Щит Ахилла', 'Шлем Одина', 'Перчатки Геракла', 'Сапоги Гермеса', 'Кольцо всевластия']
    };
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Определяем редкость в зависимости от типа сундука
    let rarity;
    if (chestType === 'common') {
        // Обычный сундук: 85% common, 15% uncommon
        const r = Math.random();
        if (r < 0.85) rarity = 'common';
        else rarity = 'uncommon';
    } else if (chestType === 'uncommon') {
        // Необычный сундук: 25% common, 65% uncommon, 10% rare
        const r = Math.random();
        if (r < 0.25) rarity = 'common';
        else if (r < 0.90) rarity = 'uncommon';
        else rarity = 'rare';
    } else if (chestType === 'rare') {
        // Редкий сундук: 70% rare, 30% epic? (можно настроить)
        const r = Math.random();
        if (r < 0.7) rarity = 'rare';
        else rarity = 'epic';
    } else if (chestType === 'epic') {
        const r = Math.random();
        if (r < 0.7) rarity = 'epic';
        else rarity = 'legendary';
    } else if (chestType === 'legendary') {
        const r = Math.random();
        if (r < 0.7) rarity = 'legendary';
        else rarity = 'epic';
    } else {
        rarity = 'common';
    }

    const name = itemNames[rarity][Math.floor(Math.random() * itemNames[rarity].length)];
    
    // Базовые бонусы для каждой редкости
    const bonuses = {
        common: { atk: 1, def: 1, hp: 2 },
        uncommon: { atk: 2, def: 2, hp: 4 },
        rare: { atk: 3, def: 3, hp: 6 },
        epic: { atk: 5, def: 5, hp: 10 },
        legendary: { atk: 7, def: 7, hp: 15 }
    };
    const b = bonuses[rarity];
    
    // Случайно выбираем 2 бонуса (можно расширить)
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
        owner_class: ['warrior','assassin','mage'][Math.floor(Math.random()*3)],
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
        if (stat === 'atk') item.atk_bonus = Math.floor(b.atk * (0.8 + 0.4*Math.random()));
        else if (stat === 'def') item.def_bonus = Math.floor(b.def * (0.8 + 0.4*Math.random()));
        else if (stat === 'hp') item.hp_bonus = Math.floor(b.hp * (0.8 + 0.4*Math.random()));
        else if (stat === 'spd') item.spd_bonus = Math.floor(b.atk * 0.5 + 1); // условно
        else if (stat === 'crit') item.crit_bonus = Math.floor(b.atk * 2);
        else if (stat === 'crit_dmg') item.crit_dmg_bonus = Math.floor(b.atk * 5);
        else if (stat === 'agi') item.agi_bonus = Math.floor(b.atk * 2);
        else if (stat === 'int') item.int_bonus = Math.floor(b.atk * 2);
        else if (stat === 'vamp') item.vamp_bonus = Math.floor(b.atk * 2);
        else if (stat === 'reflect') item.reflect_bonus = Math.floor(b.atk * 2);
    });

    return item;
}

router.post('/buychest', async (req, res) => {
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

        // Определяем цену в монетах (алмазы пока не используем)
        let price = 0;
        let isFree = false;

        const now = new Date();
        const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowTime.toISOString().split('T')[0]; // YYYY-MM-DD

        if (chestType === 'common') {
            // Проверяем, можно ли получить бесплатно
            if (!lastFree || new Date(lastFree).toISOString().split('T')[0] !== today) {
                isFree = true;
                price = 0;
            } else {
                price = 50;
            }
        } else if (chestType === 'uncommon') {
            price = 200;
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
            // Записываем время получения бесплатного сундука
            await client.query('UPDATE users SET last_free_common_chest = $1 WHERE id = $2', [moscowTime, userId]);
        }

        // Генерируем предмет
        const item = generateItemFromChest(chestType);

        // Вставляем предмет в таблицу items (если она используется)
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

        // Добавляем в инвентарь
        await client.query(
            'INSERT INTO inventory (user_id, item_id, equipped) VALUES ($1, $2, false)',
            [userId, itemId]
        );

        await client.query('COMMIT');

        // Возвращаем предмет клиенту для отображения
        res.json({ success: true, item: { ...item, id: itemId } });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
