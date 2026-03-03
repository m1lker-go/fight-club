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

async function updatePlayerPower(client, userId, className) {
    // Получаем данные класса
    const classRes = await client.query(
        'SELECT * FROM user_classes WHERE user_id = $1 AND class = $2',
        [userId, className]
    );
    if (classRes.rows.length === 0) return;
    const classData = classRes.rows[0];

    // Получаем подкласс пользователя (из users)
    const userRes = await client.query('SELECT subclass FROM users WHERE id = $1', [userId]);
    const subclass = userRes.rows[0]?.subclass || 'guardian';

    // Получаем инвентарь для этого класса (только надетые предметы)
    const invRes = await client.query(
        `SELECT i.*, it.* FROM inventory i
         JOIN items it ON i.item_id = it.id
         WHERE i.user_id = $1 AND i.equipped = true AND it.owner_class = $2`,
        [userId, className]
    );
    const inventory = invRes.rows;

    // Базовая статистика (копия из клиента)
    const baseStats = {
        warrior: { hp: 28, atk: 3, def: 4, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
        assassin: { hp: 20, atk: 5, def: 1, agi: 5, int: 0, spd: 15, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
        mage: { hp: 18, atk: 2, def: 1, agi: 2, int: 5, spd: 12, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
    };
    const base = baseStats[className] || baseStats.warrior;

    // Расчёт базовых + навыки
    let stats = {
        hp: base.hp + (classData.hp_points || 0) * 2,
        atk: base.atk + (classData.atk_points || 0),
        def: base.def + (classData.def_points || 0),
        agi: base.agi + (classData.dodge_points || 0),
        int: base.int + (classData.int_points || 0),
        spd: base.spd + (classData.spd_points || 0),
        crit: base.crit + (classData.crit_points || 0),
        critDmg: 1.5 + ((classData.crit_dmg_points || 0) / 100),
        vamp: base.vamp + (classData.vamp_points || 0),
        reflect: base.reflect + (classData.reflect_points || 0)
    };

    // Бонусы от экипировки
    inventory.forEach(item => {
        stats.hp += item.hp_bonus || 0;
        stats.atk += item.atk_bonus || 0;
        stats.def += item.def_bonus || 0;
        stats.agi += item.agi_bonus || 0;
        stats.int += item.int_bonus || 0;
        stats.spd += item.spd_bonus || 0;
        stats.crit += item.crit_bonus || 0;
        stats.critDmg += (item.crit_dmg_bonus || 0) / 100;
        stats.vamp += item.vamp_bonus || 0;
        stats.reflect += item.reflect_bonus || 0;
    });

    // Пассивные бонусы подкласса (упрощённо, можно добавить позже)
    const rolePassives = {
        knight: { reflect: 20 },
        assassin: { vamp: 20 },
        blood_hunter: { vamp: 20 }
    };
    const roleBonus = rolePassives[subclass] || {};
    if (roleBonus.vamp) stats.vamp += roleBonus.vamp;
    if (roleBonus.reflect) stats.reflect += roleBonus.reflect;

    // Капы
    stats.def = Math.min(100, stats.def);
    stats.agi = Math.min(100, stats.agi);
    stats.crit = Math.min(100, stats.crit);

    // Веса характеристик (importance) – те же, что на клиенте
    const importance = {
        warrior: {
            hp: 2.0, atk: 2.0, def: 2.0,
            crit: 1.5, reflect: 1.5, critDmg: 1.5,
            agi: 1.0, int: 1.0, spd: 1.0, vamp: 0.5
        },
        assassin: {
            atk: 2.0, agi: 2.0, vamp: 2.0,
            hp: 1.5, crit: 1.5, critDmg: 1.5,
            def: 1.0, int: 1.0, spd: 1.0, reflect: 1.0
        },
        mage: {
            atk: 2.0, int: 2.0, agi: 2.0,
            hp: 1.5, crit: 1.5, critDmg: 1.5,
            def: 1.0, spd: 1.0, vamp: 0.5, reflect: 0.5
        }
    };
    const coeff = importance[className] || importance.warrior;

    let power = 0;
    power += stats.hp * coeff.hp;
    power += stats.atk * coeff.atk * 2;
    power += stats.def * coeff.def * 2;
    power += stats.agi * coeff.agi * 2;
    power += stats.int * coeff.int * 2;
    power += stats.spd * coeff.spd * 2;
    power += stats.crit * coeff.crit * 3;
    power += (stats.critDmg - 1.5) * 100 * coeff.critDmg;
    power += stats.vamp * coeff.vamp * 3;
    power += stats.reflect * coeff.reflect * 2;
    power += classData.level * 10;

    power = Math.round(power);

    // Сохраняем в базу
    await client.query(
        'UPDATE user_classes SET power = $1 WHERE user_id = $2 AND class = $3',
        [power, userId, className]
    );
}

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

function validateTgId(tg_id) {
    if (tg_id === undefined || tg_id === null) return false;
    const num = Number(tg_id);
    return !isNaN(num) && num > 0;
}

// ========== БЕСПЛАТНЫЙ СУНДУК - БЕЗ ЗАЩИТЫ ==========
router.get('/freechest', async (req, res) => {
    const rawTgId = req.query.tg_id;
    
    console.log('=== FREE CHEST CHECK ===');
    console.log('tg_id:', rawTgId);
    
    if (!rawTgId) {
        return res.status(400).json({ error: 'tg_id required' });
    }
    
    const tgId = parseInt(rawTgId);
    if (isNaN(tgId)) {
        return res.status(400).json({ error: 'Invalid tg_id' });
    }
    
    try {
        // Проверяем, когда последний раз брали бесплатный сундук
        const user = await pool.query(
            'SELECT last_free_common_chest FROM users WHERE tg_id = $1', 
            [tgId]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const lastFree = user.rows[0].last_free_common_chest;
        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];
        
        // Бесплатно, если никогда не брали или брали не сегодня
        const freeAvailable = !lastFree || new Date(lastFree).toISOString().split('T')[0] !== today;
        
        console.log('freeAvailable:', freeAvailable);
        res.json({ freeAvailable });
    } catch (e) {
        console.error('Database error:', e);
        res.status(500).json({ error: 'Database error' });
    }
});
// =================================================

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

        // ИСПРАВЛЕННЫЙ ЗАПРОС С JOIN, добавлено i.in_forge
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
    const { tg_id, class: className, stat, points } = req.body;
    
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

router.post('/avatar', async (req, res) => {
    const { tg_id, avatar_id } = req.body;
    
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

module.exports = router;
