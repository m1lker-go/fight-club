const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { updatePlayerPower } = require('../utils/power');
const dailyTasks = require('../utils/dailyTasks');

const getMoscowDate = () => dailyTasks.getMoscowDate();

function toMoscowDateString(dbDate) {
    if (!dbDate) return null;
    const d = new Date(dbDate);
    return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' });
}

// ========== ТЕСТОВЫЙ МАРШРУТ (можно удалить позже) ==========
router.get('/test', async (req, res) => {
    try {
        const result = await pool.query('SELECT 1+1 as sum');
        res.json({ 
            status: 'ok', 
            db: 'connected',
            test: result.rows[0].sum,
            time: new Date().toISOString()
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Вспомогательная функция для восстановления энергии
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

// ========== ПОЛУЧИТЬ ПРОФИЛЬ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ==========
router.get('/profile', async (req, res) => {
    const userId = req.userId;
    const client = await pool.connect();
    try {
        await rechargeEnergy(client, userId);

        const user = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });

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
            [userId]
        );

        const classes = await client.query(
            'SELECT * FROM user_classes WHERE user_id = $1',
            [userId]
        );

        res.json({
            user: user.rows[0],
            inventory: inventory.rows,
            classes: classes.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== БЕСПЛАТНЫЙ СУНДУК ==========
router.get('/freechest', async (req, res) => {
    const userId = req.userId;
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT last_free_common_chest FROM users WHERE id = $1', [userId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const today = getMoscowDate();
        const lastFreeMsk = toMoscowDateString(user.rows[0].last_free_common_chest);
        const freeAvailable = lastFreeMsk !== today;
        
        res.json({ freeAvailable });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== БЕСПЛАТНЫЙ УГОЛЬ ==========
router.get('/freecoal', async (req, res) => {
    const userId = req.userId;
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT last_free_coal_date FROM users WHERE id = $1', [userId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        
        const today = getMoscowDate();
        const lastFreeMsk = toMoscowDateString(user.rows[0].last_free_coal_date);
        const freeAvailable = lastFreeMsk !== today;
        
        res.json({ freeAvailable });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ========== ЛИМИТ ПОКУПКИ УГЛЯ ЗА МОНЕТЫ ==========
router.get('/coal-limit', async (req, res) => {
    const userId = req.userId;
    const client = await pool.connect();
    try {
        const user = await client.query('SELECT coal_purchased_today FROM users WHERE id = $1', [userId]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const purchasedToday = user.rows[0].coal_purchased_today || 0;
        const maxDaily = 1000;
        res.json({ purchasedToday, maxDaily });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ========== ИНФОРМАЦИЯ О КЛАССЕ ==========
router.get('/class/:className', async (req, res) => {
    const userId = req.userId;
    const { className } = req.params;
    const client = await pool.connect();
    try {
        const classData = await client.query(
            'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
            [userId, className]
        );
        if (classData.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
        res.json(classData.rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ========== УЛУЧШИТЬ ХАРАКТЕРИСТИКУ ==========
router.post('/upgrade', async (req, res) => {
    const userId = req.userId;
    const { class: className, stat, points } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
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

// ========== СМЕНИТЬ ТЕКУЩИЙ КЛАСС ==========
router.post('/class', async (req, res) => {
    const userId = req.userId;
    const { class: newClass } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
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

// ========== СМЕНИТЬ ПОДКЛАСС ==========
router.post('/subclass', async (req, res) => {
    const userId = req.userId;
    const { subclass } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const currentClass = await client.query('SELECT current_class FROM users WHERE id = $1', [userId]);
        if (currentClass.rows.length === 0) throw new Error('User not found');
        await client.query('UPDATE users SET subclass = $1 WHERE id = $2', [subclass, userId]);
        await updatePlayerPower(client, userId, currentClass.rows[0].current_class);
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ========== СМЕНИТЬ АВАТАР (СКИН) ==========
router.post('/avatar', async (req, res) => {
    const userId = req.userId;
    const { avatar_id } = req.body;
    if (!avatar_id) return res.status(400).json({ error: 'Missing avatar_id' });
    const client = await pool.connect();
    try {
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

module.exports = router;
