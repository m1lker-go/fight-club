// js/i18n.js – финальная версия с поддержкой переменных интерполяции
(function() {
    console.log('🔄 i18n init started');

    const savedLang = localStorage.getItem('i18nextLng') || 'ru';

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

    // Временные fallback-функции до инициализации i18next
    window.$t = function(key, fallback) {
        return fallback || key;
    };
    window.__ = window.$t;

    function updateUI() {
        console.log('🔄 updateUI called, currentScreen:', window.currentScreen);
        if (typeof window.showScreen === 'function') {
            const current = window.currentScreen || 'main';
            if (typeof userData !== 'undefined' && userData && userData.id) {
                window.showScreen(current);
            } else {
                console.warn('updateUI: userData not ready, skipping redraw');
            }
        } else {
            console.warn('showScreen not defined, reloading');
            location.reload();
        }

        if (window.updateTradeBadges) window.updateTradeBadges();
        if (window.updateMainMenuNewIcons) window.updateMainMenuNewIcons();
        if (window.updateMessagesBadge) window.updateMessagesBadge();

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

    async function initI18next() {
        try {
            const [ruData, enData] = await Promise.all([
                loadTranslation('ru'),
                loadTranslation('en')
            ]);

            if (!ruData && !enData) {
                console.warn('⚠️ No translation files loaded, using fallback only');
                window.$t = function(key, fallback) { return fallback || key; };
                window.__ = window.$t;
                return;
            }

            if (typeof i18next === 'undefined') {
                console.error('❌ i18next library not found!');
                window.$t = function(key, fallback) { return fallback || key; };
                window.__ = window.$t;
                return;
            }

            const resources = {
                ru: ruData || {},
                en: enData || {}
            };

            const nsList = ruData ? Object.keys(ruData) : ['common'];
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

            // ====== УСТАНАВЛИВАЕМ ТЕКУЩИЙ ЯЗЫК ГЛОБАЛЬНО ======
            window.currentLanguage = i18next.language;

            // ====== КАСТОМНАЯ ФУНКЦИЯ ПЕРЕВОДА С ПОДДЕРЖКОЙ ПЕРЕМЕННЫХ ======
            window.$t = function(key, fallback, vars) {
                if (key && key.includes(':')) {
                    const parts = key.split(':');
                    const ns = parts[0];
                    const actualKey = parts.slice(1).join(':');
                    const opts = { ns: ns, defaultValue: fallback || key };
                    if (vars && typeof vars === 'object') {
                        Object.assign(opts, vars);   // передаём все переменные для интерполяции
                    }
                    return i18next.t(actualKey, opts);
                } else {
                    const opts = { defaultValue: fallback || key };
                    if (vars && typeof vars === 'object') {
                        Object.assign(opts, vars);
                    }
                    return i18next.t(key, opts);
                }
            };
            window.__ = window.$t;

            console.log('✅ window.$t теперь поддерживает переменные интерполяции');

            if (typeof userData !== 'undefined' && userData && userData.id) {
                updateUI();
            } else {
                console.log('⏳ userData not loaded yet, UI will be updated after login');
                const waitForUser = setInterval(() => {
                    if (typeof userData !== 'undefined' && userData && userData.id) {
                        clearInterval(waitForUser);
                        console.log('✅ userData loaded, updating UI');
                        updateUI();
                    }
                }, 100);
            }

            // Функция смены языка
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
                    window.currentLanguage = lang;
                    console.log(`🌐 Language changed to ${lang}`);
                    updateUI();
                });
            };

            i18next.on('languageChanged', (lng) => {
                if (localStorage.getItem('i18nextLng') !== lng) {
                    localStorage.setItem('i18nextLng', lng);
                }
                window.currentLanguage = lng;
                updateUI();
            });

            document.querySelectorAll('.lang-option, .lang-option-settings').forEach(opt => {
                opt.addEventListener('click', (e) => {
                    const lang = opt.dataset.lang;
                    if (lang && window.setLanguage) window.setLanguage(lang);
                });
            });

        } catch (e) {
            console.error('❌ i18next initialization failed:', e);
            window.$t = function(key, fallback) { return fallback || key; };
            window.__ = window.$t;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initI18next);
    } else {
        initI18next();
    }

    window.updateUIAfterLanguageChange = updateUI;

})();
