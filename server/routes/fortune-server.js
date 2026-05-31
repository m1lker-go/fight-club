const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { generateItemByRarity } = require('../utils/botGenerator');
const dailyTasks = require('../utils/dailyTasks');

// Единая функция получения московской даты (синхронизирована со сбросом)
const getMoscowDate = () => dailyTasks.getMoscowDate();

// Шансы выигрыша (сумма 100)
const prizes = [
    { type: 'legendary_chest', chance: 1, name: 'Легендарное снаряжение' },
    { type: 'free_spin', chance: 10, name: 'Билет лотереи' },
    { type: 'coal', amount: 10, chance: 18, name: '10 угля' },
    { type: 'coins', amount: 100, chance: 18, name: '100 монет' },
    { type: 'exp', amount: 20, chance: 18, name: '20 опыта' },
    { type: 'coins', amount: 300, chance: 10, name: '300 монет' },
    { type: 'exp', amount: 50, chance: 10, name: '50 опыта' },
    { type: 'coal', amount: 50, chance: 9, name: '50 угля' },
    { type: 'coins', amount: 1000, chance: 3, name: '1000 монет' },
    { type: 'exp', amount: 250, chance: 3, name: '250 опыта' }
];

function getRandomPrize() {
    const total = prizes.reduce((s, p) => s + p.chance, 0);
    let r = Math.random() * total;
    let cum = 0;
    for (let i = 0; i < prizes.length; i++) {
        cum += prizes[i].chance;
        if (r <= cum) return { ...prizes[i], index: i };
    }
    return prizes[0];
}

