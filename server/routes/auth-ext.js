const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/email'); // нужно реализовать

// Вспомогательная функция для генерации токена
function generateToken(userId) {
    return crypto.randomBytes(32).toString('hex');
}

// Проверка никнейма
router.get('/check-nickname', async (req, res) => {
    const { nickname } = req.query;
    if (!nickname) return res.status(400).json({ error: 'Nickname required' });
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT id FROM users WHERE nickname = $1', [nickname]);
        res.json({ available: result.rows.length === 0 });
    } finally { client.release(); }
});

// Первый шаг авторизации (выбор способа)
router.post('/init', async (req, res) => {
    const { method, initData, email } = req.body;
    // Если method === 'telegram', используем существующую логику из auth.js, но возвращаем токен сессии.
    // Для простоты будем использовать JWT или просто создавать сессию.
    // Здесь я реализую только Telegram (уже есть) и заглушки для других.
    if (method === 'telegram') {
        // Проверяем initData как в auth.js
        const isValid = validateTelegramWebAppData(initData, process.env.BOT_TOKEN);
        if (!isValid) return res.status(401).json({ error: 'Invalid Telegram data' });
        const urlParams = new URLSearchParams(initData);
        const user = JSON.parse(urlParams.get('user'));
        const tgId = user.id;
        const username = user.username || `user_${tgId}`;
        // Ищем пользователя по tg_id
        const client = await pool.connect();
        try {
            let userRes = await client.query('SELECT * FROM users WHERE tg_id = $1', [tgId]);
            if (userRes.rows.length === 0) {
                // Создаём временного пользователя (без nickname)
                const referralCode = Math.random().toString(36).substring(2, 10);
                const newUser = await client.query(
                    `INSERT INTO users (tg_id, username, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
                    [tgId, username, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
                );
                userRes = newUser;
                // Добавляем классы
                const classes = ['warrior', 'assassin', 'mage'];
                for (let cls of classes) {
                    await client.query(
                        `INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [newUser.rows[0].id, cls]
                    );
                }
            }
            const userData = userRes.rows[0];
            // Если у пользователя нет nickname – вернём флаг, что требуется установка никнейма
            if (!userData.nickname) {
                // Генерируем временный токен для сессии (без полной авторизации)
                const sessionToken = generateToken(userData.id);
                await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
                return res.json({ needNickname: true, sessionToken, userId: userData.id });
            } else {
                // Полная авторизация
                const sessionToken = generateToken(userData.id);
                await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
                return res.json({ success: true, sessionToken, user: userData });
            }
        } finally { client.release(); }
    } else if (method === 'email') {
        // Отправка кода подтверждения на email
        if (!email) return res.status(400).json({ error: 'Email required' });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // Сохраняем код в БД или в Redis (временное хранилище)
        await pool.query('INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')', [email, code]);
        await sendVerificationEmail(email, code);
        res.json({ message: 'Code sent', email });
    }
    // Другие методы (google, vk) – аналогично с OAuth2
});

// Подтверждение email
router.post('/verify-email', async (req, res) => {
    const { email, code, nickname } = req.body;
    const client = await pool.connect();
    try {
        const ver = await client.query('SELECT * FROM email_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW()', [email, code]);
        if (ver.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired code' });
        // Проверяем, существует ли уже пользователь с таким email
        let userRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        let userData;
        if (userRes.rows.length === 0) {
            // Создаём нового пользователя
            const referralCode = Math.random().toString(36).substring(2, 10);
            const newUser = await client.query(
                `INSERT INTO users (email, nickname, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
                [email, nickname, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
            );
            userData = newUser.rows[0];
            // Добавляем классы
            const classes = ['warrior', 'assassin', 'mage'];
            for (let cls of classes) {
                await client.query(
                    `INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [userData.id, cls]
                );
            }
        } else {
            userData = userRes.rows[0];
            // Если пользователь уже существует, проверяем никнейм (если передан)
            if (nickname && nickname !== userData.nickname) {
                const nickCheck = await client.query('SELECT id FROM users WHERE nickname = $1 AND id != $2', [nickname, userData.id]);
                if (nickCheck.rows.length > 0) return res.status(400).json({ error: 'Nickname already taken' });
                await client.query('UPDATE users SET nickname = $1 WHERE id = $2', [nickname, userData.id]);
            }
        }
        // Привязываем email к пользователю (если ещё не привязан)
        await client.query(
            `INSERT INTO user_connections (user_id, provider, email) VALUES ($1, 'email', $2) ON CONFLICT (user_id, provider) DO UPDATE SET email = EXCLUDED.email`,
            [userData.id, email]
        );
        const sessionToken = generateToken(userData.id);
        await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
        res.json({ success: true, sessionToken, user: userData });
    } finally { client.release(); }
});

