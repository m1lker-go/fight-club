// vk-webview.js – авторизация VK для WebView (APK)
(function() {
    console.log('[VK-WebView] скрипт загружен');

    // Функция для запуска редиректа на VK OAuth
    function redirectToVK() {
        const clientId = 54525890;  // ID вашего standalone-приложения
        const redirectUri = encodeURIComponent('https://cat-fight.ru/auth/vk/callback');
        const url = `https://oauth.vk.com/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email&v=5.131`;
        console.log('[VK-WebView] редирект на:', url);
        window.location.href = url;
    }

    // Ждём полной загрузки DOM
    document.addEventListener('DOMContentLoaded', function() {
        const vkBtn = document.getElementById('vkAuthBtn');
        if (vkBtn) {
            // Переопределяем обработчик кнопки VK только для WebView
            vkBtn.addEventListener('click', function(e) {
                e.preventDefault();
                redirectToVK();
                return false;
            });
            console.log('[VK-WebView] обработчик кнопки VK установлен');
        } else {
            console.warn('[VK-WebView] кнопка VK не найдена');
        }
    });

    // Обработка возврата после авторизации (callback)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('vk_auth') === 'success') {
        const sessionToken = urlParams.get('sessionToken');
        const needusername = urlParams.get('needusername') === 'true';
        const userId = urlParams.get('userId');
        if (sessionToken) {
            localStorage.setItem('sessionToken', sessionToken);
            console.log('[VK-WebView] токен сохранён');
            if (needusername && typeof showusernameModal === 'function') {
                showusernameModal(userId);
            } else {
                // Очищаем параметры из URL и перезагружаем страницу
                window.history.replaceState({}, document.title, window.location.pathname);
                location.reload();
            }
        }
    }
})();
