const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const crypto = require('crypto');

// ID вашего магазина и секретный ключ из .env
const shopId = process.env.YOOKASSA_SHOP_ID;
const secretKey = process.env.YOOKASSA_SECRET_KEY;

// Базовый URL API ЮKassa
const API_BASE = 'https://api.yookassa.ru/v3';

// Функция для выполнения запросов к API с авторизацией
async function yookassaRequest(endpoint, method, body) {
    const url = `${API_BASE}${endpoint}`;
    const auth = Buffer.from(`${shopId}:${secretKey}`).toString('base64');
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`,
            'Idempotence-Key': crypto.randomUUID(),
        },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.description || data.error || 'YooKassa API error');
    }
    return data;
}

// ---------- СОЗДАНИЕ ПЛАТЕЖА ----------
router.post('/create', async (req, res) => {
    try {
        const { userId, amount, description, returnUrl, metadata } = req.body;
        if (!userId || !amount || !description || !returnUrl) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const paymentData = {
            amount: {
                value: amount.toFixed(2),
                currency: 'RUB'
            },
            confirmation: {
                type: 'redirect',
                return_url: returnUrl
            },
            description: description,
            metadata: {
                userId: userId,
                ...metadata
            },
            capture: true
        };

        const payment = await yookassaRequest('/payments', 'POST', paymentData);

        res.json({
            confirmationUrl: payment.confirmation.confirmation_url,
            paymentId: payment.id
        });
    } catch (e) {
        console.error('Payment create error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ---------- WEBHOOK ОТ ЮKASSA ----------
router.post('/confirm', async (req, res) => {
    console.log('=== ЮKASSA WEBHOOK ===');
    console.log('Body:', JSON.stringify(req.body));

    try {
        // TODO: проверка подписи вебхука
        const event = req.body;
        if (event.event !== 'payment.succeeded') {
            return res.status(200).json({ message: 'Ignored' });
        }

        const payment = event.object;
        const userId = payment.metadata?.userId;
        if (!userId) {
            console.error('No userId');
            return res.status(400).json({ error: 'No userId' });
        }

        console.log(`Платёж ${payment.id} на ${payment.amount.value} RUB от user ${userId}`);

        // Здесь позже добавим начисление подписки/алмазов

        res.status(200).json({ result: 'ok' });
    } catch (e) {
        console.error('Webhook error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
