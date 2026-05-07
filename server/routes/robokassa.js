// routes/robokassa.js — полный обработчик Robokassa (алмазы + подписка)

require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

// ---------- КОНФИГУРАЦИЯ ИЗ .env ----------
const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN;
const PASSWORD1      = process.env.ROBOKASSA_PASSWORD1;
const PASSWORD2      = process.env.ROBOKASSA_PASSWORD2;
const IS_TEST        = process.env.ROBOKASSA_TEST_MODE === 'true';

if (!MERCHANT_LOGIN || !PASSWORD1 || !PASSWORD2) {
    console.error('[Robokassa] Не заданы ROBOKASSA_MERCHANT_LOGIN, PASSWORD1 или PASSWORD2');
    process.exit(1);
}

const ROBOKASSA_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

// ---------- Подпись SHA256 ----------
function generateSignature(invId, outSum, password) {
    const str = `${MERCHANT_LOGIN}:${outSum}:${invId}:${password}`;
    return crypto.createHash('sha256').update(str).digest('hex');
}

// ---------- СОЗДАНИЕ ПЛАТЕЖА ----------
router.post('/create', async (req, res) => {
    try {
        const { userId, amount, description, returnUrl, metadata } = req.body;
        if (!userId || !amount || !description) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        let invId;
        const type = metadata?.type;
        if (type === 'subscription') {
            invId = `sub_${userId}_${Date.now()}`;
        } else {
            invId = `diamonds_${userId}_${Date.now()}`;
            if (metadata?.packId) invId += `_${metadata.packId}`;
        }

        const outSum = Number(amount).toFixed(2);
        const signature = generateSignature(invId, outSum, PASSWORD1);

        const params = new URLSearchParams({
            MerchantLogin: MERCHANT_LOGIN,
            OutSum: outSum,
            InvId: invId,
            Description: description,
            SignatureValue: signature,
            IsTest: IS_TEST ? '1' : '0',
            Culture: 'ru',
            Encoding: 'utf-8'
        });

        if (returnUrl) {
            params.append('SuccessURL', returnUrl);
        }

        const confirmationUrl = `${ROBOKASSA_URL}?${params.toString()}`;

        res.json({ confirmationUrl, paymentId: invId });
    } catch (e) {
        console.error('[Robokassa] create error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ---------- НАЧИСЛЕНИЕ АЛМАЗОВ ----------
async function handleDiamondsPayment(userId, outSum, invId) {
    console.log(`[Robokassa] handleDiamondsPayment: userId=${userId}, sum=${outSum}, inv=${invId}`);

    const parts = invId.split('_');
    const packId = parts[3]; // diamonds_userId_timestamp_packId
    const diamondsToAdd = parseInt(packId) || 0; // временная логика, позже можно привязать к packId

    if (diamondsToAdd === 0) {
        console.warn(`[Robokassa] Нет алмазов для начисления userId=${userId}`);
        return true;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, null, userId);
        if (!user) throw new Error('Пользователь не найден');
        await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [diamondsToAdd, user.id]);
        await client.query('COMMIT');
        console.log(`[Robokassa] Начислено ${diamondsToAdd} алмазов пользователю ${userId}`);
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Robokassa] Ошибка начисления алмазов:', err);
        return false;
    } finally {
        client.release();
    }
}

// ---------- АКТИВАЦИЯ ПОДПИСКИ ----------
async function handleSubscriptionPayment(userId, outSum, invId) {
    console.log(`[Robokassa] handleSubscriptionPayment: userId=${userId}, sum=${outSum}, inv=${invId}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT 1 FROM subscription_activations WHERE inv_id = $1',
            [invId]
        );
        if (existing.rowCount > 0) {
            console.log(`[Robokassa] Подписка уже активирована для InvId ${invId}`);
            await client.query('COMMIT');
            return true;
        }

        const user = await getUserByIdentifier(client, null, userId);
        if (!user) throw new Error('Пользователь не найден');

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        const expiryDateStr = expiryDate.toISOString().split('T')[0];

        await client.query(
            'UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2',
            [expiryDateStr, user.id]
        );

        await client.query(`
            CREATE TABLE IF NOT EXISTS subscription_activations (
                inv_id VARCHAR(50) PRIMARY KEY,
                user_id INTEGER,
                activated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(
            'INSERT INTO subscription_activations (inv_id, user_id) VALUES ($1, $2)',
            [invId, user.id]
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
        console.log(`[Robokassa] Подписка активирована для user ${user.id} до ${expiryDateStr}`);
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Robokassa] Ошибка активации подписки:', err);
        return false;
    } finally {
        client.release();
    }
}

// ---------- CALLBACK от Robokassa (Result URL) ----------
router.post('/result', async (req, res) => {
    console.log('=== ROBOKASSA RESULT ===');
    console.log('Body:', req.body);
    console.log('Query:', req.query);

    try {
        const OutSum = req.body.OutSum || req.query.OutSum;
        const InvId = req.body.InvId || req.query.InvId;
        const SignatureValue = req.body.SignatureValue || req.query.SignatureValue;

        if (!OutSum || !InvId || !SignatureValue) {
            console.error('Missing parameters');
            return res.status(400).send('ERROR');
        }

        const expectedSignature = generateSignature(InvId, OutSum, PASSWORD2);
        if (SignatureValue.toLowerCase() !== expectedSignature) {
            console.error('Invalid signature');
            return res.status(400).send('ERROR');
        }

        const parts = InvId.split('_');
        const type = parts[0];
        const userId = parseInt(parts[1]);
        if (isNaN(userId)) {
            console.error('Bad InvId');
            return res.status(400).send('ERROR');
        }

        let success = false;
        if (type === 'sub') {
            success = await handleSubscriptionPayment(userId, OutSum, InvId);
        } else if (type === 'diamonds') {
            success = await handleDiamondsPayment(userId, OutSum, InvId);
        } else {
            console.error('Unknown payment type');
            return res.status(400).send('ERROR');
        }

        if (success) {
            res.send(`OK${InvId}`);
        } else {
            res.status(500).send('ERROR');
        }
    } catch (e) {
        console.error('Result error:', e);
        res.status(500).send('ERROR');
    }
});

module.exports = router;
