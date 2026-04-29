const express = require('express');
const router = express.Router();
const { pool, getUserByIdentifier } = require('../db');
const dailyTasks = require('../utils/dailyTasks');
const { generateItemByRarity } = require('../utils/botGenerator');
const { itemNames, fixedBonuses } = require('../data/itemData');

// ======================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ АДВЕНТА ========================

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

// ======================== АДВЕНТ-КАЛЕНДАРЬ ========================

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
        const todayStr = dailyTasks.getMoscowDate();
        if (adventMonth !== currentMonth || adventYear !== currentYear) {
            lastClaimed = 0;
            lastClaimDate = null;
            await client.query(
                `UPDATE users SET advent_last_claimed_day = 0, advent_last_claim_date = NULL, advent_month = $1, advent_year = $2 WHERE id = $3`,
                [currentMonth, currentYear, userId]
            );
        }
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const nextDay = lastClaimed + 1;
        let availableDay = null;
        if (nextDay <= currentDay && (!lastClaimDate || lastClaimDate !== todayStr)) {
            availableDay = nextDay;
        }
        res.json({ currentDay, daysInMonth, nextAvailable: availableDay, lastClaimed, lastClaimDate });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
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
        const todayStr = dailyTasks.getMoscowDate();
        if (adventMonth !== currentMonth || adventYear !== currentYear) {
            lastClaimed = 0;
            lastClaimDate = null;
            await client.query(
                `UPDATE users SET advent_last_claimed_day = 0, advent_last_claim_date = NULL, advent_month = $1, advent_year = $2 WHERE id = $3`,
                [currentMonth, currentYear, userId]
            );
        }
        const nextDay = lastClaimed + 1;
        if (nextDay > currentDay) throw new Error('This day is not available yet');
        if (lastClaimDate && lastClaimDate === todayStr) throw new Error('You have already claimed today\'s reward');
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
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
                [userId, itemId, false, item.name, item.type, item.rarity, 'any', item.owner_class,
                 item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
                 item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
            );
            rewardDescription = `Предмет: ${item.name} (${item.rarity})`;
            rewardItem = item;
        }
        await client.query(
            `UPDATE users SET advent_last_claimed_day = $1, advent_last_claim_date = $2 WHERE id = $3`,
            [nextDay, todayStr, userId]
        );
        await client.query('COMMIT');
        res.json({ success: true, reward: rewardDescription, nextAvailable: nextDay + 1, item: rewardItem, newLastClaimed: nextDay, leveledUp });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// ======================== ЕЖЕДНЕВНЫЕ ЗАДАНИЯ ========================

router.get('/daily/list', async (req, res) => {
    const { tg_id, user_id } = req.query;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        await dailyTasks.checkAndResetDay(client, user);
        const tasks = await dailyTasks.getTasksList(user);
        const streakRes = await client.query('SELECT daily_win_streak FROM users WHERE id = $1', [user.id]);
        const dailyWinStreak = streakRes.rows[0]?.daily_win_streak || 0;
        const allTasks = tasks.filter(t => t.id !== 9);
        const completedTasksCount = allTasks.filter(t => t.completed).length;
        res.json({
            tasks,
            dailyWinStreak,
            totalTasksCount: allTasks.length,
            completedTasksCount
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    } finally {
        client.release();
    }
});

router.post('/daily/claim', async (req, res) => {
    const { tg_id, user_id, task_id, class_choice } = req.body;
    if ((!tg_id && !user_id) || !task_id) return res.status(400).json({ error: 'Missing data' });
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        await dailyTasks.checkAndResetDay(client, user);
        if (user.daily_tasks_mask & (1 << (task_id - 1))) {
            throw new Error('Task already claimed');
        }
        const taskRes = await client.query('SELECT * FROM daily_tasks WHERE id = $1', [task_id]);
        if (taskRes.rows.length === 0) throw new Error('Task not found');
        const task = taskRes.rows[0];
        let progressObj = dailyTasks.parseProgress(user.daily_tasks_progress);
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
            const streakRes = await client.query('SELECT daily_win_streak FROM users WHERE id = $1', [user.id]);
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
        if (!isCompleted) throw new Error('Task not completed');
        let leveledUp = false;
        if (task.reward_type === 'coins') {
            await client.query('UPDATE users SET coins = coins + $1 WHERE id = $2', [task.reward_amount, user.id]);
        } else if (task.reward_type === 'exp') {
            if (!class_choice) throw new Error('class_choice required for exp reward');
            const classRes = await client.query(
                'SELECT level, exp, skill_points FROM user_classes WHERE user_id = $1 AND class = $2',
                [user.id, class_choice]
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
                [level, exp, skill_points, user.id, class_choice]
            );
        }
        await client.query(
            'UPDATE users SET daily_tasks_mask = daily_tasks_mask | $1 WHERE id = $2',
            [1 << (task_id - 1), user.id]
        );
        await client.query('COMMIT');
        res.json({ success: true, leveledUp });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

router.post('/daily/update/battle', async (req, res) => {
    const { tg_id, user_id, class_played, is_victory } = req.body;
    if (!tg_id && !user_id) return res.status(400).json({ error: 'tg_id or user_id required' });
    const client = await pool.connect();
    try {
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        await dailyTasks.resetIfNeeded(user.id);
        await dailyTasks.updateBattleProgress(user.id, class_played, is_victory);
        res.json({ success: true });
    } catch (e) {
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
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        // вызов resetIfNeeded УДАЛЁН – чтобы не сбрасывать прогресс повторно
        await dailyTasks.updateExpProgress(user.id, exp_gained);
        res.json({ success: true });
    } catch (e) {
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
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        await dailyTasks.updateChestProgress(user.id, item_rarity);
        res.json({ success: true });
    } catch (e) {
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
        const user = await getUserByIdentifier(client, tg_id, user_id);
        if (!user) throw new Error('User not found');
        await dailyTasks.updateProfileProgress(user.id);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
