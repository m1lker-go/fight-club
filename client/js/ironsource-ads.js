// ironsource-ads.js – rewarded video через ironSource (Mobile Web)

const IRONSOURCE_APP_KEY = '26516de4d';          // Application Key
const IRONSOURCE_PLACEMENT = '8xy6xsn6cgz8yqbf'; // Placement ID

let ironRV = null;

// Подключаем скрипт ironSource, если ещё не загружен
function loadIronSourceSDK() {
    return new Promise((resolve, reject) => {
        if (window.IronRV) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        // Основной (рекомендованный) URL для Mobile Web SDK:
script.src = 'https://static.ironsrc.com/rv-min.js';

// Запасной, если основной тоже не отвечает:
// script.src = 'https://c.ironsrc.com/rv/rv-min.js';
        script.onload = () => {
            console.log('[IronSource] SDK loaded');
            resolve();
        };
        script.onerror = () => {
            console.error('[IronSource] SDK load failed');
            reject(new Error('ironSource SDK не загружен'));
        };
        document.head.appendChild(script);
    });
}

// Инициализация ironSource (вызывается при старте игры)
async function initIronSourceAds(userId) {
    try {
        await loadIronSourceSDK();
        ironRV = IronRV.getInstance({
            applicationKey: IRONSOURCE_APP_KEY,
            applicationUserId: String(userId)   // важно передать строку
        });
        console.log('[IronSource] initialized, userId:', userId);
    } catch (e) {
        console.error('[IronSource] init error:', e);
    }
}

// Проверка готовности рекламы (можно не вызывать, show() сам проверит)
async function checkIronSourceAdsReady() {
    if (!ironRV) return false;
    try {
        const availability = await ironRV.isAdAvailable({ placement: IRONSOURCE_PLACEMENT });
        return availability === true;
    } catch (e) {
        return false;
    }
}

// Показ rewarded video
function showIronSourceRewardedAd() {
    return new Promise((resolve, reject) => {
        if (!ironRV) {
            console.warn('[IronSource] not initialized');
            resolve(false);
            return;
        }
        const options = {
            placement: IRONSOURCE_PLACEMENT
        };
        ironRV.show(options, (response) => {
            if (response.error) {
                console.error('[IronSource] show error:', response.error);
                resolve(false);
            } else {
                console.log('[IronSource] show response:', response);
                // response.watched === true означает, что награда честно заслужена
                resolve(response.watched === true);
            }
        });
    });
}

// Экспорт функций в глобальную область
window.initIronSourceAds = initIronSourceAds;
window.checkIronSourceAdsReady = checkIronSourceAdsReady;
window.showIronSourceRewardedAd = showIronSourceRewardedAd;
