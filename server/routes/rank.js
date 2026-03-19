const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Проверка и сброс сезонного рейтинга (каждые 3 месяца) – можно оставить для будущего использования
async function checkSeasonReset() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    // Начало текущего квартала
    let seasonStart;
    if (month < 3) { // янв-март
        seasonStart = new Date(year, 0, 1);
    } else if (month < 6) { // апр-июнь
        seasonStart = new Date(year, 3, 1);
    } else if (month < 9) { // июль-сент
        seasonStart = new Date(year, 6, 1);
    } else { // окт-дек
        seasonStart = new Date(year, 9, 1);
    }

    const client = await pool.connect();
    try {
        const res = await client.query(
            `UPDATE users 
             SET season_rating = 0, last_season_reset = $1 
             WHERE last_season_reset < $2 OR last_season_reset IS NULL`,
            [seasonStart, seasonStart]
        );
        if (res.rowCount > 0) {
            console.log(`Сброшен рейтинг для ${res.rowCount} пользователей (новый сезон)`);
        }
    } catch (e) {
        console.error('Ошибка при сбросе сезонного рейтинга:', e);
    } finally {
        client.release();
    }
}

// Топ по рейтингу
router.get('/rating', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.username,
                u.rating as rating,
                u.current_class as class
            FROM users u
            WHERE u.username != 'test'
            ORDER BY u.rating DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (e) {
        console.error('Ошибка получения рейтинга:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

// Топ по силе (максимальная сила среди классов игрока) – показываем всех, даже без боёв
router.get('/power', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.username,
                uc.power as power,
                uc.class as class
            FROM users u
            JOIN user_classes uc ON u.id = uc.user_id
            WHERE u.username != 'test'
              AND uc.power = (SELECT MAX(power) FROM user_classes WHERE user_id = u.id)
            ORDER BY uc.power DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (e) {
        console.error('Ошибка получения силы:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

// Топ башни по этажам
router.get('/tower', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.username,
                tl.floor,
                tl.achieved_at,
                tp.chosen_class,
                tp.chosen_subclass
            FROM tower_leaderboard tl
            JOIN users u ON tl.user_id = u.id
            LEFT JOIN tower_progress tp ON tl.user_id = tp.user_id
            WHERE u.username != 'test'
            ORDER BY tl.floor DESC, tl.achieved_at ASC
        `);
        res.json(result.rows);
    } catch (e) {
        console.error('Ошибка получения рейтинга башни:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
