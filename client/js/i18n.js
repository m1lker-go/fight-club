// js/i18n.js – загрузка переводов через fetch с поддержкой множественных пространств имён

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
            return { ru: {}, en: {} };
        }
    }

    async function initI18next() {
        if (typeof i18next === 'undefined') {
            console.error('i18next not loaded');
            return;
        }

        const translations = await loadTranslations();
        // Строим ресурсы с пространствами имён
        const resources = {
            ru: {
                common: translations.ru.common || {},
                auth: translations.ru.auth || {},
                settings: translations.ru.settings || {},
                main: translations.ru.main || {},
                equip: translations.ru.equip || {},
                trade: translations.ru.trade || {},
                market: translations.ru.market || {},
                rating: translations.ru.rating || {},
                profile: translations.ru.profile || {},
                avatar: translations.ru.avatar || {},
                alchemy: translations.ru.alchemy || {},
                battle: translations.ru.battle || {},
                modals: translations.ru.modals || {},
                achievements: translations.ru.achievements || {},
                clans: translations.ru.clans || {},
                subclasses: translations.ru.subclasses || {},
                items: translations.ru.items || {},
                item_data: translations.ru.item_data || {},
                forge: translations.ru.forge || {},
                fortune: translations.ru.fortune || {},
                gems: translations.ru.gems || {},
                helpers: translations.ru.helpers || {},
                messages: translations.ru.messages || {},
                mint: translations.ru.mint || {},
                tournament: translations.ru.tournament || {},
                tower: translations.ru.tower || {},
                telegram_bot: translations.ru.telegram_bot || {},
                system: translations.ru.system || {},
                bot_generator: translations.ru.bot_generator || {},
                season: translations.ru.season || {},
                email: translations.ru.email || {},
                auth_errors: translations.ru.auth_errors || {},
                shop: translations.ru.shop || {},
                subscription: translations.ru.subscription || {},
                tasks: translations.ru.tasks || {},
                daily_tasks: translations.ru.daily_tasks || {},
                skins: translations.ru.skins || {}
            },
            en: {
                common: translations.en.common || {},
                auth: translations.en.auth || {},
                settings: translations.en.settings || {},
                main: translations.en.main || {},
                equip: translations.en.equip || {},
                trade: translations.en.trade || {},
                market: translations.en.market || {},
                rating: translations.en.rating || {},
                profile: translations.en.profile || {},
                avatar: translations.en.avatar || {},
                alchemy: translations.en.alchemy || {},
                battle: translations.en.battle || {},
                modals: translations.en.modals || {},
                achievements: translations.en.achievements || {},
                clans: translations.en.clans || {},
                subclasses: translations.en.subclasses || {},
                items: translations.en.items || {},
                item_data: translations.en.item_data || {},
                forge: translations.en.forge || {},
                fortune: translations.en.fortune || {},
                gems: translations.en.gems || {},
                helpers: translations.en.helpers || {},
                messages: translations.en.messages || {},
                mint: translations.en.mint || {},
                tournament: translations.en.tournament || {},
                tower: translations.en.tower || {},
                telegram_bot: translations.en.telegram_bot || {},
                system: translations.en.system || {},
                bot_generator: translations.en.bot_generator || {},
                season: translations.en.season || {},
                email: translations.en.email || {},
                auth_errors: translations.en.auth_errors || {},
                shop: translations.en.shop || {},
                subscription: translations.en.subscription || {},
                tasks: translations.en.tasks || {},
                daily_tasks: translations.en.daily_tasks || {},
                skins: translations.en.skins || {}
            }
        };

        const nsList = Object.keys(resources.ru);

        i18next.init({
            lng: savedLang,
            fallbackLng: 'ru',
            resources: resources,
            ns: nsList,
            defaultNS: 'common',
            interpolation: {
                escapeValue: false
            }
        }, function(err, t) {
            if (err) {
                console.error('i18next init error:', err);
                return;
            }
            console.log('✅ i18next initialized, language:', i18next.language);
            
            // Глобальная функция с поддержкой fallback
            window.__ = function(key, fallback) {
                // key вида "namespace:key" или "key" (тогда используется defaultNS)
                return i18next.t(key, { defaultValue: fallback || key });
            };
            
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

    window.setLanguage = function(lang) {
        if (window.i18next && typeof window.i18next.changeLanguage === 'function') {
            window.i18next.changeLanguage(lang, () => {
                localStorage.setItem('i18nextLng', lang);
                updateContent();
                if (document.querySelector('.settings-container')) {
                    if (typeof window.renderSettings === 'function') {
                        window.renderSettings();
                    }
                }
                if (window.currentScreen === 'main' && typeof window.renderMain === 'function') {
                    window.renderMain();
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
        if (window.currentScreen === 'main' && typeof window.renderMain === 'function') {
            window.renderMain();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initI18next);
    } else {
        initI18next();
    }
})();
