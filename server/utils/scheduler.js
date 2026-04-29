const { pool } = require('../db');

// Ежедневный сброс (задания и билеты башни)
async function resetDailyTasks() {
    console.log('[SCHEDULER] Ежедневный сброс запущен');
    const client = await pool.connect();
    try {
        // Сброс ежедневных заданий: обнуляем маску и прогресс
        await client.query(`
            UPDATE users 
            SET daily_tasks_mask = 0, 
                daily_tasks_progress = '{}',
                last_daily_reset = CURRENT_DATE
        `);
        // Сброс попыток башни
        await client.query(`
            UPDATE tower_progress 
            SET attempts_today = 0, 
                last_attempt_date = CURRENT_DATE
        `);
        console.log('[SCHEDULER] Ежедневный сброс выполнен успешно');
    } catch (err) {
        console.error('[SCHEDULER] Ошибка при ежедневном сбросе:', err);
    } finally {
        client.release();
    }
}

// Ежемесячный сброс рейтинга и выдача наград (пока заглушка)
async function resetSeason() {
    console.log('[SCHEDULER] Сезонный сброс запущен');
    const client = await pool.connect();
    try {
        // Здесь позже добавим логику начисления наград и обнуления rating
        console.log('[SCHEDULER] Сезонный сброс выполнен (заглушка)');
    } catch (err) {
        console.error('[SCHEDULER] Ошибка при сезонном сбросе:', err);
    } finally {
        client.release();
    }
}

module.exports = {
    resetDailyTasks,
    resetSeason
};
