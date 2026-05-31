const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { rechargeEnergy } = require('../utils/energy');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ========== ПРОФИЛЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ==========
router.get('/profile', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        await rechargeEnergy(client, userId);
        const updatedUser = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        const userData = updatedUser.rows[0];
        const connections = await client.query('SELECT provider, email FROM user_connections WHERE user_id = $1', [userId]);
        const classes = await client.query('SELECT * FROM user_classes WHERE user_id = $1', [userId]);
        const inventory = await client.query(
            `SELECT 
                i.id as id, 
                i.item_id, 
                i.equipped, 
                i.for_sale, 
                i.price, 
                i.in_forge, 
                i.forge_tab,
                it.name, 
                it.type, 
                it.rarity, 
                it.class_restriction, 
                it.owner_class,
                it.atk_bonus, 
                it.def_bonus, 
                it.hp_bonus, 
                it.spd_bonus,
                it.crit_bonus, 
                it.crit_dmg_bonus, 
                it.agi_bonus, 
                it.int_bonus, 
                it.vamp_bonus, 
                it.reflect_bonus
             FROM inventory i 
             JOIN items it ON i.item_id = it.id 
             WHERE i.user_id = $1`,
            [userId]
        );
        res.json({ user: userData, connections: connections.rows, userClasses: classes.rows, inventory: inventory.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== ОБНОВЛЕНИЕ НАСТРОЕК ==========
router.post('/update-settings', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { sound_enabled, music_enabled, username } = req.body;
    const client = await pool.connect();
    try {
        if (username) {
            const nickCheck = await client.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
            if (nickCheck.rows.length > 0) return res.status(400).json({ error: 'username already taken' });
            await client.query('UPDATE users SET username = $1 WHERE id = $2', [username, userId]);
        }
        if (sound_enabled !== undefined) {
            await client.query('UPDATE users SET sound_enabled = $1 WHERE id = $2', [sound_enabled, userId]);
        }
        if (music_enabled !== undefined) {
            await client.query('UPDATE users SET music_enabled = $1 WHERE id = $2', [music_enabled, userId]);
        }
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== ОБНОВЛЕНИЕ ИМЕНИ (НИКНЕЙМА) ИЗ VK ==========
router.post('/update-username', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { username } = req.body;
    if (!username) return res.status(400). json({ error: 'No username provided' });
    const client = await pool.connect();
    try {
        // Проверяем, не занят ли никнейм другим пользователем
        const existing = await client.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'Username already taken' });
        }
        await client.query('UPDATE users SET username = $1 WHERE id = $2', [username, userId]);
        res.json({ success: true, username });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== ПРИВЯЗКА АККАУНТОВ ==========
router.post('/link', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { provider, idToken, initData, email, access_token, user_id: vkUserId } = req.body;
    const client = await pool.connect();
    try {
        if (provider === 'google' && idToken) {
            const ticket = await googleClient.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
            const payload = ticket.getPayload();
            const googleId = payload.sub;
            const googleEmail = payload.email;
            const existing = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['google', googleId]
            );
            if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
                return res.status(409).json({ error: 'This Google account is already linked to another user' });
            }
            if (googleEmail) {
                const emailUser = await client.query('SELECT id FROM users WHERE email = $1 AND id != $2', [googleEmail, userId]);
                if (emailUser.rows.length > 0) {
                    return res.status(409).json({ error: 'Этот email уже зарегистрирован у другого пользователя' });
                }
            }
            await client.query(
                `INSERT INTO user_connections (user_id, provider, provider_id, email, data)
                 VALUES ($1, 'google', $2, $3, $4)
                 ON CONFLICT (user_id, provider) DO UPDATE SET provider_id = $2, email = $3, data = $4`,
                [userId, googleId, googleEmail, JSON.stringify(payload)]
            );
            if (googleEmail) {
                await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [googleEmail, userId]);
            }
            return res.json({ success: true });
        }
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
        else if (provider === 'vk' && access_token && vkUserId) {
            const existing = await client.query(
                'SELECT user_id FROM user_connections WHERE provider = $1 AND provider_id = $2',
                ['vk', String(vkUserId)]
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
                [userId, String(vkUserId), email || null, JSON.stringify({ access_token, user_id: vkUserId, email })]
            );
            if (email) {
                await client.query('UPDATE users SET email = $1 WHERE id = $2 AND email IS NULL', [email, userId]);
            }
            return res.json({ success: true });
        }
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

// ========== ОБНОВЛЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ (REFRESH) ==========
router.post('/refresh', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        await rechargeEnergy(client, userId);
        const updatedUser = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        const userData = updatedUser.rows[0];
        const classes = await client.query('SELECT * FROM user_classes WHERE user_id = $1', [userId]);
        const inventory = await client.query(
            `SELECT 
                i.id as id, 
                i.item_id, 
                i.equipped, 
                i.for_sale, 
                i.price, 
                i.in_forge, 
                i.forge_tab,
                it.name, 
                it.type, 
                it.rarity, 
                it.class_restriction, 
                it.owner_class,
                it.atk_bonus, 
                it.def_bonus, 
                it.hp_bonus, 
                it.spd_bonus,
                it.crit_bonus, 
                it.crit_dmg_bonus, 
                it.agi_bonus, 
                it.int_bonus, 
                it.vamp_bonus, 
                it.reflect_bonus
             FROM inventory i 
             JOIN items it ON i.item_id = it.id 
             WHERE i.user_id = $1`,
            [userId]
        );
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

// ========== СООБЩЕНИЯ ==========
router.get('/messages', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const messages = await client.query(
            `SELECT id, from_text as "from", sender_avatar, subject, body, reward_type, reward_amount, is_read, is_claimed, created_at
             FROM user_messages
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );
        res.json({ messages: messages.rows });
    } catch (err) {
        console.error('Ошибка при получении сообщений:', err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/messages/read', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { message_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('UPDATE user_messages SET is_read = true WHERE id = $1 AND user_id = $2', [message_id, userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/messages/delete', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { message_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('DELETE FROM user_messages WHERE id = $1 AND user_id = $2', [message_id, userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/messages/claim', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { message_id } = req.body;
    const client = await pool.connect();
    try {
        const msgRes = await client.query(
            'SELECT reward_type, reward_amount, reward_type2, reward_amount2, is_claimed FROM user_messages WHERE id = $1 AND user_id = $2',
            [message_id, userId]
        );
        if (msgRes.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
        const msg = msgRes.rows[0];
        if (msg.is_claimed) return res.status(400).json({ error: 'Reward already claimed' });

        let rewardText = '';
        if (msg.reward_type && msg.reward_amount) {
            if (msg.reward_type === 'coins') {
                await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [msg.reward_amount, userId]);
                rewardText += `${msg.reward_amount} монет`;
            } else if (msg.reward_type === 'diamonds') {
                await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [msg.reward_amount, userId]);
                rewardText += `${msg.reward_amount} алмазов`;
            }
        }
        if (msg.reward_type2 && msg.reward_amount2) {
            if (msg.reward_type2 === 'coins') {
                await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [msg.reward_amount2, userId]);
                rewardText += (rewardText ? ' и ' : '') + `${msg.reward_amount2} монет`;
            } else if (msg.reward_type2 === 'diamonds') {
                await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [msg.reward_amount2, userId]);
                rewardText += (rewardText ? ' и ' : '') + `${msg.reward_amount2} алмазов`;
            }
        }
        await client.query('UPDATE user_messages SET is_claimed = true WHERE id = $1', [message_id]);
        res.json({ success: true, reward_text: rewardText });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ========== ВЫБОР КЛАССА ДЛЯ НАГРАДЫ (очки навыков) ==========
router.post('/claim-class-reward', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { message_id, chosen_class } = req.body;
    const client = await pool.connect();
    try {
        const msgRes = await client.query(
            `SELECT id, reward_type, reward_amount, is_claimed 
             FROM user_messages 
             WHERE id = $1 AND user_id = $2`,
            [message_id, userId]
        );
        if (msgRes.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
        const msg = msgRes.rows[0];
        if (msg.is_claimed) return res.status(400).json({ error: 'Reward already claimed' });
        if (msg.reward_type !== 'skill_points_choice') return res.status(400).json({ error: 'Invalid reward type' });

        const validClasses = ['warrior', 'assassin', 'mage'];
        if (!validClasses.includes(chosen_class)) return res.status(400).json({ error: 'Invalid class' });

        await client.query(
            'UPDATE user_classes SET skill_points = skill_points + $1 WHERE user_id = $2 AND class = $3',
            [msg.reward_amount, userId, chosen_class]
        );
        await client.query('UPDATE user_messages SET is_claimed = true, chosen_class = $1 WHERE id = $2', [chosen_class, message_id]);
        res.json({ success: true, chosen_class });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

// ========== СМЕНА ТЕКУЩЕГО КЛАССА ==========
router.post('/change-class', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { class_name } = req.body;
    if (!class_name) return res.status(400).json({ error: 'Class name required' });
    const validClasses = ['warrior', 'assassin', 'mage'];
    if (!validClasses.includes(class_name)) return res.status(400).json({ error: 'Invalid class' });

    const client = await pool.connect();
    try {
        const classCheck = await client.query(
            'SELECT id FROM user_classes WHERE user_id = $1 AND class = $2',
            [userId, class_name]
        );
        if (classCheck.rows.length === 0) return res.status(400).json({ error: 'Class not found for this user' });
        await client.query('UPDATE users SET current_class = $1 WHERE id = $2', [class_name, userId]);
        res.json({ success: true, current_class: class_name });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

// ========== СМЕНА ПАРОЛЯ (требует авторизации) ==========
router.put('/change-password', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ error: 'Новый пароль должен быть не менее 6 символов' });

    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = userRes.rows[0];
        if (!user.password_hash) return res.status(400).json({ error: 'У вас не установлен пароль' });

        const valid = await bcrypt.compare(oldPassword, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Неверный старый пароль' });

        const newHash = await bcrypt.hash(newPassword, 10);
        await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка смены пароля' });
    } finally {
        client.release();
    }
});

module.exports = router;
