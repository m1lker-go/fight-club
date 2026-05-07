const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

// ---------- КОНФИГУРАЦИЯ ИЗ .env ----------
const MERCHANT_LOGIN = process.env.ROBOKASSA_MERCHANT_LOGIN; // у нас catfight
const PASSWORD1      = process.env.ROBOKASSA_PASSWORD1;       // ваш тестовый пароль #1
const PASSWORD2      = process.env.ROBOKASSA_PASSWORD2;       // ваш тестовый пароль #2
const IS_TEST        = process.env.ROBOKASSA_TEST_MODE === 'true';

// Проверка, что все обязательные переменные заданы
if (!MERCHANT_LOGIN || !PASSWORD1 || !PASSWORD2) {
    console.error('[Robokassa] ОШИБКА: не заданы ROBOKASSA_MERCHANT_LOGIN, PASSWORD1 или PASSWORD2 в .env');
    process.exit(1);
}

// URL платёжного шлюза (для тестов и боя одинаковый, режим определяется паролем и флагом IsTest)
const ROBOKASSA_URL = 'https://auth.robokassa.ru/Merchant/Index.aspx';

// Функция для создания подписи (SHA256, как требует Robokassa)
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
            // можно добавить Shp_userId если нужно, но это опционально
        });

        const confirmationUrl = `${ROBOKASSA_URL}?${params.toString()}`;

        // Здесь можно сохранить заказ в БД со статусом 'pending'

        res.json({
            confirmationUrl,
            paymentId: invId
        });
    } catch (e) {
        console.error('Robokassa create error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ---------- ВЕБХУК (Robokassa дёргает этот URL после оплаты) ----------
router.post('/result', async (req, res) => {
    console.log('=== ROBOKASSA RESULT ===');
    console.log('Query:', req.query);
    console.log('Body:', req.body);

    try {
        // Параметры могут прийти и в query (GET), и в body (POST) — берём оттуда, где есть
        const OutSum = req.body.OutSum || req.query.OutSum;
        const InvId = req.body.InvId || req.query.InvId;
        const SignatureValue = req.body.SignatureValue || req.query.SignatureValue;

        if (!OutSum || !InvId || !SignatureValue) {
            console.error('Missing parameters');
            return res.status(400).send('Missing parameters');
        }

        // Проверка подписи с Паролем #2
        const expectedSignature = generateSignature(InvId, OutSum, PASSWORD2);
        if (SignatureValue.toLowerCase() !== expectedSignature) {
            console.error('Invalid signature');
            return res.status(400).send('Invalid signature');
        }

        // Извлекаем userId из InvId
        const userId = parseInt(InvId.split('_')[0]);
        if (isNaN(userId)) {
            console.error('Cannot parse userId');
            return res.status(400).send('Bad InvId');
        }

        // Здесь обработайте начисление алмазов/подписки и пометьте заказ как оплаченный
        console.log(`✅ Платёж ${InvId} на сумму ${OutSum} RUB от user ${userId} подтверждён`);

        // Обязательный ответ для Robokassa: OK + InvId
        res.status(200).send(`OK${InvId}`);
    } catch (e) {
        console.error('Webhook error:', e);
        res.status(500).send('Internal error');
    }
});

module.exports = router;
