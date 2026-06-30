// js/i18n.js – загрузка переводов через fetch (без HTTP-бекенда)

(function() {
    console.log('🔄 i18n init started');

    const savedLang = localStorage.getItem('i18nextLng') || 'ru';

    async function loadTranslations() {
        try {
            const [ruRes, enRes] = await Promise.all([
                fetch('/locales/ru.json'),
                fetch('/locales/en.json')
            ]);
            if (!ruRes.ok || !enRes.ok) {
                throw new Error('Failed to load translation files');
            }
            const ru = await ruRes.json();
            const en = await enRes.json();
            return { ru, en };
        } catch (e) {
            console.error('Error loading translations:', e);
            // fallback – пустые объекты, чтобы i18next не падал
            return { ru: {}, en: {} };
        }
    }

    async function initI18next() {
        if (typeof i18next === 'undefined') {
            console.error('i18next not loaded');
            return;
        }

        const translations = await loadTranslations();
        const resources = {
            ru: { translation: translations.ru },
            en: { translation: translations.en }
        };

        i18next.init({
            lng: savedLang,
            fallbackLng: 'ru',
            resources: resources,
            interpolation: {
                escapeValue: false
            }
        }, function(err, t) {
            if (err) {
                console.error('i18next init error:', err);
                return;
            }
            console.log('✅ i18next initialized, language:', i18next.language);
            window.__ = i18next.t.bind(i18next);
            window.i18next = i18next;
            updateContent();
            if (typeof window.updateUIAfterLanguageChange === 'function') {
                window.updateUIAfterLanguageChange();
            }
        });
    }

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

    // Глобальная функция смены языка
    window.setLanguage = function(lang) {
        if (window.i18next && typeof window.i18next.changeLanguage === 'function') {
            window.i18next.changeLanguage(lang, () => {
                localStorage.setItem('i18nextLng', lang);
                updateContent();
                // Обновляем открытые экраны
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
            });
        } else {
            localStorage.setItem('i18nextLng', lang);
            location.reload();
        }
    };

    window.updateUIAfterLanguageChange = function() {
        updateContent();
        if (document.querySelector('.settings-container')) {
            if (typeof window.renderSettings === 'function') {
                window.renderSettings();
            }
        }
    };

    // Запуск после загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initI18next);
    } else {
        initI18next();
    }
})();
