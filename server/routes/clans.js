const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { isClanNameValid, isUserInClan, getMaxMembers, addClanExp } = require('../utils/clanHelpers');

// ==================== Создание клана ====================
router.post('/create', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { name, icon_id, icon_bg_color, icon_border_color, icon_color, payment_method } = req.body;

    // Валидация
    if (!isClanNameValid(name)) {
        return res.status(400).json({ error: 'Некорректное название (3-30 символов, без мата)' });
    }
    if (!icon_id || icon_id < 1 || icon_id > 12) {
        return res.status(400).json({ error: 'Выберите иконку от 1 до 12' });
    }
    // Цвета: простейшая валидация hex (можно расширить)
    const hexRegex = /^#[0-9A-F]{6}$/i;
    if (!hexRegex.test(icon_bg_color) || !hexRegex.test(icon_border_color) || !hexRegex.test(icon_color)) {
        return res.status(400).json({ error: 'Некорректный цвет' });
    }
    if (!['coins', 'diamonds'].includes(payment_method)) {
        return res.status(400).json({ error: 'Неверный способ оплаты' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Проверка, не в клане ли уже
        const inClan = await isUserInClan(userId, client);
        if (inClan) throw new Error('Вы уже состоите в клане');

        // Проверка уникальности названия
        const nameCheck = await client.query('SELECT id FROM clans WHERE name ILIKE $1', [name]);
        if (nameCheck.rows.length > 0) throw new Error('Клан с таким названием уже существует');

        // Стоимость
        let coinsCost = 0, diamondsCost = 0;
        const userRes = await client.query('SELECT coins, diamonds FROM users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        if (payment_method === 'coins') {
            coinsCost = 2000;
            if (user.coins < coinsCost) throw new Error('Недостаточно монет');
            await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [coinsCost, userId]);
        } else {
            diamondsCost = 150;
            if (user.diamonds < diamondsCost) throw new Error('Недостаточно алмазов');
            await client.query('UPDATE users SET diamonds = diamonds - $1 WHERE id = $2', [diamondsCost, userId]);
        }

        // Создание клана
        const clanRes = await client.query(
            `INSERT INTO clans (name, icon_id, icon_bg_color, icon_border_color, icon_color, leader_id, coins_cost, diamonds_cost)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, icon_id, icon_bg_color, icon_border_color, icon_color, userId, coinsCost, diamondsCost]
        );
        const clan = clanRes.rows[0];

        // Добавить лидера в clan_members
        await client.query(
            `INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'leader')`,
            [clan.id, userId]
        );

        // Инициализировать казну
        await client.query(`INSERT INTO clan_treasury (clan_id, coins) VALUES ($1, 0)`, [clan.id]);

        // Инициализировать бонусы (total_points = 0, все бонусы 0)
        await client.query(
            `INSERT INTO clan_bonuses (clan_id, total_points, bonus_hp, bonus_attack, bonus_defense, bonus_agility, bonus_crit_damage, bonus_vampirism)
             VALUES ($1, 0, 0, 0, 0, 0, 0, 0)`,
            [clan.id]
        );

        await client.query('COMMIT');
        res.json({ success: true, clan });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Create clan error:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ==================== Список кланов (с фильтрацией и пагинацией) ====================
router.get('/list', async (req, res) => {
    const { search, sort = 'level_desc', page = 1, open_only = false } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;

    let orderBy = '';
    switch (sort) {
        case 'level_desc': orderBy = 'c.level DESC'; break;
        case 'level_asc': orderBy = 'c.level ASC'; break;
        case 'members_desc': orderBy = 'member_count DESC'; break;
        case 'created_desc': orderBy = 'c.created_at DESC'; break;
        default: orderBy = 'c.level DESC';
    }

    let whereClause = '';
    const params = [];
    if (search) {
        params.push(`%${search}%`);
        whereClause = `AND c.name ILIKE $${params.length}`;
    }
    if (open_only === 'true') {
        whereClause += ` AND c.join_type = 'open'`;
    }

    const query = `
        SELECT c.id, c.name, c.icon_id, c.icon_bg_color, c.icon_border_color, c.icon_color,
               c.level, c.join_type, c.created_at,
               (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count,
               (10 + (c.level - 1)) as max_members
        FROM clans c
        WHERE 1=1 ${whereClause}
        ORDER BY ${orderBy}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    params.push(limit, offset);

    try {
        const clansRes = await pool.query(query, params);
        const totalRes = await pool.query(
            `SELECT COUNT(*) FROM clans c WHERE 1=1 ${whereClause.replace('AND', '')}`,
            params.slice(0, -2)
        );
        res.json({
            clans: clansRes.rows,
            total: parseInt(totalRes.rows[0].count),
            page: parseInt(page),
            pages: Math.ceil(totalRes.rows[0].count / limit)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ==================== Публичная информация о клане ====================
router.get('/:id', async (req, res) => {
    const clanId = parseInt(req.params.id);
    if (isNaN(clanId)) return res.status(400).json({ error: 'Invalid clan id' });

    try {
        const clanRes = await pool.query(
            `SELECT c.*, u.username as leader_name,
                    (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count,
                    (10 + (c.level - 1)) as max_members
             FROM clans c
             LEFT JOIN users u ON c.leader_id = u.id
             WHERE c.id = $1`,
            [clanId]
        );
        if (clanRes.rows.length === 0) return res.status(404).json({ error: 'Clan not found' });
        const clan = clanRes.rows[0];

        // Список участников (до 20)
        const membersRes = await pool.query(
            `SELECT u.id, u.username, u.avatar_id, cm.role, cm.joined_at
             FROM clan_members cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.clan_id = $1
             ORDER BY cm.role = 'leader' DESC, cm.joined_at
             LIMIT 20`,
            [clanId]
        );
        clan.members = membersRes.rows;
        res.json(clan);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ==================== Мой клан (информация для текущего пользователя) ====================
router.get('/my', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const memberRes = await pool.query(
            'SELECT clan_id, role FROM clan_members WHERE user_id = $1',
            [userId]
        );
        if (memberRes.rows.length === 0) {
            return res.json({ inClan: false });
        }
        const clanId = memberRes.rows[0].clan_id;
        const role = memberRes.rows[0].role;

        const clanRes = await pool.query(
            `SELECT c.*, u.username as leader_name,
                    (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count,
                    (10 + (c.level - 1)) as max_members
             FROM clans c
             LEFT JOIN users u ON c.leader_id = u.id
             WHERE c.id = $1`,
            [clanId]
        );
        if (clanRes.rows.length === 0) return res.status(404).json({ error: 'Clan not found' });
        const clan = clanRes.rows[0];

        const membersRes = await pool.query(
            `SELECT u.id, u.username, u.avatar_id, cm.role, cm.joined_at,
                    COALESCE(u.last_online_at, u.created_at) as last_online
             FROM clan_members cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.clan_id = $1
             ORDER BY cm.role = 'leader' DESC, cm.role = 'officer' DESC, cm.joined_at`,
            [clanId]
        );

        res.json({
            inClan: true,
            clan,
            members: membersRes.rows,
            userRole: role
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ==================== Вступление в открытый клан ====================
router.post('/join', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { clan_id } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Проверка, не в клане ли уже
        const existing = await client.query('SELECT 1 FROM clan_members WHERE user_id = $1', [userId]);
        if (existing.rows.length > 0) throw new Error('Вы уже состоите в клане');

        // Получить информацию о клане
        const clanRes = await client.query(
            'SELECT id, level, join_type FROM clans WHERE id = $1',
            [clan_id]
        );
        if (clanRes.rows.length === 0) throw new Error('Клан не найден');
        const clan = clanRes.rows[0];
        if (clan.join_type !== 'open') throw new Error('Этот клан не принимает мгновенное вступление');

        // Проверка лимита участников
        const memberCountRes = await client.query('SELECT COUNT(*) FROM clan_members WHERE clan_id = $1', [clan.id]);
        const memberCount = parseInt(memberCountRes.rows[0].count);
        const maxMembers = getMaxMembers(clan.level);
        if (memberCount >= maxMembers) throw new Error('В клане нет свободных мест');

        // Вступление
        await client.query(
            'INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, $3)',
            [clan.id, userId, 'member']
        );

        // Системное сообщение в чат
        const userRes = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
        const username = userRes.rows[0].username;
        await client.query(
            `INSERT INTO clan_messages (clan_id, user_id, message) VALUES ($1, NULL, $2)`,
            [clan.id, `${username} вступил в клан!`]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ==================== Чат: отправка сообщения ====================
router.post('/chat/send', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { message } = req.body;
    if (!message || message.length > 200) return res.status(400).json({ error: 'Сообщение должно быть от 1 до 200 символов' });

    try {
        const memberRes = await pool.query(
            'SELECT clan_id FROM clan_members WHERE user_id = $1',
            [userId]
        );
        if (memberRes.rows.length === 0) return res.status(403).json({ error: 'Вы не в клане' });
        const clanId = memberRes.rows[0].clan_id;

        await pool.query(
            `INSERT INTO clan_messages (clan_id, user_id, message) VALUES ($1, $2, $3)`,
            [clanId, userId, message]
        );
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// ==================== Чат: получение последних сообщений ====================
router.get('/chat', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const memberRes = await pool.query(
            'SELECT clan_id FROM clan_members WHERE user_id = $1',
            [userId]
        );
        if (memberRes.rows.length === 0) return res.json([]);
        const clanId = memberRes.rows[0].clan_id;

        const messages = await pool.query(
            `SELECT cm.message, cm.created_at, u.username, u.avatar_id
             FROM clan_messages cm
             LEFT JOIN users u ON cm.user_id = u.id
             WHERE cm.clan_id = $1
             ORDER BY cm.created_at DESC
             LIMIT 100`,
            [clanId]
        );
        res.json(messages.rows.reverse());
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
