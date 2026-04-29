const { pool } = require('../db');

function debugLog(context, message, data = null) {
    console.log(`[DAILY_DEBUG] ${context}: ${message}`);
    if (data !== null) console.log(`[DAILY_DEBUG] data:`, data);
}

function getMoscowDate() {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const result = moscowTime.toISOString().split('T')[0];
    debugLog('getMoscowDate', result);
    return result;
}

function parseProgress(progress) {
    if (!progress) return {};
    try {
        return typeof progress === 'string' ? JSON.parse(progress) : progress;
    } catch {
        return {};
    }
}

async function resetDailyTasks(client, userId, today) {
    debugLog('resetDailyTasks', `user ${userId}, date ${today}`);
    await client.query(
        `UPDATE users SET daily_tasks_mask = 0, daily_tasks_progress = $1, last_daily_reset = $2 WHERE id = $3`,
        [JSON.stringify({}), today, userId]
    );
}

// Основная функция для сброса дня (используется в маршрутах)
async function checkAndResetDay(client, user) {
    const today = getMoscowDate();
    const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
    if (lastResetStr !== today) {
        await resetDailyTasks(client, user.id, today);
        user.daily_tasks_mask = 0;
        user.daily_tasks_progress = {};
        user.last_daily_reset = today;
        debugLog('checkAndResetDay', `reset performed for user ${user.id}`);
    } else {
        debugLog('checkAndResetDay', `no reset needed for user ${user.id}`);
    }
    return user;
}

// Альтернативная функция, принимающая только userId (для update маршрутов)
async function resetIfNeeded(userId) {
    const client = await pool.connect();
    try {
        const userRes = await client.query('SELECT id, last_daily_reset FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        const today = getMoscowDate();
        const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
        if (lastResetStr !== today) {
            await resetDailyTasks(client, userId, today);
            debugLog('resetIfNeeded', `reset performed for user ${userId}`);
        } else {
            debugLog('resetIfNeeded', `no reset needed for user ${userId}`);
        }
    } finally {
        client.release();
    }
}

async function getTasksList(user) {
    const client = await pool.connect();
    try {
        const tasksRes = await client.query('SELECT * FROM daily_tasks ORDER BY id');
        const tasks = tasksRes.rows;
        const progressObj = parseProgress(user.daily_tasks_progress);
        const result = [];
        for (const task of tasks) {
            const completed = !!(user.daily_tasks_mask & (1 << (task.id - 1)));
            let progress = completed ? task.target_value : (progressObj[task.id] || 0);
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
        debugLog('getTasksList', `user ${user.id}, tasks count ${result.length}`);
        return result;
    } finally {
        client.release();
    }
}

async function updateTaskProgress(userId, taskId, increment = 1) {
    debugLog('updateTaskProgress', `user ${userId}, task ${taskId}, +${increment}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Получаем user с блокировкой
        const userRes = await client.query(
            'SELECT daily_tasks_mask, daily_tasks_progress FROM users WHERE id = $1 FOR UPDATE',
            [userId]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];
        if (user.daily_tasks_mask & (1 << (taskId - 1))) {
            debugLog('updateTaskProgress', `task ${taskId} already completed, skip`);
            await client.query('COMMIT');
            return false;
        }
        let progress = parseProgress(user.daily_tasks_progress);
        const old = progress[taskId] || 0;
        progress[taskId] = old + increment;
        await client.query(
            'UPDATE users SET daily_tasks_progress = $1 WHERE id = $2',
            [JSON.stringify(progress), userId]
        );
        debugLog('updateTaskProgress', `progress updated: ${old} → ${progress[taskId]}`);
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        debugLog('updateTaskProgress', `error: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
}

async function updateBattleProgress(userId, classPlayed, isVictory) {
    debugLog('updateBattleProgress', `user ${userId}, class ${classPlayed}, victory ${isVictory}`);
    if (!isVictory) return;
    await updateTaskProgress(userId, 5, 1);
    let taskId = classPlayed === 'warrior' ? 1 : (classPlayed === 'assassin' ? 2 : (classPlayed === 'mage' ? 3 : null));
    if (taskId) await updateTaskProgress(userId, taskId, 1);
}

async function updateExpProgress(userId, expGained) {
    debugLog('updateExpProgress', `user ${userId}, exp ${expGained}`);
    if (expGained > 0) await updateTaskProgress(userId, 4, expGained);
}

async function updateChestProgress(userId, itemRarity) {
    debugLog('updateChestProgress', `user ${userId}, rarity ${itemRarity}`);
    if (['rare', 'epic', 'legendary'].includes(itemRarity)) {
        await updateTaskProgress(userId, 7, 1);
    }
}

async function updateProfileProgress(userId) {
    debugLog('updateProfileProgress', `user ${userId}`);
    await updateTaskProgress(userId, 6, 1);
}

async function updateTowerTask(userId) {
    debugLog('updateTowerTask', `user ${userId}`);
    await updateTaskProgress(userId, 8, 1);
}

module.exports = {
    getMoscowDate,
    parseProgress,
    checkAndResetDay,
    resetIfNeeded,
    getTasksList,
    updateTaskProgress,
    updateBattleProgress,
    updateExpProgress,
    updateChestProgress,
    updateProfileProgress,
    updateTowerTask,
    debugLog
};
