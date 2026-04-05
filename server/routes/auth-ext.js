const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const { rechargeEnergy } = require('../utils/energy');

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

// ========== TELEGRAM (только по tg_id, без объединения по email) ==========
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

    if (calculatedHash !== hash) throw new Error('Invalid Telegram data');

    const user = JSON.parse(urlParams.get('user'));
    const tgId = user.id;
    const username = user.username || `user_${tgId}`;

    let userRes = await client.query('SELECT * FROM users WHERE tg_id = $1', [tgId]);
    let userData;
    let needNickname = false;

    if (userRes.rows.length === 0) {
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
    } finally { client.release(); }
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
        } finally { client.release(); }
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
        if (ver.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired code' });

        let userRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        let userData, needNickname = false;
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
            await client.query(
                `INSERT INTO user_connections (user_id, provider, email) VALUES ($1, 'email', $2) ON CONFLICT (user_id, provider) DO UPDATE SET email = $2`,
                [userData.id, email]
            );
        }
        await rechargeEnergy(client, userData.id);
        const freshUser = await client.query('SELECT * FROM users WHERE id = $1', [userData.id]);
        userData = freshUser.rows[0];

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

// Для входа через Telegram внутри WebApp (popup с initData)
router.post('/telegram-oauth', async (req, res) => {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'No initData' });
    const client = await pool.connect();
    try {
        const { sessionToken, needNickname, userId, user } = await handleTelegramLogin(initData, null, client);
        await rechargeEnergy(client, user.id);
        const freshUser = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
        res.json({ success: true, sessionToken, needNickname, userId, user: freshUser.rows[0] });
    } catch (err) {
        res.status(401).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Автоматический вход внутри Telegram WebApp (без popup)
router.post('/telegram-auto', async (req, res) => {
    const { initData, referral_code } = req.body;
    if (!initData) return res.status(400).json({ error: 'No initData' });
    const client = await pool.connect();
    try {
        const { sessionToken, needNickname, userId, user } = await handleTelegramLogin(initData, referral_code, client);
        await rechargeEnergy(client, user.id);
        const freshUser = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
        res.json({ success: true, sessionToken, needNickname, userId, user: freshUser.rows[0] });
    } catch (err) {
        res.status(401).json({ error: err.message });
    } finally {
        client.release();
    }
});

// Google OAuth через One Tap (получение idToken)
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

        const client = await pool.connect();
        try {
            let existingConnection = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['google', googleId]
            );
            if (existingConnection.rows.length > 0) {
                const userId = existingConnection.rows[0].user_id;
                await rechargeEnergy(client, userId);
                const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
                const userData = userRes.rows[0];
                const sessionToken = generateToken();
                await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
                const needNickname = !userData.nickname;
                return res.json({ success: true, sessionToken, needNickname, user: userData });
            }

            if (email) {
                const emailUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
                if (emailUser.rows.length > 0) {
                    return res.status(409).json({ error: 'Этот email уже зарегистрирован. Войдите через другой способ или привяжите аккаунт в настройках.' });
                }
            }

            const referralCode = Math.random().toString(36).substring(2, 10);
            const newUser = await client.query(
                `INSERT INTO users (email, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [email || null, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
            );
            const userData = newUser.rows[0];
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'google', $2, $3, $4)`,
                [userData.id, googleId, email, JSON.stringify(payload)]
            );
            const classes = ['warrior', 'assassin', 'mage'];
            for (let cls of classes) {
                await client.query(
                    `INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [userData.id, cls]
                );
            }
            const sessionToken = generateToken();
            await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
            res.json({ success: true, sessionToken, needNickname: true, user: userData });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: 'Invalid Google token' });
    }
});

// ========== VK OAuth (для входа через popup) ==========
router.get('/vk', (req, res) => {
    const mode = req.query.mode === 'link' ? 'link' : 'login';
    let state = { mode };
    if (mode === 'link' && req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        if (token) state.sessionToken = token;
    }
    const vkAuthUrl = `https://oauth.vk.com/authorize?client_id=${process.env.VK_APP_ID}&redirect_uri=${encodeURIComponent(process.env.VK_CALLBACK_URL)}&response_type=code&v=5.131&scope=email,phone&state=${encodeURIComponent(JSON.stringify(state))}`;
    res.redirect(vkAuthUrl);
});

router.get('/vk/callback', async (req, res) => {
    console.log('=== VK Callback Started ===');
    console.log('Full query:', req.query);
    const { code, error, state: stateParam } = req.query;
    if (error) {
        console.error('VK OAuth error param:', error);
        return res.status(400).send(`Ошибка VK: ${error}`);
    }
    if (!code) {
        console.error('No code provided in VK callback');
        return res.status(400).send('No code provided');
    }
    console.log('✅ VK code received:', code);
    
    let state;
    try {
        state = JSON.parse(stateParam);
        console.log('State parsed:', state);
    } catch(e) {
        state = { mode: 'login' };
        console.log('State parsing failed, using default login mode');
    }
    
    const client = await pool.connect();
    try {
        const tokenResponse = await fetch(`https://oauth.vk.com/access_token?client_id=${process.env.VK_APP_ID}&client_secret=${process.env.VK_CLIENT_SECRET}&redirect_uri=${encodeURIComponent(process.env.VK_CALLBACK_URL)}&code=${code}`);
        console.log('VK token response status:', tokenResponse.status);
        const tokenData = await tokenResponse.json();
        console.log('VK token data:', JSON.stringify(tokenData, null, 2));
        
        if (tokenData.error) {
            console.error('VK token exchange error:', tokenData.error, tokenData.error_description);
            throw new Error(tokenData.error_description || tokenData.error);
        }
        const { user_id, email, access_token } = tokenData;
        console.log('✅ VK user_id:', user_id, 'email:', email);
        
        const userInfoResponse = await fetch(`https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_50&access_token=${access_token}&v=5.131`);
        const userInfo = await userInfoResponse.json();
        console.log('VK user info:', JSON.stringify(userInfo, null, 2));
        const vkUser = userInfo.response[0];
        
        if (state.mode === 'link') {
            // Привязка VK к существующему пользователю
            const sessionToken = state.sessionToken;
            if (!sessionToken) throw new Error('No session token for linking');
            const userRes = await client.query('SELECT id FROM users WHERE session_token = $1', [sessionToken]);
            if (userRes.rows.length === 0) throw new Error('Invalid session');
            const userId = userRes.rows[0].id;
            const existing = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['vk', String(user_id)]
            );
            if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
                throw new Error('This VK account is already linked to another user');
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'vk', $2, $3, $4)
                 ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                [userId, String(user_id), email || null, JSON.stringify(tokenData)]
            );
            if (email) {
                await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
            }
            console.log('✅ VK linked successfully, sending postMessage');
            return res.send(`
                <html><body><script>
                    window.opener.postMessage({ type: 'vkLinkSuccess' }, '${process.env.CLIENT_URL}');
                    window.close();
                </script></body></html>
            `);
        }
        
        // Режим входа (login) – отправляем postMessage для popup
        console.log('Mode: LOGIN (full OAuth flow)');
        let existingConnection = await client.query(
            'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
            ['vk', String(user_id)]
        );
        let userData, needNickname = false;
        if (existingConnection.rows.length > 0) {
            const userId = existingConnection.rows[0].user_id;
            console.log('Existing user found, userId:', userId);
            await rechargeEnergy(client, userId);
            const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            userData = userRes.rows[0];
            needNickname = !userData.nickname;
        } else {
            console.log('No existing connection, checking email uniqueness...');
            if (email) {
                const emailUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
                if (emailUser.rows.length > 0) {
                    console.log('Email already registered, returning conflict');
                    return res.status(409).send('Этот email уже зарегистрирован. Войдите через другой способ или привяжите аккаунт в настройках.');
                }
            }
            const referralCode = Math.random().toString(36).substring(2, 10);
            const newUser = await client.query(
                `INSERT INTO users (email, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [email || null, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
            );
            userData = newUser.rows[0];
            needNickname = true;
            console.log('New user created, userId:', userData.id);
            const classes = ['warrior', 'assassin', 'mage'];
            for (let cls of classes) {
                await client.query(`INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userData.id, cls]);
            }
        }
        await client.query(
            `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
             VALUES ($1, 'vk', $2, $3, $4)
             ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
            [userData.id, String(user_id), email || null, JSON.stringify(tokenData)]
        );
        if (email && !userData.email) {
            await client.query('UPDATE users SET email = $1 WHERE id = $2', [email, userData.id]);
        }
        const sessionToken = generateToken();
        await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
        console.log('✅ Session token generated, sending postMessage to popup');
        res.send(`
            <html><body><script>
                window.opener.postMessage({
                    type: 'vkAuthSuccess',
                    sessionToken: '${sessionToken}',
                    needNickname: ${needNickname},
                    userId: ${userData.id}
                }, '${process.env.CLIENT_URL}');
                window.close();
            </script></body></html>
        `);
    } catch (err) {
        console.error('❌ Error in vk-callback:', err);
        res.status(500).send('Authentication failed: ' + err.message);
    } finally {
        client.release();
    }
});

// ========== ПРОФИЛЬ, НАСТРОЙКИ, ПРИВЯЗКА, ОБНОВЛЕНИЕ ==========
router.get('/profile', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT * FROM users WHERE session_token = $1', [token]);
        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
        const user = userRes.rows[0];
        await rechargeEnergy(client, user.id);
        const updatedUser = await client.query('SELECT * FROM users WHERE id = $1', [user.id]);
        const userData = updatedUser.rows[0];
        const connections = await client.query('SELECT provider, email FROM user_connections WHERE user_id = $1', [userData.id]);
        const classes = await client.query('SELECT * FROM user_classes WHERE user_id = $1', [userData.id]);
        const inventory = await client.query('SELECT i.*, it.* FROM inventory i JOIN items it ON i.item_id = it.id WHERE i.user_id = $1', [userData.id]);
        res.json({ user: userData, connections: connections.rows, userClasses: classes.rows, inventory: inventory.rows });
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

router.post('/link', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });
    const { provider, idToken, initData, email, code, device_id, user, access_token } = req.body;
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT id FROM users WHERE session_token = $1', [token]);
        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
        const userId = userRes.rows[0].id;

        // Google OAuth (One Tap / popup)
        if (provider === 'google' && idToken) {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            const payload = ticket.getPayload();
            const googleId = payload.sub;
            const email = payload.email;
            const existing = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['google', googleId]
            );
            if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
                return res.status(409).json({ error: 'This Google account is already linked to another user' });
            }
            if (email) {
                const emailUser = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
                if (emailUser.rows.length > 0) {
                    return res.status(409).json({ error: 'Этот email уже зарегистрирован у другого пользователя' });
                }
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'google', $2, $3, $4)
                 ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                [userId, googleId, email, JSON.stringify(payload)]
            );
            if (email) {
                await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
            }
            return res.json({ success: true });
        }
        // Telegram OAuth (виджет)
        else if (provider === 'telegram' && initData) {
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
            const tgUser = JSON.parse(urlParams.get('user'));
            const tgId = tgUser.id;
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
                [userId, String(tgId), tgUser.email || null, JSON.stringify(tgUser)]
            );
            const userTg = await client.query('SELECT tg_id FROM users WHERE id = $1', [userId]);
            if (!userTg.rows[0].tg_id) {
                await client.query('UPDATE users SET tg_id = $1 WHERE id = $2', [tgId, userId]);
            }
            return res.json({ success: true });
        }
        // VK через Low-code (user + access_token)
        else if (provider === 'vk' && user && user.id) {
            const vkId = user.id;
            const email = user.email || null;
            const existing = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['vk', String(vkId)]
            );
            if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
                return res.status(409).json({ error: 'Этот VK аккаунт уже привязан к другому пользователю' });
            }
            if (email) {
                const emailUser = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
                if (emailUser.rows.length > 0) {
                    return res.status(409).json({ error: 'Этот email уже зарегистрирован у другого пользователя' });
                }
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'vk', $2, $3, $4)
                 ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                [userId, String(vkId), email || null, JSON.stringify({ user, access_token })]
            );
            if (email) {
                await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
            }
            return res.json({ success: true });
        }
        // VK через старый OAuth (code + device_id) – запасной вариант
        else if (provider === 'vk' && code && device_id) {
            console.log('=== VK LINK (old OAuth) ===');
            console.log('code:', code);
            console.log('device_id:', device_id);
            console.log('VK_APP_ID:', process.env.VK_APP_ID);
            console.log('VK_CALLBACK_URL:', process.env.VK_CALLBACK_URL);
            console.log('VK_CLIENT_SECRET (first 5 chars):', process.env.VK_CLIENT_SECRET?.substring(0,5));
            
            try {
                const tokenResponse = await fetch(`https://oauth.vk.com/access_token?client_id=${process.env.VK_APP_ID}&client_secret=${process.env.VK_CLIENT_SECRET}&code=${code}&device_id=${device_id}&redirect_uri=${encodeURIComponent(process.env.VK_CALLBACK_URL)}`);
                console.log('VK token response status:', tokenResponse.status);
                const tokenData = await tokenResponse.json();
                console.log('VK token data:', JSON.stringify(tokenData, null, 2));
                
                if (tokenData.error) {
                    console.error('VK token exchange error:', tokenData.error, tokenData.error_description);
                    return res.status(400).json({ error: `Ошибка VK: ${tokenData.error_description || tokenData.error}` });
                }
                const { user_id, email } = tokenData;
                
                const existing = await client.query(
                    'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                    ['vk', String(user_id)]
                );
                if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
                    return res.status(409).json({ error: 'Этот VK аккаунт уже привязан к другому пользователю' });
                }
                if (email) {
                    const emailUser = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
                    if (emailUser.rows.length > 0) {
                        return res.status(409).json({ error: 'Этот email уже зарегистрирован у другого пользователя' });
                    }
                }
                await client.query(
                    `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                     VALUES ($1, 'vk', $2, $3, $4)
                     ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                    [userId, String(user_id), email || null, JSON.stringify(tokenData)]
                );
                if (email) {
                    await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
                }
                return res.json({ success: true });
            } catch (err) {
                console.error('VK link error:', err);
                return res.status(500).json({ error: 'Ошибка привязки VK: ' + err.message });
            }
        }
        // Email привязка
        else if (provider === 'email' && email) {
            const emailUser = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
            if (emailUser.rows.length > 0) {
                return res.status(409).json({ error: 'Этот email уже зарегистрирован у другого пользователя' });
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, email)
                 VALUES ($1, 'email', $2)
                 ON CONFLICT (user_id, provider) DO UPDATE SET email = $2`,
                [userId, email]
            );
            await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
            return res.json({ success: true });
        }
        else {
            return res.status(400).json({ error: 'Invalid provider or missing data' });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});


