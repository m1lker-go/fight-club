const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const dailyTasks = require('../utils/dailyTasks');

// Преобразует дату из БД в московскую строку для сравнения
function toMoscowDateString(dbDate) {
    if (!dbDate) return null;
    const d = new Date(dbDate);
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

// Статус подписки и бесплатной монеты (теперь freeCoinAvailable не зависит от подписки)
router.get('/status', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT subscription_expiry, last_free_sub_coin FROM users WHERE id = $1`,
            [user_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const row = result.rows[0];
        const expiry = row.subscription_expiry;
        const hasSubscription = expiry ? new Date(expiry) > new Date() : false;

        const todayMsk = dailyTasks.getMoscowDate();
        const lastFreeMsk = toMoscowDateString(row.last_free_sub_coin);
        const freeCoinAvailable = lastFreeMsk !== todayMsk;

        res.json({ hasSubscription, freeCoinAvailable, bonusPacks: {} });
    } finally {
        client.release();
    }
});

// Получение бесплатной монеты (20 монет)
router.post('/claim-free-coin', async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');

        const todayMsk = dailyTasks.getMoscowDate();
        const lastFreeMsk = toMoscowDateString(user.last_free_sub_coin);
        if (lastFreeMsk === todayMsk) {
            throw new Error('Бесплатная монета уже получена сегодня');
        }

        await client.query(
            `UPDATE users SET coins = coins + 20, last_free_sub_coin = $1 WHERE id = $2`,
            [todayMsk, user.id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Claim free coin error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
