const { pool } = require('../db');
const dailyTasks = require('./dailyTasks');
const { simulateBattle } = require('./battleSimulator');
const { addExp } = require('./exp');
const { updatePlayerPower } = require('./power');

const TOURNAMENT_SIZE = 32; // Изменили с 64 на 32

// ==================== СУЩЕСТВУЮЩИЕ ФУНКЦИИ ====================

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
    const classData = await client.query(
        `SELECT * FROM user_classes 
         WHERE user_id = $1 AND class = $2`,
        [userId, className]
    );
    if (classData.rows.length === 0) {
        throw new Error(`Class ${className} not found for user ${userId}`);
    }
    const classRow = classData.rows[0];

    const inventory = await client.query(
        `SELECT i.*, it.* FROM inventory i
         JOIN items it ON i.item_id = it.id
         WHERE i.user_id = $1 AND i.equipped = true AND it.owner_class = $2`,
        [userId, className]
    );

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
    // Награды для 32 участников (1-32)
    const rewardsMap = {
        1: { coins: 500, diamonds: 15, exp: 250, chest: 'rare', points: 20 },
        2: { coins: 400, diamonds: 10, exp: 200, chest: 'uncommon', points: 15 },
        3: { coins: 300, diamonds: 5, exp: 150, chest: 'uncommon', points: 12 },
        4: { coins: 250, diamonds: 0, exp: 120, chest: null, points: 10 },
        5: { coins: 200, diamonds: 0, exp: 100, chest: null, points: 8 },   // 5-8
        9: { coins: 150, diamonds: 0, exp: 75, chest: null, points: 6 },    // 9-16
        17: { coins: 100, diamonds: 0, exp: 50, chest: null, points: 4 }    // 17-32
    };

    let reward;
    if (place === 1) reward = rewardsMap[1];
    else if (place === 2) reward = rewardsMap[2];
    else if (place === 3) reward = rewardsMap[3];
    else if (place === 4) reward = rewardsMap[4];
    else if (place <= 8) reward = rewardsMap[5];
    else if (place <= 16) reward = rewardsMap[9];
    else reward = rewardsMap[17];

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

// ==================== ОСНОВНАЯ ФУНКЦИЯ ЗАПУСКА ТУРНИРА (32 участника, 5 раундов + матч за 3 место) ====================