// Получение профиля по токену
router.get('/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT * FROM users WHERE session_token = $1', [token]);
        if (user.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
        const connections = await client.query('SELECT provider, email FROM user_connections WHERE user_id = $1', [user.rows[0].id]);
        res.json({ user: user.rows[0], connections: connections.rows });
    } finally { client.release(); }
});

// Обновление настроек (звук, никнейм)
router.post('/update-settings', async (req, res) => {
    const { token, sound_enabled, music_enabled, nickname } = req.body;
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT id FROM users WHERE session_token = $1', [token]);
        if (user.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
        const userId = user.rows[0].id;
        if (nickname) {
            const nickCheck = await client.query('SELECT id FROM users WHERE nickname = $1 AND id != $2', [nickname, userId]);
            if (nickCheck.rows.length > 0) return res.status(400).json({ error: 'Nickname already taken' });
            await client.query('UPDATE users SET nickname = $1 WHERE id = $2', [nickname, userId]);
        }
        if (sound_enabled !== undefined) {
            await client.query('UPDATE users SET sound_enabled = $1 WHERE id = $2', [sound_enabled, userId]);
        }
        if (music_enabled !== undefined) {
            await client.query('UPDATE users SET music_enabled = $1 WHERE id = $2', [music_enabled, userId]);
        }
        res.json({ success: true });
    } finally { client.release(); }
});



// Привязка нового аккаунта (Google, VK) – аналогично email, но с OAuth2
// В файле auth-ext.js добавьте:
router.post('/telegram-oauth', async (req, res) => {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'No initData' });

    // Проверяем подпись Telegram (как в auth.js)
    const botToken = process.env.BOT_TOKEN;
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    urlParams.delete('hash');

    const dataCheckString = Array.from(urlParams.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (calculatedHash !== hash) {
        return res.status(401).json({ error: 'Invalid Telegram data' });
    }

    const user = JSON.parse(urlParams.get('user'));
    const tgId = user.id;
    const username = user.username || `user_${tgId}`;

    const client = await pool.connect();
    try {
        // Ищем пользователя по tg_id
        let userRes = await client.query('SELECT * FROM users WHERE tg_id = $1', [tgId]);
        let userData;
        let needNickname = false;

        if (userRes.rows.length === 0) {
            // Новый пользователь
            const referralCode = Math.random().toString(36).substring(2, 10);
            const newUser = await client.query(
                `INSERT INTO users (tg_id, username, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
                [tgId, username, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
            );
            userData = newUser.rows[0];
            needNickname = true; // потребуется ввести никнейм
            // Добавляем классы
            const classes = ['warrior', 'assassin', 'mage'];
            for (let cls of classes) {
                await client.query(
                    `INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [userData.id, cls]
                );
            }
        } else {
            userData = userRes.rows[0];
            needNickname = !userData.nickname;
        }

        // Генерируем сессионный токен
        const sessionToken = crypto.randomBytes(32).toString('hex');
        await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);

        res.json({
            success: true,
            sessionToken,
            userId: userData.id,
            needNickname,
            user: userData
        });
    } finally {
        client.release();
    }
});



module.exports = router;
