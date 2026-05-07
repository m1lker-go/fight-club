// routes/robokassa.js — полный обработчик Robokassa (алмазы + подписка)

require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

// ---------- КОНФИГУРАЦИЯ ИЗ .env ----------
const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN; // catfight
const PASSWORD1      = process.env.ROBOKASSA_PASSWORD1;       // тестовый пароль #1
const PASSWORD2      = process.env.ROBOKASSA_PASSWORD2;       // тестовый пароль #2
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

// ---------- СОЗДАНИЕ ПЛАТЕЖА (клиенты шлют POST /payment/create) ----------
router.post('/create', async (req, res) => {
    try {
        const { userId, amount, description, returnUrl, metadata } = req.body;
        if (!userId || !amount || !description) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const invId = `${userId}_${Date.now()}`;
        const outSum = Number(amount).toFixed(2);
        const signature = generateSignature(invId, outSum, PASSWORD1);

        const params = new URLSearchParams({
            MerchantLogin: MERCHANT_LOGIN,
            OutSum: outSum,
            InvId: invId,
            Description: description,
            SignatureValue: signature,
            IsTest: IS_TEST ? '1' : '0',
            ...(returnUrl && { SuccessURL: returnUrl }),
            // Передаём дополнительные параметры, если есть metadata
            ...(metadata?.packId && { Shp_packId: metadata.packId.toString() }),
            ...(metadata?.diamonds && { Shp_diamonds: metadata.diamonds.toString() }),
            ...(metadata?.bonus && { Shp_bonus: metadata.bonus.toString() }),
            ...(metadata?.type === 'subscription' && { Shp_subscription: '1' }),
            Shp_userId: userId.toString()
        });

        const confirmationUrl = `${ROBOKASSA_URL}?${params.toString()}`;

        // Здесь можно сохранить заказ в БД как pending

        res.json({
            confirmationUrl,
            paymentId: invId
        });
    } catch (e) {
        console.error('[Robokassa] create error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ---------- НАЧИСЛЕНИЕ АЛМАЗОВ (внутренняя функция) ----------
async function handleDiamondsPayment(userId, outSum, invId, shpParams) {
    console.log(`[Robokassa] handleDiamondsPayment: userId=${userId}, sum=${outSum}, inv=${invId}`);
    let diamondsToAdd = parseInt(shpParams.Shp_diamonds) || 0;
    const packId = shpParams.Shp_packId;
    const isBonus = shpParams.Shp_bonus === 'true';

    if (isBonus && diamondsToAdd > 0) {
        const client = await pool.connect();
        try {
            const checkRes = await client.query(
                'SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2',
                [userId, packId]
            );
            if (checkRes.rowCount === 0) {
                diamondsToAdd = Math.floor(diamondsToAdd * 1.5);
                await client.query(
                    'INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)',
                    [userId, packId]
                );
                console.log(`[Robokassa] Бонус +50% применён: user ${userId}, pack ${packId}, итого ${diamondsToAdd}`);
            }
        } catch (err) {
            console.error('[Robokassa] Ошибка проверки бонуса:', err);
        } finally {
            client.release();
        }
    }

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

// ---------- АКТИВАЦИЯ ПОДПИСКИ (внутренняя функция) ----------
async function handleSubscriptionPayment(userId, outSum, invId, shpParams) {
    console.log(`[Robokassa] handleSubscriptionPayment: userId=${userId}, sum=${outSum}, inv=${invId}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Защита от дублей
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

        // Таблица активаций (если ещё не создана)
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

        // Внутриигровое сообщение
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
        // Параметры могут прийти и в теле, и в query
        const OutSum = req.body.OutSum || req.query.OutSum;
        const InvId = req.body.InvId || req.query.InvId;
        const SignatureValue = req.body.SignatureValue || req.query.SignatureValue;
        const shpParams = { ...req.query, ...req.body };
        delete shpParams.OutSum;
        delete shpParams.InvId;
        delete shpParams.SignatureValue;

        if (!OutSum || !InvId || !SignatureValue) {
            console.error('Missing parameters');
            return res.status(400).send('ERROR');
        }

        const expectedSignature = generateSignature(InvId, OutSum, PASSWORD2);
        if (SignatureValue.toLowerCase() !== expectedSignature) {
            console.error('Invalid signature');
            return res.status(400).send('ERROR');
        }

        const userId = parseInt(InvId.split('_')[0]);
        if (isNaN(userId)) {
            console.error('Bad InvId');
            return res.status(400).send('ERROR');
        }

        // Определяем тип платежа
        const isSubscription = shpParams.Shp_subscription === '1' || InvId.startsWith('sub_');
        let success = false;
        if (isSubscription) {
            success = await handleSubscriptionPayment(userId, OutSum, InvId, shpParams);
        } else {
            success = await handleDiamondsPayment(userId, OutSum, InvId, shpParams);
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
