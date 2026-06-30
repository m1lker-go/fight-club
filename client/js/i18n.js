// i18n.js – инициализация i18next и загрузка переводов

(function() {
    'use strict';

    // Определяем язык по умолчанию (из localStorage или ru)
    const defaultLang = localStorage.getItem('i18nextLng') || 'ru';

    // Подключаем i18next (если он ещё не загружен)
    function loadI18next(callback) {
        if (typeof i18next !== 'undefined' && i18next.init) {
            callback();
            return;
        }

        // Загружаем i18next с CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/i18next@23.7.6/dist/umd/i18next.min.js';
        script.onload = () => {
            // Загружаем HttpBackend
            const backendScript = document.createElement('script');
            backendScript.src = 'https://cdn.jsdelivr.net/npm/i18next-http-backend@2.4.2/dist/umd/i18nextHttpBackend.min.js';
            backendScript.onload = () => {
                callback();
            };
            backendScript.onerror = () => {
                console.warn('[i18n] Failed to load i18next-http-backend, using fallback');
                callback();
            };
            document.head.appendChild(backendScript);
        };
        script.onerror = () => {
            console.warn('[i18n] Failed to load i18next from CDN, using fallback');
            // Если i18next не загрузился – используем минимальную совместимость
            window.i18next = {
                t: function(key, fallback) {
                    return fallback || key;
                },
                changeLanguage: function(lang) {
                    localStorage.setItem('i18nextLng', lang);
                    if (typeof window.updateUIAfterLanguageChange === 'function') {
                        window.updateUIAfterLanguageChange();
                    } else {
                        location.reload();
                    }
                }
            };
            callback();
        };
        document.head.appendChild(script);
    }

    function initI18next() {
        if (typeof i18next === 'undefined' || !i18next.init) {
            // fallback – минимальная совместимость
            window.i18next = {
                t: function(key, fallback) { return fallback || key; },
                changeLanguage: function(lang) {
                    localStorage.setItem('i18nextLng', lang);
                    if (typeof window.updateUIAfterLanguageChange === 'function') {
                        window.updateUIAfterLanguageChange();
                    } else {
                        location.reload();
                    }
                }
            };
            window.i18nextInitialized = true;
            console.log('[i18n] Using fallback (i18next not loaded)');
            return;
        }

        i18next.use(i18nextHttpBackend).init({
            fallbackLng: 'ru',
            lng: defaultLang,
            backend: {
                loadPath: '/locales/{{lng}}.json'
            },
            ns: ['common', 'auth', 'settings', 'main', 'equip', 'trade', 'market', 'rating', 'profile', 'alchemy', 'modals', 'achievements', 'avatar', 'battle', 'clans', 'subclasses', 'items', 'daily_tasks', 'skins', 'forge', 'fortune', 'gems', 'helpers', 'messages', 'mint', 'tournament', 'tower', 'telegram_bot', 'system', 'item_data', 'bot_generator', 'season', 'email', 'auth_errors', 'shop', 'subscription', 'tasks'],
            defaultNS: 'common',
            interpolation: {
                escapeValue: false
            }
        }, function(err, t) {
            if (err) {
                console.error('[i18n] Initialization error:', err);
                window.i18next = {
                    t: function(key, fallback) { return fallback || key; },
                    changeLanguage: function(lang) {
                        localStorage.setItem('i18nextLng', lang);
                        if (typeof window.updateUIAfterLanguageChange === 'function') {
                            window.updateUIAfterLanguageChange();
                        } else {
                            location.reload();
                        }
                    }
                };
            } else {
                console.log('[i18n] Initialized successfully, language:', i18next.language);
                // Обновляем интерфейс после загрузки
                if (typeof window.updateUIAfterLanguageChange === 'function') {
                    window.updateUIAfterLanguageChange();
                }
            }
            window.i18nextInitialized = true;
        });
    }

    // ======== ГЛОБАЛЬНЫЕ ФУНКЦИИ ========

    // Функция для смены языка
    window.setLanguage = function(lang) {
        if (window.i18next && typeof window.i18next.changeLanguage === 'function') {
            window.i18next.changeLanguage(lang);
            localStorage.setItem('i18nextLng', lang);
            if (typeof window.updateUIAfterLanguageChange === 'function') {
                window.updateUIAfterLanguageChange();
            } else {
                // Fallback – обновляем все элементы с data-i18n
                updateI18nElements();
            }
        } else {
            localStorage.setItem('i18nextLng', lang);
            if (typeof window.updateUIAfterLanguageChange === 'function') {
                window.updateUIAfterLanguageChange();
            } else {
                location.reload();
            }
        }
    };

    // Функция для перевода (прокси на i18next.t)
    window.__ = function(key, fallback) {
        if (window.i18next && typeof window.i18next.t === 'function') {
            return window.i18next.t(key);
        }
        return fallback || key;
    };

    // Функция для обновления всех элементов с data-i18n
    function updateI18nElements() {
        document.querySelectorAll('[data-i18n]').forEach(function(el) {
            const key = el.getAttribute('data-i18n');
            if (key && window.i18next && typeof window.i18next.t === 'function') {
                el.textContent = window.i18next.t(key);
            }
        });
    }
    window.updateI18nElements = updateI18nElements;

    // Функция обновления UI после смены языка (можно переопределить позже)
    window.updateUIAfterLanguageChange = function() {
        updateI18nElements();
        // Если есть другие функции обновления – вызываем их
        if (typeof window.renderSettings === 'function') {
            // Если сейчас открыты настройки – перерисовываем их
            const content = document.getElementById('content');
            if (content && content.innerHTML.includes('settings-container')) {
                window.renderSettings();
            }
        }
        // Обновляем верхнюю панель (top-bar) – если есть
        if (typeof window.updateTopBar === 'function') {
            window.updateTopBar();
        }
        // Вызываем кастомные обработчики
        if (typeof window.onLanguageChange === 'function') {
            window.onLanguageChange();
        }
    };

    // ======== ЗАПУСК ========

    // Ждём DOM, чтобы не блокировать рендер
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            loadI18next(initI18next);
        });
    } else {
        loadI18next(initI18next);
    }

})();
