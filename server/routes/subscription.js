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

        let dailySubRewardAvailable = false;
        if (hasSubscription) {
            const lastRewardMsk = toMoscowDateString(row.last_daily_sub_reward);
            dailySubRewardAvailable = (lastRewardMsk !== todayMsk);
        }

        // Получаем реальные бонусные покупки
        const bonusRes = await client.query(
            'SELECT pack_id FROM bonus_purchases WHERE user_id = $1',
            [user_id]
        );
        const bonusPacks = {};
        bonusRes.rows.forEach(r => { bonusPacks[r.pack_id] = true; });

        res.json({ hasSubscription, freeCoinAvailable, dailySubRewardAvailable, bonusPacks });
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

// Административная выдача подписки (требует секретный ключ)
router.post('/admin/activate', async (req, res) => {
    const { secret, user_id, days } = req.body;
    if (secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (days || 30));
    const expiryDateStr = expiryDate.toISOString().split('T')[0];

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');

        await client.query(
            'UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2',
            [expiryDateStr, user.id]
        );

        // Единоразовые бонусы (как в handleSubscriptionPayment)
        await client.query(
            'UPDATE users SET coins = coins + 1500, coal = coal + 50, diamonds = diamonds + 100 WHERE id = $1',
            [user.id]
        );

        await client.query(
            'INSERT INTO user_messages (user_id, subject, body) VALUES ($1, $2, $3)',
            [
                user.id,
                '🎉 Подписка VIP Silver активирована!',
                'Поздравляю! Ваша подписка "VIP-SILVER" активирована на 30 дней.\nСпасибо за покупку.\nКоты с благодарностью мяукают Вам.'
            ]
        );

        await client.query('COMMIT');
        res.json({ success: true, expiry: expiryDateStr });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
