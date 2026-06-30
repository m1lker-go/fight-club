// js/i18n.js – полный менеджер локализации с i18next и fallback

(function() {
    console.log('🔄 i18n init started');

    const savedLang = localStorage.getItem('i18nextLng') || 'ru';

    // Функция загрузки одного файла перевода
    async function loadTranslation(lang) {
        const url = `/locales/${lang}.json`;
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (e) {
            console.error(`❌ Failed to load ${url}:`, e);
            return null;
        }
    }

    // ======== Глобальная функция перевода (временная, пока i18next не инициализирован) ========
    window.__ = function(key, fallback) {
        // Если i18next уже инициализирован, используем его
        if (window.i18next && window.i18next.isInitialized) {
            return window.i18next.t(key, { defaultValue: fallback || key });
        }
        // Иначе возвращаем fallback (русский текст)
        return fallback || key;
    };

    // ======== Функция обновления UI после смены языка ========
    function updateUI() {
        // Если есть элементы с data-i18n – обновляем их
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (window.i18next) {
                const translation = window.i18next.t(key);
                if (el.tagName === 'INPUT' && el.placeholder) {
                    el.placeholder = translation;
                } else {
                    el.textContent = translation;
                }
            }
        });

        // Перерисовываем текущий экран
        const current = window.currentScreen || 'main';
        switch (current) {
            case 'main': if (window.renderMain) window.renderMain(); break;
            case 'equip': if (window.renderEquip) window.renderEquip(); break;
            case 'trade': if (window.renderTrade) window.renderTrade(); break;
            case 'market': if (window.renderMarket) window.renderMarket(); break;
            case 'profile': if (window.renderProfile) window.renderProfile(); break;
            case 'rating': if (window.renderRating) window.renderRating(); break;
            case 'settings': if (window.renderSettings) window.renderSettings(); break;
            case 'forge': if (window.renderForge) window.renderForge(); else window.renderForgeFallback?.(); break;
            case 'tournament': if (window.renderTournament) window.renderTournament(); break;
            case 'clans': if (window.renderClans) window.renderClans(); break;
            case 'tasks': if (window.renderTasks) window.renderTasks(); break;
            case 'tower': if (window.loadTowerStatus) window.loadTowerStatus(); break;
            case 'fortune': if (window.renderFortune) window.renderFortune(); break;
            case 'alchemy': if (window.renderAlchemy) window.renderAlchemy(); break;
            case 'messages': if (window.renderMessages) window.renderMessages(); break;
            default: break;
        }

        // Обновляем бейджи и иконки
        if (window.updateTradeBadges) window.updateTradeBadges();
        if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
        if (window.updateMessagesBadge) window.updateMessagesBadge();
    }

    // ======== Инициализация i18next ========
    async function initI18next() {
        try {
            // Загружаем оба файла параллельно
            const [ruData, enData] = await Promise.all([
                loadTranslation('ru'),
                loadTranslation('en')
            ]);

            if (!ruData) {
                console.warn('⚠️ ru.json не загружен, буду использовать fallback-тексты');
            }
            if (!enData) {
                console.warn('⚠️ en.json не загружен, английский временно недоступен');
            }

            // Если i18next не загружен – грузим его с CDN (но он уже должен быть в index.html)
            if (typeof i18next === 'undefined') {
                console.error('❌ i18next library not found!');
                // В этом случае оставляем только fallback-функцию
                window.__ = function(key, fallback) {
                    return fallback || key;
                };
                return;
            }

            const resources = {
                ru: { translation: ruData || {} },
                en: { translation: enData || {} }
            };

            await i18next.init({
                lng: savedLang,
                fallbackLng: 'ru',
                resources: resources,
                defaultNS: 'translation',
                interpolation: { escapeValue: false }
            });

            window.i18next = i18next;
            console.log('✅ i18next initialized, language:', i18next.language);

            // Переопределяем __, чтобы использовать i18next
            window.__ = function(key, fallback) {
                return i18next.t(key, { defaultValue: fallback || key });
            };

            // Применяем переводы к UI
            updateUI();

            // ======== Функция для смены языка ========
            window.setLanguage = function(lang) {
                if (!window.i18next || typeof window.i18next.changeLanguage !== 'function') {
                    localStorage.setItem('i18nextLng', lang);
                    location.reload();
                    return;
                }
                window.i18next.changeLanguage(lang, (err) => {
                    if (err) {
                        console.error('❌ Error changing language:', err);
                        return;
                    }
                    localStorage.setItem('i18nextLng', lang);
                    console.log(`🌐 Language changed to ${lang}`);
                    updateUI();
                });
            };

            // Если есть переключатель языка в DOM – привязываем события
            document.querySelectorAll('.lang-option').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    const lang = opt.dataset.lang;
                    if (lang) window.setLanguage(lang);
                });
            });

        } catch (e) {
            console.error('❌ i18next initialization failed:', e);
            // Оставляем fallback-функцию
            window.__ = function(key, fallback) {
                return fallback || key;
            };
        }
    }

    // ======== Запуск ========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initI18next);
    } else {
        initI18next();
    }

    // Экспортируем updateUI для использования извне
    window.updateUIAfterLanguageChange = updateUI;

})();
