const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Вспомогательная функция для проверки и сброса сезонного рейтинга
async function checkSeasonReset() {
    const now = new Date();
    // Определяем начало текущего сезона: каждый квартал (1 янв, 1 апр, 1 июл, 1 окт)
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    let seasonStart;
    if (month < 3) { // январь-март
        seasonStart = new Date(year, 0, 1);
    } else if (month < 6) { // апрель-июнь
        seasonStart = new Date(year, 3, 1);
    } else if (month < 9) { // июль-сентябрь
        seasonStart = new Date(year, 6, 1);
    } else { // октябрь-декабрь
        seasonStart = new Date(year, 9, 1);
    }

    const client = await pool.connect();
    try {
        // Находим всех пользователей, у которых last_season_reset меньше начала сезона
        const res = await client.query(
            'UPDATE users SET season_rating = 0, last_season_reset = $1 WHERE last_season_reset < $2 OR last_season_reset IS NULL',
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

// Получить топ по рейтингу (сезонному)
router.get('/rating', async (req, res) => {
    try {
        // Проверяем сброс сезона
        await checkSeasonReset();

        const result = await pool.query(`
            SELECT 
                u.tg_id,
                u.username,
                u.season_rating as rating,
                -- Определяем класс с наибольшей силой (сложно, упростим: будем хранить в отдельной таблице или вычислять)
                -- Для начала можно взять текущий класс, но это не точно. Лучше добавить поле best_power и best_class в users.
                -- Пока сделаем заглушку: будем брать класс с максимальным уровнем или просто current_class.
                u.current_class as class,
                -- Для силы нам нужно максимальное значение силы среди классов игрока.
                -- Это будет в другом эндпоинте.
                (SELECT COUNT(*) FROM battles WHERE player1_id = u.id OR player2_id = u.id) as battles_played
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

// Получить топ по силе героя (максимальная сила среди классов)
router.get('/power', async (req, res) => {
    try {
        // Для силы не нужен сброс сезона
        // Вычисляем силу для каждого класса игрока, берём максимум
        // Сложный запрос, можно оптимизировать, но для простоты сделаем подзапрос
        const result = await pool.query(`
            SELECT 
                u.tg_id,
                u.username,
                -- Максимальная сила среди классов игрока
                (SELECT MAX(
                    -- Здесь нужно повторить формулу calculatePower, но это сложно в SQL.
                    -- Поэтому лучше хранить вычисленную силу в отдельном поле best_power в users.
                    -- Пока оставим заглушку: будем брать уровень как силу (неправильно)
                    uc.level * 10
                ) FROM user_classes uc WHERE uc.user_id = u.id) as power,
                -- Класс с максимальной силой (тоже сложно)
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
