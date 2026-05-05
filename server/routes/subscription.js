```javascript
const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const dailyTasks = require('../utils/dailyTasks');

// Единая функция получения московской даты (синхронизирована со сбросом в scheduler.js)
const getMoscowDate = () => dailyTasks.getMoscowDate();

// Преобразует дату из БД в строку 'YYYY-MM-DD' по московскому времени
function toMoscowDateString(dbDate) {
    if (!dbDate) return null;
    const d = new Date(dbDate);
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

// Вспомогательная функция для ежедневной награды подписки (если подписка активна)
// Пока реализована заглушка – без реальной подписки

// Статус подписки и бонусов
router.get('/status', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        // Пока подписка не реализована – всегда false
        const hasSubscription = false;
        // Проверяем, доступна ли бесплатная монета сегодня (по Москве)
        const today = getMoscowDate();
        const lastFreeMsk = toMoscowDateString(user.last_free_sub_coin);
        const freeCoinAvailable = lastFreeMsk !== today;
        // Бонусы за покупку пакетов – заглушка
        const bonusPacks = {};
        res.json({ hasSubscription, freeCoinAvailable, bonusPacks });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Получение статуса бесплатной монеты (отдельный эндпоинт для бейджей)
router.get('/free-coin-status', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        const today = getMoscowDate();
        const lastMsk = toMoscowDateString(user.last_free_sub_coin);
        const available = lastMsk !== today;
        res.json({ available });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Получение бесплатной монеты
router.post('/claim-free-coin', async (req, res) => {
    console.log('[claim-free-coin] START', req.body);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { user_id } = req.body;
        if (!user_id) throw new Error('user_id required');
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        const today = getMoscowDate();
        const lastMsk = toMoscowDateString(user.last_free_sub_coin);
        if (lastMsk === today) throw new Error('Already claimed today');
        await client.query('UPDATE users SET coins = coins + 20, last_free_sub_coin = $1 WHERE id = $2', [today, user.id]);
        await client.query('COMMIT');
        console.log('[claim-free-coin] SUCCESS');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[claim-free-coin] ERROR:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Покупка подписки (заглушка)
router.post('/buy', async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    // Пока заглушка – подписка не реализована
    res.json({ success: true, message: 'Подписка оформлена (тестовая заглушка)' });
});

module.exports = router;
```
