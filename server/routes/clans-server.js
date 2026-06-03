const express = require('express');
const router = express.Router();
const { pool } = require('../db');


// ------------------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ -------------------

// Запрещённые слова (добавьте реальные)
const forbiddenWords = ['мат', 'хуй', 'пизда', 'бля', 'ебать'];

function isNameValid(name) {
    if (!name || name.length < 3 || name.length > 30) return false;
    const lower = name.toLowerCase();
    for (const word of forbiddenWords) {
        if (lower.includes(word)) return false;
    }
    return true;
}

// Начисление опыта клану (и повышение уровня)
async function addClanExp(clanId, expGain, client) {
    const clanRes = await client.query('SELECT level, exp FROM clans WHERE id = $1', [clanId]);
    if (clanRes.rows.length === 0) return;
    let { level, exp } = clanRes.rows[0];
    exp += expGain;
    const expNeeded = level * 100; // формула: 100 * уровень
    let leveledUp = false;
    while (exp >= expNeeded) {
        exp -= expNeeded;
        level++;
        leveledUp = true;
    }
    await client.query('UPDATE clans SET level = $1, exp = $2 WHERE id = $3', [level, exp, clanId]);
    if (leveledUp) {
        // Уведомление участников
        const members = await client.query('SELECT user_id FROM clan_members WHERE clan_id = $1', [clanId]);
        for (const m of members.rows) {
            await client.query(
                `INSERT INTO messages (user_id, from_text, subject, body, is_read, is_claimed)
                 VALUES ($1, 'Система', 'Уровень клана повышен!', 
                 'Ваш клан достиг уровня ' || $2 || '! Открыты новые возможности.', false, false)`,
                [m.user_id, level]
            );
        }
    }
}

// Получить роль пользователя в клане
async function getUserRoleInClan(userId, client) {
    const res = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
    if (res.rows.length === 0) return null;
    return { clanId: res.rows[0].clan_id, role: res.rows[0].role };
}

// Проверка прав (leader или officer)
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
    const { name, icon_class, icon_bg_color, icon_border_color, icon_color, payment_method } = req.body;
    
    if (!isNameValid(name)) {
        return res.status(400).json({ error: 'Некорректное название (3-30 символов, без мата)' });
    }
    const allowedIcons = ['fa-sword', 'fa-axe', 'fa-shield-halded', 'fa-cat', 'fa-dog', 'fa-skull', 'fa-mask', 'fa-crown', 'fa-bolt', 'fa-dragon'];
    if (!allowedIcons.includes(icon_class)) {
        return res.status(400).json({ error: 'Неверная иконка' });
    }
    // Простая валидация цветов (hex)
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    if (!hexPattern.test(icon_bg_color) || !hexPattern.test(icon_border_color) || !hexPattern.test(icon_color)) {
        return res.status(400).json({ error: 'Неверный формат цвета' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Проверяем, не состоит ли уже в клане
        const existing = await client.query('SELECT 1 FROM clan_members WHERE user_id = $1', [userId]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Вы уже состоите в клане' });
        }
        
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
        } else {
            return res.status(400).json({ error: 'Неверный способ оплаты' });
        }
        
        const newClan = await client.query(
            `INSERT INTO clans (name, icon_class, icon_bg_color, icon_border_color, icon_color, leader_id, coins_cost, diamonds_cost)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [name, icon_class, icon_bg_color, icon_border_color, icon_color, userId, coinsCost, diamondsCost]
        );
        const clan = newClan.rows[0];
        await client.query(
            `INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, 'leader')`,
            [clan.id, userId]
        );
        // Создаём запись в казне и бонусах
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
    } finally {
        client.release();
    }
});

// 2. Получить информацию о своём клане
router.get('/my', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) {
            return res.json({ inClan: false });
        }
        const clanId = memberRes.rows[0].clan_id;
        const clanRes = await client.query(
            `SELECT c.*, 
                    (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) as member_count
             FROM clans c WHERE c.id = $1`,
            [clanId]
        );
        const clan = clanRes.rows[0];
        const membersRes = await client.query(
            `SELECT u.id, u.username, u.avatar_id, cm.role, cm.joined_at
             FROM clan_members cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.clan_id = $1
             ORDER BY cm.role = 'leader' DESC, cm.joined_at`,
            [clanId]
        );
        res.json({ inClan: true, clan, members: membersRes.rows, userRole: memberRes.rows[0].role });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 3. Список кланов (с пагинацией и поиском)
router.get('/list', async (req, res) => {
    const { page = 1, search = '' } = req.query;
    const limit = 20;
    const offset = (page - 1) * limit;
    const client = await pool.connect();
    try {
        let query = `
            SELECT c.id, c.name, c.icon_class, c.icon_bg_color, c.icon_border_color, c.icon_color,
                   c.level, c.exp,
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
    } finally {
        client.release();
    }
});