// инициализация / получение статуса
router.get('/status', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const today = getMoscowDate();
        await client.query(`
            INSERT INTO user_fortune (user_id, free_spins_left, purchased_today, last_reset_date)
            VALUES ($1, 3, 0, $2)
            ON CONFLICT (user_id) DO UPDATE
            SET free_spins_left = CASE WHEN user_fortune.last_reset_date < $2 THEN 3 ELSE user_fortune.free_spins_left END,
                purchased_today = CASE WHEN user_fortune.last_reset_date < $2 THEN 0 ELSE user_fortune.purchased_today END,
                last_reset_date = $2
            WHERE user_fortune.user_id = $1
        `, [userId, today]);
        const resDb = await client.query(
            'SELECT free_spins_left, paid_spins, purchased_today FROM user_fortune WHERE user_id = $1',
            [userId]
        );
        const data = resDb.rows[0] || { free_spins_left: 3, paid_spins: 0, purchased_today: 0 };
        res.json({
            freeSpins: data.free_spins_left,
            paidSpins: data.paid_spins || 0,
            purchasedToday: data.purchased_today || 0,
            totalSpins: (data.free_spins_left || 0) + (data.paid_spins || 0)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

// Покупка билетов
router.post('/buy-tickets', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { count } = req.body;
    if (!count || count < 1 || count > 100) return res.status(400).json({ error: 'Invalid count' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const today = getMoscowDate();
        // проверяем лимит покупок за день
        const fortuneRes = await client.query(
            'SELECT purchased_today FROM user_fortune WHERE user_id = $1',
            [userId]
        );
        let purchasedToday = fortuneRes.rows[0]?.purchased_today || 0;
        if (purchasedToday + count > 100) throw new Error('You can buy no more than 100 tickets per day');
        const totalDiamonds = count * 10;
        if (user.diamonds < totalDiamonds) throw new Error('Not enough diamonds');
        await client.query('UPDATE users SET diamonds = diamonds - $1 WHERE id = $2', [totalDiamonds, userId]);
        await client.query(`
            INSERT INTO user_fortune (user_id, paid_spins, purchased_today, last_reset_date)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) DO UPDATE
            SET paid_spins = user_fortune.paid_spins + $2,
                purchased_today = user_fortune.purchased_today + $3,
                last_reset_date = $4
        `, [userId, count, count, today]);
        await client.query('COMMIT');
        res.json({ success: true, message: `You purchased ${count} tickets` });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// Вращение колеса
router.post('/spin', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        // получаем текущее состояние
        let fortune = await client.query(
            'SELECT free_spins_left, paid_spins FROM user_fortune WHERE user_id = $1',
            [userId]
        );
        let free = fortune.rows[0]?.free_spins_left || 0;
        let paid = fortune.rows[0]?.paid_spins || 0;
        if (free + paid === 0) throw new Error('No tickets left');
        // списываем билет (сначала бесплатный)
        if (free > 0) {
            await client.query('UPDATE user_fortune SET free_spins_left = free_spins_left - 1 WHERE user_id = $1', [userId]);
        } else {
            await client.query('UPDATE user_fortune SET paid_spins = paid_spins - 1 WHERE user_id = $1', [userId]);
        }
        const prize = getRandomPrize();
        let responsePrize = { type: prize.type, amount: prize.amount, name: prize.name };
        // начисляем награды
        if (prize.type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [prize.amount, userId]);
        } else if (prize.type === 'free_spin') {
            await client.query('UPDATE user_fortune SET free_spins_left = free_spins_left + 1 WHERE user_id = $1', [userId]);
        } else if (prize.type === 'legendary_chest') {
            const item = generateItemByRarity('legendary', null);
            const itemRes = await client.query(
                `INSERT INTO items (name, type, rarity, class_restriction, owner_class, atk_bonus, def_bonus, hp_bonus, spd_bonus,
                    crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
                [item.name, item.type, item.rarity, 'any', item.owner_class,
                 item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
                 item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
            );
            const itemId = itemRes.rows[0].id;
            await client.query(
                `INSERT INTO inventory (user_id, item_id, equipped, name, type, rarity, class_restriction, owner_class,
                    atk_bonus, def_bonus, hp_bonus, spd_bonus, crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus) 
                 VALUES ($1, $2, false, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
                [userId, itemId, item.name, item.type, item.rarity, 'any', item.owner_class,
                 item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
                 item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
            );
        } else if (prize.type === 'coal') {
            await client.query('UPDATE users SET coal = coal + $1 WHERE id = $2', [prize.amount, userId]);
        } else if (prize.type === 'exp') {
            responsePrize.expAmount = prize.amount;
        }

        await client.query('COMMIT');

        // Обновление заданий после COMMIT
        try {
            if (prize.type === 'coal') {
                await dailyTasks.updateCoalGainProgress(userId, prize.amount);
            }
            await dailyTasks.updateFortuneSpinProgress(userId);
        } catch (e) {
            console.error('Fortune daily task update error:', e);
        }

        res.json({ success: true, prize: responsePrize });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// Начисление опыта (для опыта)
router.post('/claim-exp', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { exp, class: chosenClass } = req.body;
    if (!exp || !chosenClass) return res.status(400).json({ error: 'exp and class required' });
    const client = await pool.connect();
    try {
        let classRes = await client.query(
            'SELECT level, exp, skill_points FROM user_classes WHERE user_id = $1 AND class = $2',
            [userId, chosenClass]
        );
        if (classRes.rows.length === 0) throw new Error('Class not found');
        let { level, exp: currentExp, skill_points } = classRes.rows[0];
        currentExp += exp;
        const expNeeded = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));
        let leveledUp = false;
        while (currentExp >= expNeeded(level)) {
            currentExp -= expNeeded(level);
            level++;
            const pointsToAdd = (level <= 14) ? 3 : 5;
            skill_points += pointsToAdd;
            leveledUp = true;
        }
        await client.query(
            'UPDATE user_classes SET level = $1, exp = $2, skill_points = $3 WHERE user_id = $4 AND class = $5',
            [level, currentExp, skill_points, userId, chosenClass]
        );
        const { updatePlayerPower } = require('../utils/power');
        await updatePlayerPower(client, userId, chosenClass);
        res.json({ success: true, leveledUp });
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

module.exports = router;
