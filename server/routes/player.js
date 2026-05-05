//player.js


const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const { updatePlayerPower } = require('../utils/power');
const dailyTasks = require('../utils/dailyTasks');

// Единая функция получения московской даты (синхронизирована со сбросом в scheduler.js)
const getMoscowDate = () => dailyTasks.getMoscowDate();

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

async function rechargeEnergy(client, userId) {
    const user = await client.query('SELECT energy, last_energy FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) return;
    const last = new Date(user.rows[0].last_energy);
    const now = new Date();
    const diffMinutes = Math.floor((now - last) / (1000 * 60));
    const intervals = Math.floor(diffMinutes / 15);
    if (intervals > 0) {
        const newEnergy = Math.min(20, user.rows[0].energy + intervals);
        await client.query(
            'UPDATE users SET energy = $1, last_energy = $2 WHERE id = $3',
            [newEnergy, now, userId]
        );
    }
}

function validateTgId(tg_id) {
    if (tg_id === undefined || tg_id === null) return false;
    const num = Number(tg_id);
    return !isNaN(num) && num > 0;
}

// ========== БЕСПЛАТНЫЙ СУНДУК ==========
router.get('/freechest', async (req, res) => {
    const { tg_id, user_id } = req.query;
    
    console.log('=== FREE CHEST CHECK ===');
    console.log('tg_id:', tg_id, 'user_id:', user_id);
    
    if (!tg_id && !user_id) {
        return res.status(400).json({ error: 'tg_id or user_id required' });
    }
    
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const lastFree = user.last_free_common_chest;
       const today = getMoscowDate();
const lastFreeMsk = toMoscowDateString(user.last_free_coal_date);
const freeAvailable = lastFreeMsk !== today;
        
        console.log('freeAvailable:', freeAvailable);
        res.json({ freeAvailable });
    } catch (e) {
        console.error('Database error:', e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== БЕСПЛАТНЫЙ УГОЛЬ ==========
router.get('/freecoal', async (req, res) => {
    const { tg_id, user_id } = req.query;
    
    console.log('=== FREE COAL CHECK ===');
    console.log('tg_id:', tg_id, 'user_id:', user_id);
    
    if (!tg_id && !user_id) {
        return res.status(400).json({ error: 'tg_id or user_id required' });
    }
    
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const lastFree = user.last_free_coal_date;
        const today = getMoscowDate(); // московская дата
       const lastFreeMsk = toMoscowDateString(user.last_free_coal_date);
const freeAvailable = lastFreeMsk !== today;
        
        console.log('freeAvailable:', freeAvailable);
        res.json({ freeAvailable });
    } catch (e) {
        console.error('Database error:', e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== ЛИМИТ ПОКУПКИ УГЛЯ ЗА МОНЕТЫ ==========
router.get('/coal-limit', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        const purchasedToday = user.coal_purchased_today || 0;
        const maxDaily = 1000;
        res.json({ purchasedToday, maxDaily });
    } catch (e) {
        console.error('Error fetching coal limit:', e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.get('/:tg_id', async (req, res) => {
    const { tg_id } = req.params;
    
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
            `SELECT 
                i.id,
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
                it.reflect_bonus,
                i.equipped,
                i.for_sale,
                i.price,
                i.in_forge
            FROM inventory i
            JOIN items it ON i.item_id = it.id
            WHERE i.user_id = $1`,
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
    const { tg_id, user_id, class: className, stat, points } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

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

        await updatePlayerPower(client, userId, className);

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
    const { tg_id, user_id, class: newClass } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

        await client.query('UPDATE users SET current_class = $1 WHERE id = $2', [newClass, userId]);

        await updatePlayerPower(client, userId, newClass);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/subclass', async (req, res) => {
    const { tg_id, user_id, subclass } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;
        const currentClass = user.current_class;

        await client.query('UPDATE users SET subclass = $1 WHERE id = $2', [subclass, userId]);

        await updatePlayerPower(client, userId, currentClass);

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/avatar', async (req, res) => {
    const { tg_id, user_id, avatar_id } = req.body;
    
    if (!avatar_id) {
        return res.status(400).json({ error: 'Missing avatar_id' });
    }
    
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const userId = user.id;

        const owned = await client.query(
            'SELECT id FROM user_avatars WHERE user_id = $1 AND avatar_id = $2',
            [userId, avatar_id]
        );
        if (owned.rows.length === 0) {
            return res.status(403).json({ error: 'Avatar not owned' });
        }

        await client.query('UPDATE users SET avatar_id = $1 WHERE id = $2', [avatar_id, userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

router.get('/coal-limit', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, null, user_id);
        if (!user) throw new Error('User not found');
        const purchasedToday = user.coal_purchased_today || 0;
        const maxDaily = 1000;
        res.json({ purchasedToday, maxDaily });
    } catch (e) {
        console.error('Error in /coal-limit:', e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Преобразует дату из БД в строку 'YYYY-MM-DD' по московскому времени
function toMoscowDateString(dbDate) {
    if (!dbDate) return null;
    const d = new Date(dbDate);
    // en-CA даёт формат YYYY-MM-DD, timeZone гарантирует московское смещение
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

module.exports = router;
