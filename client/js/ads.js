// ads.js – Реклама и бесплатные алмазы

let pendingAdRequest = false;

// Функция показа рекламы (заглушка – в реальности должна показывать рекламный ролик)
async function watchAd() {
    if (pendingAdRequest) {
        showToast('Подождите, предыдущий запрос ещё обрабатывается', 1500);
        return;
    }
    pendingAdRequest = true;

    // Заглушка: имитируем просмотр рекламы через confirm (на самом деле нужно использовать Telegram WebApp или AdMob)
    // В реальном проекте здесь должен быть вызов рекламного SDK.
    const confirmResult = confirm('Посмотреть рекламу и получить +1 к прогрессу заданий? (Заглушка)');
    if (!confirmResult) {
        pendingAdRequest = false;
        return;
    }

    try {
        const res = await window.apiRequest('/ads/watch', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            let msg = `Просмотр учтён (${data.adsWatched}/${data.needAds})`;
            if (data.diamondsGained > 0) {
                msg += `, получено ${data.diamondsGained} алмазов!`;
            }
            showToast(msg, 2000);
            await refreshData(); // обновляем баланс алмазов
            if (typeof window.updateTradeBadges === 'function') window.updateTradeBadges();
            // Если нужно обновить задания на текущей странице
            if (window.currentScreen === 'tasks' && typeof loadDailyTasks === 'function') {
                loadDailyTasks();
            }
        } else {
            showToast('Ошибка: ' + (data.error || 'Неизвестная ошибка'), 1500);
        }
    } catch (e) {
        console.error('Ошибка при просмотре рекламы:', e);
        showToast('Ошибка соединения', 1500);
    } finally {
        pendingAdRequest = false;
    }
}

// Глобальный экспорт
window.watchAd = watchAd;
