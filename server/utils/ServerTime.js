// server/utils/ServerTime.js
// Единый модуль для работы с московским временем (UTC+3)
// Все серверные модули должны использовать ТОЛЬКО эти функции.

/**
 * Возвращает текущий момент времени в Москве как объект Date
 * @returns {Date}
 */
function getCurrentMoscowDate() {
    const now = new Date();
    const offsetMs = 3 * 60 * 60 * 1000; // UTC+3 фиксированное смещение
    return new Date(now.getTime() + offsetMs);
}

/**
 * Возвращает строку YYYY-MM-DD текущей московской даты
 * @returns {string}
 */
function getMoscowDateString() {
    const d = getCurrentMoscowDate();
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Преобразует любую дату (Date, строка, timestamp) в московскую строку YYYY-MM-DD
 * @param {Date|string|number} date
 * @returns {string|null}
 */
function toMoscowDateString(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const mskTimestamp = d.getTime() + 3 * 60 * 60 * 1000;
    const mskDate = new Date(mskTimestamp);
    const year = mskDate.getUTCFullYear();
    const month = String(mskDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(mskDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Возвращает номер текущего месяца в Москве (1-12)
 * @returns {number}
 */
function getCurrentMoscowMonth() {
    return getCurrentMoscowDate().getUTCMonth() + 1;
}

/**
 * Возвращает текущий год в Москве
 * @returns {number}
 */
function getCurrentMoscowYear() {
    return getCurrentMoscowDate().getUTCFullYear();
}

/**
 * Возвращает текущий день месяца в Москве (1-31)
 * @returns {number}
 */
function getCurrentMoscowDay() {
    return getCurrentMoscowDate().getUTCDate();
}

module.exports = {
    getCurrentMoscowDate,
    getMoscowDateString,
    toMoscowDateString,
    getCurrentMoscowMonth,
    getCurrentMoscowYear,
    getCurrentMoscowDay
};
