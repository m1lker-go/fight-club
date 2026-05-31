const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');

router.post('/vk-callback', async (req, res) => {
    const secret = process.env.VK_PAY_SECRET;
    if (!secret) {
        console.error('VK_PAY_SECRET not set');
        return res.status(500).send('Internal error');
    }

    const { sig, ...data } = req.body;
    const sortedKeys = Object.keys(data).sort();
    let signatureString = '';
    for (const key of sortedKeys) {
        signatureString += `${key}=${data[key]}`;
    }
    const mySig = crypto.createHmac('sha256', secret).update(signatureString).digest('hex');
    if (mySig !== sig) {
        console.error('Invalid VK Pay signature');
        return res.status(403).send('Invalid signature');
    }

    if (data.status !== 'success') {
        return res.send('OK');
    }

    const vkUserId = data.user_id;
    const itemdefid = parseInt(data.item, 10);
    const transactionId = data.transaction_id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Проверка повтора
        const already = await client.query('SELECT 1 FROM vk_payments WHERE transaction_id = $1', [transactionId]);
        if (already.rowCount > 0) {
            await client.query('COMMIT');
            return res.send('OK');
        }

        // Найти внутреннего пользователя по vk_user_id (через таблицу user_connections)
        const userRes = await client.query(
            'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
            ['vk', String(vkUserId)]
        );
        if (userRes.rowCount === 0) {
            console.error(`No user for vk_id ${vkUserId}`);
            await client.query('ROLLBACK');
            return res.status(400).send('User not found');
        }
        const userId = userRes.rows[0].user_id;

        // Начисление по itemdefid
        if (itemdefid >= 1 && itemdefid <= 6) {
            const diamondsMap = {1:50,2:150,3:350,4:700,5:1150,6:1800};
            let diamonds = diamondsMap[itemdefid];
            // Бонус 50% при первой покупке пакета
            const bonusCheck = await client.query('SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2', [userId, itemdefid]);
            if (bonusCheck.rowCount === 0) {
                diamonds = Math.floor(diamonds * 1.5);
                await client.query('INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)', [userId, itemdefid]);
            }
            await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [diamonds, userId]);
        } else if (itemdefid === 7) {
            // Подписка на 30 дней
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            await client.query('UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2', [expiry, userId]);
            // Награда при оформлении
            await client.query('UPDATE users SET coins = coins + 1500, coal = coal + 50, diamonds = diamonds + 100 WHERE id = $1', [userId]);
        } else {
            console.error(`Unknown itemdefid ${itemdefid}`);
            await client.query('ROLLBACK');
            return res.status(400).send('Unknown item');
        }

        await client.query('INSERT INTO vk_payments (transaction_id, user_id, itemdefid) VALUES ($1, $2, $3)', [transactionId, userId, itemdefid]);
        await client.query('COMMIT');
        res.send('OK');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).send('Error');
    } finally {
        client.release();
    }
});

module.exports = router;
