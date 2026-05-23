const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const dailyTasks = require('../utils/dailyTasks');

function toMoscowDateString(dbDate) {
    if (!dbDate) return null;
    const d = new Date(dbDate);
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

// ========== СТАТУС ПОДПИСКИ (требует авторизацию) ==========
router.get('/status', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const result = await client.query(
            `SELECT subscription_expiry, last_free_sub_coin, last_daily_sub_reward FROM users WHERE id = $1`,
            [userId]
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

        const bonusRes = await client.query(
            'SELECT pack_id FROM bonus_purchases WHERE user_id = $1',
            [userId]
        );
        const bonusPacks = {};
        bonusRes.rows.forEach(r => { bonusPacks[r.pack_id] = true; });

        res.json({ hasSubscription, freeCoinAvailable, dailySubRewardAvailable, bonusPacks });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ========== ПОЛУЧИТЬ БЕСПЛАТНУЮ МОНЕТУ ==========
router.post('/claim-free-coin', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];

        const todayMsk = dailyTasks.getMoscowDate();
        const lastFreeMsk = toMoscowDateString(user.last_free_sub_coin);
        if (lastFreeMsk === todayMsk) {
            throw new Error('Бесплатная монета уже получена сегодня');
        }

        await client.query(
            `UPDATE users SET coins = coins + 20, last_free_sub_coin = $1 WHERE id = $2`,
            [todayMsk, userId]
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

// ========== ЕЖЕДНЕВНАЯ НАГРАДА ДЛЯ ПОДПИСЧИКОВ ==========
router.post('/claim-daily-reward', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];

        const hasSubscription = user.subscription_expiry ? new Date(user.subscription_expiry) > new Date() : false;
        if (!hasSubscription) {
            throw new Error('Подписка не активна');
        }

        const todayMsk = dailyTasks.getMoscowDate();
        const lastRewardMsk = toMoscowDateString(user.last_daily_sub_reward);
        if (lastRewardMsk === todayMsk) {
            throw new Error('Ежедневная награда уже получена сегодня');
        }

        await client.query(
            `UPDATE users SET coins = coins + 250, coal = coal + 10, last_daily_sub_reward = $1 WHERE id = $2`,
            [todayMsk, userId]
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

// ========== АДМИНИСТРАТИВНАЯ ВЫДАЧА ПОДПИСКИ (публичный, с секретным ключом) ==========
router.post('/admin/activate', async (req, res) => {
    const { secret, user_id, days } = req.body;
    if (secret !== process.env.ADMIN_SECRET) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const daysToAdd = days || 30;
    const expiryDate = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000);
    const expiryISO = expiryDate.toISOString();

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [user_id]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];

        await client.query(
            'UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2',
            [expiryISO, user.id]
        );

        await client.query(
            'UPDATE users SET coins = coins + 1500, coal = coal + 50, diamonds = diamonds + 100 WHERE id = $1',
            [user.id]
        );

        await client.query(
            'INSERT INTO user_messages (user_id, from_text, subject, body) VALUES ($1, $2, $3, $4)',
            [
                user.id,
                'Магазин Cat Fighting',
                '🎉 Подписка VIP Silver активирована!',
                `Поздравляю! Ваша подписка "VIP-SILVER" активирована на ${daysToAdd} дней.\nСпасибо за покупку.\nКоты с благодарностью мяукают Вам.`
            ]
        );

        await client.query('COMMIT');
        res.json({ success: true, expiry: expiryISO });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
