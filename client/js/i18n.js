// js/i18n.js – полный менеджер локализации с i18next и fallback
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

    // Временная fallback-функция (до инициализации i18next)
    window.__ = function(key, fallback) {
        return fallback || key;
    };

    function updateUI() {
        console.log('🔄 updateUI called, currentScreen:', window.currentScreen);
        const current = window.currentScreen || 'main';

        if (typeof window.showScreen === 'function') {
            window.showScreen(current);
        } else {
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

            if (!ruData) console.warn('⚠️ ru.json не загружен');
            if (!enData) console.warn('⚠️ en.json не загружен');

            if (typeof i18next === 'undefined') {
                console.error('❌ i18next library not found!');
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

            // ====== ГЛАВНОЕ ИСПРАВЛЕНИЕ ======
            // Удаляем старую window.__ и создаём новую, использующую i18next
            delete window.__;
            window.__ = function(key, fallback) {
                return i18next.t(key, { defaultValue: fallback || key });
            };
            // =================================

            updateUI();

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

            i18next.on('languageChanged', (lng) => {
                console.log(`🔄 languageChanged event: ${lng}`);
                if (localStorage.getItem('i18nextLng') !== lng) {
                    localStorage.setItem('i18nextLng', lng);
                }
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
            // Если ошибка, оставляем fallback-функцию
            window.__ = function(key, fallback) {
                return fallback || key;
            };
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initI18next);
    } else {
        initI18next();
    }

    window.updateUIAfterLanguageChange = updateUI;

})();
