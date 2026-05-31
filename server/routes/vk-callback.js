// server/routes/vk-callback.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');

const VK_API_SECRET = process.env.VK_API_SECRET; 

router.get('/vk-callback', async (req, res) => {
    try {
        // Получаем все параметры из GET-запроса
        const { uid, sum, tid, merchant_param, sign } = req.query;
        
        if (!uid || !sum || !tid || !merchant_param || !sign) {
            console.error('Missing parameters', req.query);
            return res.status(400).json({ status: 'error', errcode: 1002, errmsg: 'Missing parameters' });
        }

        // 1. Проверка подписи (MD5)
        const sortedParams = { uid, sum, tid, merchant_param };
        const sortedKeys = Object.keys(sortedParams).sort();
        let signatureString = '';
        for (const key of sortedKeys) {
            signatureString += `${key}=${sortedParams[key]}`;
        }
        const calculatedSign = crypto.createHash('md5').update(signatureString + VK_API_SECRET).digest('hex');
        
        if (calculatedSign !== sign) {
            console.error(`Invalid signature: expected ${calculatedSign}, got ${sign}`);
            return res.status(403).json({ status: 'error', errcode: 5001, errmsg: 'Invalid signature' });
        }

        // 2. Разбираем merchant_param (JSON)
        let merchant;
        try {
            merchant = JSON.parse(merchant_param);
        } catch (e) {
            console.error('Failed to parse merchant_param', merchant_param);
            return res.status(400).json({ status: 'error', errcode: 1002, errmsg: 'Invalid merchant_param' });
        }

        const itemId = parseInt(merchant.item_id, 10);
        const vkUserId = uid; // VK user id
        const transactionId = tid;

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Проверка дубликата транзакции
            const already = await client.query('SELECT 1 FROM vk_payments WHERE transaction_id = $1', [transactionId]);
            if (already.rowCount > 0) {
                await client.query('COMMIT');
                return res.json({ status: 'ok' });
            }

            // Найти внутреннего пользователя по vkUserId
            const userRes = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['vk', String(vkUserId)]
            );
            if (userRes.rowCount === 0) {
                console.error(`User not found for vk_id ${vkUserId}`);
                await client.query('ROLLBACK');
                return res.status(400).json({ status: 'error', errcode: 1002, errmsg: 'User not found' });
            }
            const userId = userRes.rows[0].user_id;

            // Начисление по itemdefid (1-6 – алмазы, 7 – подписка)
            if (itemId >= 1 && itemId <= 6) {
                const diamondsMap = { 1: 50, 2: 150, 3: 350, 4: 700, 5: 1150, 6: 1800 };
                let diamonds = diamondsMap[itemId];
                
                // Бонус 50% при первой покупке пакета
                const bonusCheck = await client.query(
                    'SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2',
                    [userId, itemId]
                );
                if (bonusCheck.rowCount === 0) {
                    diamonds = Math.floor(diamonds * 1.5);
                    await client.query(
                        'INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)',
                        [userId, itemId]
                    );
                }
                await client.query(
                    'UPDATE users SET diamonds = diamonds + $1 WHERE id = $2',
                    [diamonds, userId]
                );
            } else if (itemId === 7) {
                // Подписка на 30 дней
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + 30);
                await client.query(
                    'UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2',
                    [expiry, userId]
                );
                // Награда при оформлении
                await client.query(
                    'UPDATE users SET coins = coins + 1500, coal = coal + 50, diamonds = diamonds + 100 WHERE id = $1',
                    [userId]
                );
            } else {
                console.error(`Unknown itemdefid ${itemId}`);
                await client.query('ROLLBACK');
                return res.status(400).json({ status: 'error', errcode: 1002, errmsg: 'Unknown item' });
            }

            // Сохраняем транзакцию
            await client.query(
                'INSERT INTO vk_payments (transaction_id, user_id, itemdefid) VALUES ($1, $2, $3)',
                [transactionId, userId, itemId]
            );
            await client.query('COMMIT');
            res.json({ status: 'ok' });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('[vk-callback]', err);
        res.status(500).json({ status: 'error', errcode: 5000, errmsg: 'Internal error' });
    }
});

module.exports = router;
