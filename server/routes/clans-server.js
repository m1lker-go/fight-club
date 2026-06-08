const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { containsForbiddenWords } = require('../utils/forbiddenWords');
const { getMoscowDateString } = require('../utils/ServerTime'); // единая функция времени

// ------------------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ -------------------

function getMaxMembers(level) {
    return 10 + Math.floor((level - 1) / 5);
}

function getExpNeeded(level) {
    return Math.floor(1000 * Math.pow(level, 1.45) / 1000) * 1000;
}

// Валидация названия клана (3-30 символов, без мата)
function isValidClanName(name) {
    if (!name || name.length < 3 || name.length > 30) return false;
    return !containsForbiddenWords(name);
}

// Валидация описания клана (не более 150 символов, без мата, пустое допустимо)
function isValidClanDescription(description) {
    if (!description) return true;
    if (description.length > 150) return false;
    return !containsForbiddenWords(description);
}

async function addClanExp(clanId, expGain, client) {
    const clanRes = await client.query('SELECT level, exp FROM clans WHERE id = $1', [clanId]);
    if (clanRes.rows.length === 0) return;
    let { level, exp } = clanRes.rows[0];
    exp += expGain;
    let leveledUp = false;
    while (exp >= getExpNeeded(level)) {
        exp -= getExpNeeded(level);
        level++;
        leveledUp = true;
    }
    await client.query('UPDATE clans SET level = $1, exp = $2 WHERE id = $3', [level, exp, clanId]);
    if (leveledUp) {
        const members = await client.query('SELECT user_id FROM clan_members WHERE clan_id = $1', [clanId]);
        for (const m of members.rows) {
            await client.query(
                `INSERT INTO user_messages (user_id, from_text, subject, body, is_read, is_claimed)
                 VALUES ($1, 'Система', 'Уровень клана повышен!', 
                 'Ваш клан достиг уровня ' || $2 || '! Открыты новые возможности.', false, false)`,
                [m.user_id, level]
            );
        }
    }
}

async function getUserRoleInClan(userId, client) {
    const res = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) return null;
    return { clanId: res.rows[0].clan_id, role: res.rows[0].role };
}

async function isLeaderOrOfficer(userId, clanId, client) {
    const res = await client.query('SELECT role FROM clan_members WHERE user_id = $1 AND clan_id = $2', [userId, clanId]);
    if (res.rows.length === 0) return false;
    return res.rows[0].role === 'leader' || res.rows[0].role === 'officer';
}

// ------------------- ЭНДПОИНТЫ -------------------

// 1. Создание клана
router.post('/create', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { name, icon_id, icon_bg_color, icon_border_color, icon_color, payment_method } = req.body;
    
    if (!isValidClanName(name)) return res.status(400).json({ error: 'Некорректное название (3-30 символов, без мата)' });
    if (!icon_id || icon_id < 1 || icon_id > 10) return res.status(400).json({ error: 'Неверный ID иконки' });
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(icon_bg_color) || !hexPattern.test(icon_border_color) || !hexPattern.test(icon_color))
        return res.status(400).json({ error: 'Неверный формат цвета' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const existing = await client.query('SELECT 1 FROM clan_members WHERE user_id = $1', [userId]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'Вы уже состоите в клане' });
        
        let coinsCost = 0, diamondsCost = 0;
        if (payment_method === 'coins') {
            coinsCost = 2000;
            const user = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
            if (user.rows[0].coins < coinsCost) throw new Error('Not enough coins');
            await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [coinsCost, userId]);
        } else if (payment_method === 'diamonds') {
            diamondsCost = 150;
            const user = await client.query('SELECT diamonds FROM users WHERE id = $1', [userId]);
            if (user.rows[0].diamonds < diamondsCost) throw new Error('Not enough diamonds');
            await client.query('UPDATE users SET diamonds = diamonds - $1 WHERE id = $2', [diamondsCost, userId]);
        } else return res.status(400).json({ error: 'Неверный способ оплаты' });
        
        const newClan = await client.query(
            `INSERT INTO clans (name, icon_id, icon_bg_color, icon_border_color, icon_color, leader_id, coins_cost, diamonds_cost, join_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open') RETURNING *`,
            [name, icon_id, icon_bg_color, icon_border_color, icon_color, userId, coinsCost, diamondsCost]
        );
        const clan = newClan.rows[0];
        await client.query(`INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'leader')`, [clan.id, userId]);
        await client.query(`INSERT INTO clan_treasury (clan_id, coins) VALUES ($1, 0)`, [clan.id]);
        await client.query(`INSERT INTO clan_bonuses (clan_id) VALUES ($1)`, [clan.id]);
        await client.query('COMMIT');
        res.json({ success: true, clan });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Create clan error:', e);
        if (e.message === 'Not enough coins') res.status(400).json({ error: 'Недостаточно монет' });
        else if (e.message === 'Not enough diamonds') res.status(400).json({ error: 'Недостаточно алмазов' });
        else if (e.code === '23505') res.status(400).json({ error: 'Клан с таким названием уже существует' });
        else res.status(500).json({ error: 'Ошибка создания клана' });
    } finally { client.release(); }
});