router.post('/refresh', async (req, res) => {
    const { tg_id } = req.body;
    if (!tg_id) return res.status(400).json({ error: 'tg_id is required' });
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userId = userRes.rows[0].id;
        await rechargeEnergy(client, userId);
        const updatedUser = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        const userData = updatedUser.rows[0];
        const classes = await client.query('SELECT * FROM user_classes WHERE user_id = $1', [userId]);
        const inventory = await client.query('SELECT i.*, it.* FROM inventory i JOIN items it ON i.item_id = it.id WHERE i.user_id = $1', [userId]);
        res.json({
            user: userData,
            classes: classes.rows,
            inventory: inventory.rows,
            bot_username: process.env.BOT_USERNAME || ''
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== GOOGLE OAuth через редирект ==========
router.get('/google-auth', (req, res) => {
    const mode = req.query.mode === 'link' ? 'link' : 'login';
    let state = { mode };
    if (mode === 'link' && req.query.token) {
        state.sessionToken = req.query.token;
    }
    const redirectUri = `${process.env.API_BASE_URL || process.env.CLIENT_URL}/auth/google-callback`;
    console.log('Google redirect URI:', redirectUri);
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=email%20profile&state=${encodeURIComponent(JSON.stringify(state))}`;
    console.log('Full Google auth URL:', url);
    res.redirect(url);
});

router.get('/google-callback', async (req, res) => {
    const { code, error, state: stateParam } = req.query;
    console.log('=== Google Callback Started ===');
    console.log('Query params:', req.query);
    
    if (error) {
        console.error('Google OAuth error:', error);
        return res.status(400).send(`Ошибка Google: ${error}`);
    }
    if (!code) {
        console.error('No code provided in callback');
        return res.status(400).send('No code provided');
    }
    console.log('✅ Code received, length:', code.length);
    
    let state;
    try {
        state = JSON.parse(stateParam);
        console.log('State parsed:', state);
    } catch(e) {
        state = { mode: 'login' };
        console.log('State parsing failed, using default login mode');
    }
    
    const client = await pool.connect();
    try {
        const redirectUri = `${process.env.API_BASE_URL || process.env.CLIENT_URL}/auth/google-callback`;
        console.log('Redirect URI for token exchange:', redirectUri);
        
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code'
            })
        });
        
        console.log('Token response status:', tokenResponse.status);
        const tokenData = await tokenResponse.json();
        console.log('Token response data:', JSON.stringify(tokenData, null, 2));
        
        if (tokenData.error) {
            console.error('Token exchange error:', tokenData.error, tokenData.error_description);
            throw new Error(tokenData.error_description || tokenData.error);
        }
        const { id_token } = tokenData;
        console.log('✅ ID token obtained');
        
        const ticket = await googleClient.verifyIdToken({ idToken: id_token, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const email = payload.email;
        const googleId = payload.sub;
        console.log('✅ User verified, email:', email, 'googleId:', googleId);
        
        if (state.mode === 'link') {
            console.log('Mode: LINK (binding Google to existing user)');
            const sessionToken = state.sessionToken;
            if (!sessionToken) throw new Error('No session token for linking');
            const userRes = await client.query('SELECT id FROM users WHERE session_token = $1', [sessionToken]);
            if (userRes.rows.length === 0) throw new Error('Invalid session');
            const userId = userRes.rows[0].id;
            console.log('User ID for linking:', userId);
            
            const existing = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['google', googleId]
            );
            if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
                throw new Error('Google already linked to another user');
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'google', $2, $3, $4)
                 ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                [userId, googleId, email, JSON.stringify(payload)]
            );
            if (email) await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
            console.log('✅ Google linked successfully, sending postMessage');
            return res.send(`
                <html><body><script>
                    window.opener.postMessage({ type: 'googleLinkSuccess' }, '${process.env.CLIENT_URL}');
                    window.close();
                </script></body></html>
            `);
        }
        
        console.log('Mode: LOGIN (full OAuth flow)');
        let existingConnection = await client.query(
            'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
            ['google', googleId]
        );
        let userData, needNickname = false;
        if (existingConnection.rows.length > 0) {
            const userId = existingConnection.rows[0].user_id;
            console.log('Existing user found, userId:', userId);
            await rechargeEnergy(client, userId);
            const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            userData = userRes.rows[0];
            needNickname = !userData.nickname;
        } else {
            console.log('No existing connection, checking email uniqueness...');
            if (email) {
                const emailUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
                if (emailUser.rows.length > 0) {
                    console.log('Email already registered, returning conflict');
                    return res.status(409).send('Этот email уже зарегистрирован. Войдите через другой способ или привяжите аккаунт в настройках.');
                }
            }
            const referralCode = Math.random().toString(36).substring(2, 10);
            const newUser = await client.query(
                `INSERT INTO users (email, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [email || null, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
            );
            userData = newUser.rows[0];
            needNickname = true;
            console.log('New user created, userId:', userData.id);
            const classes = ['warrior', 'assassin', 'mage'];
            for (let cls of classes) {
                await client.query(`INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userData.id, cls]);
            }
        }
        await client.query(
            `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
             VALUES ($1, 'google', $2, $3, $4)
             ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
            [userData.id, googleId, email, JSON.stringify(payload)]
        );
        if (email && !userData.email) await client.query('UPDATE users SET email = $1 WHERE id = $2', [email, userData.id]);
        
        const sessionToken = generateToken();
        await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
        console.log('✅ Session token generated, redirecting to client');
        const redirectUrl = `${process.env.CLIENT_URL}?google_auth=success&sessionToken=${sessionToken}&needNickname=${needNickname}&userId=${userData.id}`;
        console.log('Redirect URL:', redirectUrl);
        res.redirect(redirectUrl);
    } catch (err) {
        console.error('❌ Error in google-callback:', err);
        res.status(500).send('Authentication failed: ' + err.message);
    } finally {
        client.release();
    }
});

// ========== VK ID SDK ==========
router.post('/vk-sdk', async (req, res) => {
    const { code, device_id } = req.body;
    if (!code) return res.status(400).json({ error: 'No code provided' });

    try {
        const tokenResponse = await fetch(`https://oauth.vk.com/access_token?client_id=${process.env.VK_APP_ID}&client_secret=${process.env.VK_CLIENT_SECRET}&code=${code}&device_id=${device_id}&redirect_uri=${encodeURIComponent(process.env.VK_CALLBACK_URL)}`);
        const tokenData = await tokenResponse.json();
        if (tokenData.error) throw new Error(tokenData.error_description);

        const { user_id, email, access_token } = tokenData;

        const userInfoResponse = await fetch(`https://api.vk.com/method/users.get?user_ids=${user_id}&fields=photo_50&access_token=${access_token}&v=5.131`);
        const userInfo = await userInfoResponse.json();
        const vkUser = userInfo.response[0];

        const client = await pool.connect();
        try {
            let existingConnection = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['vk', String(user_id)]
            );
            let userData, needNickname = false;
            if (existingConnection.rows.length > 0) {
                const userId = existingConnection.rows[0].user_id;
                await rechargeEnergy(client, userId);
                const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
                userData = userRes.rows[0];
                needNickname = !userData.nickname;
            } else {
                if (email) {
                    const emailUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
                    if (emailUser.rows.length > 0) {
                        return res.status(409).json({ error: 'Этот email уже зарегистрирован. Войдите через другой способ или привяжите аккаунт в настройках.' });
                    }
                }
                const referralCode = Math.random().toString(36).substring(2, 10);
                const newUser = await client.query(
                    `INSERT INTO users (email, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                    [email || null, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
                );
                userData = newUser.rows[0];
                needNickname = true;
                const classes = ['warrior', 'assassin', 'mage'];
                for (let cls of classes) {
                    await client.query(`INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userData.id, cls]);
                }
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'vk', $2, $3, $4)
                 ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                [userData.id, String(user_id), email || null, JSON.stringify(tokenData)]
            );
            if (email && !userData.email) {
                await client.query('UPDATE users SET email = $1 WHERE id = $2', [email, userData.id]);
            }
            const sessionToken = generateToken();
            await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
            res.json({ success: true, sessionToken, needNickname, userId: userData.id, user: userData });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

router.post('/auth/vk-lowcode', async (req, res) => {
    const { user, access_token } = req.body;
    if (!user || !user.id) return res.status(400).json({ error: 'No user data' });
    
    const vkId = user.id;
    const email = user.email || null;
    const username = `${user.first_name} ${user.last_name}`;
    
    const client = await pool.connect();
    try {
        let existingConnection = await client.query(
            'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
            ['vk', String(vkId)]
        );
        let userData, needNickname = false;
        if (existingConnection.rows.length > 0) {
            const userId = existingConnection.rows[0].user_id;
            await rechargeEnergy(client, userId);
            const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
            userData = userRes.rows[0];
            needNickname = !userData.nickname;
        } else {
            if (email) {
                const emailUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
                if (emailUser.rows.length > 0) {
                    return res.status(409).json({ error: 'Этот email уже зарегистрирован. Войдите через другой способ или привяжите аккаунт в настройках.' });
                }
            }
            const referralCode = Math.random().toString(36).substring(2, 10);
            const newUser = await client.query(
                `INSERT INTO users (email, referral_code, avatar_id, coins, diamonds, rating, energy, last_energy, win_streak, sound_enabled, music_enabled)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [email || null, referralCode, 1, 0, 0, 1000, 20, new Date(), 0, true, true]
            );
            userData = newUser.rows[0];
            needNickname = true;
            const classes = ['warrior', 'assassin', 'mage'];
            for (let cls of classes) {
                await client.query(`INSERT INTO user_classes (user_id, class) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userData.id, cls]);
            }
        }
        await client.query(
            `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
             VALUES ($1, 'vk', $2, $3, $4)
             ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
            [userData.id, String(vkId), email || null, JSON.stringify({ user, access_token })]
        );
        if (email && !userData.email) {
            await client.query('UPDATE users SET email = $1 WHERE id = $2', [email, userData.id]);
        }
        const sessionToken = generateToken();
        await client.query('UPDATE users SET session_token = $1 WHERE id = $2', [sessionToken, userData.id]);
        res.json({ success: true, sessionToken, needNickname, userId: userData.id, user: userData });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Authentication failed' });
    } finally {
        client.release();
    }
});


module.exports = router;
