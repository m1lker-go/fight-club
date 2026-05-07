const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

require('dotenv').config(); // добавляем для надёжности

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

router.post('/create-robokassa', async (req, res) => {
    try {
        const { userId, amount, description, metadata } = req.body;
        if (!userId || !amount || !description) {
            return res.status(400).json({ error: 'Missing userId, amount or description' });
        }

        const invId = `${userId}_${Date.now()}`;
        const shpParams = {
            Shp_userId: userId.toString(),
            ...(metadata?.packId && { Shp_packId: metadata.packId.toString() }),
            ...(metadata?.diamonds && { Shp_diamonds: metadata.diamonds.toString() }),
            ...(metadata?.bonus && { Shp_bonus: metadata.bonus.toString() })
        };

        const currentPassword1 = isTestMode ? testPassword1 : password1;
        if (!currentPassword1) {
            throw new Error('Password #1 not configured for current mode');
        }

        const signature = buildSignature(amount.toFixed(2), invId, currentPassword1, shpParams);
        let paymentUrl = `https://auth.robokassa.ru/Merchant/Index.aspx?MerchantLogin=${merchantLogin}&OutSum=${amount.toFixed(2)}&InvId=${invId}&Description=${encodeURIComponent(description)}&SignatureValue=${signature}&Culture=ru&Encoding=utf-8`;

        for (const [key, value] of Object.entries(shpParams)) {
            paymentUrl += `&${key}=${encodeURIComponent(value)}`;
        }
        if (isTestMode) {
            paymentUrl += '&IsTest=1';
        }

        res.json({ paymentUrl, invId });
    } catch (e) {
        console.error('Robokassa create payment error:', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
