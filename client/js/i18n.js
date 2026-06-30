console.log('i18n.js loaded');

(function() {
    const savedLang = localStorage.getItem('i18nextLng') || 'ru';

    i18next
        .use(i18nextHttpBackend)   // это глобальный объект
        .use(i18nextBrowserLanguageDetector)
        .init({
            fallbackLng: 'ru',
            lng: savedLang,
            backend: {
                loadPath: '/locales/{{lng}}.json'
            },
            detection: {
                order: ['localStorage', 'navigator'],
                caches: ['localStorage']
            },
            interpolation: {
                escapeValue: false
            }
        }, function(err, t) {
            if (err) {
                console.error('[i18n] Ошибка инициализации:', err);
                return;
            }
            console.log('[i18n] Инициализирован, язык:', i18next.language);
            // Применяем переводы ко всем элементам с data-i18n
            updateContent();
            // Делаем глобальную функцию для перевода
            window.__ = i18next.t.bind(i18next);
            window.i18next = i18next;
            // Вызываем функцию обновления UI, если она есть
            if (typeof window.updateUIAfterLanguageChange === 'function') {
                window.updateUIAfterLanguageChange();
            }
        });

    function updateContent() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const translation = i18next.t(key);
            if (el.tagName === 'INPUT' && el.placeholder) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        });
    }

    window.setLanguage = function(lang) {
        i18next.changeLanguage(lang, () => {
            localStorage.setItem('i18nextLng', lang);
            updateContent();
            // Если настройки открыты – перерисовать
            if (document.querySelector('.settings-container')) {
                if (typeof window.renderSettings === 'function') {
                    window.renderSettings();
                }
            }
            // Если модалка открыта – обновить заголовок
            const modal = document.getElementById('roleModal');
            if (modal && modal.style.display !== 'none') {
                const title = document.getElementById('modalTitle');
                if (title) {
                    const key = title.getAttribute('data-i18n');
                    if (key) title.textContent = i18next.t(key);
                }
            }
        });
    };

    // Обновить UI при смене языка
    window.updateUIAfterLanguageChange = function() {
        updateContent();
        if (document.querySelector('.settings-container')) {
            if (typeof window.renderSettings === 'function') {
                window.renderSettings();
            }
        }
        const modal = document.getElementById('roleModal');
        if (modal && modal.style.display !== 'none') {
            const title = document.getElementById('modalTitle');
            if (title) {
                const key = title.getAttribute('data-i18n');
                if (key) title.textContent = i18next.t(key);
            }
        }
    };
})();
