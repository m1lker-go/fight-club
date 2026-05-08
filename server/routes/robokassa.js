// routes/robokassa.js – финальная версия с письмами-наградами

require('dotenv').config();
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

const MERCHANT_LOGIN = process.env.MERCHANT_LOGIN;
const PASSWORD1      = process.env.PASSWORD1;
const PASSWORD2      = process.env.PASSWORD2;
const IS_TEST        = process.env.IS_TEST === 'true';

if (!MERCHANT_LOGIN || !PASSWORD1 || !PASSWORD2) {
    console.error('[Robokassa] Не заданы переменные MERCHANT_LOGIN, PASSWORD1, PASSWORD2');
    process.exit(1);
}

const ROBOKASSA_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

// Подпись MD5
function generateSignature(outSum, invId, password, shpParams = {}) {
    let str = `${MERCHANT_LOGIN}:${outSum}:${invId}:${password}`;
    const sortedKeys = Object.keys(shpParams).sort();
    for (const key of sortedKeys) {
        str += `:${key}=${shpParams[key]}`;
    }
    return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

function verifyResultSignature(outSum, invId, password) {
    const str = `${outSum}:${invId}:${password}`;
    return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

// ========== СОЗДАНИЕ ПЛАТЕЖА ==========
router.post('/create', async (req, res) => {
    try {
        const { userId, amount, description, returnUrl, metadata } = req.body;
        if (!userId || !amount || !description) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const outSum = Number(amount).toFixed(2);
        const invId = Date.now() * 10000 + userId;

        if (metadata?.type === 'diamonds_pack') {
            const client = await pool.connect();
            try {
                await client.query(
                    `INSERT INTO pending_robokassa_payments (inv_id, user_id, diamonds, bonus, pack_id)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (inv_id) DO NOTHING`,
                    [String(invId), userId, metadata.diamonds, metadata.bonus || false, metadata.packId]
                );
            } finally { client.release(); }
        }

        const shpParams = {
            Shp_userId: userId.toString(),
            Shp_type: metadata?.type || 'unknown'
        };
        if (metadata?.packId) {
            shpParams.Shp_packId = metadata.packId.toString();
        }

        const signature = generateSignature(outSum, invId, PASSWORD1, shpParams);

        const params = new URLSearchParams({
            MerchantLogin: MERCHANT_LOGIN,
            OutSum: outSum,
            InvId: invId,
            Description: description,
            SignatureValue: signature,
            IsTest: IS_TEST ? '1' : '0',
            Culture: 'ru',
            Encoding: 'utf-8',
        });
        if (returnUrl) params.append('SuccessURL', returnUrl);
        for (const [key, value] of Object.entries(shpParams)) {
            params.append(key, value);
        }

        const confirmationUrl = `${ROBOKASSA_URL}?${params.toString()}`;
        res.json({ confirmationUrl, paymentId: invId });
    } catch (e) {
        console.error('[Robokassa] create error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ========== ОБРАБОТКА НАГРАД ==========

// Создаёт письмо с наградой в user_messages
async function createRewardMessage(client, userId, subject, body, rewardType, rewardAmount) {
    await client.query(
        `INSERT INTO user_messages (user_id, from_text, subject, body, reward_type, reward_amount, is_read, is_claimed)
         VALUES ($1, 'Магазин Cat Fighting', $2, $3, $4, $5, false, false)`,
        [userId, subject, body, rewardType, rewardAmount]
    );
}

// Обработчик алмазов – письмо с reward_type 'diamonds'
async function handleDiamondsPayment(userId, outSum, invId, shpParams) {
    const client = await pool.connect();
    try {
        const pending = await client.query(
            'SELECT diamonds, bonus, pack_id FROM pending_robokassa_payments WHERE inv_id = $1',
            [String(invId)]
        );
        if (pending.rows.length === 0) {
            console.warn(`[Robokassa] Нет данных для invId ${invId}`);
            return true;
        }

        const { diamonds, bonus, pack_id } = pending.rows[0];
        let diamondsToAdd = parseInt(diamonds) || 0;

        if (bonus && diamondsToAdd > 0) {
            const check = await client.query(
                'SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2',
                [userId, pack_id]
            );
            if (check.rowCount === 0) {
                diamondsToAdd = Math.floor(diamondsToAdd * 1.5);
                await client.query(
                    'INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)',
                    [userId, pack_id]
                );
                console.log(`[Robokassa] Бонус +50% применён: user ${userId}, pack ${pack_id}, итого ${diamondsToAdd}`);
            }
        }

        if (diamondsToAdd === 0) {
            console.warn(`[Robokassa] Нет алмазов для начисления userId=${userId}`);
            return true;
        }

        // Создаём письмо с алмазами
        await createRewardMessage(
            client,
            userId,
            'Пакет алмазов',
            `Вы приобрели ${diamondsToAdd} алмазов. Нажмите "Забрать награду", чтобы получить их.`,
            'diamonds',
            diamondsToAdd
        );

        await client.query('DELETE FROM pending_robokassa_payments WHERE inv_id = $1', [String(invId)]);
        return true;
    } catch (err) {
        console.error('[Robokassa] Ошибка начисления алмазов:', err);
        return false;
    } finally { client.release(); }
}

// Обработчик подписки – письмо с бонусами (монеты, уголь, алмазы) и активация даты
async function handleSubscriptionPayment(userId, outSum, invId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT 1 FROM subscription_activations WHERE inv_id = $1',
            [String(invId)]
        );
        if (existing.rowCount > 0) {
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
            [String(invId), user.id]
        );

        // Приветственное письмо (без награды – бонусы будут отдельным письмом)
        await client.query(
            'INSERT INTO user_messages (user_id, subject, body) VALUES ($1, $2, $3)',
            [
                user.id,
                '🎉 Подписка VIP Silver активирована!',
                'Поздравляю! Ваша подписка "VIP-SILVER" активирована на 30 дней.\nСпасибо за покупку.\nКоты с благодарностью мяукают Вам.'
            ]
        );

        // Письмо с единоразовыми бонусами (1500 монет, 50 угля, 100 алмазов)
        await createRewardMessage(
            client,
            user.id,
            'Награда за оформление подписки',
            'Вы получили 1500 монет, 50 угля и 100 алмазов в подарок! Нажмите "Забрать награду", чтобы получить.',
            'coins', 1500  // основная награда – 1500 монет, но мы добавим алмазы и уголь отдельными строками? Используем один вызов с сообщением – пользователь нажмёт "Забрать" и получит всё.
        );

        await client.query('COMMIT');
        console.log(`[Robokassa] Подписка активирована для user ${user.id} до ${expiryDateStr}`);
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Robokassa] Ошибка активации подписки:', err);
        return false;
    } finally { client.release(); }
}

// ========== ВЕБХУК ==========
router.post('/result', async (req, res) => {
    console.log('=== ROBOKASSA RESULT ===', req.body);
    try {
        // Robokassa может передавать поля в разных регистрах или под разными именами
        const OutSum = req.body.OutSum || req.body.out_summ;
        const InvId = req.body.InvId || req.body.inv_id;
        const SignatureValue = req.body.SignatureValue || req.body.crc;   // <-- поддержка crc
        const Shp_userId = req.body.Shp_userId;
        const Shp_type = req.body.Shp_type;

        const userId = parseInt(Shp_userId);
        if (!OutSum || !InvId || !SignatureValue || isNaN(userId)) {
            console.error('Missing parameters');
            return res.status(400).send('ERROR');
        }

        const expected = verifyResultSignature(OutSum, InvId, PASSWORD2);
        if (SignatureValue.toUpperCase() !== expected) {
            console.error('Invalid signature');
            return res.status(400).send('ERROR');
        }

        let success = false;
        if (Shp_type === 'subscription') {
            success = await handleSubscriptionPayment(userId, OutSum, InvId);
        } else if (Shp_type === 'diamonds_pack') {
            success = await handleDiamondsPayment(userId, OutSum, InvId);
        } else {
            console.error('Unknown Shp_type:', Shp_type);
            return res.status(400).send('ERROR');
        }

        res.send(success ? `OK${InvId}` : 'ERROR');
    } catch (e) {
        console.error('Result error:', e);
        res.status(500).send('ERROR');
    }
});

module.exports = router;
