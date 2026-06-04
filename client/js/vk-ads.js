// client/js/vk-ads.js

const VK_ADS_AVAILABLE = typeof vkBridge !== 'undefined';
console.log('[VK-Ads] VK Bridge доступен:', VK_ADS_AVAILABLE);

/**
 * Проверяет, готова ли реклама к показу.
 * @returns {Promise<boolean>} true если можно показывать кнопку "Смотреть рекламу"
 */
async function checkAdsReady() {
    if (!VK_ADS_AVAILABLE) {
        console.warn('[VK-Ads] VK Bridge не найден – проверка невозможна');
        return false;
    }
    try {
        const data = await vkBridge.send('VKWebAppCheckNativeAds', { ad_format: 'rewarded' });
        // data.result === true – реклама готова к показу
        return data.result === true;
    } catch (error) {
        console.error('[VK-Ads] Ошибка при проверке готовности рекламы:', error);
        return false;
    }
}

/**
 * Показывает rewarded video и возвращает статус просмотра.
 * @returns {Promise<boolean>} true – пользователь досмотрел видео до конца
 */
async function showRewardedAd() {
    if (!VK_ADS_AVAILABLE) {
        console.warn('[VK-Ads] VK Bridge не найден – показ рекламы невозможен');
        return false;
    }
    try {
        const data = await vkBridge.send('VKWebAppShowNativeAds', { ad_format: 'rewarded' });
        // data.result === true – видео показано полностью, награда заработана
        return data.result === true;
    } catch (error) {
        console.error('[VK-Ads] Ошибка при показе рекламы:', error);
        return false;
    }
}

window.checkAdsReady = checkAdsReady;
window.showRewardedAd = showRewardedAd;
