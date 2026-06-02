const { pool } = require('../db');
const dailyTasks = require('./dailyTasks');
const { simulateBattle } = require('./battleSimulator'); // нужно создать этот файл (см. пояснение ниже)
const { addExp } = require('./exp'); // нужно создать (или импортировать из battle.js)
const { updatePlayerPower } = require('./power');

const TOURNAMENT_SIZE = 64;

// ==================== СУЩЕСТВУЮЩИЕ ФУНКЦИИ (ВАШИ, БЕЗ ИЗМЕНЕНИЙ) ====================

async function resetDailyTasks() {
    console.log('[SCHEDULER] Ежедневный сброс запущен');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const today = dailyTasks.getMoscowDate();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);

        await client.query(`
            UPDATE users 
            SET daily_tasks_mask = 0, 
                daily_tasks_progress = '{}',
                last_daily_reset = $1
        `, [today]);

        await client.query(`
            UPDATE tower_progress 
            SET attempts_today = 0
        `);

        await client.query(`
            UPDATE user_fortune 
            SET free_spins_left = 3, 
                purchased_today = 0, 
                last_reset_date = $1
        `, [today]);

        await client.query(`
            UPDATE users 
            SET last_free_coal_date = NULL
        `);

        await client.query(`
            UPDATE users 
            SET last_free_common_chest = NULL
        `);

        await client.query(`
            UPDATE users 
            SET last_free_sub_coin = NULL
        `);

        await client.query(`
            UPDATE users 
            SET daily_win_streak = 0,
                last_streak_date = $1
        `, [yesterdayStr]);

        await client.query(`
            UPDATE users 
            SET coal_purchased_today = 0
        `);

        await client.query(`
            UPDATE user_ads 
            SET ads_watched_today = 0,
                rewarded_today = 0,
                last_ad_date = NULL
        `);

        // Очистка черновиков турнира
        await client.query('DELETE FROM tournament_draft');

        await client.query('COMMIT');
        console.log('[SCHEDULER] Ежедневный сброс выполнен успешно');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[SCHEDULER] Ошибка при ежедневном сбросе:', err);
    } finally {
        client.release();
    }
}

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

            const subject = `🏆 Награда за сезон!`;
            const body = `Поздравляю! Ты пережил этот сезон, сражаясь как тигр! Ты занял ${placeText} в рейтинге.\n\nВы получили: ${rewardCoins > 0 ? rewardCoins + ' монет' : ''}${rewardCoins > 0 && rewardDiamonds > 0 ? ' и ' : ''}${rewardDiamonds > 0 ? rewardDiamonds + ' алмазов' : ''}.`;

            await client.query(
                `INSERT INTO user_messages (user_id, from_text, subject, body, reward_coins, reward_diamonds, is_read, is_claimed)
                 VALUES ($1, 'Мастер кошачьих боёв', $2, $3, $4, $5, false, false)`,
                [user.id, subject, body, rewardCoins, rewardDiamonds]
            );
        }

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

// ==================== НОВЫЕ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ТУРНИРА ====================

async function getPlayerTournamentStats(client, userId, className, subclassName) {
    // Получаем данные класса (уровень, очки характеристик)
    const classData = await client.query(
        `SELECT * FROM user_classes 
         WHERE user_id = $1 AND class = $2`,
        [userId, className]
    );
    if (classData.rows.length === 0) {
        throw new Error(`Class ${className} not found for user ${userId}`);
    }
    const classRow = classData.rows[0];

    // Получаем экипировку
    const inventory = await client.query(
        `SELECT i.*, it.* FROM inventory i
         JOIN items it ON i.item_id = it.id
         WHERE i.user_id = $1 AND i.equipped = true AND it.owner_class = $2`,
        [userId, className]
    );

    // Вычисляем статы через вашу функцию calculateStats (из battleSimulator)
    const { calculateStats } = require('./battleSimulator');
    const stats = calculateStats(classRow, inventory.rows, subclassName);
    const usernameRes = await client.query('SELECT username FROM users WHERE id = $1', [userId]);
    return {
        id: userId,
        username: usernameRes.rows[0].username,
        class: className,
        subclass: subclassName,
        level: classRow.level,
        stats: stats,
        inventory: inventory.rows
    };
}

