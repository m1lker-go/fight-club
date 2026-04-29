// server/utils/dailyTasks.js
const { pool } = require('../db');

// ======================== ОТЛАДОЧНАЯ ФУНКЦИЯ ========================
function debugLog(context, message, data = null) {
    console.log(`[DAILY_DEBUG] ${context}: ${message}`);
    if (data !== null) {
        console.log(`[DAILY_DEBUG] data:`, data);
    }
}

// ======================== ОСНОВНЫЕ ФУНКЦИИ ========================

/**
 * Возвращает текущую дату в формате YYYY-MM-DD по московскому времени.
 */
function getMoscowDate() {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
    const result = moscowTime.toISOString().split('T')[0];
    debugLog('getMoscowDate', `Вычисленная дата: ${result}`);
    return result;
}

/**
 * Преобразует JSON-строку прогресса в объект.
 */
function parseProgress(progress) {
    if (!progress) return {};
    try {
        return typeof progress === 'string' ? JSON.parse(progress) : progress;
    } catch (e) {
        debugLog('parseProgress', 'Ошибка парсинга JSON, возвращаем {}', e.message);
        return {};
    }
}

/**
 * Полный сброс ежедневных заданий (обнуление маски и прогресса).
 */
async function resetDailyTasks(client, userId, today) {
    debugLog('resetDailyTasks', `Пользователь ${userId}, сброс на дату ${today}`);
    await client.query(
        `UPDATE users 
         SET daily_tasks_mask = 0, 
             daily_tasks_progress = $1, 
             last_daily_reset = $2 
         WHERE id = $3`,
        [JSON.stringify({}), today, userId]
    );
    debugLog('resetDailyTasks', `Сброс выполнен, mask=0, progress={}`);
}

/**
 * Проверяет, нужно ли сбросить задания (если last_daily_reset не сегодня), и выполняет сброс.
 * Возвращает обновлённый объект пользователя.
 */
async function checkAndResetDay(client, user) {
    const today = getMoscowDate();
    const lastResetStr = user.last_daily_reset ? new Date(user.last_daily_reset).toISOString().split('T')[0] : null;
    debugLog('checkAndResetDay', `Пользователь ${user.id}, lastResetStr=${lastResetStr}, today=${today}`);
    if (lastResetStr !== today) {
        debugLog('checkAndResetDay', 'Требуется сброс – вызываем resetDailyTasks');
        await resetDailyTasks(client, user.id, today);
        user.daily_tasks_mask = 0;
        user.daily_tasks_progress = {};
        user.last_daily_reset = today;
        debugLog('checkAndResetDay', 'После сброса: mask=0, progress={}');
    } else {
        debugLog('checkAndResetDay', 'Сброс не требуется');
    }
    return user;
}

/**
 * Получает список всех заданий с прогрессом для пользователя.
 */
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
        debugLog('getTasksList', `Пользователь ${user.id}, заданий: ${result.length}`);
        return result;
    } finally {
        client.release();
    }
}

/**
 * Увеличивает прогресс конкретного задания на increment.
 * Возвращает true, если прогресс обновлён (задание ещё не выполнено), иначе false.
 */
async function updateTaskProgress(userId, taskId, increment = 1) {
    debugLog('updateTaskProgress', `Пользователь ${userId}, задание ${taskId}, +${increment}`);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userRes = await client.query(
            'SELECT daily_tasks_mask, daily_tasks_progress, last_daily_reset FROM users WHERE id = $1 FOR UPDATE',
            [userId]
        );
        if (userRes.rows.length === 0) throw new Error('User not found');
        let user = userRes.rows[0];
        user = await checkAndResetDay(client, user);

        if (user.daily_tasks_mask & (1 << (taskId - 1))) {
            debugLog('updateTaskProgress', `Задание ${taskId} уже выполнено сегодня, пропускаем`);
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
        debugLog('updateTaskProgress', `Прогресс обновлён: ${old} → ${progress[taskId]}`);
        await client.query('COMMIT');
        return true;
    } catch (err) {
        await client.query('ROLLBACK');
        debugLog('updateTaskProgress', `Ошибка: ${err.message}`);
        throw err;
    } finally {
        client.release();
    }
}

// ======================== ОБНОВЛЕНИЕ ПО СОБЫТИЯМ ========================

async function updateBattleProgress(userId, classPlayed, isVictory) {
    debugLog('updateBattleProgress', `userId=${userId}, class=${classPlayed}, victory=${isVictory}`);
    if (!isVictory) {
        debugLog('updateBattleProgress', 'Поражение – прогресс не увеличивается');
        return;
    }
    // Задание 5: количество боёв
    await updateTaskProgress(userId, 5, 1);
    // Задания 1-3: победы конкретным классом
    let taskId = null;
    if (classPlayed === 'warrior') taskId = 1;
    else if (classPlayed === 'assassin') taskId = 2;
    else if (classPlayed === 'mage') taskId = 3;
    if (taskId) {
        await updateTaskProgress(userId, taskId, 1);
    } else {
        debugLog('updateBattleProgress', `Неизвестный класс ${classPlayed}, задание не обновлено`);
    }
}

async function updateExpProgress(userId, expGained) {
    debugLog('updateExpProgress', `userId=${userId}, expGained=${expGained}`);
    if (expGained > 0) {
        await updateTaskProgress(userId, 4, expGained);
    }
}

async function updateChestProgress(userId, itemRarity) {
    debugLog('updateChestProgress', `userId=${userId}, rarity=${itemRarity}`);
    if (['rare', 'epic', 'legendary'].includes(itemRarity)) {
        await updateTaskProgress(userId, 7, 1);
    } else {
        debugLog('updateChestProgress', 'Редкость не подходит, задание 7 не обновлено');
    }
}

async function updateProfileProgress(userId) {
    debugLog('updateProfileProgress', `userId=${userId}`);
    await updateTaskProgress(userId, 6, 1);
}

async function updateTowerTask(userId) {
    debugLog('updateTowerTask', `userId=${userId}`);
    await updateTaskProgress(userId, 8, 1);
}

// ======================== ЭКСПОРТ ========================

module.exports = {
    getMoscowDate,
    parseProgress,
    resetDailyTasks,
    checkAndResetDay,
    getTasksList,
    updateTaskProgress,
    updateBattleProgress,
    updateExpProgress,
    updateChestProgress,
    updateProfileProgress,
    updateTowerTask,
    debugLog  // если нужно вызывать отдельно
};