async function runTournament() {
    console.log('[TOURNAMENT] Запуск ежедневного турнира (32 участника)');
    const client = await pool.connect();
    try {
        const todayDate = dailyTasks.getMoscowDate();

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

        // Добираем тенями до 32
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

        // Симуляция турнира: сначала 1/16 (32 → 16), затем 1/8 (16 → 8), 1/4 (8 → 4), 1/2 (4 → 2), финал (2 → 1)
        // Дополнительно: матч за 3-е место между проигравшими в полуфиналах.
        let currentRoundPlayers = participants; // 32
        let roundNum = 1; // 1/16
        const allMatches = [];

        // Раунды до полуфиналов (1/16, 1/8, 1/4)
        while (currentRoundPlayers.length > 4) {
            const nextRound = [];
            for (let i = 0; i < currentRoundPlayers.length; i += 2) {
                const p1 = currentRoundPlayers[i];
                const p2 = currentRoundPlayers[i + 1];
                if (!p2) {
                    // Не должно случиться при 32 участниках, но на всякий случай
                    nextRound.push(p1);
                    continue;
                }
                const battleResult = simulateBattle(p1.stats, p2.stats, p1.class, p2.class, p1.username, p2.username, p1.subclass, p2.subclass);
                const winner = battleResult.winner === 'player' ? p1 : p2;
                const matchLog = {
                    winner: winner.id,
                    messages: battleResult.messages,
                    states: battleResult.states,
                    playerHpRemain: battleResult.playerHpRemain,
                    enemyHpRemain: battleResult.enemyHpRemain
                };
                await client.query(
                    `INSERT INTO tournament_matches 
                     (season_id, tournament_date, round_number, match_index, player1_id, player2_id, winner_id, match_log, is_shadow)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [await getSeasonId(client), todayDate, roundNum, i / 2 + 1, p1.id, p2.id, winner.id, matchLog, p1.isShadow || p2.isShadow]
                );
                nextRound.push(winner);
            }
            currentRoundPlayers = nextRound;
            roundNum++;
        }

        // Теперь у нас 4 участника (полуфиналисты)
        // Сохраняем их для дальнейшего использования
        const semiFinalists = [...currentRoundPlayers]; // [a, b, c, d]

        // Полуфиналы: первый матч (0 vs 1), второй матч (2 vs 3)
        const semi1 = semiFinalists[0];
        const semi2 = semiFinalists[1];
        const semi3 = semiFinalists[2];
        const semi4 = semiFinalists[3];

        // Полуфинал 1
        let battleResult1 = simulateBattle(semi1.stats, semi2.stats, semi1.class, semi2.class, semi1.username, semi2.username, semi1.subclass, semi2.subclass);
        const winner1 = battleResult1.winner === 'player' ? semi1 : semi2;
        const loser1 = winner1.id === semi1.id ? semi2 : semi1;
        const matchLog1 = {
            winner: winner1.id,
            messages: battleResult1.messages,
            states: battleResult1.states,
            playerHpRemain: battleResult1.playerHpRemain,
            enemyHpRemain: battleResult1.enemyHpRemain
        };
        await client.query(
            `INSERT INTO tournament_matches 
             (season_id, tournament_date, round_number, match_index, player1_id, player2_id, winner_id, match_log, is_shadow)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [await getSeasonId(client), todayDate, 4, 1, semi1.id, semi2.id, winner1.id, matchLog1, semi1.isShadow || semi2.isShadow]
        );

        // Полуфинал 2
        let battleResult2 = simulateBattle(semi3.stats, semi4.stats, semi3.class, semi4.class, semi3.username, semi4.username, semi3.subclass, semi4.subclass);
        const winner2 = battleResult2.winner === 'player' ? semi3 : semi4;
        const loser2 = winner2.id === semi3.id ? semi4 : semi3;
        const matchLog2 = {
            winner: winner2.id,
            messages: battleResult2.messages,
            states: battleResult2.states,
            playerHpRemain: battleResult2.playerHpRemain,
            enemyHpRemain: battleResult2.enemyHpRemain
        };
        await client.query(
            `INSERT INTO tournament_matches 
             (season_id, tournament_date, round_number, match_index, player1_id, player2_id, winner_id, match_log, is_shadow)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [await getSeasonId(client), todayDate, 4, 2, semi3.id, semi4.id, winner2.id, matchLog2, semi3.isShadow || semi4.isShadow]
        );

        // Финал (победители полуфиналов)
        const final1 = winner1;
        const final2 = winner2;
        let battleResultFinal = simulateBattle(final1.stats, final2.stats, final1.class, final2.class, final1.username, final2.username, final1.subclass, final2.subclass);
        const champion = battleResultFinal.winner === 'player' ? final1 : final2;
        const runnerUp = champion.id === final1.id ? final2 : final1;
        const matchLogFinal = {
            winner: champion.id,
            messages: battleResultFinal.messages,
            states: battleResultFinal.states,
            playerHpRemain: battleResultFinal.playerHpRemain,
            enemyHpRemain: battleResultFinal.enemyHpRemain
        };
        await client.query(
            `INSERT INTO tournament_matches 
             (season_id, tournament_date, round_number, match_index, player1_id, player2_id, winner_id, match_log, is_shadow)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [await getSeasonId(client), todayDate, 5, 1, final1.id, final2.id, champion.id, matchLogFinal, final1.isShadow || final2.isShadow]
        );

        // Матч за 3-е место (проигравшие в полуфиналах)
        const thirdPlaceMatch = simulateBattle(loser1.stats, loser2.stats, loser1.class, loser2.class, loser1.username, loser2.username, loser1.subclass, loser2.subclass);
        const thirdPlaceWinner = thirdPlaceMatch.winner === 'player' ? loser1 : loser2;
        const matchLogThird = {
            winner: thirdPlaceWinner.id,
            messages: thirdPlaceMatch.messages,
            states: thirdPlaceMatch.states,
            playerHpRemain: thirdPlaceMatch.playerHpRemain,
            enemyHpRemain: thirdPlaceMatch.enemyHpRemain
        };
        await client.query(
            `INSERT INTO tournament_matches 
             (season_id, tournament_date, round_number, match_index, player1_id, player2_id, winner_id, match_log, is_shadow)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [await getSeasonId(client), todayDate, 5, 2, loser1.id, loser2.id, thirdPlaceWinner.id, matchLogThird, loser1.isShadow || loser2.isShadow]
        );

        // Начисление наград
        const seasonId = await getSeasonId(client);
        for (const participant of participants) {
            if (participant.isShadow) continue;
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

// Функция для определения места (32 участника, с учётом матча за 3 место)
async function getPlaceForUser(client, userId, tournamentDate) {
    // Получаем все матчи пользователя за этот турнир
    const matches = await client.query(
        `SELECT round_number, winner_id, player1_id, player2_id
         FROM tournament_matches
         WHERE tournament_date = $1 AND (player1_id = $2 OR player2_id = $2)
         ORDER BY round_number`,
        [tournamentDate, userId]
    );

    if (matches.rows.length === 0) return 33; // не участвовал

    let maxRound = 0;
    let isWinner = false;
    for (const m of matches.rows) {
        if (m.round_number > maxRound) maxRound = m.round_number;
        if (m.winner_id === userId) isWinner = true;
    }

    // Логика для 32 участников:
    // round 1 = 1/16
    // round 2 = 1/8
    // round 3 = 1/4
    // round 4 = 1/2 (полуфинал)
    // round 5 = финал (match_index 1) или матч за 3-е место (match_index 2)
    if (maxRound === 5) {
        // Финальный раунд
        const finalMatch = matches.rows.find(m => m.round_number === 5 && m.match_index === 1);
        const thirdPlaceMatch = matches.rows.find(m => m.round_number === 5 && m.match_index === 2);
        if (finalMatch && finalMatch.winner_id === userId) return 1;
        if (finalMatch && finalMatch.winner_id !== userId && finalMatch.player1_id === userId || finalMatch.player2_id === userId) return 2;
        if (thirdPlaceMatch && thirdPlaceMatch.winner_id === userId) return 3;
        if (thirdPlaceMatch && thirdPlaceMatch.winner_id !== userId && (thirdPlaceMatch.player1_id === userId || thirdPlaceMatch.player2_id === userId)) return 4;
    }
    if (maxRound === 4) return 5;  // проиграл в полуфинале (5-8 место)
    if (maxRound === 3) return 9;  // проиграл в 1/4
    if (maxRound === 2) return 17; // проиграл в 1/8
    if (maxRound === 1) return 25; // проиграл в 1/16 (25-32)
    return 33;
}

module.exports = {
    resetDailyTasks,
    resetSeason,
    runTournament
};
