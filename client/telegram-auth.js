// telegram-auth.js – упрощённая авторизация Telegram
(async function() {
    console.log('[TG] Старт');

    function getInitData() {
        if (window.Telegram?.WebApp?.initData) return window.Telegram.WebApp.initData;
        const urlParams = new URLSearchParams(window.location.search);
        let tg = urlParams.get('tgWebAppData');
        if (tg) return decodeURIComponent(tg);
        const hash = new URLSearchParams(window.location.hash.substring(1));
        tg = hash.get('tgWebAppData');
        if (tg) return decodeURIComponent(tg);
        return null;
    }

    const initData = getInitData();
    if (!initData) {
        console.warn('[TG] Нет initData');
        return;
    }

    try {
        const res = await fetch('https://api.cat-fight.ru/auth/telegram-auto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ initData })
        });
        const data = await res.json();
        if (data.sessionToken) {
            localStorage.setItem('sessionToken', data.sessionToken);
            if (typeof window.loadUserDataByToken === 'function') {
                await window.loadUserDataByToken(data.sessionToken);
            }
            if (typeof window.showScreen === 'function') {
                window.showScreen('main');
            }
        } else {
            console.error('[TG] Ошибка:', data.error);
        }
    } catch (err) {
        console.error('[TG] Исключение:', err);
    }
})();
