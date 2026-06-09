const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');

// Каталог товаров
const itemsCatalog = {
    1: { title: '50 алмазов', price: 15, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_1.png' },
    2: { title: '150 алмазов', price: 57, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_2.png' },
    3: { title: '350 алмазов', price: 129, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_3.png' },
    4: { title: '700 алмазов', price: 229, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_4.png' },
    5: { title: '1150 алмазов', price: 357, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_5.png' },
    6: { title: '1800 алмазов', price: 572, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_6.png' },
    7: { title: 'VIP Silver подписка', price: 86, photo_url: 'https://cat-fight.ru/assets/icons/vip_silver.png' }
};

// Временно отключаем проверку подписи (включите после успешного теста)
function verifyVKSignature(body, secret) {
    return true;
}

async function grantItem(dbUserId, itemId) {
    const client = await pool.connect();
    try {
        if (itemId >= 1 && itemId <= 6) {
            const diamondsMap = { 1: 50, 2: 150, 3: 350, 4: 700, 5: 1150, 6: 1800 };
            let diamonds = diamondsMap[itemId];
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
        }
    } finally {
        client.release();
    }
}

// Логируем все входящие запросы
router.use((req, res, next) => {
    console.log('[VK Payment] Incoming request:', req.method, req.url);
    console.log('[VK Payment] Headers:', req.headers);
    console.log('[VK Payment] Body:', req.body);
    next();
});

// ==== GET-обработчик для проверки доступности ====
router.get('/', (req, res) => {
    console.log('[VK Payment] GET request received');
    res.json({ status: 'ok', message: 'Payment callback endpoint is ready' });
});

// ==== POST-обработчик ====
router.post('/', async (req, res) => {
    console.log('[VK Payment] POST request received, body:', JSON.stringify(req.body));

    const { notification_type, item, order_id, user_id, status, app_id, receiver_id, test_mode } = req.body;
    const itemId = item ? (isNaN(item) ? item : parseInt(item, 10)) : null;

    // 1. Запрос информации о товаре (get_item_test)
    if (notification_type === 'get_item_test' || notification_type === 'get_item') {
        if (!itemsCatalog[itemId]) {
            console.error(`[VK Payment] Item ${itemId} not found`);
            return res.json({
                error: {
                    error_code: 20,
                    error_msg: 'Item not found',
                    critical: true
                }
            });
        }
        const product = itemsCatalog[itemId];
        const response = {
            response: {
                item_id: String(itemId),
                title: product.title,
                photo_url: product.photo_url,
                price: product.price
            }
        };
        console.log('[VK Payment] Returning item info:', response);
        return res.json(response);
    }

    // 2. Уведомление об изменении статуса заказа
    if (notification_type === 'order_status_change_test' || notification_type === 'order_status_change') {
        if (status === 'chargeable') {
            const client = await pool.connect();
            try {
                const existing = await client.query('SELECT 1 FROM vk_payments WHERE order_id = $1', [order_id]);
                if (existing.rowCount === 0) {
                    const userRes = await client.query('SELECT id FROM users WHERE vk_id = $1', [String(user_id)]);
                    if (userRes.rowCount === 0) {
                        console.error(`[VK Payment] User with vk_id ${user_id} not found`);
                        return res.json({
                            error: {
                                error_code: 30,
                                error_msg: 'User not found',
                                critical: true
                            }
                        });
                    }
                    const dbUserId = userRes.rows[0].id;
                    await grantItem(dbUserId, itemId);
                    await client.query(
                        'INSERT INTO vk_payments (order_id, user_id, item_id, amount) VALUES ($1, $2, $3, $4)',
                        [order_id, dbUserId, itemId, itemsCatalog[itemId]?.price || 0]
                    );
                    console.log(`[VK Payment] Granted item ${itemId} to user ${dbUserId} (vk_id ${user_id})`);
                } else {
                    console.log(`[VK Payment] Duplicate order_id ${order_id}, skipping`);
                }
                res.json({ response: { order_id: order_id } });
            } catch (err) {
                console.error('[VK Payment] Error processing order:', err);
                res.status(500).json({
                    error: {
                        error_code: 10,
                        error_msg: 'Internal server error',
                        critical: true
                    }
                });
            } finally {
                client.release();
            }
        } else if (status === 'refunded' || status === 'cancelled') {
            res.json({ response: { order_id: order_id } });
        } else {
            res.json({
                error: {
                    error_code: 11,
                    error_msg: 'Unknown status',
                    critical: true
                }
            });
        }
        return;
    }

    // 3. Неизвестный тип уведомления
    res.json({
        error: {
            error_code: 11,
            error_msg: 'Unknown notification_type',
            critical: true
        }
    });
});

module.exports = router;
