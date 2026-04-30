const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const { generateItemByRarity } = require('../utils/botGenerator');

// Шансы (сумма 100)
const prizeList = [
    { type: 'coins', amount: 1000, chance: 5, name: '1000 монет' },
    { type: 'exp', amount: 250, chance: 10, name: '250 опыта' },
    { type: 'coins', amount: 100, chance: 20, name: '100 монет' },
    { type: 'coal', amount: 50, chance: 12, name: '50 угля' },
    { type: 'exp', amount: 50, chance: 25, name: '50 опыта' },
    { type: 'coal', amount: 10, chance: 15, name: '10 угля' },
    { type: 'coins', amount: 300, chance: 8, name: '300 монет' },
    { type: 'exp', amount: 20, chance: 3, name: '20 опыта' },
    { type: 'free_spin', chance: 1, name: 'Бесплатный билет' },
    { type: 'item', chance: 1, name: 'Легендарный сундук' }
];

function getRandomPrize() {
    const total = prizeList.reduce((s, p) => s + p.chance, 0);
    let r = Math.random() * total;
    let cum = 0;
    for (let i = 0; i < prizeList.length; i++) {
        cum += prizeList[i].chance;
        if (r <= cum) return { ...prizeList[i], index: i };
    }
    return prizeList[0];
}

// Получение статуса
router.get('/status', async (req, res) => {
    const { tg_id, user_id } = req.query;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const today = new Date().toISOString().split('T')[0];
        await client.query(
            `INSERT INTO user_fortune (user_id, free_spins_left, last_reset_date)
             VALUES ($1, 3, $2)
             ON CONFLICT (user_id) DO UPDATE
             SET free_spins_left = CASE WHEN user_fortune.last_reset_date < $2 THEN 3 ELSE user_fortune.free_spins_left END,
                 last_reset_date = $2
             WHERE user_fortune.user_id = $1`,
            [user.id, today]
        );
        const resDb = await client.query('SELECT free_spins_left FROM user_fortune WHERE user_id = $1', [user.id]);
        res.json({ freeSpinsLeft: resDb.rows[0]?.free_spins_left || 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

// Вращение
router.post('/spin', async (req, res) => {
    const { tg_id, user_id } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        // Проверка и списание билета
        const today = new Date().toISOString().split('T')[0];
        await client.query(
            `INSERT INTO user_fortune (user_id, free_spins_left, last_reset_date)
             VALUES ($1, 3, $2)
             ON CONFLICT (user_id) DO UPDATE
             SET free_spins_left = CASE WHEN user_fortune.last_reset_date < $2 THEN 3 ELSE user_fortune.free_spins_left END,
                 last_reset_date = $2
             WHERE user_fortune.user_id = $1`,
            [user.id, today]
        );
        let fortune = await client.query('SELECT free_spins_left FROM user_fortune WHERE user_id = $1', [user.id]);
        let free = fortune.rows[0]?.free_spins_left || 0;
        if (free > 0) {
            await client.query('UPDATE user_fortune SET free_spins_left = free_spins_left - 1 WHERE user_id = $1', [user.id]);
        } else {
            if (user.diamonds < 10) throw new Error('Not enough diamonds');
            await client.query('UPDATE users SET diamonds = diamonds - 10 WHERE id = $1', [user.id]);
        }
        const prize = getRandomPrize();
        // Если приз бесплатный билет – добавляем билет
        if (prize.type === 'free_spin') {
            await client.query('UPDATE user_fortune SET free_spins_left = free_spins_left + 1 WHERE user_id = $1', [user.id]);
        }
        // Если монеты – сразу начисляем
        if (prize.type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [prize.amount, user.id]);
        }
        await client.query('COMMIT');
        res.json({ success: true, prize: { type: prize.type, amount: prize.amount, name: prize.name } });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// Покупка билета
router.post('/buy-ticket', async (req, res) => {
    const { tg_id, user_id } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        if (user.diamonds < 10) throw new Error('Not enough diamonds');
        await client.query('UPDATE users SET diamonds = diamonds - 10 WHERE id = $1', [user.id]);
        await client.query('UPDATE user_fortune SET free_spins_left = free_spins_left + 1 WHERE user_id = $1', [user.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// Начисление опыта (для опыта)
router.post('/claim-exp', async (req, res) => {
    const { tg_id, user_id, exp, class: chosenClass } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const classRes = await client.query(
            'SELECT level, exp FROM user_classes WHERE user_id = $1 AND class = $2',
            [user.id, chosenClass]
        );
        if (classRes.rows.length === 0) throw new Error('Class not found');
        let { level, exp: currentExp } = classRes.rows[0];
        currentExp += exp;
        const expNeeded = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));
        let leveledUp = false;
        while (currentExp >= expNeeded(level)) {
            currentExp -= expNeeded(level);
            level++;
            leveledUp = true;
        }
        await client.query(
            'UPDATE user_classes SET level = $1, exp = $2 WHERE user_id = $3 AND class = $4',
            [level, currentExp, user.id, chosenClass]
        );
        res.json({ success: true, leveledUp });
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// Начисление угля (если нет колонки coal, можно заменить на монеты)
router.post('/claim-coal', async (req, res) => {
    const { tg_id, user_id, amount } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        // Если нет колонки coal, добавьте или используйте coins:
        await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [amount, user.id]);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// Начисление легендарного сундука
router.post('/claim-chest', async (req, res) => {
    const { tg_id, user_id } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
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
            [user.id, itemId, item.name, item.type, item.rarity, 'any', item.owner_class,
             item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
             item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

module.exports = router;
