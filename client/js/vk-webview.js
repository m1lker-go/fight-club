// vk-webview.js – авторизация VK для WebView (APK) через редирект
(function() {
    console.log('[VK-WebView] скрипт загружен');

    function redirectToVK() {
        const clientId = 54525890;  // ID standalone-приложения
        // redirect_uri ДОЛЖЕН совпадать с тем, что в настройках VK-приложения и в серверном обработчике
        const redirectUri = encodeURIComponent('https://api.cat-fight.ru/auth/vk/callback');
        const url = `https://oauth.vk.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email&v=5.131&display=page`;
        console.log('[VK-WebView] Редирект на:', url);
        window.location.href = url;
    }

    // Ждём загрузки DOM, чтобы кнопка точно существовала
    document.addEventListener('DOMContentLoaded', function() {
        const vkBtn = document.getElementById('vkAuthBtn');
        if (vkBtn) {
            // Удаляем старые обработчики, чтобы не было конфликта
            const newBtn = vkBtn.cloneNode(true);
            vkBtn.parentNode.replaceChild(newBtn, vkBtn);
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                redirectToVK();
            });
            console.log('[VK-WebView] Обработчик кнопки VK установлен');
        } else {
            console.warn('[VK-WebView] Кнопка VK не найдена');
        }
    });

    // Обработка возврата после авторизации (параметры в URL)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('vk_auth') === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        if (sessionToken) {
            localStorage.setItem('sessionToken', sessionToken);
            console.log('[VK-WebView] Токен сохранён');
            if (needusername && typeof window.showusernameModal === 'function') {
                window.showusernameModal(userId);
            } else {
                // Убираем параметры из URL и перезагружаем страницу
                window.history.replaceState({}, document.title, window.location.pathname);
                location.reload();
            }
        }
    }
    if (urlParams.get('auth_error') === 'vk') {
        console.error('[VK-WebView] Ошибка авторизации VK');
    }
})();
