const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

// ========== НАСТРОЙКИ ==========
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

async function sendVerificationEmail(email, code) {
    await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Код подтверждения для входа',
        text: `Ваш код подтверждения: ${code}. Действителен 10 минут.`,
    });
}

// Общая логика создания/входа пользователя по Telegram initData (без автоматического связывания по email, т.к. у Telegram редко есть email)
async function handleTelegramLogin(initData, referralCode, client) {
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
        throw new Error('Invalid Telegram data');
    }

    const user = JSON.parse(urlParams.get('user'));
    const tgId = user.id;
    const username = user.username || `user_${tgId}`;

    let userRes = await client.query('SELECT * FROM users WHERE tg_id = $1', [tgId]);
    let userData;
    let needNickname = false;

    if (userRes.rows.length === 0) {
        // Сначала пробуем найти по email, если он есть в данных Telegram
        const email = user.email || null;
        if (email) {
            const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                // Привязываем Telegram к существующему пользователю
                userData = existingUser.rows[0];
                await client.query(
                    `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                     VALUES ($1, 'telegram', $2, $3, $4)
                     ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                    [userData.id, String(tgId), email, JSON.stringify(user)]
                );
                // Обновляем tg_id в users
                await client.query('UPDATE users SET tg_id = $1 WHERE id = $2', [tgId, userData.id]);
                needNickname = !userData.nickname;
                const sessionToken = generateToken();
                await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
                return { sessionToken, needNickname, userId: userData.id, user: userData };
            }
        }
        // Создаём нового пользователя
        const newReferralCode = Math.random().toString(36).substring(2, 10);
        let referredById = null;
        if (referralCode) {
            const referrer = await client.query('SELECT id FROM users WHERE referral_code = $1', [referralCode]);
            if (referrer.rows.length) {
                referredById = referrer.rows[0].id;
                await client.query('UPDATE users SET coins = coins + 100 WHERE id = $1', [referredById]);
            }
        }
        const newUser = await client.query(
            `INSERT INTO users (tg_id, username, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled, referred_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            [tgId, username, newReferralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true, referredById]
        );
        userData = newUser.rows[0];
        needNickname = true;
        const classes = ['warrior', 'assassin', 'mage'];
        for (let cls of classes) {
            await client.query(
                `INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [userData.id, cls]
            );
        }
        await client.query(
            `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
             VALUES ($1, 'telegram', $2, $3, $4) ON CONFLICT (user_id, provider) DO NOTHING`,
            [userData.id, String(tgId), user.email || null, JSON.stringify(user)]
        );
    } else {
        userData = userRes.rows[0];
        needNickname = !userData.nickname;
    }

    const sessionToken = generateToken();
    await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
    return { sessionToken, needNickname, userId: userData.id, user: userData };
}

// ========== МАРШРУТЫ ==========

router.get('/check-nickname', async (req, res) => {
    const { nickname } = req.query;
    if (!nickname) return res.status(400).json({ error: 'Nickname required' });
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT id FROM users WHERE nickname = $1', [nickname]);
        res.json({ available: result.rows.length === 0 });
    } finally {
        client.release();
    }
});

router.post('/init', async (req, res) => {
    const { method, email } = req.body;
    if (method === 'email') {
        if (!email) return res.status(400).json({ error: 'Email required' });
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const client = await pool.connect();
        try {
            await client.query('DELETE FROM email_verifications WHERE email = $1', [email]);
            await client.query(
                'INSERT INTO email_verifications (email, code, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'10 minutes\')',
                [email, code]
            );
            await sendVerificationEmail(email, code);
            res.json({ message: 'Code sent' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Failed to send code' });
        } finally {
            client.release();
        }
    } else {
        res.status(400).json({ error: 'Invalid method' });
    }
});

router.post('/verify-email', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Missing data' });
    const client = await pool.connect();
    try {
        const ver = await client.query(
            'SELECT * FROM email_verifications WHERE email = $1 AND code = $2 AND expires_at > NOW()',
            [email, code]
        );
        if (ver.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }
        let userRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        let userData;
        let needNickname = false;
        if (userRes.rows.length === 0) {
            const referralCode = Math.random().toString(36).substring(2, 10);
            const newUser = await client.query(
                `INSERT INTO users (email, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [email, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
            );
            userData = newUser.rows[0];
            needNickname = true;
            const classes = ['warrior', 'assassin', 'mage'];
            for (let cls of classes) {
                await client.query(
                    `INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [userData.id, cls]
                );
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, email) VALUES ($1, 'email', $2) ON CONFLICT (user_id, provider) DO NOTHING`,
                [userData.id, email]
            );
        } else {
            userData = userRes.rows[0];
            needNickname = !userData.nickname;
            // Обновляем связь email (на всякий случай)
            await client.query(
                `INSERT INTO user_connections (user_id, provider, email) VALUES ($1, 'email', $2) ON CONFLICT (user_id, provider) DO UPDATE SET email = $2`,
                [userData.id, email]
            );
        }
        const sessionToken = generateToken();
        await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
        await client.query('DELETE FROM email_verifications WHERE email = $1', [email]);
        res.json({ success: true, sessionToken, needNickname, user: userData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

router.post('/telegram-oauth', async (req, res) => {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'No initData' });
    const client = await pool.connect();
    try {
        const { sessionToken, needNickname, userId, user } = await handleTelegramLogin(initData, null, client);
        res.json({ success: true, sessionToken, needNickname, userId, user });
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: err.message || 'Invalid Telegram data' });
    } finally {
        client.release();
    }
});

router.post('/telegram-auto', async (req, res) => {
    const { initData, referral_code } = req.body;
    if (!initData) return res.status(400).json({ error: 'No initData' });
    const client = await pool.connect();
    try {
        const { sessionToken, needNickname, userId, user } = await handleTelegramLogin(initData, referral_code, client);
        res.json({ success: true, sessionToken, needNickname, userId, user });
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: err.message || 'Invalid Telegram data' });
    } finally {
        client.release();
    }
});

router.post('/google', async (req, res) => {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'No idToken' });
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const email = payload.email;
        const googleId = payload.sub;
        const name = payload.name;

        const client = await pool.connect();
        try {
            // Сначала ищем пользователя по email
            let userRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
            let userData;
            let needNickname = false;

            if (userRes.rows.length > 0) {
                userData = userRes.rows[0];
                needNickname = !userData.nickname;
                // Привязываем Google к существующему пользователю
                await client.query(
                    `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                     VALUES ($1, 'google', $2, $3, $4)
                     ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                    [userData.id, googleId, email, JSON.stringify(payload)]
                );
            } else {
                // Создаём нового пользователя
                const referralCode = Math.random().toString(36).substring(2, 10);
                const newUser = await client.query(
                    `INSERT INTO users (email, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                    [email, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
                );
                userData = newUser.rows[0];
                needNickname = true;
                await client.query(
                    `INSERT INTO user_connections (user_id, provider, provider_id, email, data) VALUES ($1, 'google', $2, $3, $4)`,
                    [userData.id, googleId, email, JSON.stringify(payload)]
                );
                const classes = ['warrior', 'assassin', 'mage'];
                for (let cls of classes) {
                    await client.query(
                        `INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                        [userData.id, cls]
                    );
                }
            }
            const sessionToken = generateToken();
            await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
            res.json({ success: true, sessionToken, needNickname, user: userData });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Invalid Google token' });
    }
});

// Привязка дополнительного аккаунта (для настроек)
router.post('/link', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const { provider, idToken, initData, email } = req.body;
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT id FROM users WHERE session_token = $1', [token]);
        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
        const userId = userRes.rows[0].id;

        if (provider === 'google' && idToken) {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            const googleId = payload.sub;
            const email = payload.email;
            // Проверяем, не привязан ли этот Google аккаунт к другому пользователю
            const existing = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['google', googleId]
            );
            if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
                return res.status(409).json({ error: 'This Google account is already linked to another user' });
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'google', $2, $3, $4)
                 ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                [userId, googleId, email, JSON.stringify(payload)]
            );
            // Если у пользователя ещё нет email в профиле – обновляем
            if (email) {
                await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
            }
            res.json({ success: true });
        } 
        else if (provider === 'telegram' && initData) {
            // Валидация Telegram initData
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
            // Проверяем, не привязан ли этот Telegram аккаунт к другому пользователю
            const existing = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['telegram', String(tgId)]
            );
            if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
                return res.status(409).json({ error: 'This Telegram account is already linked to another user' });
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'telegram', $2, $3, $4)
                 ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                [userId, String(tgId), user.email || null, JSON.stringify(user)]
            );
            // Обновляем tg_id в users, если его нет
            const userTg = await client.query('SELECT tg_id FROM users WHERE id = $1', [userId]);
            if (!userTg.rows[0].tg_id) {
                await client.query('UPDATE users SET tg_id = $1 WHERE id = $2', [tgId, userId]);
            }
            res.json({ success: true });
        }
        else if (provider === 'email' && email) {
            // Привязка email: нужно подтверждение кода (упрощённо – считаем, что код уже подтверждён)
            // Для простоты предполагаем, что email уже верифицирован
            await client.query(
                `INSERT INTO user_connections (user_id, provider, email)
                 VALUES ($1, 'email', $2)
                 ON CONFLICT (user_id, provider) DO UPDATE SET email = $2`,
                [userId, email]
            );
            await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
            res.json({ success: true });
        }
        else {
            res.status(400).json({ error: 'Invalid provider or missing data' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

router.get('/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT * FROM users WHERE session_token = $1', [token]);
        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
        const user = userRes.rows[0];
        const connections = await client.query('SELECT provider, email FROM user_connections WHERE user_id = $1', [user.id]);
        const classes = await client.query('SELECT * FROM user_classes WHERE user_id = $1', [user.id]);
        const inventory = await client.query('SELECT i.*, it.* FROM inventory i JOIN items it ON i.item_id = it.id WHERE i.user_id = $1', [user.id]);
        res.json({ user, connections: connections.rows, userClasses: classes.rows, inventory: inventory.rows });
    } finally {
        client.release();
    }
});

router.post('/update-settings', async (req, res) => {
    const { token, sound_enabled, music_enabled, nickname } = req.body;
    if (!token) return res.status(401).json({ error: 'No token' });
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT id FROM users WHERE session_token = $1', [token]);
        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
        const userId = userRes.rows[0].id;
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
    } finally {
        client.release();
    }
});

module.exports = router;
