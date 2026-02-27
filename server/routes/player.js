const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ========== ТЕСТОВЫЙ МАРШРУТ ==========
router.get('/test', async (req, res) => {
    try {
        console.log('=== TEST ROUTE CALLED ===');
        console.log('Query params:', req.query);
        
        const result = await pool.query('SELECT 1+1 as sum');
        
        res.json({ 
            status: 'ok', 
            db: 'connected',
            test: result.rows[0].sum,
            time: new Date().toISOString(),
            query: req.query
        });
    } catch (e) {
        console.error('TEST ROUTE ERROR:', e);
        res.status(500).json({ 
            status: 'error', 
            message: e.message,
            stack: e.stack 
        });
    }
});
// ================================

async function rechargeEnergy(client, userId) {
    const user = await client.query('SELECT energy, last_energy FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return;
    const last = new Date(user.rows[0].last_energy);
    const now = new Date();
    const diffMinutes = Math.floor((now - last) / (1000 * 60));
    if (diffMinutes > 0) {
        const newEnergy = Math.min(20, user.rows[0].energy + diffMinutes);
        await client.query(
            'UPDATE users SET energy = $1, last_energy = $2 WHERE id = $3',
            [newEnergy, now, userId]
        );
    }
}

// Вспомогательная функция для проверки tg_id
function validateTgId(tg_id) {
    // Если параметр вообще не передан
    if (tg_id === undefined || tg_id === null) return false;
    
    // Пробуем преобразовать в число
    const num = Number(tg_id);
    
    // Проверяем, что это число и оно положительное
    return !isNaN(num) && num > 0;
}

router.get('/:tg_id', async (req, res) => {
    const { tg_id } = req.params;
    
    // Защита от некорректного tg_id
    if (!validateTgId(tg_id)) {
        console.log('Invalid tg_id in /:tg_id:', tg_id);
        return res.status(400).json({ error: 'Invalid tg_id format' });
    }
    
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT * FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });

        await rechargeEnergy(client, user.rows[0].id);

        const inventory = await client.query(
            `SELECT id, name, type, rarity, class_restriction, owner_class,
                    atk_bonus, def_bonus, hp_bonus, spd_bonus,
                    crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus,
                    equipped, for_sale, price
             FROM inventory
             WHERE user_id = $1`,
            [user.rows[0].id]
        );

        const classes = await client.query(
            'SELECT * FROM user_classes WHERE user_id = $1',
            [user.rows[0].id]
        );

        res.json({
            user: user.rows[0],
            inventory: inventory.rows,
            classes: classes.rows
        });
    } finally {
        client.release();
    }
});

router.get('/class/:tg_id/:class', async (req, res) => {
    const { tg_id, class: className } = req.params;
    
    // Защита от некорректного tg_id
    if (!validateTgId(tg_id)) {
        console.log('Invalid tg_id in /class:', tg_id);
        return res.status(400).json({ error: 'Invalid tg_id format' });
    }
    
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const classData = await client.query(
            'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
            [user.rows[0].id, className]
        );
        if (classData.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
        res.json(classData.rows[0]);
    } finally {
        client.release();
    }
});

router.post('/upgrade', async (req, res) => {
    const { tg_id, class: className, stat, points } = req.body;
    
    // Защита от некорректного tg_id
    if (!validateTgId(tg_id)) {
        console.log('Invalid tg_id in /upgrade:', tg_id);
        return res.status(400).json({ error: 'Invalid tg_id format' });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const classData = await client.query(
            'SELECT skill_points FROM user_classes WHERE user_id = $1 AND class = $2',
            [userId, className]
        );
        if (classData.rows.length === 0) throw new Error('Class not found');
        if (classData.rows[0].skill_points < points) throw new Error('Not enough skill points');

        await client.query(
            `UPDATE user_classes SET ${stat} = ${stat} + $1, skill_points = skill_points - $1 WHERE user_id = $2 AND class = $3`,
            [points, userId, className]
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

router.post('/class', async (req, res) => {
    const { tg_id, class: newClass } = req.body;
    
    // Защита от некорректного tg_id
    if (!validateTgId(tg_id)) {
        console.log('Invalid tg_id in /class:', tg_id);
        return res.status(400).json({ error: 'Invalid tg_id format' });
    }
    
    try {
        await pool.query('UPDATE users SET current_class = $1 WHERE tg_id = $2', [newClass, tg_id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/subclass', async (req, res) => {
    const { tg_id, subclass } = req.body;
    
    // Защита от некорректного tg_id
    if (!validateTgId(tg_id)) {
        console.log('Invalid tg_id in /subclass:', tg_id);
        return res.status(400).json({ error: 'Invalid tg_id format' });
    }
    
    try {
        await pool.query('UPDATE users SET subclass = $1 WHERE tg_id = $2', [subclass, tg_id]);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Смена аватара
router.post('/avatar', async (req, res) => {
    const { tg_id, avatar_id } = req.body;
    
    // Защита от некорректного tg_id
    if (!validateTgId(tg_id)) {
        console.log('Invalid tg_id in /avatar:', tg_id);
        return res.status(400).json({ error: 'Invalid tg_id format' });
    }
    
    if (!avatar_id) {
        return res.status(400).json({ error: 'Missing avatar_id' });
    }
    
    try {
        const user = await pool.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userId = user.rows[0].id;

        const owned = await pool.query(
            'SELECT id FROM user_avatars WHERE user_id = $1 AND avatar_id = $2',
            [userId, avatar_id]
        );
        if (owned.rows.length === 0) {
            return res.status(403).json({ error: 'Avatar not owned' });
        }

        await pool.query('UPDATE users SET avatar_id = $1 WHERE id = $2', [avatar_id, userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ========== УПРОЩЁННЫЙ МАРШРУТ ДЛЯ БЕСПЛАТНОГО СУНДУКА ==========
router.get('/freechest', async (req, res) => {
    console.log('=== FREE CHEST SIMPLIFIED ===');
    console.log('Query:', req.query);
    console.log('Time:', new Date().toISOString());
    
    // Просто возвращаем успех, без обращений к БД и без проверок
    res.json({ 
        freeAvailable: true,
        message: 'Simplified test response',
        receivedTgId: req.query.tg_id || 'no tg_id'
    });
});
// ==============================================================

module.exports = router;
