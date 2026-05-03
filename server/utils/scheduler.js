const { pool } = require('../db');

// Ежедневный сброс (задания, башня, лотерея, уголь, сундук, подписка, серия побед, лимиты, реклама)
async function resetDailyTasks() {
    console.log('[SCHEDULER] Ежедневный сброс запущен');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Сброс ежедневных заданий
        await client.query(`
            UPDATE users 
            SET daily_tasks_mask = 0, 
                daily_tasks_progress = '{}',
                last_daily_reset = CURRENT_DATE
        `);

        // Сброс попыток башни
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

        // Сброс бесплатного угля
        await client.query(`
            UPDATE users 
            SET last_free_coal_date = NULL
        `);

        // Сброс бесплатного сундука
        await client.query(`
            UPDATE users 
            SET last_free_common_chest = NULL
        `);

        // Сброс бесплатной монеты подписки (20 монет)
        await client.query(`
            UPDATE users 
            SET last_free_sub_coin = NULL
        `);

        // Сброс ежедневной серии побед и даты
        await client.query(`
            UPDATE users 
            SET daily_win_streak = 0,
                last_streak_date = CURRENT_DATE - 1
        `);

        // Сброс лимита покупки угля за монеты
        await client.query(`
            UPDATE users 
            SET coal_purchased_today = 0
        `);

        // Сброс таблицы просмотров рекламы
        await client.query(`
            UPDATE user_ads 
            SET ads_watched_today = 0,
                rewarded_today = 0,
                last_ad_date = NULL
        `);

        await client.query('COMMIT');
        console.log('[SCHEDULER] Ежедневный сброс выполнен успешно');
    } catch (err) {
        await client.query('ROLLBACK');
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

        const users = await client.query(`
            SELECT id, username, rating
            FROM users
            WHERE rating > 0
            ORDER BY rating DESC
        `);

        let position = 1;
        for (let i = 0; i < users.rows.length; i++) {
            const user = users.rows[i];
            let rewardCoins = 0;
            let rewardDiamonds = 0;
            let placeText = '';

            if (i > 0 && user.rating === users.rows[i-1].rating) {
                // позиция не меняется
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

            let rewardTextParts = [];
            if (rewardCoins > 0) rewardTextParts.push(`${rewardCoins} монет`);
            if (rewardDiamonds > 0) rewardTextParts.push(`${rewardDiamonds} алмазов`);
            const rewardText = rewardTextParts.join(' и ');

            const subject = `🏆 Награда за сезон!`;
            const body = `Поздравляю! Ты пережил этот сезон, сражаясь как тигр! Ты занял ${placeText} в рейтинге.\n\nВы получили: ${rewardText}.`;

            await client.query(
                `INSERT INTO user_messages (user_id, from_text, subject, body, reward_type, reward_amount, reward_type2, reward_amount2, is_read, is_claimed)
                 VALUES ($1, 'Мастер кошачьих боёв', $2, $3, $4, $5, $6, $7, false, false)`,
                [user.id, subject, body,
                 rewardCoins > 0 ? 'coins' : null, rewardCoins > 0 ? rewardCoins : null,
                 rewardDiamonds > 0 ? 'diamonds' : null, rewardDiamonds > 0 ? rewardDiamonds : null]
            );
        }

        // Сброс рейтинга
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
