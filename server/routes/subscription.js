const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

require('dotenv').config();

const merchantLogin = process.env.MERCHANT_LOGIN;
const password1 = process.env.PASSWORD_1;
const testPassword1 = process.env.TEST_PASSWORD_1;
const isTestMode = process.env.IS_TEST_MODE === 'true';

function buildSignature(outSum, invId, password, shpParams = {}) {
    let signatureString = `${outSum}:${invId}:${password}`;
    const sortedKeys = Object.keys(shpParams).sort();
    for (const key of sortedKeys) {
        signatureString += `:${key}=${shpParams[key]}`;
    }
    return crypto.createHash('md5').update(signatureString).digest('hex').toUpperCase();
}

// ---------- 1. Создание платежа для подписки ----------
router.post('/create-subscription', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const amount = 599;
        const invId = `sub_${userId}_${Date.now()}`;
        const description = 'VIP Silver подписка на 30 дней';

        const shpParams = {
            Shp_userId: userId.toString(),
            Shp_subscription: '1'
        };
        const currentPassword1 = isTestMode ? testPassword1 : password1;
        if (!currentPassword1) {
            throw new Error('Password #1 not configured for current mode');
        }

        const signature = buildSignature(amount.toFixed(2), invId, currentPassword1, shpParams);
        let paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${merchantLogin}&OutSum=${amount.toFixed(2)}&InvId=${invId}&Description=${encodeURIComponent(description)}&SignatureValue=${signature}&Culture=ru`;

        for (const [key, value] of Object.entries(shpParams)) {
            paymentUrl += `&${key}=${encodeURIComponent(value)}`;
        }
        if (isTestMode) paymentUrl += '&IsTest=1';

        res.json({ paymentUrl, invId });
    } catch (e) {
        console.error('Create subscription error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ---------- 2. Проверка статуса подписки (включая возможность получить бесплатную монету) ----------
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
        const now = new Date();
        const hasSubscription = expiry ? new Date(expiry) > now : false;

        let freeCoinAvailable = false;
        if (hasSubscription) {
            const todayStr = now.toISOString().split('T')[0];
            const lastFreeStr = row.last_free_sub_coin ? new Date(row.last_free_sub_coin).toISOString().split('T')[0] : null;
            freeCoinAvailable = (lastFreeStr !== todayStr);
        }

        res.json({ hasSubscription, freeCoinAvailable });
    } finally {
        client.release();
    }
});

// ---------- 3. Получение бесплатной монеты (20 монет) для активных подписчиков ----------
router.post('/claim-free-coin', async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');

        // Проверяем активность подписки
        const expiry = user.subscription_expiry;
        const now = new Date();
        const hasSubscription = expiry ? new Date(expiry) > now : false;
        if (!hasSubscription) {
            return res.status(400).json({ error: 'Подписка не активна' });
        }

        // Проверяем, получал ли уже сегодня
        const todayStr = now.toISOString().split('T')[0];
        const lastFreeStr = user.last_free_sub_coin ? new Date(user.last_free_sub_coin).toISOString().split('T')[0] : null;
        if (lastFreeStr === todayStr) {
            return res.status(400).json({ error: 'Бесплатная монета уже получена сегодня' });
        }

        // Начисляем 20 монет и обновляем дату
        await client.query(
            `UPDATE users SET coins = coins + 20, last_free_sub_coin = NOW() WHERE id = $1`,
            [user.id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Claim free coin error:', e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
