const { pool } = require('../db');

// Запрещённые слова для названия клана (можно вынести в конфиг)
const forbiddenWords = ['мат1', 'мат2', 'дурак', 'идиот', 'редиска']; // заполните реальными

// Проверка названия
function isClanNameValid(name) {
    if (!name || name.length < 3 || name.length > 30) return false;
    const lower = name.toLowerCase();
    for (const word of forbiddenWords) {
        if (lower.includes(word)) return false;
    }
    return true;
}

// Проверка, состоит ли пользователь в клане
async function isUserInClan(userId, client = null) {
    const db = client || pool;
    const res = await db.query('SELECT clan_id FROM clan_members WHERE user_id = $1', [userId]);
    return res.rows.length > 0 ? res.rows[0].clan_id : null;
}

// Получить лимит участников клана (10 + уровень - 1)
function getMaxMembers(clanLevel) {
    return 10 + (clanLevel - 1);
}

// Начисление опыта клану (автоматическое повышение уровня)
async function addClanExp(clanId, expGain, client) {
    const db = client || pool;
    const clanRes = await db.query('SELECT level, exp FROM clans WHERE id = $1', [clanId]);
    if (clanRes.rows.length === 0) return;
    let { level, exp } = clanRes.rows[0];
    exp += expGain;
    const expNeeded = level * 100; // формула exp для уровня: level*100
    let leveledUp = false;
    while (exp >= expNeeded && level < 25) {
        exp -= expNeeded;
        level++;
        leveledUp = true;
    }
    await db.query('UPDATE clans SET level = $1, exp = $2 WHERE id = $3', [level, exp, clanId]);
    if (leveledUp) {
        // Отправить системное сообщение в чат клана о повышении уровня
        const sysMsg = `Клан достиг ${level} уровня! Максимум участников увеличен до ${getMaxMembers(level)}.`;
        await db.query(
            `INSERT INTO clan_messages (clan_id, user_id, message, created_at) VALUES ($1, $2, $3, NOW())`,
            [clanId, null, sysMsg]
        );
    }
}

module.exports = {
    isClanNameValid,
    isUserInClan,
    getMaxMembers,
    addClanExp
};
