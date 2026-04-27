const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const { itemNames, fixedBonuses } = require('../data/itemData');

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getMoscowDate() {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    return moscowTime.toISOString().split('T')[0];
}

function parseProgress(progress) {
    if (!progress) return {};
    try {
        return typeof progress === 'string' ? JSON.parse(progress) : progress;
    } catch {
        return {};
    }
}

function generateItemByRarity(rarity, ownerClass = null) {
    const classes = ['warrior', 'assassin', 'mage'];
    const chosenClass = ownerClass || classes[Math.floor(Math.random() * classes.length)];
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    const namesArray = itemNames[chosenClass][type][rarity];
    const name = namesArray[Math.floor(Math.random() * namesArray.length)];

    const possibleStats = ['atk', 'def', 'hp', 'spd', 'crit', 'crit_dmg', 'agi', 'int', 'vamp', 'reflect'];
    const stat1 = possibleStats[Math.floor(Math.random() * possibleStats.length)];
    const stat2 = possibleStats[Math.floor(Math.random() * possibleStats.length)];

    const item = {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: chosenClass,
        atk_bonus: 0,
        def_bonus: 0,
        hp_bonus: 0,
        spd_bonus: 0,
        crit_bonus: 0,
        crit_dmg_bonus: 0,
        agi_bonus: 0,
        int_bonus: 0,
        vamp_bonus: 0,
        reflect_bonus: 0
    };

    const bonus = fixedBonuses[rarity];

    const addBonus = (stat) => {
        switch (stat) {
            case 'atk': item.atk_bonus += bonus.atk; break;
            case 'def': item.def_bonus += bonus.def; break;
            case 'hp': item.hp_bonus += bonus.hp; break;
            case 'spd': item.spd_bonus += bonus.spd; break;
            case 'crit': item.crit_bonus += bonus.crit; break;
            case 'crit_dmg': item.crit_dmg_bonus += bonus.crit_dmg; break;
            case 'agi': item.agi_bonus += bonus.agi; break;
            case 'int': item.int_bonus += bonus.int; break;
            case 'vamp': item.vamp_bonus += bonus.vamp; break;
            case 'reflect': item.reflect_bonus += bonus.reflect; break;
        }
    };

    addBonus(stat1);
    addBonus(stat2);

    return item;
}

function getAdventReward(day, daysInMonth) {
    const coinExpBase = [50, 50, 60, 60, 70, 70, 80, 80, 90, 90, 100, 100, 120, 120, 150, 150, 200, 200, 250, 250, 300, 300, 400, 400, 500, 500];
    
    if (day === 7) return { type: 'item', rarity: 'common' };
    if (day === 14) return { type: 'item', rarity: 'uncommon' };
    if (day === 22) return { type: 'item', rarity: 'epic' };
    if (day === daysInMonth && (daysInMonth === 30 || daysInMonth === 31)) {
        return { type: 'item', rarity: 'legendary' };
    }
    const index = day - 1;
    if (index < coinExpBase.length) {
        if (day % 2 === 1) return { type: 'coins', amount: coinExpBase[index] };
        else return { type: 'exp', amount: coinExpBase[index] };
    } else {
        const higher = [300, 300, 400, 400, 500, 500];
        let idx = index - coinExpBase.length;
        if (idx < higher.length) {
            if (day % 2 === 1) return { type: 'coins', amount: higher[idx] };
            else return { type: 'exp', amount: higher[idx] };
        }
    }
    return { type: 'coins', amount: 100 };
}

// ==================== АДВЕНТ ====================