// 4. Вступление в открытый клан
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
        const maxMembers = 10 + (level - 1);
        if (member_count >= maxMembers) throw new Error('Нет свободных мест');
        
        await client.query(
            'INSERT INTO clan_members (clan_id, user_id, role) VALUES ($1, $2, $3)',
            [clan_id, userId, 'member']
        );
        const userRes = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
        const username = userRes.rows[0].username;
        await client.query(
            `INSERT INTO clan_messages (clan_id, user_id, message, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [clan_id, userId, `${username} вступил в клан!`]
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
            `INSERT INTO clan_messages (clan_id, user_id, message, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [clan_id, userId, `${username} покинул клан`]
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

// 6. Исключение участника (только лидер/офицер)
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
            `INSERT INTO clan_messages (clan_id, user_id, message, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [clan_id, userId, `${username} был исключён из клана`]
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

// 7. Назначить офицером (только лидер)
router.post('/promote', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { target_user_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const current = await client.query('SELECT clan_id, role FROM clan_members WHERE user_id = $1', [userId]);
        if (current.rows.length === 0) throw new Error('Вы не в клане');
        const { clan_id, role } = current.rows[0];
        if (role !== 'leader') throw new Error('Только лидер может назначать офицеров');
        await client.query(
            'UPDATE clan_members SET role = $1 WHERE user_id = $2 AND clan_id = $3',
            ['officer', target_user_id, clan_id]
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
    } finally {
        client.release();
    }
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
        await client.query(
            `INSERT INTO clan_messages (clan_id, user_id, message, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [clanId, userId, message]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
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
             FROM clan_messages cm
             JOIN users u ON cm.user_id = u.id
             WHERE cm.clan_id = $1
             ORDER BY cm.created_at DESC
             LIMIT 100`,
            [clanId]
        );
        res.json(messages.rows.reverse());
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 11. Ежедневная отметка (check-in)
router.get('/checkin/status', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const memberRes = await client.query('SELECT clan_id, daily_checkin_date FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) return res.json({ error: 'Не в клане' });
        const today = new Date().toISOString().slice(0,10);
        const alreadyChecked = memberRes.rows[0].daily_checkin_date === today;
        const totalMembers = await client.query('SELECT COUNT(*) FROM clan_members WHERE clan_id = $1', [memberRes.rows[0].clan_id]);
        const checkedToday = await client.query('SELECT COUNT(*) FROM clan_members WHERE clan_id = $1 AND daily_checkin_date = $2', [memberRes.rows[0].clan_id, today]);
        res.json({ already_checked: alreadyChecked, checked_today: parseInt(checkedToday.rows[0].count), total_members: parseInt(totalMembers.rows[0].count) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/checkin', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const memberRes = await client.query('SELECT clan_id, daily_checkin_date FROM clan_members WHERE user_id = $1', [userId]);
        if (memberRes.rows.length === 0) throw new Error('Вы не в клане');
        const clanId = memberRes.rows[0].clan_id;
        const today = new Date().toISOString().slice(0,10);
        if (memberRes.rows[0].daily_checkin_date === today) throw new Error('Вы уже отметились сегодня');
        
        // Награда игроку
        const coinsReward = 50;
        const coalReward = 5;
        await client.query('UPDATE users SET coins = coins + $1, coal = coal + $2 WHERE id = $3', [coinsReward, coalReward, userId]);
        
        // Обновляем дату отметки
        await client.query('UPDATE clan_members SET daily_checkin_date = $1 WHERE user_id = $2', [today, userId]);
        
        // Начисляем опыт клану +10
        await addClanExp(clanId, 10, client);
        
        // Проверяем, отметились ли все участники
        const totalMembers = await client.query('SELECT COUNT(*) FROM clan_members WHERE clan_id = $1', [clanId]);
        const checkedToday = await client.query('SELECT COUNT(*) FROM clan_members WHERE clan_id = $1 AND daily_checkin_date = $2', [clanId, today]);
        if (parseInt(checkedToday.rows[0].count) === parseInt(totalMembers.rows[0].count)) {
            await addClanExp(clanId, 100, client);
        }
        
        await client.query('COMMIT');
        res.json({ success: true, coins: coinsReward, coal: coalReward });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 12. Клановая казна (получить)
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
    } finally {
        client.release();
    }
});

// 13. Пожертвовать монеты в казну
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
        
        // Проверяем баланс игрока
        const userRes = await client.query('SELECT coins FROM users WHERE id = $1', [userId]);
        if (userRes.rows[0].coins < amount) throw new Error('Недостаточно монет');
        
        // Списываем у игрока
        await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [amount, userId]);
        // Добавляем в казну
        await client.query('UPDATE clan_treasury SET coins = coins + $1 WHERE clan_id = $2', [amount, clanId]);
        
        // Начисляем опыт клану за каждые 100 монет
        const expGain = Math.floor(amount / 100);
        if (expGain > 0) {
            await addClanExp(clanId, expGain, client);
        }
        
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 14. Клановые бонусы (получить)
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
        } else {
            res.json(bonuses.rows[0]);
        }
    } catch (e) {
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 15. Купить очко навыка (только лидер)
router.post('/buy-point', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const roleInfo = await getUserRoleInClan(userId, client);
        if (!roleInfo || roleInfo.role !== 'leader') throw new Error('Только лидер может покупать очки');
        const clanId = roleInfo.clanId;
        
        // Получаем текущий уровень клана и купленные очки
        const clan = await client.query('SELECT level FROM clans WHERE id = $1', [clanId]);
        const level = clan.rows[0].level;
        const bonuses = await client.query('SELECT total_points FROM clan_bonuses WHERE clan_id = $1', [clanId]);
        let totalPoints = bonuses.rows[0]?.total_points || 0;
        const maxPoints = level * 5;
        if (totalPoints >= maxPoints) throw new Error('Достигнут максимум очков для этого уровня');
        
        // Определяем стоимость следующего очка
        let cost = 2000;
        if (totalPoints >= 5 && totalPoints < 10) cost = 3000;
        else if (totalPoints >= 10 && totalPoints < 20) cost = 4500;
        else if (totalPoints >= 20) cost = 6000;
        
        // Проверяем казну
        const treasury = await client.query('SELECT coins FROM clan_treasury WHERE clan_id = $1', [clanId]);
        if (treasury.rows[0].coins < cost) throw new Error('Недостаточно монет в казне');
        
        // Списываем монеты и увеличиваем total_points
        await client.query('UPDATE clan_treasury SET coins = coins - $1 WHERE clan_id = $2', [cost, clanId]);
        totalPoints++;
        await client.query('UPDATE clan_bonuses SET total_points = $1 WHERE clan_id = $2', [totalPoints, clanId]);
        
        await client.query('COMMIT');
        res.json({ success: true, total_points: totalPoints, cost });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// 16. Перераспределить очки (только лидер)
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
        const sum = (bonus_hp||0) + (bonus_attack||0) + (bonus_defense||0) + (bonus_agility||0) + (bonus_crit_damage||0) + (bonus_vampirism||0);
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
    } finally {
        client.release();
    }
});

module.exports = router;