async function awardTournamentRewards(client, userId, place, seasonId, chosenClass) {
    const rewardsMap = {
        1: { coins: 500, diamonds: 15, exp: 250, chest: 'rare', points: 20 },
        2: { coins: 400, diamonds: 10, exp: 200, chest: 'uncommon', points: 15 },
        3: { coins: 300, diamonds: 5, exp: 150, chest: 'uncommon', points: 12 },
        4: { coins: 250, diamonds: 0, exp: 120, chest: null, points: 10 },
        5: { coins: 200, diamonds: 0, exp: 100, chest: null, points: 8 },  // 5-8
        9: { coins: 150, diamonds: 0, exp: 75, chest: null, points: 6 },   // 9-16
        17: { coins: 100, diamonds: 0, exp: 50, chest: null, points: 4 },  // 17-32
        33: { coins: 50, diamonds: 0, exp: 15, chest: null, points: 2 }    // 33-64
    };

    let reward;
    if (place === 1) reward = rewardsMap[1];
    else if (place === 2) reward = rewardsMap[2];
    else if (place === 3) reward = rewardsMap[3];
    else if (place === 4) reward = rewardsMap[4];
    else if (place <= 8) reward = rewardsMap[5];
    else if (place <= 16) reward = rewardsMap[9];
    else if (place <= 32) reward = rewardsMap[17];
    else reward = rewardsMap[33];

    // Начисляем
    if (reward.coins > 0) {
        await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [reward.coins, userId]);
    }
    if (reward.diamonds > 0) {
        await client.query('UPDATE users SET diamonds = diamonds + $1 WHERE id = $2', [reward.diamonds, userId]);
    }
    if (reward.exp > 0 && chosenClass) {
        const leveledUp = await addExp(client, userId, chosenClass, reward.exp);
        if (leveledUp) {
            await updatePlayerPower(client, userId, chosenClass);
        }
    }
    if (reward.chest) {
        const { generateItemByRarity } = require('../utils/botGenerator');
        const item = generateItemByRarity(reward.chest, null);
        const itemRes = await client.query(
            `INSERT INTO items (name, type, rarity, class_restriction, owner_class, atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
            [item.name, item.type, item.rarity, 'any', item.owner_class,
             item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
             item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
        );
        const itemId = itemRes.rows[0].id;
        await client.query(
            `INSERT INTO inventory (user_id, item_id, equipped, name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus, crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus) 
             VALUES ($1, $2, false, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
            [userId, itemId, item.name, item.type, item.rarity, 'any', item.owner_class,
             item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
             item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
        );
    }
    if (reward.points > 0) {
        await client.query(
            `INSERT INTO tournament_points (user_id, season_id, points, best_place)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, season_id) DO UPDATE
             SET points = tournament_points.points + $3,
                 best_place = LEAST(tournament_points.best_place, $4)`,
            [userId, seasonId, reward.points, place]
        );
    }

    // Отправляем письмо
    const rewardTextParts = [];
    if (reward.coins > 0) rewardTextParts.push(`${reward.coins} монет`);
    if (reward.diamonds > 0) rewardTextParts.push(`${reward.diamonds} алмазов`);
    if (reward.exp > 0) rewardTextParts.push(`${reward.exp} опыта для класса ${chosenClass}`);
    if (reward.chest) rewardTextParts.push(`${reward.chest === 'rare' ? 'Редкий' : 'Необычный'} сундук`);
    const rewardText = rewardTextParts.join(', ');
    const subject = `Итоги турнира Золотого Когтя`;
    const body = `Поздравляю! Вы заняли ${place} место в ежедневном турнире! Получите свою награду.`;
    await client.query(
        `INSERT INTO user_messages (user_id, from_text, subject, body, reward_coins, reward_diamonds, reward_exp, reward_exp_class, reward_chest, is_read, is_claimed)
         VALUES ($1, 'Мастер кошачьих боёв', $2, $3, $4, $5, $6, $7, $8, false, false)`,
        [userId, subject, body, reward.coins, reward.diamonds, reward.exp, chosenClass, reward.chest]
    );
}

async function getSeasonId(client) {
    const today = dailyTasks.getMoscowDate();
    let season = await client.query(
        'SELECT id FROM tournament_seasons WHERE start_date <= $1 AND end_date >= $1',
        [today]
    );
    if (season.rows.length === 0) {
        const startDate = new Date(today);
        const endDate = new Date(today);
        endDate.setMonth(endDate.getMonth() + 1);
        endDate.setDate(endDate.getDate() - 1);
        const name = `Сезон ${startDate.toLocaleDateString('ru-RU')}`;
        const newSeason = await client.query(
            'INSERT INTO tournament_seasons (name, start_date, end_date, league) VALUES ($1, $2, $3, $4) RETURNING id',
            [name, startDate, endDate, 'bronze']
        );
        return newSeason.rows[0].id;
    }
    return season.rows[0].id;
}

// ==================== ОСНОВНАЯ ФУНКЦИЯ ЗАПУСКА ТУРНИРА ====================

async function runTournament() {
    console.log('[TOURNAMENT] Запуск ежедневного турнира');
    const client = await pool.connect();
    try {
        const todayDate = dailyTasks.getMoscowDate();

        // Проверяем, не запущен ли турнир уже сегодня
        const existing = await client.query(
            'SELECT 1 FROM tournament_matches WHERE tournament_date = $1 LIMIT 1',
            [todayDate]
        );
        if (existing.rows.length > 0) {
            console.log('[TOURNAMENT] Турнир за сегодня уже проведён');
            return;
        }

        // Получаем зарегистрированных участников
        const regs = await client.query(
            `SELECT r.user_id, r.class_choice, r.subclass_choice
             FROM tournament_registrations r
             WHERE r.registered_at::DATE = $1`,
            [todayDate]
        );
        let participants = [];
        for (const reg of regs.rows) {
            const stats = await getPlayerTournamentStats(client, reg.user_id, reg.class_choice, reg.subclass_choice);
            participants.push({
                id: reg.user_id,
                username: stats.username,
                class: reg.class_choice,
                subclass: reg.subclass_choice,
                stats: stats.stats,
                isShadow: false
            });
        }

        // Добираем тенями, если меньше 64
        if (participants.length < TOURNAMENT_SIZE) {
            const needed = TOURNAMENT_SIZE - participants.length;
            const shadows = await client.query(
                `SELECT id, current_class, subclass
                 FROM users 
                 WHERE id NOT IN (SELECT user_id FROM tournament_registrations WHERE registered_at::DATE = $1)
                 ORDER BY RANDOM() LIMIT $2`,
                [todayDate, needed]
            );
            for (const shadow of shadows.rows) {
                const stats = await getPlayerTournamentStats(client, shadow.id, shadow.current_class, shadow.subclass || 'guardian');
                participants.push({
                    id: shadow.id,
                    username: stats.username,
                    class: shadow.current_class,
                    subclass: shadow.subclass || 'guardian',
                    stats: stats.stats,
                    isShadow: true
                });
            }
        }

        // Случайное перемешивание
        for (let i = participants.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [participants[i], participants[j]] = [participants[j], participants[i]];
        }

        // Симуляция турнира (сетка на вылет)
        let currentRoundPlayers = participants;
        let roundNum = 1;
        const allMatches = [];

        while (currentRoundPlayers.length > 1) {
            const nextRound = [];
            for (let i = 0; i < currentRoundPlayers.length; i += 2) {
                const p1 = currentRoundPlayers[i];
                const p2 = currentRoundPlayers[i + 1];
                if (!p2) {
                    // Если нечётное количество (не должно быть при 64, но на всякий случай)
                    nextRound.push(p1);
                    continue;
                }
                // Симуляция боя
                const battleResult = simulateBattle(p1.stats, p2.stats, p1.class, p2.class, p1.username, p2.username, p1.subclass, p2.subclass);
                const winner = battleResult.winner === 'player' ? p1 : p2;
                const matchLog = {
                    winner: winner.id,
                    messages: battleResult.messages,
                    states: battleResult.states,
                    playerHpRemain: battleResult.playerHpRemain,
                    enemyHpRemain: battleResult.enemyHpRemain
                };
                // Сохраняем матч в БД
                const matchRes = await client.query(
                    `INSERT INTO tournament_matches 
                     (season_id, tournament_date, round_number, match_index, player1_id, player2_id, winner_id, match_log, is_shadow)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     RETURNING id`,
                    [await getSeasonId(client), todayDate, roundNum, i / 2 + 1, p1.id, p2.id, winner.id, matchLog, p1.isShadow || p2.isShadow]
                );
                allMatches.push(matchRes.rows[0]);
                nextRound.push(winner);
            }
            currentRoundPlayers = nextRound;
            roundNum++;
            if (roundNum > 7) break; // 7 раундов максимум
        }

        // Начисление наград после завершения всех матчей
        const seasonId = await getSeasonId(client);
        for (const participant of participants) {
            if (participant.isShadow) continue; // тени не получают наград
            const place = await getPlaceForUser(client, participant.id, todayDate);
            await awardTournamentRewards(client, participant.id, place, seasonId, participant.class);
        }

        console.log('[TOURNAMENT] Турнир завершён, награды начислены');
    } catch (err) {
        console.error('[TOURNAMENT] Ошибка:', err);
    } finally {
        client.release();
    }
}

// Функция для определения места по матчам (должна быть объявлена до использования)
async function getPlaceForUser(client, userId, tournamentDate) {
    const res = await client.query(
        `WITH user_matches AS (
            SELECT 
                CASE WHEN player1_id = $1 THEN player1_id ELSE player2_id END as user_id,
                CASE WHEN winner_id = $1 THEN 1 ELSE 0 END as is_win,
                round_number
            FROM tournament_matches
            WHERE tournament_date = $2 AND (player1_id = $1 OR player2_id = $1)
        )
        SELECT 
            COUNT(CASE WHEN is_win = 1 THEN 1 END) as wins,
            MAX(CASE WHEN is_win = 1 THEN round_number ELSE 0 END) as max_round
        FROM user_matches`,
        [userId, tournamentDate]
    );
    const wins = parseInt(res.rows[0]?.wins || 0);
    const maxRound = parseInt(res.rows[0]?.max_round || 0);

    if (maxRound === 7 && wins === 3) return 1;
    if (maxRound === 7 && wins === 2) return 2;
    if (maxRound === 6) return 3;
    if (maxRound === 5) return 5;
    if (maxRound === 4) return 9;
    if (maxRound === 3) return 17;
    return 33;
}

// ==================== ЭКСПОРТ ====================

module.exports = {
    resetDailyTasks,
    resetSeason,
    runTournament
};