router.get('/advent', async (req, res) => {
    const { tg_id, user_id } = req.query;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        const userId = user.id;
        let lastClaimed = user.advent_last_claimed_day || 0;
        let lastClaimDate = user.advent_last_claim_date;
        let adventMonth = user.advent_month;
        let adventYear = user.advent_year;
        
        const now = new Date();
        const mskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const currentMonth = mskTime.getMonth() + 1;
        const currentYear = mskTime.getFullYear();
        const currentDay = mskTime.getDate();
        const todayStr = getMoscowDate();
        
        // Сброс при смене месяца/года
        if (adventMonth !== currentMonth || adventYear !== currentYear) {
            lastClaimed = 0;
            lastClaimDate = null;
            await client.query(
                `UPDATE users 
                 SET advent_last_claimed_day = 0, 
                     advent_last_claim_date = NULL, 
                     advent_month = $1, 
                     advent_year = $2 
                 WHERE id = $3`,
                [currentMonth, currentYear, userId]
            );
        }
        
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const nextDay = lastClaimed + 1;
        
        const lastClaimDateStr = lastClaimDate ? new Date(lastClaimDate).toISOString().split('T')[0] : null;
        
        let availableDay = null;
        if (nextDay <= currentDay && (!lastClaimDateStr || lastClaimDateStr !== todayStr)) {
            availableDay = nextDay;
        }
        
        console.log(`[ADVENT GET] user=${userId}, lastClaimed=${lastClaimed}, lastClaimDate=${lastClaimDateStr}, nextDay=${nextDay}, availableDay=${availableDay}`);
        
        res.json({
            currentDay,
            daysInMonth,
            nextAvailable: availableDay,
            lastClaimed: lastClaimed,
            lastClaimDate: lastClaimDateStr
        });
    } finally {
        client.release();
    }
});

