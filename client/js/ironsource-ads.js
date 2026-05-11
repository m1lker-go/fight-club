// ironsource-ads.js – rewarded video через ironSource (Mobile Web)

const IRONSOURCE_APP_KEY = '26516de4d';
const IRONSOURCE_PLACEMENT = '8xy6xsn6cgz8yqbf';

let ironRV = null;

// Проверенные URL (порядок приоритетный)
const SDK_URLS = [
    'https://c.ironsrc.com/rv/rv.js',
    'https://static.ironsrc.com/rv/rv-min.js',
    'https://cdn.ironsrc.com/rv/rv-min.js',
    'https://static.ultra-rv.com/rv-min.js'   // запасной
];

async function loadIronSourceSDK() {
    if (window.IronRV) return;

    for (const url of SDK_URLS) {
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                script.onload = () => {
                    console.log('[IronSource] SDK loaded from', url);
                    resolve();
                };
                script.onerror = () => reject(new Error('Failed to load ' + url));
                document.head.appendChild(script);
            });
            return;   // успех
        } catch (e) {
            console.warn('[IronSource]', e.message);
            // пробуем следующий URL
        }
    }

    throw new Error('Ни один URL SDK не сработал');
}

async function initIronSourceAds(userId) {
    try {
        await loadIronSourceSDK();
        ironRV = IronRV.getInstance({
            applicationKey: IRONSOURCE_APP_KEY,
            applicationUserId: String(userId)
        });
        console.log('[IronSource] initialized, userId:', userId);
        try { localStorage.setItem('ironsource_user_id', String(userId)); } catch(e) {}
    } catch (e) {
        console.error('[IronSource] init error:', e.message);
        // игра не ломается – SDK недоступен
    }
}

async function checkIronSourceAdsReady() {
    if (!ironRV) return false;
    try {
        const availability = await ironRV.isAdAvailable({ placement: IRONSOURCE_PLACEMENT });
        return availability === true;
    } catch (e) {
        return false;
    }
}

function showIronSourceRewardedAd() {
    return new Promise((resolve) => {
        if (!ironRV) {
            console.warn('[IronSource] SDK не инициализирован');
            resolve(false);
            return;
        }
        const options = { placement: IRONSOURCE_PLACEMENT };
        ironRV.show(options, (response) => {
            if (response.error) {
                console.error('[IronSource] show error:', response.error);
                resolve(false);
            } else {
                console.log('[IronSource] show response:', response);
                resolve(response.watched === true);
            }
        });
    });
}

window.initIronSourceAds = initIronSourceAds;
window.checkIronSourceAdsReady = checkIronSourceAdsReady;
window.showIronSourceRewardedAd = showIronSourceRewardedAd;
