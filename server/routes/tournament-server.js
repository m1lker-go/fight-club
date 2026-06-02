const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { simulateBattle } = require('../utils/battleSimulator');
const { addExp } = require('../utils/exp');
const { updatePlayerPower } = require('../utils/power');
const { getMoscowDate } = require('../utils/dailyTasks');

// Константы
const TOURNAMENT_SIZE = 64;
const REGISTRATION_DEADLINE_HOUR = 19; // 19:50 МСК
const TOURNAMENT_START_HOUR = 20;

// Вспомогательная функция: получить или создать текущий сезон
async function getCurrentSeason(client) {
    const todayStr = getMoscowDate(); // строка 'YYYY-MM-DD'
    const today = new Date(todayStr);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    let season = await client.query(
        'SELECT * FROM tournament_seasons WHERE start_date <= $1 AND end_date >= $1',
        [todayStr]
    );
    if (season.rows.length === 0) {
        const name = `Сезон ${startOfMonth.toLocaleDateString('ru-RU')}`;
        const newSeason = await client.query(
            'INSERT INTO tournament_seasons (name, start_date, end_date, league) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, startOfMonth, endOfMonth, 'bronze']
        );
        return newSeason.rows[0].id;
    }
    return season.rows[0].id;
}

// ========== ЭНДПОИНТЫ ==========

router.get('/status', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const now = new Date();
        const mskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const currentHour = mskTime.getHours();
        const currentMinute = mskTime.getMinutes();
        const canRegister = (currentHour < REGISTRATION_DEADLINE_HOUR) || 
                            (currentHour === REGISTRATION_DEADLINE_HOUR && currentMinute <= 50);
        const tournamentActive = (currentHour >= TOURNAMENT_START_HOUR);
        const todayDate = getMoscowDate();
        
        // Проверяем, зарегистрирован ли пользователь на сегодня
        const regRes = await client.query(
            `SELECT class_choice, subclass_choice FROM tournament_registrations 
             WHERE user_id = $1 AND registered_at::DATE = $2`,
            [userId, todayDate]
        );
        const isRegistered = regRes.rows.length > 0;
        const registeredClass = isRegistered ? regRes.rows[0].class_choice : null;
        const registeredSubclass = isRegistered ? regRes.rows[0].subclass_choice : null;
        
        // Проверяем, завершён ли уже турнир сегодня (есть ли записи в tournament_matches за сегодня)
        const matchesRes = await client.query(
            'SELECT 1 FROM tournament_matches WHERE tournament_date = $1 LIMIT 1',
            [todayDate]
        );
        const tournamentCompleted = matchesRes.rows.length > 0;
        
        res.json({
            canRegister: canRegister && !tournamentCompleted,
            isRegistered,
            registeredClass,
            registeredSubclass,
            tournamentActive: tournamentActive && !tournamentCompleted,
            tournamentCompleted
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/select-class', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { class: className } = req.body;
    if (!className) return res.status(400).json({ error: 'Class required' });
    // Сохраняем временно в сессию или в отдельную таблицу user_tournament_draft
    // Для простоты сохраним в redis или просто в памяти. Но лучше создать таблицу user_tournament_draft
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO tournament_draft (user_id, class_choice, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (user_id) DO UPDATE SET class_choice = $2, updated_at = NOW()`,
            [userId, className]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/select-subclass', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { subclass } = req.body;
    if (!subclass) return res.status(400).json({ error: 'Subclass required' });
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO tournament_draft (user_id, subclass_choice, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (user_id) DO UPDATE SET subclass_choice = $2, updated_at = NOW()`,
            [userId, subclass]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/register', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        // Получаем выбранные класс и подкласс из черновика
        const draft = await client.query(
            'SELECT class_choice, subclass_choice FROM tournament_draft WHERE user_id = $1',
            [userId]
        );
        if (draft.rows.length === 0 || !draft.rows[0].class_choice || !draft.rows[0].subclass_choice) {
            return res.status(400).json({ error: 'Выберите класс и роль' });
        }
        const { class_choice, subclass_choice } = draft.rows[0];
        const seasonId = await getCurrentSeason(client);
        const todayDate = getMoscowDate();
        // Проверяем, не зарегистрирован ли уже
        const existing = await client.query(
            'SELECT id FROM tournament_registrations WHERE user_id = $1 AND registered_at::DATE = $2',
            [userId, todayDate]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Вы уже зарегистрированы' });
        }
        await client.query(
            `INSERT INTO tournament_registrations (season_id, user_id, class_choice, subclass_choice, registered_at) 
             VALUES ($1, $2, $3, $4, NOW())`,
            [seasonId, userId, class_choice, subclass_choice]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.post('/unregister', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const todayDate = getMoscowDate();
        await client.query(
            'DELETE FROM tournament_registrations WHERE user_id = $1 AND registered_at::DATE = $2',
            [userId, todayDate]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.get('/bracket', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const todayDate = getMoscowDate();
        const matches = await client.query(
            `SELECT m.id, m.round_number as round, m.match_index, 
                    m.player1_id, u1.username as player1_name,
                    m.player2_id, u2.username as player2_name,
                    m.winner_id, m.match_log
             FROM tournament_matches m
             LEFT JOIN users u1 ON m.player1_id = u1.id
             LEFT JOIN users u2 ON m.player2_id = u2.id
             WHERE m.tournament_date = $1
             ORDER BY m.round_number, m.match_index`,
            [todayDate]
        );
        res.json({ matches: matches.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.get('/match/:matchId', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { matchId } = req.params;
    const client = await pool.connect();
    try {
        const match = await client.query(
            'SELECT match_log FROM tournament_matches WHERE id = $1',
            [matchId]
        );
        if (match.rows.length === 0 || !match.rows[0].match_log) {
            return res.status(404).json({ error: 'Match log not found' });
        }
        res.json({ log: match.rows[0].match_log });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

router.get('/leaders', async (req, res) => {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const client = await pool.connect();
    try {
        const seasonId = await getCurrentSeason(client);
        const leaders = await client.query(
            `SELECT u.id, u.username, u.current_class, COALESCE(tp.points, 0) as tournament_points
             FROM users u
             LEFT JOIN tournament_points tp ON u.id = tp.user_id AND tp.season_id = $1
             WHERE tp.points > 0
             ORDER BY tp.points DESC
             LIMIT 100`,
            [seasonId]
        );
        res.json(leaders.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});

module.exports = router;
