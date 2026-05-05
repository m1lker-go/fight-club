const express = require('express');
const router = express.Router();
const { YooCheckout } = require('yookassa');
const { pool, getUserByIdentifier } = require('../db');
const crypto = require('crypto');

const checkout = new YooCheckout({
    shopId: process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
});

// Функция генерации уникального ключа идемпотентности (совместима с Node 14+)
function generateIdempotenceKey() {
    return crypto.randomUUID();
}

router.post('/create', async (req, res) => {
    try {
        const { userId, amount, description, returnUrl, metadata } = req.body;
        if (!userId || !amount || !description || !returnUrl) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const idempotenceKey = generateIdempotenceKey();
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

        const payment = await checkout.createPayment(paymentData, idempotenceKey);

        res.json({
            confirmationUrl: payment.confirmation.confirmation_url,
            paymentId: payment.id
        });
    } catch (e) {
        console.error('Payment create error:', e);
        res.status(500).json({ error: e.message });
    }
});

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
