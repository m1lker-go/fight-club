const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Вспомогательная функция генерации предмета по редкости (аналог из shop.js)
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

    return {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: ownerClass || ['warrior','assassin','mage'][Math.floor(Math.random()*3)],
        atk_bonus: Math.floor(b.atk * (0.8 + 0.4*Math.random())),
        def_bonus: Math.floor(b.def * (0.8 + 0.4*Math.random())),
        hp_bonus: Math.floor(b.hp * (0.8 + 0.4*Math.random())),
    };
}

// Функция для определения награды по дню
function getAdventReward(day, daysInMonth) {
    const coinExpBase = [50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 100, 100, 120, 120, 150, 150, 200, 200, 250, 250, 300, 300, 400, 400, 500, 500];
    if (day === 7) return { type: 'item', rarity: 'common' };
    if (day === 10) return { type: 'item', rarity: 'uncommon' };
    if (day === 15) return { type: 'item', rarity: 'rare' };
    if (day === 22) return { type: 'item', rarity: 'epic' };
    if (day === 30) return { type: 'item', rarity: 'legendary' };
    if (daysInMonth === 31 && day === 31) return { type: 'item', rarity: 'legendary' };
    const index = day - 1;
    if (index < coinExpBase.length) {
        if (day % 2 === 1) return { type: 'coins', amount: coinExpBase[index] };
        else return { type: 'exp', amount: coinExpBase[index] };
    } else {
        const higher = [300, 300, 400, 400, 500, 500];
        let idx = index - coinExpBase.length;
        if (idx < higher.length) {
            if (day % 2 === 1) return { type: 'coins', amount: higher[idx] };
            else return { type: 'exp', amount: higher[idx] };
        }
    }
    return { type: 'coins', amount: 100 };
}

// Получить состояние календаря
router.get('/advent', async (req, res) => {
    const { tg_id } = req.query;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });

    const client = await pool.connect();
    try {
        const user = await client.query('SELECT id, advent_month, advent_year, advent_mask FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        let { advent_month, advent_year, advent_mask } = user.rows[0];
        const userId = user.rows[0].id;

        const now = new Date();
        const mskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const currentMonth = mskTime.getMonth() + 1;
        const currentYear = mskTime.getFullYear();
        const currentDay = mskTime.getDate();

        if (advent_month !== currentMonth || advent_year !== currentYear) {
            advent_mask = 0;
            advent_month = currentMonth;
            advent_year = currentYear;
            await client.query(
                'UPDATE users SET advent_month = $1, advent_year = $2, advent_mask = $3 WHERE id = $4',
                [currentMonth, currentYear, 0, userId]
            );
        }

        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

        res.json({
            currentDay,
            daysInMonth,
            mask: advent_mask,
            month: currentMonth,
            year: currentYear
        });
    } finally {
        client.release();
    }
});

// Забрать награду за конкретный день
router.post('/advent/claim', async (req, res) => {
    const { tg_id, day, classChoice } = req.body;
    if (!tg_id || !day) return res.status(400).json({ error: 'Missing data' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await client.query('SELECT id, advent_month, advent_year, advent_mask FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        let { advent_month, advent_year, advent_mask } = user.rows[0];

        const now = new Date();
        const mskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const currentMonth = mskTime.getMonth() + 1;
        const currentYear = mskTime.getFullYear();
        const currentDay = mskTime.getDate();

        if (advent_month !== currentMonth || advent_year !== currentYear) {
            advent_mask = 0;
            advent_month = currentMonth;
            advent_year = currentYear;
        }

        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        if (day > currentDay || day > daysInMonth) {
            throw new Error('This day is not available yet');
        }

        if (advent_mask & (1 << (day-1))) {
            throw new Error('Reward already claimed');
        }

        if (day > 1) {
            const expectedMask = (1 << (day-1)) - 1;
            if ((advent_mask & expectedMask) !== expectedMask) {
                throw new Error('You must claim previous days first');
            }
        }

        const reward = getAdventReward(day, daysInMonth);
        let rewardDescription = '';

        if (reward.type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [reward.amount, userId]);
            rewardDescription = `${reward.amount} монет`;
        } else if (reward.type === 'exp') {
            if (!classChoice) throw new Error('Class choice required for exp');
            const classRes = await client.query('SELECT level, exp FROM user_classes WHERE user_id = $1 AND class = $2', [userId, classChoice]);
            if (classRes.rows.length === 0) throw new Error('Class not found');
            let { level, exp } = classRes.rows[0];
            exp += reward.amount;
            let leveledUp = false;
            const expNeeded = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));
            while (exp >= expNeeded(level)) {
                exp -= expNeeded(level);
                level++;
                leveledUp = true;
                await client.query('UPDATE user_classes SET skill_points = skill_points + 3 WHERE user_id = $1 AND class = $2', [userId, classChoice]);
            }
            await client.query('UPDATE user_classes SET level = $1, exp = $2 WHERE user_id = $3 AND class = $4', [level, exp, userId, classChoice]);
            rewardDescription = `${reward.amount} опыта для класса ${classChoice}`;
        } else if (reward.type === 'item') {
            const item = generateItemByRarity(reward.rarity, null);
            const itemRes = await client.query(
                `INSERT INTO items (name, type, rarity, class_restriction, owner_class, atk_bonus, def_bonus, hp_bonus) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
                [item.name, item.type, item.rarity, 'any', item.owner_class, item.atk_bonus, item.def_bonus, item.hp_bonus]
            );
            const itemId = itemRes.rows[0].id;
            await client.query('INSERT INTO inventory (user_id, item_id, equipped) VALUES ($1, $2, false)', [userId, itemId]);
            rewardDescription = `Предмет: ${item.name} (${item.rarity})`;
        }

        advent_mask |= (1 << (day-1));
        await client.query('UPDATE users SET advent_mask = $1, advent_month = $2, advent_year = $3 WHERE id = $4',
            [advent_mask, currentMonth, currentYear, userId]);

        await client.query('COMMIT');

        res.json({ success: true, reward: rewardDescription, mask: advent_mask });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
