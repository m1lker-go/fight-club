// server/routes/robokassa.js
// Универсальный обработчик callback от Robokassa (и для алмазов, и для подписки)

require('dotenv').config(); // страховка, если в главном файле не загрузилось

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

const merchantLogin = process.env.MERCHANT_LOGIN;
const password2 = process.env.PASSWORD_2;
const testPassword2 = process.env.TEST_PASSWORD_2;
const isTestMode = process.env.IS_TEST_MODE === 'true';

function buildSignature(outSum, invId, password, shpParams = {}) {
    let signatureString = `${outSum}:${invId}:${password}`;
    const sortedKeys = Object.keys(shpParams).sort();
    for (const key of sortedKeys) {
        signatureString += `:${key}=${shpParams[key]}`;
    }
    return crypto.createHash('md5').update(signatureString).digest('hex').toUpperCase();
}

// ---- Внутренняя логика начисления алмазов ----
async function handleDiamondsPayment(userId, outSum, invId, shpParams) {
    console.log(`[robokassa] handleDiamondsPayment: userId=${userId}, outSum=${outSum}, invId=${invId}`);
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
                console.log(`[robokassa] Bonus applied: user ${userId}, pack ${packId}, total diamonds ${diamondsToAdd}`);
            }
        } catch (err) {
            console.error('[robokassa] Bonus check error:', err);
        } finally {
            client.release();
        }
    }

    if (diamondsToAdd === 0) {
        console.warn(`[robokassa] No diamonds to add for userId ${userId}`);
        return true; // ничего не делаем, но считаем успехом
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, null, userId);
        if (!user) throw new Error('User not found');
        await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [diamondsToAdd, user.id]);
        await client.query('COMMIT');
        console.log(`[robokassa] Added ${diamondsToAdd} diamonds to user ${userId}`);
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[robokassa] Failed to add diamonds:', err);
        return false;
    } finally {
        client.release();
    }
}

// ---- Внутренняя логика активации подписки ----
async function handleSubscriptionPayment(userId, outSum, invId, shpParams) {
    console.log(`[robokassa] handleSubscriptionPayment: userId=${userId}, outSum=${outSum}, invId=${invId}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Защита от дублей
        const existing = await client.query(
            'SELECT 1 FROM subscription_activations WHERE inv_id = $1',
            [invId]
        );
        if (existing.rowCount > 0) {
            console.log(`[robokassa] Subscription already activated for InvId ${invId}`);
            await client.query('COMMIT');
            return true;
        }

        const user = await getUserByIdentifier(client, null, userId);
        if (!user) throw new Error('User not found');

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        const expiryDateStr = expiryDate.toISOString().split('T')[0];

        await client.query(
            `UPDATE users
             SET subscription_expiry = $1, subscription_expiry_notified = FALSE
             WHERE id = $2`,
            [expiryDateStr, user.id]
        );

        // Таблица активаций
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
            `INSERT INTO user_messages (user_id, subject, body)
             VALUES ($1, $2, $3)`,
            [
                user.id,
                '🎉 Подписка VIP Silver активирована!',
                'Поздравляю! Ваша подписка "VIP-SILVER" активирована на 30 дней.\nСпасибо за покупку.\nКоты с благодарностью мяукают Вам.'
            ]
        );

        await client.query('COMMIT');
        console.log(`[robokassa] Subscription activated for user ${user.id} until ${expiryDateStr}`);
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[robokassa] Subscription activation error:', err);
        return false;
    } finally {
        client.release();
    }
}

// ---- Единый callback ----
router.post('/callback', async (req, res) => {
    console.log('=== ROBOKASSA UNIVERSAL CALLBACK ===');
    const { OutSum, InvId, SignatureValue, ...shpParams } = req.body;
    const userId = shpParams.Shp_userId;
    if (!userId) {
        console.error('No userId in callback');
        return res.status(400).send('ERROR');
    }

    // Выбираем пароль в зависимости от режима
    const currentPassword2 = isTestMode ? testPassword2 : password2;
    if (!currentPassword2) {
        console.error('Password #2 not configured for current mode');
        return res.status(500).send('ERROR');
    }

    const expectedSignature = buildSignature(OutSum, InvId, currentPassword2, shpParams);
    if (SignatureValue !== expectedSignature) {
        console.error(`Invalid signature. Expected ${expectedSignature}, got ${SignatureValue}`);
        return res.status(400).send('ERROR');
    }

    // Определяем тип платежа: подписка или алмазы
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
});

module.exports = router;
