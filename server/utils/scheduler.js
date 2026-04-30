const { pool } = require('../db');

// Ежедневный сброс (задания, билеты башни, лотерея)
async function resetDailyTasks() {
    console.log('[SCHEDULER] Ежедневный сброс запущен');
    const client = await pool.connect();
    try {
        // Сброс ежедневных заданий
        await client.query(`
            UPDATE users 
            SET daily_tasks_mask = 0, 
                daily_tasks_progress = '{}',
                last_daily_reset = CURRENT_DATE
        `);
        // Сброс попыток башни (last_attempt_date больше не используется, удаляем)
        await client.query(`
            UPDATE tower_progress 
            SET attempts_today = 0
        `);
        // Сброс лотереи (бесплатные билеты и счётчик покупок)
        await client.query(`
            UPDATE user_fortune 
            SET free_spins_left = 3, 
                purchased_today = 0, 
                last_reset_date = CURRENT_DATE
        `);
        console.log('[SCHEDULER] Ежедневный сброс выполнен успешно');
    } catch (err) {
        console.error('[SCHEDULER] Ошибка при ежедневном сбросе:', err);
    } finally {
        client.release();
    }
}

// Ежемесячный сброс рейтинга и выдача наград
async function resetSeason() {
    console.log('[SCHEDULER] Запуск сезонного сброса рейтинга и выдачи наград');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Получаем всех пользователей с рейтингом > 0, сортируем по убыванию
        const users = await client.query(`
            SELECT id, username, rating
            FROM users
            WHERE rating > 0
            ORDER BY rating DESC
        `);

        // 2. Определяем места и награды
        let position = 1;
        for (let i = 0; i < users.rows.length; i++) {
            const user = users.rows[i];
            let rewardCoins = 0;
            let rewardDiamonds = 0;
            let placeText = '';

            // Обработка одинаковых рейтингов (позиция не меняется, если рейтинг равен предыдущему)
            if (i > 0 && user.rating === users.rows[i-1].rating) {
                // позиция остаётся прежней
            } else {
                position = i + 1;
            }

            if (position === 1) {
                rewardCoins = 5000;
                rewardDiamonds = 100;
                placeText = '1-е место';
            } else if (position === 2) {
                rewardCoins = 3000;
                rewardDiamonds = 50;
                placeText = '2-е место';
            } else if (position === 3) {
                rewardCoins = 2000;
                rewardDiamonds = 25;
                placeText = '3-е место';
            } else {
                rewardCoins = 1000;
                rewardDiamonds = 0;
                placeText = `${position}-е место`;
            }

            // Начисляем монеты и алмазы
            if (rewardCoins > 0) {
                await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [rewardCoins, user.id]);
            }
            if (rewardDiamonds > 0) {
                await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [rewardDiamonds, user.id]);
            }

            // Отправляем письма (отдельно для монет и для алмазов)
            const subject = `🏆 Награда за сезон!`;
            if (rewardCoins > 0) {
                const bodyCoins = `Поздравляю! Ты пережил этот сезон, сражаясь как тигр! Ты занял ${placeText} в рейтинге. Забери свою заслуженную награду: ${rewardCoins} монет.`;
                await client.query(
                    `INSERT INTO user_messages (user_id, from_text, subject, body, reward_type, reward_amount, is_read, is_claimed)
                     VALUES ($1, 'Мастер кошачьих боёв', $2, $3, 'coins', $4, false, false)`,
                    [user.id, subject, bodyCoins, rewardCoins]
                );
            }
            if (rewardDiamonds > 0) {
                const bodyDiamonds = `Поздравляю! Ты занял ${placeText} в рейтинге и получаешь дополнительно ${rewardDiamonds} алмазов!`;
                await client.query(
                    `INSERT INTO user_messages (user_id, from_text, subject, body, reward_type, reward_amount, is_read, is_claimed)
                     VALUES ($1, 'Мастер кошачьих боёв', $2, $3, 'diamonds', $4, false, false)`,
                    [user.id, subject, bodyDiamonds, rewardDiamonds]
                );
            }
        }

        // 3. Сброс рейтинга всех пользователей до 1000
        await client.query('UPDATE users SET rating = 1000');

        await client.query('COMMIT');
        console.log('[SCHEDULER] Сезонный сброс и выдача наград выполнены');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[SCHEDULER] Ошибка при сезонном сбросе:', err);
    } finally {
        client.release();
    }
}

module.exports = {
    resetDailyTasks,
    resetSeason
};
