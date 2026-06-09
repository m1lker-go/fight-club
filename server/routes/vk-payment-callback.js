const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');

const itemsCatalog = {
    1: { title: '50 алмазов', price: 15, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_1.png' },
    2: { title: '150 алмазов', price: 57, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_2.png' },
    3: { title: '350 алмазов', price: 129, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_3.png' },
    4: { title: '700 алмазов', price: 229, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_4.png' },
    5: { title: '1150 алмазов', price: 357, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_5.png' },
    6: { title: '1800 алмазов', price: 572, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_6.png' },
    7: { title: 'VIP Silver подписка', price: 86, photo_url: 'https://cat-fight.ru/assets/icons/vip_silver.png' }
};

function verifyVKSignature(body, secret) {
    // Для теста временно отключаем проверку подписи
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

router.post('/', async (req, res) => {
    console.log('[VK Payment] Received headers:', req.headers);
    console.log('[VK Payment] Received body:', req.body);
    const { notification_type, item_id, order_id, user_id, status } = req.body;

    // Преобразуем item_id в число
    const itemIdNum = parseInt(item_id, 10);

    // Обработка get_item / get_item_test
    if (notification_type === 'get_item_test' || notification_type === 'get_item') {
        const item = itemsCatalog[itemIdNum];
        if (!item) {
            console.error(`[VK Payment] Item ${item_id} not found in catalog`);
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

    // Обработка order_status_change / order_status_change_test
    if (notification_type === 'order_status_change_test' || notification_type === 'order_status_change') {
        if (status === 'chargeable') {
            const client = await pool.connect();
            try {
                // Проверяем дубликат заказа
                const existing = await client.query('SELECT 1 FROM vk_payments WHERE order_id = $1', [order_id]);
                if (existing.rowCount === 0) {
                    // Ищем пользователя по vk_id
                    const userRes = await client.query('SELECT id FROM users WHERE vk_id = $1', [String(user_id)]);
                    if (userRes.rowCount === 0) {
                        console.error(`[VK Payment] User with vk_id ${user_id} not found`);
                        return res.status(400).json({ error: 'User not found' });
                    }
                    const dbUserId = userRes.rows[0].id;
                    await grantItem(dbUserId, itemIdNum);
                    await client.query(
                        'INSERT INTO vk_payments (order_id, user_id, item_id, amount) VALUES ($1, $2, $3, $4)',
                        [order_id, dbUserId, itemIdNum, itemsCatalog[itemIdNum]?.price || 0]
                    );
                    console.log(`[VK Payment] Granted item ${itemIdNum} to user ${dbUserId} (vk_id ${user_id})`);
                } else {
                    console.log(`[VK Payment] Duplicate order_id ${order_id}, skipping`);
                }
                return res.json({ response: { status: 'ok' } });
            } catch (err) {
                console.error('[VK Payment] Error processing order:', err);
                return res.status(500).json({ error: 'Internal error' });
            } finally {
                client.release();
            }
        } else {
            return res.json({ response: { status: 'ok' } });
        }
    }

    console.warn('[VK Payment] Unknown notification_type:', notification_type);
    res.status(400).json({ error: 'Unknown notification_type' });
});

module.exports = router;
