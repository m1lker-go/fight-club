const { pool } = require('../db');

function log(msg, data) {
    console.log(`[DAILY] ${msg}`);
    if (data) console.log(data);
}

function getMoscowDate() {
    const d = new Date();
    const msk = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    return msk.toISOString().split('T')[0];
}

function parseProgress(p) {
    if (!p) return {};
    try { return typeof p === 'string' ? JSON.parse(p) : p; } catch { return {}; }
}

async function getTasksList(user) {
    const client = await pool.connect();
    try {
        const tasks = (await client.query('SELECT * FROM daily_tasks ORDER BY id')).rows;
        const progress = parseProgress(user.daily_tasks_progress);
        const mask = user.daily_tasks_mask;
        const dailyWinStreak = user.daily_win_streak || 0;

        return tasks.map(t => {
            const alreadyCompleted = !!(mask & (1 << (t.id - 1)));
            let prog = alreadyCompleted ? t.target_value : (progress[t.id] || 0);

            // Задания 1, 2, 3: если серия >= 10, задание считается готовым
            if ([1, 2, 3].includes(t.id) && !alreadyCompleted && dailyWinStreak >= 10) {
                prog = t.target_value;
            }

            return {
                id: t.id,
                name: t.name,
                description: t.description,
                reward_type: t.reward_type,
                reward_amount: t.reward_amount,
                target_type: t.target_type,
                target_value: t.target_value,
                progress: prog,
                completed: alreadyCompleted
            };
        });
    } finally {
        client.release();
    }
}

async function updateTaskProgress(userId, taskId, inc) {
    log(`updateTaskProgress: user ${userId}, task ${taskId}, +${inc}`);
    const client = await pool.connect();
    try {
        const res = await client.query('SELECT daily_tasks_mask, daily_tasks_progress FROM users WHERE id=$1', [userId]);
        if (res.rows.length === 0) return false;
        const { daily_tasks_mask, daily_tasks_progress } = res.rows[0];
        if (daily_tasks_mask & (1 << (taskId-1))) {
            log(`task ${taskId} already completed, skip`);
            return false;
        }
        let prog = parseProgress(daily_tasks_progress);
        const old = prog[taskId] || 0;
        let newVal = old + inc;
        // Ограничиваем прогресс для заданий 1,2,3 максимум 10
        if (taskId === 1 || taskId === 2 || taskId === 3) {
            newVal = Math.min(newVal, 10);
        }
        prog[taskId] = newVal;
        await client.query('UPDATE users SET daily_tasks_progress=$1 WHERE id=$2', [JSON.stringify(prog), userId]);
        log(`task ${taskId}: ${old} → ${newVal}`);
        return true;
    } finally { client.release(); }
}

async function updateBattleProgress(userId, cls, victory) {
    log(`updateBattleProgress: user ${userId}, class ${cls}, victory ${victory}`);
    if (!victory) return;
    await updateTaskProgress(userId, 5, 1);
    let taskId = cls === 'warrior' ? 1 : (cls === 'assassin' ? 2 : (cls === 'mage' ? 3 : null));
    if (taskId) await updateTaskProgress(userId, taskId, 1);
}

async function updateExpProgress(userId, exp) {
    log(`updateExpProgress: user ${userId}, exp ${exp}`);
    if (exp > 0) await updateTaskProgress(userId, 4, exp);
}

async function updateChestProgress(userId, rarity) {
    if (['rare', 'epic', 'legendary'].includes(rarity)) {
        await updateTaskProgress(userId, 7, 1);
    }
}

async function updateProfileProgress(userId) {
    await updateTaskProgress(userId, 6, 1);
}

async function updateTowerTask(userId) {
    await updateTaskProgress(userId, 8, 1);
}

// ========== НОВЫЕ ЗАДАНИЯ ==========

// Задание 10: покрутить рулетку в фортуне
async function updateFortuneSpinProgress(userId) {
    await updateTaskProgress(userId, 10, 1);
}

// Задания 11 и 12: просмотр рекламы (оба увеличиваются одновременно)
async function updateWatchAdsProgress(userId) {
    await updateTaskProgress(userId, 11, 1);
    await updateTaskProgress(userId, 12, 1);
}

// Задание 13: получить 15 угля за день (суммарно)
async function updateCoalGainProgress(userId, amount) {
    await updateTaskProgress(userId, 13, amount);
}

module.exports = {
    getMoscowDate,
    parseProgress,
    getTasksList,
    updateTaskProgress,
    updateBattleProgress,
    updateExpProgress,
    updateChestProgress,
    updateProfileProgress,
    updateTowerTask,
    updateFortuneSpinProgress,
    updateWatchAdsProgress,
    updateCoalGainProgress
};
