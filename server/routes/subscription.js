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

// Статус подписки и бесплатной монеты (freeCoinAvailable не зависит от подписки)
router.get('/status', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT subscription_expiry, last_free_sub_coin, last_daily_sub_reward FROM users WHERE id = $1`,
            [user_id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const row = result.rows[0];
        const hasSubscription = row.subscription_expiry ? new Date(row.subscription_expiry) > new Date() : false;

        const todayMsk = dailyTasks.getMoscowDate();
        const lastFreeMsk = toMoscowDateString(row.last_free_sub_coin);
        const freeCoinAvailable = (lastFreeMsk !== todayMsk);

        // Проверка возможности получения ежедневной награды подписчиком
        let dailySubRewardAvailable = false;
        if (hasSubscription) {
            const lastRewardMsk = toMoscowDateString(row.last_daily_sub_reward);
            dailySubRewardAvailable = (lastRewardMsk !== todayMsk);
        }

        res.json({ hasSubscription, freeCoinAvailable, dailySubRewardAvailable, bonusPacks: {} });
    } finally {
        client.release();
    }
});

// Получение бесплатной монеты (20 монет) – без привязки к подписке
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

// Ежедневная награда для подписчиков (250 монет + 10 угля)
router.post('/claim-daily-reward', async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');

        // Проверка активности подписки
        const hasSubscription = user.subscription_expiry ? new Date(user.subscription_expiry) > new Date() : false;
        if (!hasSubscription) {
            throw new Error('Подписка не активна');
        }

        // Проверка, не получал ли уже сегодня
        const todayMsk = dailyTasks.getMoscowDate();
        const lastRewardMsk = toMoscowDateString(user.last_daily_sub_reward);
        if (lastRewardMsk === todayMsk) {
            throw new Error('Ежедневная награда уже получена сегодня');
        }

        // Начисление 250 монет и 10 угля
        await client.query(
            `UPDATE users SET coins = coins + 250, coal = coal + 10, last_daily_sub_reward = $1 WHERE id = $2`,
            [todayMsk, user.id]
        );

        await client.query('COMMIT');
        res.json({ success: true, coins: 250, coal: 10 });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Claim daily sub reward error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
