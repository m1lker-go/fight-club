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
        return tasks.map(t => ({
            id: t.id,
            name: t.name,
            description: t.description,
            reward_type: t.reward_type,
            reward_amount: t.reward_amount,
            target_type: t.target_type,
            target_value: t.target_value,
            progress: (mask & (1 << (t.id-1))) ? t.target_value : (progress[t.id] || 0),
            completed: !!(mask & (1 << (t.id-1)))
        }));
    } finally { client.release(); }
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
        prog[taskId] = old + inc;
        await client.query('UPDATE users SET daily_tasks_progress=$1 WHERE id=$2', [JSON.stringify(prog), userId]);
        log(`task ${taskId}: ${old} → ${prog[taskId]}`);
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

module.exports = {
    getMoscowDate,
    parseProgress,
    getTasksList,
    updateTaskProgress,
    updateBattleProgress,
    updateExpProgress,
    updateChestProgress,
    updateProfileProgress,
    updateTowerTask
};