router.post('/advent/claim', async (req, res) => {
    const { tg_id, user_id, classChoice } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;
        let lastClaimed = user.advent_last_claimed_day || 0;
        let lastClaimDate = user.advent_last_claim_date;
        let adventMonth = user.advent_month;
        let adventYear = user.advent_year;
        
        const now = new Date();
        const mskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const currentMonth = mskTime.getMonth() + 1;
        const currentYear = mskTime.getFullYear();
        const currentDay = mskTime.getDate();
        const todayStr = getMoscowDate();
        
        if (adventMonth !== currentMonth || adventYear !== currentYear) {
            lastClaimed = 0;
            lastClaimDate = null;
            await client.query(
                `UPDATE users 
                 SET advent_last_claimed_day = 0, 
                     advent_last_claim_date = NULL, 
                     advent_month = $1, 
                     advent_year = $2 
                 WHERE id = $3`,
                [currentMonth, currentYear, userId]
            );
        }
        
        const nextDay = lastClaimed + 1;
        const lastClaimDateStr = lastClaimDate ? new Date(lastClaimDate).toISOString().split('T')[0] : null;
        
        console.log(`[ADVENT CLAIM] user=${userId}, lastClaimed=${lastClaimed}, lastClaimDate=${lastClaimDateStr}, todayStr=${todayStr}, currentDay=${currentDay}`);
        
        if (nextDay > currentDay) {
            throw new Error('This day is not available yet');
        }
        if (lastClaimDateStr && lastClaimDateStr === todayStr) {
            throw new Error('You have already claimed today\'s reward');
        }
        
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const reward = getAdventReward(nextDay, daysInMonth);
        let rewardDescription = '';
        let rewardItem = null;
        let leveledUp = false;
        
        if (reward.type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [reward.amount, userId]);
            rewardDescription = `${reward.amount} монет`;
        } else if (reward.type === 'exp') {
            if (!classChoice) throw new Error('Class choice required for exp');
            const classRes = await client.query(
                'SELECT level, exp, skill_points FROM user_classes WHERE user_id = $1 AND class = $2',
                [userId, classChoice]
            );
            if (classRes.rows.length === 0) throw new Error('Class not found');
            let { level, exp, skill_points } = classRes.rows[0];
            exp += reward.amount;
            const expNeeded = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));
            while (exp >= expNeeded(level)) {
                exp -= expNeeded(level);
                level++;
                const pointsToAdd = (level <= 14) ? 3 : 5;
                skill_points += pointsToAdd;
                leveledUp = true;
            }
            await client.query(
                'UPDATE user_classes SET level = $1, exp = $2, skill_points = $3 WHERE user_id = $4 AND class = $5',
                [level, exp, skill_points, userId, classChoice]
            );
            rewardDescription = `${reward.amount} опыта для класса ${classChoice}`;
        } else if (reward.type === 'item') {
            const item = generateItemByRarity(reward.rarity, null);
            const itemRes = await client.query(
                `INSERT INTO items (name, type, rarity, class_restriction, owner_class, 
                    atk_bonus, def_bonus, hp_bonus, spd_bonus,
                    crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
                [item.name, item.type, item.rarity, 'any', item.owner_class,
                 item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
                 item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
            );
            const itemId = itemRes.rows[0].id;
            await client.query(
                `INSERT INTO inventory (user_id, item_id, equipped,
                    name, type, rarity, class_restriction, owner_class,
                    atk_bonus, def_bonus, hp_bonus, spd_bonus,
                    crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                [userId, itemId, false,
                 item.name, item.type, item.rarity, 'any', item.owner_class,
                 item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
                 item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
            );
            rewardDescription = `Предмет: ${item.name} (${item.rarity})`;
            rewardItem = item;
        }
        
        await client.query(
            `UPDATE users 
             SET advent_last_claimed_day = $1, 
                 advent_last_claim_date = $2 
             WHERE id = $3`,
            [nextDay, todayStr, userId]
        );
        
        await client.query('COMMIT');
        res.json({ 
            success: true, 
            reward: rewardDescription, 
            nextAvailable: nextDay + 1, 
            item: rewardItem, 
            newLastClaimed: nextDay,
            leveledUp: leveledUp
        });
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ==================== ЕЖЕДНЕВНЫЕ ЗАДАНИЯ ====================

async function updateTowerTask(client, userId) {
    const userRes = await client.query(
        'SELECT daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE id = $1',
        [userId]
    );
    const user = userRes.rows[0];
    const today = getMoscowDate();
    const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
    if (lastResetStr !== today) {
        // Не сбрасываем прогресс, только обновляем дату
        await client.query('UPDATE users SET last_daily_reset = $1, daily_win_streak = 0 WHERE id = $2', [today, userId]);
        user.last_daily_reset = today;
    }
    let progress = parseProgress(user.daily_tasks_progress);
    const taskId = 8;
    if (!(user.daily_tasks_mask & (1 << (taskId - 1)))) {
        const currentProgress = progress[taskId] || 0;
        const newProgress = currentProgress + 1;
        progress[taskId] = newProgress;
        await client.query(
            'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
            [JSON.stringify(progress), userId]
        );
    }
}

async function updateLuckyTask(client, userId) {
    const userRes = await client.query(
        'SELECT daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE id = $1',
        [userId]
    );
    const user = userRes.rows[0];
    const today = getMoscowDate();
    const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
    if (lastResetStr !== today) {
        // Не сбрасываем прогресс, только обновляем дату
        await client.query('UPDATE users SET last_daily_reset = $1, daily_win_streak = 0 WHERE id = $2', [today, userId]);
        user.last_daily_reset = today;
    }
    let progress = parseProgress(user.daily_tasks_progress);
    const taskId = 7;
    if (!(user.daily_tasks_mask & (1 << (taskId - 1)))) {
        const currentProgress = progress[taskId] || 0;
        const newProgress = currentProgress + 1;
        progress[taskId] = newProgress;
        await client.query(
            'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
            [JSON.stringify(progress), userId]
        );
    }
}

router.get('/daily/list', async (req, res) => {
    console.log('=== /daily/list called ===');
    console.log('tg_id:', req.query.tg_id, 'user_id:', req.query.user_id);
    const { tg_id, user_id } = req.query;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });

    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        const userId = user.id;

        const streakRes = await client.query('SELECT daily_win_streak FROM users WHERE id = $1', [userId]);
        let dailyWinStreak = streakRes.rows[0]?.daily_win_streak || 0;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
        if (lastResetStr !== today) {
            // Ежедневный сброс: обнуляем маску выполненных заданий и прогресс
            await client.query(
                'UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = $1, last_daily_reset = $2, daily_win_streak = 0 WHERE id = $3',
                ['{}', today, userId]
            );
            user.daily_tasks_mask = 0;
            user.daily_tasks_progress = '{}';
            dailyWinStreak = 0;
        }

        let progressObj = parseProgress(user.daily_tasks_progress);
        const tasksRes = await client.query('SELECT * FROM daily_tasks ORDER BY id');
        const tasks = tasksRes.rows;

        const result = [];
        for (const task of tasks) {
            const completed = !!(user.daily_tasks_mask & (1 << (task.id - 1)));
            let progress = completed ? task.target_value : (progressObj[task.id] || 0);
            
            if ([1,2,3].includes(task.id) && !completed && dailyWinStreak >= 10) {
                progress = task.target_value;
            }
            
            result.push({
                id: task.id,
                name: task.name,
                description: task.description,
                reward_type: task.reward_type,
                reward_amount: task.reward_amount,
                target_type: task.target_type,
                target_value: task.target_value,
                progress: parseInt(progress),
                completed
            });
        }

        const allTasks = tasks.filter(t => t.id !== 9);
        const totalTasksCount = allTasks.length;
        const completedTasksCount = allTasks.filter(t => !!(user.daily_tasks_mask & (1 << (t.id - 1)))).length;

        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.json({
            tasks: result,
            dailyWinStreak: dailyWinStreak,
            totalTasksCount: totalTasksCount,
            completedTasksCount: completedTasksCount
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

// ================== ИСПРАВЛЕННЫЙ ОБРАБОТЧИК CLAIM (без сброса прогресса) ==================
router.post('/daily/claim', async (req, res) => {
    const { tg_id, user_id, task_id, class_choice } = req.body;
    if ((!tg_id && !user_id) || !task_id) return res.status(400).json({ error: 'Missing data' });

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
        if (lastResetStr !== today) {
            // Если дата сброса не совпадает, значит сброс не выполнялся. Прежде чем дать claim, нужно сбросить, но тогда прогресс обнулится и claim не пройдёт.
            // Поэтому просто обновляем дату, чтобы избежать ошибки, но claim всё равно не должен проходить, т.к. задания не выполнены.
            // Лучше выполнить сброс сейчас, чтобы пользователь увидел актуальные задания.
            await client.query(
                'UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = $1, last_daily_reset = $2, daily_win_streak = 0 WHERE id = $3',
                ['{}', today, userId]
            );
            user.daily_tasks_mask = 0;
            user.daily_tasks_progress = '{}';
            // После сброса задание не может быть выполнено, выбрасываем ошибку
            throw new Error('Daily reset performed, please refresh');
        }

        if (user.daily_tasks_mask & (1 << (task_id - 1))) {
            throw new Error('Task already claimed');
        }

        const taskRes = await client.query('SELECT * FROM daily_tasks WHERE id = $1', [task_id]);
        if (taskRes.rows.length === 0) throw new Error('Task not found');
        const task = taskRes.rows[0];

        let progressObj = parseProgress(user.daily_tasks_progress);
        let isCompleted = false;

        if (task_id == 9) {
            const otherTasks = await client.query('SELECT id FROM daily_tasks WHERE id != 9');
            let allCompleted = true;
            for (let other of otherTasks.rows) {
                if (!(user.daily_tasks_mask & (1 << (other.id - 1)))) {
                    allCompleted = false;
                    break;
                }
            }
            isCompleted = allCompleted;
        } else if ([1,2,3].includes(task.id)) {
            const streakRes = await client.query('SELECT daily_win_streak FROM users WHERE id = $1', [userId]);
            const dailyWinStreak = streakRes.rows[0]?.daily_win_streak || 0;
            if (dailyWinStreak >= 10) {
                isCompleted = true;
            } else if ((progressObj[task_id] || 0) >= task.target_value) {
                isCompleted = true;
            }
        } else {
            if ((progressObj[task_id] || 0) >= task.target_value) {
                isCompleted = true;
            }
        }

        if (!isCompleted) {
            throw new Error('Task not completed');
        }

        let leveledUp = false;

        if (task.reward_type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [task.reward_amount, userId]);
        } else if (task.reward_type === 'exp') {
            if (!class_choice) {
                throw new Error('class_choice required for exp reward');
            }
            const classRes = await client.query(
                'SELECT level, exp, skill_points FROM user_classes WHERE user_id = $1 AND class = $2',
                [userId, class_choice]
            );
            if (classRes.rows.length === 0) throw new Error('Class not found');
            let { level, exp, skill_points } = classRes.rows[0];
            exp += task.reward_amount;
            const expNeeded = (lvl) => Math.floor(80 * Math.pow(lvl, 1.5));
            while (exp >= expNeeded(level)) {
                exp -= expNeeded(level);
                level++;
                const pointsToAdd = (level <= 14) ? 3 : 5;
                skill_points += pointsToAdd;
                leveledUp = true;
            }
            await client.query(
                'UPDATE user_classes SET level = $1, exp = $2, skill_points = $3 WHERE user_id = $4 AND class = $5',
                [level, exp, skill_points, userId, class_choice]
            );
        }

        await client.query(
            'UPDATE users SET daily_tasks_mask = daily_tasks_mask | $1 WHERE id = $2',
            [1 << (task_id - 1), userId]
        );

        await client.query('COMMIT');
        res.json({ success: true, leveledUp: leveledUp });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ==================== МАРШРУТЫ ОБНОВЛЕНИЯ ПРОГРЕССА ====================

router.post('/daily/update/battle', async (req, res) => {
    const { tg_id, user_id, class_played, is_victory } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        let progress = {};
        const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
        if (lastResetStr !== today) {
            // Не сбрасываем прогресс, только обновляем дату и серию побед
            await client.query('UPDATE users SET last_daily_reset = $1, daily_win_streak = 0 WHERE id = $2', [today, userId]);
            user.last_daily_reset = today;
            // Читаем актуальный прогресс пользователя (он не сброшен, т.к. сброс будет в /daily/list)
            progress = parseProgress(user.daily_tasks_progress);
        } else {
            progress = parseProgress(user.daily_tasks_progress);
        }

        progress[5] = (progress[5] || 0) + 1;

        if (is_victory) {
            if (class_played === 'warrior') progress[1] = (progress[1] || 0) + 1;
            if (class_played === 'assassin') progress[2] = (progress[2] || 0) + 1;
            if (class_played === 'mage') progress[3] = (progress[3] || 0) + 1;
        }

        await client.query(
            'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
            [JSON.stringify(progress), userId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/daily/update/exp', async (req, res) => {
    const { tg_id, user_id, exp_gained } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        let progress = {};
        const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
        if (lastResetStr !== today) {
            // Не сбрасываем прогресс, только обновляем дату и серию побед
            await client.query('UPDATE users SET last_daily_reset = $1, daily_win_streak = 0 WHERE id = $2', [today, userId]);
            user.last_daily_reset = today;
            progress = parseProgress(user.daily_tasks_progress);
        } else {
            progress = parseProgress(user.daily_tasks_progress);
        }

        progress[4] = (progress[4] || 0) + exp_gained;

        await client.query(
            'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
            [JSON.stringify(progress), userId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/daily/update/chest', async (req, res) => {
    const { tg_id, user_id, item_rarity } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        let progress = {};
        const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
        if (lastResetStr !== today) {
            // Не сбрасываем прогресс, только обновляем дату и серию побед
            await client.query('UPDATE users SET last_daily_reset = $1, daily_win_streak = 0 WHERE id = $2', [today, userId]);
            user.last_daily_reset = today;
            progress = parseProgress(user.daily_tasks_progress);
        } else {
            progress = parseProgress(user.daily_tasks_progress);
        }

        if (['rare', 'epic', 'legendary'].includes(item_rarity)) {
            progress[7] = (progress[7] || 0) + 1;
            await client.query(
                'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
                [JSON.stringify(progress), userId]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/daily/update/profile', async (req, res) => {
    const { tg_id, user_id } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        const userId = user.id;

        const now = new Date();
        const moscowNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowNow.toISOString().split('T')[0];

        let progress = {};
        const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
        if (lastResetStr !== today) {
            // Не сбрасываем прогресс, только обновляем дату и серию побед
            await client.query('UPDATE users SET last_daily_reset = $1, daily_win_streak = 0 WHERE id = $2', [today, userId]);
            user.last_daily_reset = today;
            progress = parseProgress(user.daily_tasks_progress);
        } else {
            progress = parseProgress(user.daily_tasks_progress);
        }

        progress[6] = (progress[6] || 0) + 1;

        await client.query(
            'UPDATE users SET daily_tasks_progress = $1, last_profile_visit = $2 WHERE id = $3',
            [JSON.stringify(progress), moscowNow, userId]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

async function checkChampionTask(client, userId) {
    // Заглушка – больше не используется
}

module.exports = router;
module.exports.updateLuckyTask = updateLuckyTask;
module.exports.updateTowerTask = updateTowerTask;
module.exports.checkChampionTask = checkChampionTask;
