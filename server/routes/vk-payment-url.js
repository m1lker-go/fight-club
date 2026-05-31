// server/routes/vk-payment-url.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');

const GMR_ID = 48198;
const VK_API_SECRET = process.env.VK_API_SECRET; // I3BEj6UXESVawEQR

router.post('/payment-url', async (req, res) => {
    try {
        const { item_id, amount, description } = req.body;
        const user = req.user; // предполагается, что у вас есть middleware аутентификации, которая кладёт user в req
        if (!user || !user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Получаем VK user_id из вашей таблицы user_connections
        const { pool } = require('../db');
        const vkRes = await pool.query(
            'SELECT provider_id FROM user_connections WHERE user_id = $1 AND provider = $2',
            [user.id, 'vk']
        );
        let vkUserId = user.id;
        if (vkRes.rowCount > 0) {
            vkUserId = vkRes.rows[0].provider_id;
        } else {
            // Если пользователь залогинен не через VK, но пытается купить в VK Mini App – ошибка
            return res.status(400).json({ error: 'VK user not linked' });
        }

        const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Формируем merchant_param (обязательные поля)
        const merchantParam = {
            uid: String(vkUserId),      // id пользователя VK
            ip: userIp,
            amount: amount,             // цена в голосах (число)
            currency: 'RUB',            // для RU-региона – рубли
            description: description.slice(0, 50),
            item_id: String(item_id),
            additional_param: `order_${Date.now()}_${user.id}`
        };

        // Для метода billing/item/client нужно передать ids (строка с id товара)
        const ids = String(item_id);
        const merchantParamJson = JSON.stringify(merchantParam);
        
        // Строка для подписи: "ids=...&merchant_param={...}" (без URL-кодирования)
        const signString = `ids=${ids}&merchant_param=${merchantParamJson}`;
        const sign = crypto.createHash('md5').update(signString + VK_API_SECRET).digest('hex');

        const url = `https://vkplay.ru/app/${GMR_ID}/billing/item/client?sign=${sign}`;
        
        // Тело запроса в формате x-www-form-urlencoded
        const body = new URLSearchParams();
        body.append('ids', ids);
        body.append('merchant_param', merchantParamJson);

        const response = await axios.post(url, body.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        if (response.data && response.data.status === 'ok') {
            return res.json({ paymentUrl: response.data.url });
        } else {
            console.error('VK billing error:', response.data);
            return res.status(400).json({ error: response.data.errmsg || 'VK payment error' });
        }
    } catch (err) {
        console.error('[vk-payment-url]', err.response?.data || err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
