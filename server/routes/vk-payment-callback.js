const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Секретный ключ для подтверждения уведомлений (из настроек приложения, раздел "Платежи")
const APP_SECRET = process.env.VK_APP_SECRET; // тот же, что и для авторизации, или отдельный? По документации – секретный ключ приложения

// Информация о товарах (itemdefid -> название, цена в голосах, картинка)
const itemsCatalog = {
    1: { title: '50 алмазов', price: 15, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_1.png' },
    2: { title: '150 алмазов', price: 57, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_2.png' },
    3: { title: '350 алмазов', price: 129, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_3.png' },
    4: { title: '700 алмазов', price: 229, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_4.png' },
    5: { title: '1150 алмазов', price: 357, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_5.png' },
    6: { title: '1800 алмазов', price: 572, photo_url: 'https://cat-fight.ru/assets/diamond/buy_diamond_6.png' },
    7: { title: 'VIP Silver подписка', price: 86, photo_url: 'https://cat-fight.ru/assets/icons/vip_silver.png' }
};

// Вспомогательная функция начисления товара
async function grantItem(userId, itemId) {
    const client = await pool.connect();
    try {
        if (itemId >= 1 && itemId <= 6) {
            const diamondsMap = { 1: 50, 2: 150, 3: 350, 4: 700, 5: 1150, 6: 1800 };
            let diamonds = diamondsMap[itemId];
            // Бонус 50% при первой покупке пакета
            const bonusCheck = await client.query('SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2', [userId, itemId]);
            if (bonusCheck.rowCount === 0) {
                diamonds = Math.floor(diamonds * 1.5);
                await client.query('INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)', [userId, itemId]);
            }
            await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [diamonds, userId]);
        } else if (itemId === 7) {
            // Подписка на 30 дней
            const expiry = new Date();
            expiry.setDate(expiry.getDate() + 30);
            await client.query('UPDATE users SET subscription_expiry = $1, subscription_expiry_notified = FALSE WHERE id = $2', [expiry, userId]);
            // Награда при оформлении
            await client.query('UPDATE users SET coins = coins + 1500, coal = coal + 50, diamonds = diamonds + 100 WHERE id = $1', [userId]);
        } else {
            throw new Error('Unknown itemId');
        }
    } finally {
        client.release();
    }
}

router.post('/', async (req, res) => {
    console.log('[Payment Callback] Received:', JSON.stringify(req.body));
    const { notification_type, order_id, item_id, user_id, status, ...rest } = req.body;
    
    // Уведомление get_item – запрос информации о товаре
    if (notification_type === 'get_item') {
        const item = itemsCatalog[item_id];
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }
        return res.json({
            response: {
                item_id: String(item_id),
                title: item.title,
                price: item.price,
                photo_url: item.photo_url
            }
        });
    }
    
    // Уведомление order_status_change – изменение статуса заказа
    if (notification_type === 'order_status_change') {
        if (status === 'chargeable') {
            // Платёж успешен – начисляем товар
            const client = await pool.connect();
            try {
                // Проверяем, не обработан ли уже этот order_id
                const existing = await client.query('SELECT 1 FROM vk_payments WHERE order_id = $1', [order_id]);
                if (existing.rowCount === 0) {
                    // Находим внутреннего пользователя по vk_user_id
                    const userRes = await client.query('SELECT id FROM users WHERE vk_id = $1', [String(user_id)]);
                    if (userRes.rowCount === 0) {
                        console.error(`User with vk_id ${user_id} not found`);
                        return res.status(400).json({ error: 'User not found' });
                    }
                    const userId = userRes.rows[0].id;
                    await grantItem(userId, item_id);
                    await client.query(
                        'INSERT INTO vk_payments (order_id, user_id, item_id, amount) VALUES ($1, $2, $3, $4)',
                        [order_id, userId, item_id, itemsCatalog[item_id]?.price || 0]
                    );
                    console.log(`[Payment] Granted item ${item_id} to user ${userId} (vk_id ${user_id})`);
                } else {
                    console.log(`[Payment] Duplicate order_id ${order_id}, skipping`);
                }
                res.json({ response: { status: 'ok' } });
            } catch (err) {
                console.error('[Payment] Error processing order:', err);
                res.status(500).json({ error: 'Internal error' });
            } finally {
                client.release();
            }
        } else if (status === 'refunded') {
            // Возврат – можно залогировать, но товар не отнимаем (по желанию)
            console.log(`[Payment] Order ${order_id} refunded`);
            res.json({ response: { status: 'ok' } });
        } else {
            // Другие статусы (pending и т.д.) – просто ок
            res.json({ response: { status: 'ok' } });
        }
        return;
    }
    
    // Неизвестный тип уведомления
    res.status(400).json({ error: 'Unknown notification_type' });
});

module.exports = router;
