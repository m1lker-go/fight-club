// client/js/vk-ads.js

const VK_ADS_AVAILABLE = typeof vkBridge !== 'undefined';
console.log('[VK-Ads] VK Bridge доступен:', VK_ADS_AVAILABLE);

/**
 * Проверяет, готова ли реклама к показу.
 * @returns {Promise<boolean>} true если можно показывать кнопку "Смотреть рекламу"
 */
async function checkAdsReady() {
    if (!VK_ADS_AVAILABLE) return false;
    try {
        const data = await vkBridge.send('VKWebAppCheckNativeAds', {
            ad_format: 'reward',
            placement_id: 2019349   // ваш ID
        });
        return data.result === true;
    } catch (error) {
        console.error('[VK-Ads] checkAdsReady error:', error);
        return false;
    }
}

async function showRewardedAd() {
    if (!VK_ADS_AVAILABLE) return false;
    try {
        const data = await vkBridge.send('VKWebAppShowNativeAds', {
            ad_format: 'reward',
            placement_id: 2019349   // ваш ID
        });
        return data.result === true;
    } catch (error) {
        console.error('[VK-Ads] showRewardedAd error:', error);
        return false;
    }
}

window.checkAdsReady = checkAdsReady;
window.showRewardedAd = showRewardedAd;
