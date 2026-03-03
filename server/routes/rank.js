const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Проверка и сброс сезонного рейтинга (каждые 3 месяца)
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

// Топ по рейтингу (сезонному)
router.get('/rating', async (req, res) => {
    try {
        await checkSeasonReset();

        const result = await pool.query(`
           SELECT 
    u.username,
    u.rating as rating,
    u.current_class as class
FROM users u
            WHERE (SELECT COUNT(*) FROM battles WHERE player1_id = u.id OR player2_id = u.id) > 0
            ORDER BY u.season_rating DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (e) {
        console.error('Ошибка получения рейтинга:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

// Топ по силе (максимальная сила среди классов игрока)
router.get('/power', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                u.username,
                (SELECT power FROM user_classes uc WHERE uc.user_id = u.id ORDER BY power DESC LIMIT 1) as power,
                u.current_class as class
            FROM users u
            WHERE (SELECT COUNT(*) FROM battles WHERE player1_id = u.id OR player2_id = u.id) > 0
            ORDER BY power DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (e) {
        console.error('Ошибка получения силы:', e);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
