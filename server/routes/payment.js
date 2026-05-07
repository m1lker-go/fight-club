const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool, getUserByIdentifier } = require('../db');

// Загружаем переменные окружения
const merchantLogin = process.env.MERCHANT_LOGIN;
const password1 = process.env.PASSWORD_1;
const password2 = process.env.PASSWORD_2;

// Тестовые пароли (если нужны, но мы будем использовать флаг isTest)
const testPassword1 = process.env.TEST_PASSWORD_1;
const testPassword2 = process.env.TEST_PASSWORD_2;

// Режим тестирования: true — используем тестовые пароли и шлюз, false — боевые
const isTestMode = process.env.IS_TEST_MODE === 'true' || true; // пока true для отладки

// Базовый URL Robokassa в зависимости от режима
const ROBOKASSA_URL = isTestMode
    ? 'https://auth.robokassa.ru/Merchant/Index.aspx'
    : 'https://auth.robokassa.ru/Merchant/Index.aspx';

// Функция генерации подписи (MD5)
function buildSignature(outSum, invId, password, shpParams = {}) {
    let signatureString = `${outSum}:${invId}:${password}`;
    // Добавляем все Shp-параметры в алфавитном порядке
    const sortedKeys = Object.keys(shpParams).sort();
    for (const key of sortedKeys) {
        signatureString += `:${key}=${shpParams[key]}`;
    }
    return crypto.createHash('md5').update(signatureString).digest('hex').toUpperCase();
}

// ---------- 1. СОЗДАНИЕ ПЛАТЕЖА (возвращает ссылку для оплаты) ----------
router.post('/create-robokassa', async (req, res) => {
    try {
        const { userId, amount, description, returnUrl, metadata } = req.body;
        if (!userId || !amount || !description) {
            return res.status(400).json({ error: 'Missing userId, amount or description' });
        }

        // Уникальный номер заказа (InvId) - используем userId + timestamp
        const invId = `${userId}_${Date.now()}`;

        // Параметры, которые будут переданы в Robokassa
        const shpParams = {
            Shp_userId: userId.toString(),
            ...(metadata?.packId && { Shp_packId: metadata.packId.toString() }),
            ...(metadata?.diamonds && { Shp_diamonds: metadata.diamonds.toString() }),
            ...(metadata?.bonus && { Shp_bonus: metadata.bonus.toString() })
        };

        // Выбираем пароль для подписи (тестовый или основной)
        const currentPassword1 = isTestMode ? testPassword1 : password1;
        if (!currentPassword1) {
            throw new Error('Password #1 not configured for current mode');
        }

        // Генерируем подпись
        const signature = buildSignature(amount.toFixed(2), invId, currentPassword1, shpParams);

        // Формируем URL для перенаправления игрока
        const paymentUrl = `${ROBOKASSA_URL}?MerchantLogin=${merchantLogin}&OutSum=${amount.toFixed(2)}&InvId=${invId}&Description=${encodeURIComponent(description)}&SignatureValue=${signature}&Culture=ru&Encoding=utf-8`;

        // Добавляем Shp-параметры в URL
        let fullUrl = paymentUrl;
        for (const [key, value] of Object.entries(shpParams)) {
            fullUrl += `&${key}=${encodeURIComponent(value)}`;
        }

        // Если тестовый режим – добавляем параметр IsTest=1
        if (isTestMode) {
            fullUrl += '&IsTest=1';
        }

        // Сохраняем заказ в базе (опционально) для последующей проверки
        // Здесь можно создать запись в таблице payments, но не обязательно

        res.json({
            paymentUrl: fullUrl,
            invId: invId
        });
    } catch (e) {
        console.error('Robokassa create payment error:', e);
        res.status(500).json({ error: e.message });
    }
});

// ---------- 2. ОБРАБОТЧИК УВЕДОМЛЕНИЙ ОТ ROBOKASSA (Result URL) ----------
router.post('/callback', async (req, res) => {
    console.log('=== ROBOKASSA CALLBACK ===');
    console.log('Body:', req.body);

    try {
        const { OutSum, InvId, SignatureValue, ...shpParams } = req.body;

        if (!OutSum || !InvId || !SignatureValue) {
            console.error('Missing required fields');
            return res.status(400).send('ERROR');
        }

        // Извлекаем userId из Shp-параметров
        const userId = shpParams.Shp_userId;
        if (!userId) {
            console.error('No Shp_userId in callback');
            return res.status(400).send('ERROR');
        }

        // Выбираем пароль #2 для проверки (тестовый или основной)
        const currentPassword2 = isTestMode ? testPassword2 : password2;
        if (!currentPassword2) {
            console.error('Password #2 not configured for current mode');
            return res.status(500).send('ERROR');
        }

        // Формируем ожидаемую подпись
        const expectedSignature = buildSignature(OutSum, InvId, currentPassword2, shpParams);

        if (SignatureValue !== expectedSignature) {
            console.error(`Invalid signature. Expected ${expectedSignature}, got ${SignatureValue}`);
            return res.status(400).send('ERROR');
        }

        // Подпись верна – начисляем алмазы
        console.log(`Payment confirmed: InvId=${InvId}, OutSum=${OutSum}, userId=${userId}`);

        // Определяем количество алмазов для начисления
        // В метаданных мы передавали diamonds и bonus
        let diamondsToAdd = parseInt(shpParams.Shp_diamonds) || 0;
        const packId = shpParams.Shp_packId;
        const isBonus = shpParams.Shp_bonus === 'true';

        // Если это первый раз для этого пакета и есть бонус – добавляем +50%
        if (isBonus && diamondsToAdd > 0) {
            // Проверяем, покупал ли игрок этот пакет ранее (можно хранить в БД)
            const client = await pool.connect();
            try {
                const checkRes = await client.query(
                    'SELECT 1 FROM bonus_purchases WHERE user_id = $1 AND pack_id = $2',
                    [userId, packId]
                );
                if (checkRes.rowCount === 0) {
                    // Бонус ещё не использован – добавляем 50%
                    diamondsToAdd = Math.floor(diamondsToAdd * 1.5);
                    // Записываем, что бонус использован
                    await client.query(
                        'INSERT INTO bonus_purchases (user_id, pack_id) VALUES ($1, $2)',
                        [userId, packId]
                    );
                    console.log(`Bonus applied: user ${userId}, pack ${packId}, total diamonds ${diamondsToAdd}`);
                }
            } catch (dbErr) {
                console.error('DB error while checking bonus:', dbErr);
                // Продолжаем начисление без бонуса, чтобы не потерять оплату
            } finally {
                client.release();
            }
        }

        if (diamondsToAdd === 0) {
            console.warn(`No diamonds to add for userId ${userId}`);
            return res.send(`OK${InvId}`);
        }

        // Начисляем алмазы в базе
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const user = await getUserByIdentifier(client, null, userId);
            if (!user) {
                throw new Error('User not found');
            }
            await client.query(
                'UPDATE users SET diamonds = diamonds + $1 WHERE id = $2',
                [diamondsToAdd, user.id]
            );
            await client.query('COMMIT');
            console.log(`Added ${diamondsToAdd} diamonds to user ${userId}`);
        } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error('Failed to add diamonds:', dbErr);
            return res.status(500).send('ERROR');
        } finally {
            client.release();
        }

        // Robokassa требует ответа в виде "OK" + номер заказа
        res.send(`OK${InvId}`);
    } catch (e) {
        console.error('Callback processing error:', e);
        res.status(500).send('ERROR');
    }
});

module.exports = router;
