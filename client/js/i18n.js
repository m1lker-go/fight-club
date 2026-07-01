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
    // Определяем её сразу, но она будет переопределена после инициализации i18next
    window.__ = function(key, fallback) {
        return fallback || key;
    };

    // ======== Функция обновления UI после смены языка ========
    function updateUI() {
        console.log('🔄 updateUI called, currentScreen:', window.currentScreen);
        const current = window.currentScreen || 'main';

        if (typeof window.showScreen === 'function') {
            window.showScreen(current);
        } else {
            // fallback: старый способ с switch
            switch (current) {
                case 'main': if (window.renderMain) window.renderMain(); break;
                case 'equip': if (window.renderEquip) window.renderEquip(); break;
                case 'trade': if (window.renderTrade) window.renderTrade(); break;
                case 'market': if (window.renderMarket) window.renderMarket(); break;
                case 'profile': if (window.renderProfile) window.renderProfile(); break;
                case 'rating': if (window.renderRating) window.renderRating(); break;
                case 'settings': if (window.renderSettings) window.renderSettings(); break;
                case 'forge': if (window.renderForge) window.renderForge(); else if (window.renderForgeFallback) window.renderForgeFallback(); break;
                case 'tournament': if (window.renderTournament) window.renderTournament(); break;
                case 'clans': if (window.renderClans) window.renderClans(); break;
                case 'tasks': if (window.renderTasks) window.renderTasks(); break;
                case 'tower': if (window.loadTowerStatus) window.loadTowerStatus(); break;
                case 'fortune': if (window.renderFortune) window.renderFortune(); break;
                case 'alchemy': if (window.renderAlchemy) window.renderAlchemy(); break;
                case 'messages': if (window.renderMessages) window.renderMessages(); break;
                default: break;
            }
        }

        // Обновляем бейджи и иконки
        if (window.updateTradeBadges) window.updateTradeBadges();
        if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
        if (window.updateMessagesBadge) window.updateMessagesBadge();

        // Обновляем элементы с data-i18n (на случай, если они есть)
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
    }

    // ======== Инициализация i18next ========
    async function initI18next() {
        try {
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

            if (typeof i18next === 'undefined') {
                console.error('❌ i18next library not found!');
                window.__ = function(key, fallback) {
                    return fallback || key;
                };
                return;
            }

            // Строим ресурсы с пространствами имён (как в твоём ru.json)
            const resources = {
                ru: ruData || {},
                en: enData || {}
            };

            // Получаем список всех пространств имён из ru.json (common, auth, main, ...)
            const nsList = ruData ? Object.keys(ruData) : ['common'];
            // Гарантируем, что clans есть (на случай, если он отсутствует в ruData)
            if (!nsList.includes('clans')) nsList.push('clans');

            await i18next.init({
                lng: savedLang,
                fallbackLng: 'ru',
                resources: resources,
                ns: nsList,
                defaultNS: 'common',
                interpolation: { escapeValue: false }
            });

            window.i18next = i18next;
            console.log('✅ i18next initialized, language:', i18next.language);

            // ======== ОСНОВНАЯ ФУНКЦИЯ ПЕРЕВОДА ========
            // Переопределяем window.__ с использованием i18next
            // И ЗАЩИЩАЕМ её от перезаписи
            Object.defineProperty(window, '__', {
                configurable: false,
                writable: false,
                value: function(key, fallback) {
                    return i18next.t(key, { defaultValue: fallback || key });
                }
            });

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

            // Подписываемся на событие смены языка (на случай, если язык изменится иначе)
            i18next.on('languageChanged', (lng) => {
                console.log(`🔄 languageChanged event: ${lng}`);
                if (localStorage.getItem('i18nextLng') !== lng) {
                    localStorage.setItem('i18nextLng', lng);
                }
                updateUI();
            });

            // Если есть переключатель языка в DOM – привязываем события
            document.querySelectorAll('.lang-option, .lang-option-settings').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    const lang = opt.dataset.lang;
                    if (lang && window.setLanguage) window.setLanguage(lang);
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
