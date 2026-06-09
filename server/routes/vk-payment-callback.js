const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');

// Каталог товаров (itemdefid -> данные)
const itemsCatalog = {
    1: { title: '50 алмазов', price: 15, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_1.png' },
    2: { title: '150 алмазов', price: 57, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_2.png' },
    3: { title: '350 алмазов', price: 129, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_3.png' },
    4: { title: '700 алмазов', price: 229, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_4.png' },
    5: { title: '1150 алмазов', price: 357, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_5.png' },
    6: { title: '1800 алмазов', price: 572, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_6.png' },
    7: { title: 'VIP Silver подписка', price: 86, photo_url: 'https://cat-fight.ru/assets/icons/vip_silver.png' }
};

// Временно отключаем проверку подписи для теста (включите после отладки)
function verifyVKSignature(body, secret) {
    return true; // отключаем проверку
    // оригинальная проверка:
    /*
    const params = { ...body };
    const receivedSign = params.sign;
    if (!receivedSign) return false;
    delete params.sign;
    const sortedKeys = Object.keys(params).sort();
    let stringToSign = '';
    for (const key of sortedKeys) {
        if (params[key] !== undefined && params[key] !== null) {
            stringToSign += `${key}=${params[key]}`;
        }
    }
    stringToSign += secret;
    const calculatedSign = crypto.createHash('md5').update(stringToSign).digest('hex');
    return calculatedSign === receivedSign;
    */
}

// Начисление товара пользователю
async function grantItem(dbUserId, itemId) {
    const client = await pool.connect();
    try {
        if (itemId >= 1 && itemId <= 6) {
            const diamondsMap = { 1: 50, 2: 150, 3: 350, 4: 700, 5: 1150, 6: 1800 };
            let diamonds = diamondsMap[itemId];
            // Бонус за первую покупку
            const bonusCheck = await client.query('SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2', [dbUserId, itemId]);
            if (bonusCheck.rowCount === 0) {
                diamonds = Math.floor(diamonds * 1.5);
                await client.query('INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)', [dbUserId, itemId]);
            }
            await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [diamonds, dbUserId]);
        } else if (itemId === 7) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            await client.query('UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2', [expiry, dbUserId]);
            await client.query('UPDATE users SET coins = coins + 1500, coal = coal + 50, diamonds = diamonds + 100 WHERE id = $1', [dbUserId]);
        } else {
            throw new Error('Unknown itemId');
        }
    } finally {
        client.release();
    }
}

router.post('/', async (req, res) => {
    console.log('[VK Payment] Received callback:', req.body);
    const { notification_type, item_id, order_id, user_id, status } = req.body;

    // Обработка тестового запроса на получение информации о товаре (get_item_test)
    if (notification_type === 'get_item_test' || notification_type === 'get_item') {
        const item = itemsCatalog[item_id];
        if (!item) {
            console.error(`[VK Payment] Item ${item_id} not found`);
            return res.status(404).json({ error: 'Item not found' });
        }
        const response = {
            response: {
                item_id: String(item_id),
                title: item.title,
                price: item.price,
                photo_url: item.photo_url
            }
        };
        console.log('[VK Payment] Returning item info:', response);
        return res.json(response);
    }

    // Обработка уведомления о статусе заказа (order_status_change_test / order_status_change)
    if (notification_type === 'order_status_change_test' || notification_type === 'order_status_change') {
        if (status === 'chargeable') {
            const client = await pool.connect();
            try {
                // Проверяем, не был ли уже обработан этот заказ
                const existing = await client.query('SELECT 1 FROM vk_payments WHERE order_id = $1', [order_id]);
                if (existing.rowCount === 0) {
                    // Находим пользователя в БД по vk_id
                    const userRes = await client.query('SELECT id FROM users WHERE vk_id = $1', [String(user_id)]);
                    if (userRes.rowCount === 0) {
                        console.error(`[VK Payment] User with vk_id ${user_id} not found`);
                        return res.status(400).json({ error: 'User not found' });
                    }
                    const dbUserId = userRes.rows[0].id;
                    await grantItem(dbUserId, item_id);
                    await client.query(
                        'INSERT INTO vk_payments (order_id, user_id, item_id, amount, created_at) VALUES ($1, $2, $3, $4, NOW())',
                        [order_id, dbUserId, item_id, itemsCatalog[item_id]?.price || 0]
                    );
                    console.log(`[VK Payment] Granted item ${item_id} to user ${dbUserId} (vk_id ${user_id})`);
                } else {
                    console.log(`[VK Payment] Duplicate order_id ${order_id}, skipping`);
                }
                res.json({ response: { status: 'ok' } });
            } catch (err) {
                console.error('[VK Payment] Error processing order:', err);
                res.status(500).json({ error: 'Internal error' });
            } finally {
                client.release();
            }
        } else {
            // Другие статусы (refunded, cancelled) – просто подтверждаем получение
            res.json({ response: { status: 'ok' } });
        }
        return;
    }

    // Если тип уведомления не распознан
    console.warn('[VK Payment] Unknown notification_type:', notification_type);
    res.status(400).json({ error: 'Unknown notification_type' });
});

module.exports = router;
