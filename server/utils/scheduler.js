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
         // Сброс лотереи   
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

// Ежемесячный сброс рейтинга и выдача наград (пока заглушка)
// server/utils/scheduler.js (дополнить существующий код)

async function resetSeason() {
    console.log('[SCHEDULER] Запуск сезонного сброса рейтинга и выдачи наград');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Получаем всех пользователей, у которых rating > 0, сортируем по убыванию рейтинга
        const users = await client.query(`
            SELECT id, username, rating
            FROM users
            WHERE rating > 0
            ORDER BY rating DESC
        `);

        // 2. Определяем места и награды
        const rewards = [];
        let position = 1;
        for (let i = 0; i < users.rows.length; i++) {
            const user = users.rows[i];
            let rewardCoins = 0;
            let rewardDiamonds = 0;
            let placeText = '';

            // Обработка одинаковых рейтингов (если рейтинг равен предыдущему, позиция не меняется)
            if (i > 0 && user.rating === users.rows[i-1].rating) {
                position = position; // сохраняем ту же позицию
            } else {
                position = i + 1;
            }

            if (position === 1) {
                rewardCoins = 5000;
                rewardDiamonds = 100;
                placeText = '1ое место';
            } else if (position === 2) {
                rewardCoins = 3000;
                rewardDiamonds = 50;
                placeText = '2ое место';
            } else if (position === 3) {
                rewardCoins = 2000;
                rewardDiamonds = 25;
                placeText = '3е место';
            } else {
                rewardCoins = 1000;
                rewardDiamonds = 0;
                placeText = `${position}ое место`;
            }

            if (rewardCoins > 0 || rewardDiamonds > 0) {
                // Сохраняем награду для последующей вставки сообщения
                rewards.push({
                    userId: user.id,
                    coins: rewardCoins,
                    diamonds: rewardDiamonds,
                    place: position,
                    placeText: placeText
                });
            }
        }

        // 3. Вставляем сообщения и начисляем награды
        for (const reward of rewards) {
            // Начисляем монеты и алмазы
            if (reward.coins > 0) {
                await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [reward.coins, reward.userId]);
            }
            if (reward.diamonds > 0) {
                await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [reward.diamonds, reward.userId]);
            }

            // Создаём письмо
            const subject = `Награда за сезон! 🎉`;
            const body = `Поздравляю! Ты пережил этот сезон, сражаясь как тигр! Ты занял ${reward.placeText} в рейтинге. Забери свою заслуженную награду: ${reward.coins > 0 ? reward.coins + ' монет ' : ''}${reward.diamonds > 0 ? reward.diamonds + ' алмазов' : ''}.`;
            await client.query(
                `INSERT INTO user_messages (user_id, from_text, subject, body, reward_type, reward_amount, is_read, is_claimed)
                 VALUES ($1, 'Мастер кошачьих боёв', $2, $3, $4, $5, false, false)`,
                [reward.userId, subject, body, 'coins', reward.coins > 0 ? reward.coins : reward.diamonds]
            );
            // Если нужна отдельная запись для алмазов, можно сделать два сообщения, но проще объединить.
            // В данном случае reward_type='coins', но сумма может быть смешанной. Лучше создать два сообщения или изменить логику.
            // Упростим: отправим одно сообщение со смешанной наградой, но в таблице только один reward_type.
            // Чтобы учесть оба типа, можно создать два сообщения.
            if (reward.coins > 0 && reward.diamonds > 0) {
                // Дополнительное сообщение для алмазов
                await client.query(
                    `INSERT INTO user_messages (user_id, from_text, subject, body, reward_type, reward_amount, is_read, is_claimed)
                     VALUES ($1, 'Мастер кошачьих боёв', $2, $3, 'diamonds', $4, false, false)`,
                    [reward.userId, subject, `+${reward.diamonds} алмазов!`, reward.diamonds]
                );
            } else if (reward.coins > 0) {
                // уже добавлено выше
            } else if (reward.diamonds > 0) {
                await client.query(
                    `INSERT INTO user_messages (user_id, from_text, subject, body, reward_type, reward_amount, is_read, is_claimed)
                     VALUES ($1, 'Мастер кошачьих боёв', $2, $3, 'diamonds', $4, false, false)`,
                    [reward.userId, subject, `+${reward.diamonds} алмазов!`, reward.diamonds]
                );
            }
        }

        // 4. Сброс рейтинга для всех пользователей (и тех, у кого было 0, тоже)
        await client.query('UPDATE users SET rating = 1000 WHERE rating != 1000');

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