// 2. Получить информацию о своём клане
router.get('/my', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) return res.json({ inClan: false });
        const clanId = memberRes.rows[0].clan_id;
        const clanRes = await client.query(
            `SELECT c.*, (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count
             FROM clans c WHERE c.id = $1`,
            [clanId]
        );
        const clan = clanRes.rows[0];
        const membersRes = await client.query(
            `SELECT u.id, u.username, u.avatar_id, cm.role, cm.joined_at, u.last_energy
             FROM clan_members cm JOIN users u ON cm.user_id = u.id
             WHERE cm.clan_id = $1
             ORDER BY cm.role = 'leader' DESC, cm.joined_at`,
            [clanId]
        );
        const today = getMoscowDateString();
        const checkedRes = await client.query(
            `SELECT user_id FROM clan_members WHERE clan_id = $1 AND daily_checkin_date = $2`,
            [clanId, today]
        );
        const checkedTodayList = checkedRes.rows.map(r => r.user_id);
        res.json({
            inClan: true,
            clan,
            members: membersRes.rows,
            userRole: memberRes.rows[0].role,
            checkedTodayList
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

// 3. Список кланов
router.get('/list', async (req, res) => {
    const { page = 1, search = '' } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    const client = await pool.connect();
    try {
        const query = `
            SELECT c.id, c.name, c.icon_id, c.icon_bg_color, c.icon_border_color, c.icon_color,
                   c.level, c.exp, c.join_type,
                   (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as current_members
            FROM clans c
            WHERE c.name ILIKE $1
            ORDER BY c.level DESC, c.name
            LIMIT $2 OFFSET $3
        `;
        const values = [`%${search}%`, limit, offset];
        const clans = await client.query(query, values);
        res.json(clans.rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

// 4. Вступление в клан
router.post('/join', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { clan_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const existing = await client.query('SELECT 1 FROM clan_members WHERE user_id = $1', [userId]);
        if (existing.rows.length > 0) throw new Error('Вы уже состоите в клане');
        
        const clanRes = await client.query(
            'SELECT level, join_type, (SELECT COUNT(*) FROM clan_members WHERE clan_id = $1) as member_count FROM clans WHERE id = $1',
            [clan_id]
        );
        if (clanRes.rows.length === 0) throw new Error('Клан не найден');
        const { level, join_type, member_count } = clanRes.rows[0];
        if (join_type !== 'open') throw new Error('Клан не принимает мгновенное вступление');
        const maxMembers = getMaxMembers(level);
        if (member_count >= maxMembers) throw new Error('Нет свободных мест');
        
        await client.query(`INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'member')`, [clan_id, userId]);
        const userRes = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
        const username = userRes.rows[0].username;
        await client.query(
            `INSERT INTO clan_messages (clan_id, user_id, message, created_at) VALUES ($1, $2, $3, NOW())`,
            [clan_id, userId, `${username} вступил в клан!`]
        );
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 5. Выход из клана
router.post('/leave', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const memberRes = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Вы не в клане');
        const { clan_id, role } = memberRes.rows[0];
        if (role === 'leader') throw new Error('Лидер должен передать руководство перед выходом');
        await client.query('DELETE FROM clan_members WHERE user_id = $1', [userId]);
        const userRes = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
        const username = userRes.rows[0].username;
        await client.query(
            `INSERT INTO clan_messages (clan_id, user_id, message, created_at) VALUES ($1, $2, $3, NOW())`,
            [clan_id, userId, `${username} покинул клан`]
        );
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 6. Исключение участника
router.post('/kick', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { target_user_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const current = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (current.rows.length === 0) throw new Error('Вы не в клане');
        const { clan_id, role } = current.rows[0];
        if (role !== 'leader' && role !== 'officer') throw new Error('Недостаточно прав');
        const target = await client.query('SELECT role FROM clan_members WHERE user_id = $1 AND clan_id = $2', [target_user_id, clan_id]);
        if (target.rows.length === 0) throw new Error('Пользователь не в клане');
        if (target.rows[0].role === 'leader') throw new Error('Нельзя исключить лидера');
        await client.query('DELETE FROM clan_members WHERE user_id = $1 AND clan_id = $2', [target_user_id, clan_id]);
        const userRes = await client.query('SELECT username FROM users WHERE id = $1', [target_user_id]);
        const username = userRes.rows[0].username;
        await client.query(
            `INSERT INTO clan_messages (clan_id, user_id, message, created_at) VALUES ($1, $2, $3, NOW())`,
            [clan_id, userId, `${username} был исключён из клана`]
        );
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 7. Изменение роли
router.post('/promote', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { target_user_id, role } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const current = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (current.rows.length === 0) throw new Error('Вы не в клане');
        const { clan_id, role: currentRole } = current.rows[0];
        if (currentRole !== 'leader') throw new Error('Только лидер может изменять роли');
        
        const target = await client.query('SELECT role FROM clan_members WHERE user_id = $1 AND clan_id = $2', [target_user_id, clan_id]);
        if (target.rows.length === 0) throw new Error('Пользователь не в клане');
        const targetRole = target.rows[0].role;
        if (targetRole === 'leader') throw new Error('Нельзя изменить роль лидера');
        
        let newRole;
        if (role === 'officer') {
            if (targetRole === 'officer') throw new Error('Пользователь уже офицер');
            newRole = 'officer';
        } else if (role === 'member') {
            if (targetRole === 'member') throw new Error('Пользователь уже участник');
            newRole = 'member';
        } else {
            throw new Error('Некорректная роль');
        }
        
        await client.query('UPDATE clan_members SET role = $1 WHERE user_id = $2 AND clan_id = $3', [newRole, target_user_id, clan_id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 8. Передать лидерство
router.post('/transfer', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { target_user_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const current = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (current.rows.length === 0) throw new Error('Вы не в клане');
        const { clan_id, role } = current.rows[0];
        if (role !== 'leader') throw new Error('Только лидер может передать руководство');
        const target = await client.query('SELECT 1 FROM clan_members WHERE user_id = $1 AND clan_id = $2', [target_user_id, clan_id]);
        if (target.rows.length === 0) throw new Error('Пользователь не в вашем клане');
        await client.query('UPDATE clan_members SET role = $1 WHERE user_id = $2 AND clan_id = $3', ['member', userId, clan_id]);
        await client.query('UPDATE clan_members SET role = $1 WHERE user_id = $2 AND clan_id = $3', ['leader', target_user_id, clan_id]);
        await client.query('UPDATE clans SET leader_id = $1 WHERE id = $2', [target_user_id, clan_id]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 9. Чат: отправить сообщение
router.post('/chat/send', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { message } = req.body;
    if (!message || message.length > 200) return res.status(400).json({ error: 'Сообщение не может быть пустым или длиннее 200 символов' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Вы не состоите в клане');
        const clanId = memberRes.rows[0].clan_id;
        await client.query(`INSERT INTO clan_messages (clan_id, user_id, message, created_at) VALUES ($1, $2, $3, NOW())`, [clanId, userId, message]);
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 10. Чат: получить сообщения
router.get('/chat', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) return res.json([]);
        const clanId = memberRes.rows[0].clan_id;
        const messages = await client.query(
            `SELECT cm.message, cm.created_at, u.username, u.avatar_id
             FROM clan_messages cm JOIN users u ON cm.user_id = u.id
             WHERE cm.clan_id = $1
             ORDER BY cm.created_at DESC LIMIT 100`,
            [clanId]
        );
        res.json(messages.rows.reverse());
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

// 11. Ежедневная отметка - статус
router.get('/checkin/status', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query(
            `SELECT clan_id, daily_checkin_date FROM clan_members WHERE user_id = $1`,
            [userId]
        );
        if (memberRes.rows.length === 0) return res.json({ error: 'Не в клане' });
        const today = getMoscowDateString();
        const lastCheckin = memberRes.rows[0].daily_checkin_date;
        const alreadyChecked = lastCheckin ? (toMoscowDateString(lastCheckin) === today) : false;
        const totalMembers = await client.query(`SELECT COUNT(*) FROM clan_members WHERE clan_id = $1`, [memberRes.rows[0].clan_id]);
        const checkedToday = await client.query(
            `SELECT COUNT(*) FROM clan_members WHERE clan_id = $1 AND daily_checkin_date = $2`,
            [memberRes.rows[0].clan_id, today]
        );
        res.json({
            already_checked: alreadyChecked,
            checked_today: parseInt(checkedToday.rows[0].count),
            total_members: parseInt(totalMembers.rows[0].count)
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 12. Ежедневная отметка - выполнение (атомарный UPDATE)
router.post('/checkin', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // 1. Получаем clan_id (пользователь может быть только в одном клане)
        const memberRes = await client.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Вы не в клане');
        const clanId = memberRes.rows[0].clan_id;
        const today = getMoscowDateString();

        // 2. Атомарно обновляем дату, только если она ещё не равна сегодня
        const updateRes = await client.query(
            `UPDATE clan_members 
             SET daily_checkin_date = $1 
             WHERE user_id = $2 AND (daily_checkin_date IS NULL OR daily_checkin_date != $3)`,
            [today, userId, today]
        );
        if (updateRes.rowCount === 0) {
            throw new Error('Вы уже отметились сегодня');
        }

        // 3. Начисляем награды
        await client.query('UPDATE users SET coins = coins + 50, coal = coal + 5 WHERE id = $1', [userId]);
        await addClanExp(clanId, 10, client);

        // 4. Бонус за полную отметку всего клана
        const total = await client.query('SELECT COUNT(*) FROM clan_members WHERE clan_id = $1', [clanId]);
        const checked = await client.query(
            'SELECT COUNT(*) FROM clan_members WHERE clan_id = $1 AND daily_checkin_date = $2',
            [clanId, today]
        );
        if (parseInt(checked.rows[0].count) === parseInt(total.rows[0].count)) {
            await addClanExp(clanId, 100, client);
        }

        await client.query('COMMIT');
        res.json({ success: true, coins: 50, coal: 5 });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 13. Клановая казна
router.get('/treasury', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Не в клане');
        const clanId = memberRes.rows[0].clan_id;
        const treasury = await client.query('SELECT coins FROM clan_treasury WHERE clan_id = $1', [clanId]);
        res.json({ coins: treasury.rows[0]?.coins || 0 });
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 14. Пожертвовать монеты
router.post('/donate', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Неверная сумма' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const memberRes = await client.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Не в клане');
        const clanId = memberRes.rows[0].clan_id;
        const userRes = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
        if (userRes.rows[0].coins < amount) throw new Error('Недостаточно монет');
        await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [amount, userId]);
        await client.query('UPDATE clan_treasury SET coins = coins + $1 WHERE clan_id = $2', [amount, clanId]);
        const expGain = Math.floor(amount / 100);
        if (expGain > 0) await addClanExp(clanId, expGain, client);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 15. Клановые бонусы
router.get('/bonuses', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Не в клане');
        const clanId = memberRes.rows[0].clan_id;
        const bonuses = await client.query('SELECT * FROM clan_bonuses WHERE clan_id = $1', [clanId]);
        if (bonuses.rows.length === 0) {
            await client.query('INSERT INTO clan_bonuses (clan_id) VALUES ($1)', [clanId]);
            res.json({ total_points: 0, bonus_hp:0, bonus_attack:0, bonus_defense:0, bonus_agility:0, bonus_crit_damage:0, bonus_vampirism:0 });
        } else res.json(bonuses.rows[0]);
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 16. Купить очко навыка
router.post('/buy-point', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roleInfo = await getUserRoleInClan(userId, client);
        if (!roleInfo || roleInfo.role !== 'leader') throw new Error('Только лидер может покупать очки');
        const clanId = roleInfo.clanId;
        const clan = await client.query('SELECT level FROM clans WHERE id = $1', [clanId]);
        const level = clan.rows[0].level;
        const bonuses = await client.query('SELECT total_points FROM clan_bonuses WHERE clan_id = $1', [clanId]);
        let totalPoints = bonuses.rows[0]?.total_points || 0;
        const maxPoints = level * 5;
        if (totalPoints >= maxPoints) throw new Error('Достигнут максимум очков для этого уровня');
        let cost = 2000;
        if (totalPoints >= 5 && totalPoints < 10) cost = 3000;
        else if (totalPoints >= 10 && totalPoints < 20) cost = 4500;
        else if (totalPoints >= 20) cost = 6000;
        const treasury = await client.query('SELECT coins FROM clan_treasury WHERE clan_id = $1', [clanId]);
        if (treasury.rows[0].coins < cost) throw new Error('Недостаточно монет в казне');
        await client.query('UPDATE clan_treasury SET coins = coins - $1 WHERE clan_id = $2', [cost, clanId]);
        totalPoints++;
        await client.query('UPDATE clan_bonuses SET total_points = $1 WHERE clan_id = $2', [totalPoints, clanId]);
        await client.query('COMMIT');
        res.json({ success: true, total_points: totalPoints, cost });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 17. Перераспределить очки
router.post('/redistribute', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { bonus_hp, bonus_attack, bonus_defense, bonus_agility, bonus_crit_damage, bonus_vampirism } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roleInfo = await getUserRoleInClan(userId, client);
        if (!roleInfo || roleInfo.role !== 'leader') throw new Error('Только лидер может распределять очки');
        const clanId = roleInfo.clanId;
        const bonuses = await client.query('SELECT total_points FROM clan_bonuses WHERE clan_id = $1', [clanId]);
        const totalPoints = bonuses.rows[0]?.total_points || 0;
        const sum = (bonus_hp||0)+(bonus_attack||0)+(bonus_defense||0)+(bonus_agility||0)+(bonus_crit_damage||0)+(bonus_vampirism||0);
        if (sum !== totalPoints) throw new Error('Сумма распределённых очков не равна купленным');
        await client.query(
            `UPDATE clan_bonuses SET 
                bonus_hp = $1, bonus_attack = $2, bonus_defense = $3, bonus_agility = $4, bonus_crit_damage = $5, bonus_vampirism = $6
             WHERE clan_id = $7`,
            [bonus_hp||0, bonus_attack||0, bonus_defense||0, bonus_agility||0, bonus_crit_damage||0, bonus_vampirism||0, clanId]
        );
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally { client.release(); }
});

// 18. Получить публичную информацию о клане
router.get('/:id', async (req, res) => {
    const clanId = parseInt(req.params.id);
    if (isNaN(clanId)) return res.status(400).json({ error: 'Invalid clan ID' });
    const userId = req.userId;
    const client = await pool.connect();
    try {
        const clanRes = await client.query(
            `SELECT c.*, (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count
             FROM clans c WHERE c.id = $1`,
            [clanId]
        );
        if (clanRes.rows.length === 0) return res.status(404).json({ error: 'Клан не найден' });
        const clan = clanRes.rows[0];

        const membersRes = await client.query(
            `SELECT u.id, u.username, u.avatar_id, cm.role, cm.joined_at, u.last_energy, 0 as power
             FROM clan_members cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.clan_id = $1
             ORDER BY cm.role = 'leader' DESC, cm.joined_at`,
            [clanId]
        );

        let userMembership = null;
        if (userId) {
            const userMember = await client.query(
                'SELECT role FROM clan_members WHERE user_id = $1 AND clan_id = $2',
                [userId, clanId]
            );
            if (userMember.rows.length) userMembership = userMember.rows[0].role;
        }

        let userApplicationStatus = null;
        if (userId) {
            const appCheck = await client.query(
                'SELECT status FROM clan_applications WHERE clan_id = $1 AND user_id = $2 AND status = $3',
                [clanId, userId, 'pending']
            );
            if (appCheck.rows.length > 0) userApplicationStatus = appCheck.rows[0].status;
        }

        res.json({ clan, members: membersRes.rows, userMembership, userApplicationStatus });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 19. Редактирование настроек клана
router.put('/:id/settings', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const clanId = parseInt(req.params.id);
    if (isNaN(clanId)) return res.status(400).json({ error: 'Invalid clan ID' });
    const { name, description, icon_id, icon_bg_color, icon_border_color, icon_color, join_type } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roleRes = await client.query('SELECT role FROM clan_members WHERE user_id = $1 AND clan_id = $2', [userId, clanId]);
        if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'leader') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Только лидер может редактировать клан' });
        }
        if (name !== undefined) {
            if (!isValidClanName(name)) throw new Error('Некорректное название (3-30 символов, без мата)');
            const existing = await client.query('SELECT id FROM clans WHERE name = $1 AND id != $2', [name, clanId]);
            if (existing.rows.length > 0) throw new Error('Клан с таким названием уже существует');
            await client.query('UPDATE clans SET name = $1 WHERE id = $2', [name, clanId]);
        }
        if (description !== undefined) {
            if (!isValidClanDescription(description)) throw new Error('Описание должно быть не длиннее 150 символов и не содержать запрещённых слов');
            await client.query('UPDATE clans SET description = $1 WHERE id = $2', [description, clanId]);
        }
        if (join_type !== undefined) {
            if (!['open', 'application', 'invite_only'].includes(join_type)) throw new Error('Неверный тип вступления');
            await client.query('UPDATE clans SET join_type = $1 WHERE id = $2', [join_type, clanId]);
        }
        if (icon_id !== undefined && icon_id >= 1 && icon_id <= 10) await client.query('UPDATE clans SET icon_id = $1 WHERE id = $2', [icon_id, clanId]);
        if (icon_bg_color && /^#[0-9A-Fa-f]{6}$/i.test(icon_bg_color)) await client.query('UPDATE clans SET icon_bg_color = $1 WHERE id = $2', [icon_bg_color, clanId]);
        if (icon_border_color && /^#[0-9A-Fa-f]{6}$/i.test(icon_border_color)) await client.query('UPDATE clans SET icon_border_color = $1 WHERE id = $2', [icon_border_color, clanId]);
        if (icon_color && /^#[0-9A-Fa-f]{6}$/i.test(icon_color)) await client.query('UPDATE clans SET icon_color = $1 WHERE id = $2', [icon_color, clanId]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 20. Расформировать клан
router.delete('/:id', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const clanId = parseInt(req.params.id);
    if (isNaN(clanId)) return res.status(400).json({ error: 'Invalid clan ID' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roleRes = await client.query('SELECT role FROM clan_members WHERE user_id = $1 AND clan_id = $2', [userId, clanId]);
        if (roleRes.rows.length === 0 || roleRes.rows[0].role !== 'leader') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Только лидер может расформировать клан' });
        }
        await client.query('DELETE FROM clan_members WHERE clan_id = $1', [clanId]);
        await client.query('DELETE FROM clan_messages WHERE clan_id = $1', [clanId]);
        await client.query('DELETE FROM clan_treasury WHERE clan_id = $1', [clanId]);
        await client.query('DELETE FROM clan_bonuses WHERE clan_id = $1', [clanId]);
        await client.query('DELETE FROM clans WHERE id = $1', [clanId]);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally { client.release(); }
});

// 21. Подать заявку
router.post('/apply', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { clan_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const existingMember = await client.query('SELECT 1 FROM clan_members WHERE user_id = $1', [userId]);
        if (existingMember.rows.length > 0) throw new Error('Вы уже состоите в клане');
        const clanRes = await client.query('SELECT id, join_type FROM clans WHERE id = $1', [clan_id]);
        if (clanRes.rows.length === 0) throw new Error('Клан не найден');
        const { join_type } = clanRes.rows[0];
        if (join_type !== 'application') throw new Error('Этот клан не принимает заявки');
        const existingApp = await client.query(
            'SELECT 1 FROM clan_applications WHERE clan_id = $1 AND user_id = $2 AND status = $3',
            [clan_id, userId, 'pending']
        );
        if (existingApp.rows.length > 0) throw new Error('Вы уже подали заявку в этот клан');
        await client.query(
            'INSERT INTO clan_applications (clan_id, user_id, status, created_at) VALUES ($1, $2, $3, NOW())',
            [clan_id, userId, 'pending']
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

// 22. Отменить свою заявку
router.post('/cancel-application', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { clan_id } = req.body;
    const client = await pool.connect();
    try {
        const result = await client.query(
            'DELETE FROM clan_applications WHERE clan_id = $1 AND user_id = $2 AND status = $3',
            [clan_id, userId, 'pending']
        );
        if (result.rowCount === 0) throw new Error('Заявка не найдена');
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 23. Получить список заявок для лидера
router.get('/applications', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Вы не в клане');
        if (memberRes.rows[0].role !== 'leader') throw new Error('Только лидер может просматривать заявки');
        const clanId = memberRes.rows[0].clan_id;

        const apps = await client.query(
            `SELECT ca.id, ca.user_id, ca.created_at, u.username, u.avatar_id,
                    u.level AS hero_level, 
                    u.current_class AS hero_class,
                    (SELECT power FROM user_classes WHERE user_id = u.id AND class = u.current_class LIMIT 1) AS power
             FROM clan_applications ca
             JOIN users u ON ca.user_id = u.id
             WHERE ca.clan_id = $1 AND ca.status = 'pending'
             ORDER BY ca.created_at ASC`,
            [clanId]
        );
        res.json(apps.rows);
    } catch (e) {
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 24. Принять заявку
router.post('/accept-application', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { application_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const memberRes = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Вы не в клане');
        if (memberRes.rows[0].role !== 'leader') throw new Error('Только лидер может принимать заявки');
        const clanId = memberRes.rows[0].clan_id;
        const appRes = await client.query(
            'SELECT user_id FROM clan_applications WHERE id = $1 AND clan_id = $2 AND status = $3',
            [application_id, clanId, 'pending']
        );
        if (appRes.rows.length === 0) throw new Error('Заявка не найдена');
        const applicantId = appRes.rows[0].user_id;
        const existing = await client.query('SELECT 1 FROM clan_members WHERE user_id = $1', [applicantId]);
        if (existing.rows.length > 0) throw new Error('Пользователь уже в клане');
        const clanInfo = await client.query('SELECT level, name FROM clans WHERE id = $1', [clanId]);
        const level = clanInfo.rows[0].level;
        const memberCountRes = await client.query('SELECT COUNT(*) FROM clan_members WHERE clan_id = $1', [clanId]);
        const memberCount = parseInt(memberCountRes.rows[0].count);
        const maxMembers = getMaxMembers(level);
        if (memberCount >= maxMembers) throw new Error('Нет свободных мест');
        await client.query('INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, $3)', [clanId, applicantId, 'member']);
        await client.query('DELETE FROM clan_applications WHERE id = $1', [application_id]);
        await client.query(
            `INSERT INTO user_messages (user_id, from_text, subject, body, is_read, is_claimed)
             VALUES ($1, 'Система', 'Заявка принята', $2, false, false)`,
            [applicantId, `Ваша заявка на вступление в клан "${clanInfo.rows[0].name}" принята!`]
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

// 25. Отклонить заявку
router.post('/reject-application', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { application_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const memberRes = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Вы не в клане');
        if (memberRes.rows[0].role !== 'leader') throw new Error('Только лидер может отклонять заявки');
        const clanId = memberRes.rows[0].clan_id;
        const appRes = await client.query(
            'SELECT user_id FROM clan_applications WHERE id = $1 AND clan_id = $2 AND status = $3',
            [application_id, clanId, 'pending']
        );
        if (appRes.rows.length === 0) throw new Error('Заявка не найдена');
        const applicantId = appRes.rows[0].user_id;
        await client.query('DELETE FROM clan_applications WHERE id = $1', [application_id]);
        await client.query(
            `INSERT INTO user_messages (user_id, from_text, subject, body, is_read, is_claimed)
             VALUES ($1, 'Система', 'Заявка отклонена', 'Ваша заявка на вступление в клан отклонена лидером.', false, false)`,
            [applicantId]
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

// 26. Изменить один клановый талант
router.post('/adjust-talent', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { stat, delta } = req.body;
    if (!stat || (delta !== 1 && delta !== -1)) {
        return res.status(400).json({ error: 'Неверные параметры' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roleInfo = await getUserRoleInClan(userId, client);
        if (!roleInfo || roleInfo.role !== 'leader') {
            throw new Error('Только лидер может распределять таланты');
        }
        const clanId = roleInfo.clanId;

        const bonusesRes = await client.query('SELECT * FROM clan_bonuses WHERE clan_id = $1', [clanId]);
        if (bonusesRes.rows.length === 0) {
            await client.query('INSERT INTO clan_bonuses (clan_id) VALUES ($1)', [clanId]);
            return res.json({ success: true });
        }
        const bonuses = bonusesRes.rows[0];
        const totalPoints = bonuses.total_points;

        const fieldMap = {
            'hp': 'bonus_hp',
            'attack': 'bonus_attack',
            'defense': 'bonus_defense',
            'agility': 'bonus_agility',
            'crit_damage': 'bonus_crit_damage',
            'vampirism': 'bonus_vampirism'
        };
        const field = fieldMap[stat];
        if (!field) throw new Error('Неверная характеристика');

        const currentVal = bonuses[field] || 0;
        let newVal = currentVal + delta;
        if (newVal < 0) throw new Error('Значение не может быть отрицательным');

        let sum = 0;
        for (const f of Object.values(fieldMap)) {
            if (f === field) sum += newVal;
            else sum += (bonuses[f] || 0);
        }
        if (sum > totalPoints) {
            throw new Error('Нельзя распределить больше очков, чем куплено');
        }

        await client.query(`UPDATE clan_bonuses SET ${field} = $1 WHERE clan_id = $2`, [newVal, clanId]);

        await client.query('COMMIT');
        res.json({ success: true, newValue: newVal });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
