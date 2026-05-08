// routes/robokassa.js – добавлены бонусы при оформлении подписки

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

// ---------- Подпись MD5 с Receipt и Shp ----------
function buildSignatureString(outSum, invId, password, options = {}) {
    const { receipt = null, shpParams = {} } = options;
    let str = `${MERCHANT_LOGIN}:${outSum}:${invId}`;
    if (receipt) str += `:${receipt}`;
    str += `:${password}`;
    const sortedShp = Object.keys(shpParams).sort();
    for (const key of sortedShp) {
        str += `:${key}=${shpParams[key]}`;
    }
    return str;
}

function generateSignature(outSum, invId, password, options = {}) {
    const str = buildSignatureString(outSum, invId, password, options);
    const sig = crypto.createHash('md5').update(str).digest('hex').toUpperCase();
    console.log(`[SIGN DEBUG] String: ${str}`);
    console.log(`[SIGN DEBUG] Result: ${sig}`);
    return sig;
}

function verifyResultSignature(outSum, invId, password) {
    const str = `${outSum}:${invId}:${password}`;
    return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

// ---------- СОЗДАНИЕ ПЛАТЕЖА (без изменений) ----------
router.post('/create', async (req, res) => {
    try {
        const { userId, amount, description, returnUrl, metadata, receipt } = req.body;
        if (!userId || !amount || !description) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        const outSum = Number(amount).toFixed(2);
        const invId = `${metadata?.type === 'subscription' ? 'sub' : 'diamonds'}_${userId}_${Date.now()}`;

        if (metadata?.type === 'diamonds_pack') {
            const client = await pool.connect();
            try {
                await client.query(
                    `INSERT INTO pending_robokassa_payments (inv_id, user_id, diamonds, bonus, pack_id)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (inv_id) DO NOTHING`,
                    [invId, userId, metadata.diamonds, metadata.bonus || false, metadata.packId]
                );
            } finally { client.release(); }
        }

        const shpParams = { Shp_userId: userId.toString() };
        if (metadata?.packId) shpParams.Shp_packId = metadata.packId.toString();

        const signature = generateSignature(outSum, invId, PASSWORD1, {
            receipt: receipt || null,
            shpParams: shpParams
        });

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
        if (receipt) params.append('Receipt', receipt);
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

// ---------- НАЧИСЛЕНИЕ АЛМАЗОВ (без изменений) ----------
async function handleDiamondsPayment(userId, outSum, invId) {
    const client = await pool.connect();
    try {
        const pending = await client.query(
            'SELECT diamonds, bonus, pack_id FROM pending_robokassa_payments WHERE inv_id = $1', [invId]
        );
        if (pending.rows.length === 0) return true;
        const { diamonds, bonus, pack_id } = pending.rows[0];
        let diamondsToAdd = parseInt(diamonds) || 0;
        if (bonus && diamondsToAdd > 0) {
            const check = await client.query(
                'SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2', [userId, pack_id]
            );
            if (check.rowCount === 0) {
                diamondsToAdd = Math.floor(diamondsToAdd * 1.5);
                await client.query('INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)', [userId, pack_id]);
            }
        }
        if (diamondsToAdd === 0) return true;
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, null, userId);
        if (!user) throw new Error('Пользователь не найден');
        await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [diamondsToAdd, user.id]);
        await client.query('DELETE FROM pending_robokassa_payments WHERE inv_id = $1', [invId]);
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Robokassa] Ошибка начисления алмазов:', err);
        return false;
    } finally { client.release(); }
}

// ---------- АКТИВАЦИЯ ПОДПИСКИ С БОНУСАМИ ----------
async function handleSubscriptionPayment(userId, outSum, invId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Защита от дублей
        const existing = await client.query(
            'SELECT 1 FROM subscription_activations WHERE inv_id = $1', [invId]
        );
        if (existing.rowCount > 0) {
            await client.query('COMMIT');
            return true;
        }

        const user = await getUserByIdentifier(client, null, userId);
        if (!user) throw new Error('Пользователь не найден');

        // 1. Активация подписки (30 дней)
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        const expiryDateStr = expiryDate.toISOString().split('T')[0];
        await client.query(
            'UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2',
            [expiryDateStr, user.id]
        );

        // 2. Запись об активации
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

        // 3. Приветственное сообщение
        await client.query(
            'INSERT INTO user_messages (user_id, subject, body) VALUES ($1, $2, $3)',
            [
                user.id,
                '🎉 Подписка VIP Silver активирована!',
                'Поздравляю! Ваша подписка "VIP-SILVER" активирована на 30 дней.\nСпасибо за покупку.\nКоты с благодарностью мяукают Вам.'
            ]
        );

        // 4. ЕДИНОРАЗОВЫЕ БОНУСЫ (только при первой активации)
        await client.query(
            'UPDATE users SET coins = coins + 1500, coal = coal + 50, diamonds = diamonds + 100 WHERE id = $1',
            [user.id]
        );
        console.log(`[Robokassa] Начислены бонусы: 1500 монет, 50 угля, 100 алмазов пользователю ${user.id}`);

        await client.query('COMMIT');
        console.log(`[Robokassa] Подписка активирована для user ${user.id} до ${expiryDateStr}`);
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Robokassa] Ошибка активации подписки:', err);
        return false;
    } finally { client.release(); }
}

// ---------- ВЕБХУК (без изменений) ----------
router.post('/result', async (req, res) => {
    console.log('=== ROBOKASSA RESULT ===', req.body);
    try {
        const { OutSum, InvId, SignatureValue } = req.body;
        if (!OutSum || !InvId || !SignatureValue) return res.status(400).send('ERROR');

        const expected = verifyResultSignature(OutSum, InvId, PASSWORD2);
        if (SignatureValue.toUpperCase() !== expected) return res.status(400).send('ERROR');

        const parts = InvId.split('_');
        const type = parts[0];
        const userId = parseInt(parts[1]);
        if (isNaN(userId)) return res.status(400).send('ERROR');

        let success = (type === 'sub') ? await handleSubscriptionPayment(userId, OutSum, InvId)
                                      : await handleDiamondsPayment(userId, OutSum, InvId);
        res.send(success ? `OK${InvId}` : 'ERROR');
    } catch (e) {
        console.error('Result error:', e);
        res.status(500).send('ERROR');
    }
});

module.exports = router;
