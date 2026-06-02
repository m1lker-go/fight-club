// server/utils/exp.js
async function addExp(client, userId, className, expGain) {
    const classRes = await client.query(
        'SELECT level, exp, skill_points FROM user_classes WHERE user_id = $1 AND class = $2',
        [userId, className]
    );
    if (classRes.rows.length === 0) return false;
    let { level, exp, skill_points } = classRes.rows[0];
    exp += expGain;
    let leveledUp = false;
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
        [level, exp, skill_points, userId, className]
    );
    return leveledUp;
}
module.exports = { addExp };
