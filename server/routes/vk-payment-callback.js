const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../db');

// Секретный ключ из настроек VK Mini App
const VK_APP_SECRET = process.env.VK_APP_SECRET;
const VK_PAY_SECRET = process.env.VK_PAY_SECRET; // может не понадобиться

// Информация о товарах
const itemsCatalog = {
    1: { title: '50 алмазов', price: 15, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_1.png' },
    2: { title: '150 алмазов', price: 57, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_2.png' },
    3: { title: '350 алмазов', price: 129, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_3.png' },
    4: { title: '700 алмазов', price: 229, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_4.png' },
    5: { title: '1150 алмазов', price: 357, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_5.png' },
    6: { title: '1800 алмазов', price: 572, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_6.png' },
    7: { title: 'VIP Silver подписка', price: 86, photo_url: 'https://cat-fight.ru/assets/icons/vip_silver.png' }
};

// Проверка подписи VK (MD5, как в документации)
function verifyVKSignature(body, secret) {
    const params = { ...body };
    const receivedSign = params.sign;
    if (!receivedSign) return false;
    delete params.sign;
    
    const sortedKeys = Object.keys(params).sort();
    let signString = '';
    for (const key of sortedKeys) {
        const value = params[key];
        if (value !== undefined && value !== null && value !== '') {
            signString += `${key}=${value}`;
        }
    }
    signString += secret;
    const calculatedSign = crypto.createHash('md5').update(signString).digest('hex');
    console.log('[VK Payment] Calculated sign:', calculatedSign);
    console.log('[VK Payment] Received sign:', receivedSign);
    return calculatedSign === receivedSign;
}

// Начисление товара пользователю
async function grantItem(userId, itemId) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (itemId >= 1 && itemId <= 6) {
            const diamondsMap = { 1: 50, 2: 150, 3: 350, 4: 700, 5: 1150, 6: 1800 };
            let diamonds = diamondsMap[itemId];
            // Проверка бонуса за первую покупку
            const bonusCheck = await client.query('SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2', [userId, itemId]);
            if (bonusCheck.rowCount === 0) {
                diamonds = Math.floor(diamonds * 1.5);
                await client.query('INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)', [userId, itemId]);
            }
            await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [diamonds, userId]);
        } else if (itemId === 7) {
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            await client.query('UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2', [expiry, userId]);
            await client.query('UPDATE users SET coins = coins + 1500, coal = coal + 50, diamonds = diamonds + 100 WHERE id = $1', [userId]);
        } else {
            throw new Error('Unknown itemId');
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

router.post('/', async (req, res) => {
    console.log('[VK Payment Callback] Received body:', JSON.stringify(req.body));
    
    const params = req.body;
    const { notification_type, order_id, item_id, user_id, status } = params;
    
    // Проверяем подпись (если передан секрет)
    if (VK_APP_SECRET && !verifyVKSignature(params, VK_APP_SECRET)) {
        console.error('[VK Payment] Invalid signature');
        return res.status(403).json({ error: 'Invalid signature' });
    }
    
    // Обработка запроса информации о товаре (тестовый и боевой)
    if (notification_type === 'get_item' || notification_type === 'get_item_test') {
        const item = itemsCatalog[item_id];
        if (!item) {
            console.log('[VK Payment] Item not found:', item_id);
            return res.status(404).json({ error: 'Item not found' });
        }
        console.log('[VK Payment] Returning item info:', item);
        return res.json({
            response: {
                item_id: String(item_id),
                title: item.title,
                price: item.price,
                photo_url: item.photo_url
            }
        });
    }
    
    // Обработка изменения статуса заказа
    if (notification_type === 'order_status_change' || notification_type === 'order_status_change_test') {
        if (status === 'chargeable') {
            const client = await pool.connect();
            try {
                // Проверяем, не обработан ли уже заказ
                const existing = await client.query('SELECT 1 FROM vk_payments WHERE order_id = $1', [order_id]);
                if (existing.rowCount > 0) {
                    console.log(`[VK Payment] Order ${order_id} already processed, skipping`);
                    return res.json({ response: { status: 'ok' } });
                }
                
                // Ищем пользователя по vk_id
                const userRes = await client.query('SELECT id FROM users WHERE vk_id = $1', [String(user_id)]);
                if (userRes.rowCount === 0) {
                    console.error(`[VK Payment] User with vk_id ${user_id} not found`);
                    return res.status(400).json({ error: 'User not found' });
                }
                const dbUserId = userRes.rows[0].id;
                
                // Начисляем товар
                await grantItem(dbUserId, item_id);
                
                // Сохраняем информацию о платеже
                await client.query(
                    'INSERT INTO vk_payments (order_id, user_id, item_id, amount) VALUES ($1, $2, $3, $4)',
                    [order_id, dbUserId, item_id, itemsCatalog[item_id]?.price || 0]
                );
                console.log(`[VK Payment] Granted item ${item_id} to user ${dbUserId} (vk_id ${user_id})`);
                res.json({ response: { status: 'ok' } });
            } catch (err) {
                console.error('[VK Payment] Error processing order:', err);
                res.status(500).json({ error: 'Internal error' });
            } finally {
                client.release();
            }
        } else {
            // Другие статусы (refunded и т.п.) – просто подтверждаем
            console.log(`[VK Payment] Order ${order_id} status: ${status}`);
            res.json({ response: { status: 'ok' } });
        }
        return;
    }
    
    // Неизвестный тип уведомления
    console.log('[VK Payment] Unknown notification_type:', notification_type);
    res.status(400).json({ error: 'Unknown notification_type' });
});

module.exports = router;
