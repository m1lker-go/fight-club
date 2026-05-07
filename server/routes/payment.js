const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

const merchantLogin = process.env.MERCHANT_LOGIN;
const password1 = process.env.PASSWORD_1;
const password2 = process.env.PASSWORD_2;
const testPassword1 = process.env.TEST_PASSWORD_1;
const testPassword2 = process.env.TEST_PASSWORD_2;
const isTestMode = process.env.IS_TEST_MODE === 'true';   // ✅ исправлено

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

router.post('/callback', async (req, res) => {
    console.log('=== ROBOKASSA CALLBACK (diamonds) ===');
    try {
        const { OutSum, InvId, SignatureValue, ...shpParams } = req.body;
        if (!OutSum || !InvId || !SignatureValue) {
            console.error('Missing required fields');
            return res.status(400).send('ERROR');
        }

        const userId = shpParams.Shp_userId;
        if (!userId) {
            console.error('No Shp_userId in callback');
            return res.status(400).send('ERROR');
        }

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

        console.log(`Payment confirmed: InvId=${InvId}, OutSum=${OutSum}, userId=${userId}`);

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
                    console.log(`Bonus applied: user ${userId}, pack ${packId}, total diamonds ${diamondsToAdd}`);
                }
            } catch (dbErr) {
                console.error('DB error while checking bonus:', dbErr);
            } finally {
                client.release();
            }
        }

        if (diamondsToAdd === 0) {
            console.warn(`No diamonds to add for userId ${userId}`);
            return res.send(`OK${InvId}`);
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const user = await getUserByIdentifier(client, null, userId);
            if (!user) throw new Error('User not found');
            await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [diamondsToAdd, user.id]);
            await client.query('COMMIT');
            console.log(`Added ${diamondsToAdd} diamonds to user ${userId}`);
        } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error('Failed to add diamonds:', dbErr);
            return res.status(500).send('ERROR');
        } finally {
            client.release();
        }

        res.send(`OK${InvId}`);
    } catch (e) {
        console.error('Callback processing error:', e);
        res.status(500).send('ERROR');
    }
});

module.exports = router;
