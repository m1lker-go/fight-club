const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Проверка и сброс сезонного рейтинга (оставляем без изменений)
async function checkSeasonReset() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    let seasonStart;
    if (month < 3) {
        seasonStart = new Date(year, 0, 1);
    } else if (month < 6) {
        seasonStart = new Date(year, 3, 1);
    } else if (month < 9) {
        seasonStart = new Date(year, 6, 1);
    } else {
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

// Топ по рейтингу (без изменений)
router.get('/rating', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.username,
                u.rating,
                (SELECT class FROM user_classes WHERE user_id = u.id ORDER BY power DESC LIMIT 1) as class
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

// Топ по силе (исправлено: один пользователь – одна запись, максимальная сила)
router.get('/power', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (u.id)
                u.username,
                uc.power,
                uc.class
            FROM users u
            JOIN user_classes uc ON u.id = uc.user_id
            WHERE u.username != 'test'
            ORDER BY u.id, uc.power DESC, uc.class
        `);
        // Сортируем результат по силе убыванию
        result.rows.sort((a, b) => b.power - a.power);
        // Ограничиваем 100 записями
        const top100 = result.rows.slice(0, 100);
        res.json(top100);
    } catch (e) {
        console.error('Ошибка получения силы:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

// Топ башни (исправлено: один пользователь – максимальный этаж)
router.get('/tower', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (u.id)
                u.username,
                tl.floor,
                tl.achieved_at,
                tp.chosen_class,
                tp.chosen_subclass
            FROM tower_leaderboard tl
            JOIN users u ON tl.user_id = u.id
            LEFT JOIN tower_progress tp ON tl.user_id = tp.user_id
            WHERE u.username != 'test'
            ORDER BY u.id, tl.floor DESC, tl.achieved_at ASC
        `);
        // Сортируем по этажам убыванию
        result.rows.sort((a, b) => b.floor - a.floor);
        const top100 = result.rows.slice(0, 100);
        res.json(top100);
    } catch (e) {
        console.error('Ошибка получения рейтинга башни:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
