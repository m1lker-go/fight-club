// server/data/battlePhrases.js
const fs = require('fs');
const path = require('path');

// Встроенные русские фразы (fallback) – все, что были в оригинале
const defaultPhrases = {
    attackPhrases: {
        warrior: [
            "%s с размаху бьёт щитом по голове %s. Урон -%d.",
            "%s наносит сокрушительный удар мечом по %s. Урон -%d.",
            "%s пробивает броню %s мощным выпадом. Урон -%d.",
            "%s обрушивает на %s град ударов. Урон -%d."
        ],
        assassin: [
            "%s незаметно подкрадывается и наносит удар в спину %s. Урон -%d.",
            "%s вонзает кинжал в плоть %s. Урон -%d.",
            "%s делает стремительный выпад, раня %s. Урон -%d.",
            "%s перерезает горло %s одним движением. Урон -%d."
        ],
        mage: [
            "%s выпускает магический снаряд в %s. Урон -%d.",
            "%s проклинает %s, и тот теряет жизненную силу. Урон -%d.",
            "%s призывает стихии, поражая %s. Урон -%d.",
            "%s читает заклинание, испепеляющее %s. Урон -%d."
        ]
    },
    critPhrases: {
        warrior: [
            "%s с невероятной силой обрушивается на %s. Крит. урон -%d.",
            "%s находит брешь в защите %s. Крит. урон -%d."
        ],
        assassin: [
            "%s наносит точнейший удар в уязвимое место %s. Крит. урон -%d.",
            "%s атакует молниеносно, разя %s наповал. Крит. урон -%d."
        ],
        mage: [
            "%s концентрирует магию в одной точке, прожигая %s. Крит. урон -%d.",
            "%s произносит древнее заклинание, испепеляющее %s. Крит. урон -%d."
        ]
    },
    dodgePhrases: [
        "%s ловко уворачивается от атаки %s. Уворот.",
        "%s уклоняется от смертельного удара %s. Уворот.",
        "%s использует неуловимый манёвр, избегая атаки %s. Уворот."
    ],
    vampPhrase: "Вампиризм +%d.",
    reflectPhrase: "Отражение -%d.",
    poisonStackPhrase: "Яд накапливается. Уровень %d.",
    burnStackPhrase: "Огонь разгорается. Уровень %d.",
    freezeStackPhrase: "Лед накапливается. Уровень %d.",
    poisonDamagePhrase: "%s получает %d урона от яда.",
    burnDamagePhrase: "%s получает %d урона от огня.",
    frozenPhrase: "%s застывает во льду! Заморозка.",
    frozenContinuePhrase: "%s пропускает ход.",
    frozenEndPhrase: "%s освобождается ото льда.",
    frozenAlreadyPhrase: "%s заморожен и пропускает ход.",
    selfDamagePhrase: "%s наносит порез себе. Урон -%d",
    ultPhrases: {
        guardian: "%s активирует божественную защиту. Здоровье +%d.",
        berserker: "%s впадает в ярость. Урон -%d, самоповреждение -%d.",
        knight: "%s поднимает щит, отражая 50%% урона 2 хода. Защита.",
        assassin: "%s исчезает в тени и наносит смертельный удар %s. Урон -%d.",
        venom_blade: "%s отравляет цель, нанося урон ядом. Урон -%d.",
        blood_hunter: "%s активирует кровавую жажду. Урон -%d, вампиризм усилен.",
        pyromancer: "%s призывает огненный шторм, сжигая %s. Урон -%d.",
        cryomancer: {
            normal: "<strong>%s</strong> применяет Вечную Зиму к <strong>%s</strong>. Урон -%d (x2).",
            frozen: "<strong>%s</strong> применяет Вечную Зиму к замороженному <strong>%s</strong>. Урон -%d (x3)."
        },
        illusionist: "%s создаёт иллюзию, заставляя %s атаковать себя. Урон -%d."
    },
    block_phrase: "<strong>{defender}</strong> полностью избежал урона - БЛОК",
    mana_steal_phrase: "{attacker} крадёт {amount} маны у {defender}.",
    poison_stack_phrase: "{defender} отравлен! Стаков: {stacks}/5 (урон стака {damage}).",
    burn_stack_phrase: "{defender} подожжён! Стаков: {stacks}/5 (урон стака {damage}).",
    freeze_stack_accumulate: "Лед накапливается {stacks}/3.",
    freeze_stack_full: "Лед накапливается 3/3. <strong>{target}</strong> замораживается и пропускает 1 ход.",
    mana_regen_disabled: "{name} не восстанавливает ману из-за последствий ультимейта.",
    mana_regen_halved: "{name} восстанавливает только {amount} маны из-за критического удара.",
    cannot_use_skill: "<strong>{name}</strong> не может использовать умение.",
    does_nothing: "{name} ничего не делает.",
    mouse_blade_ultimate: "<strong>{attacker}</strong> использует Уязвимость и наносит {damage} урона, игнорируя защиту!",
    mouse_antimag_ultimate: "<strong>{attacker}</strong> использует Антимагический удар и наносит {damage} урона (зависит от маны цели).",
    mouse_paladin_ultimate: "<strong>{attacker}</strong> становится неуязвимым на 2 хода!",
    mouse_alchemist_ultimate: "<strong>{attacker}</strong> использует Адский коктейль, нанося {damage} урона и отравляя цель на 2 хода!",
    mouse_shadow_ultimate: "<strong>{attacker}</strong> исчезает в тени! В конце хода последует сокрушительный удар.",
    mouse_necromancer_revive: "<strong>{name}</strong> воскресает, восстанавливая {hp} HP!",
    shadow_attack: "<strong>{attacker}</strong> выходит из тени и наносит {damage} урона, игнорируя защиту!",
    miss_mana_effect: "{attacker} промахивается и теряет 10 маны. {defender} восстанавливает 5 маны.",
    stunned_mana_effect: "{name} ошеломлён! Регенерация маны уменьшена на 50% в следующем ходу.",
    victory_phrases: [
        "🎉 Это была невероятная схватка! Вы одержали <span style=\"color:#2ecc71;\">ПОБЕДУ</span>!",
        "⚔️ С последним ударом враг повержен. <span style=\"color:#2ecc71;\">ПОБЕДА</span>!",
        "🏆 Вы оказались сильнее! <span style=\"color:#2ecc71;\">ПОБЕДА</span>!",
        "✨ Невероятная битва! <span style=\"color:#2ecc71;\">ПОБЕДА</span> за вами!"
    ],
    defeat_phrases: [
        "💔 В этой напряжённой схватке враг был сильнее. <span style=\"color:#e74c3c;\">ПОРАЖЕНИЕ</span>",
        "😵 Ваши силы иссякли... <span style=\"color:#e74c3c;\">ПОРАЖЕНИЕ</span>",
        "😢 Увы, победа не ваша. <span style=\"color:#e74c3c;\">ПОРАЖЕНИЕ</span>",
        "⚰️ Соперник оказался сильнее. <span style=\"color:#e74c3c;\">ПОРАЖЕНИЕ</span>"
    ],
    draw_phrases: [
        "🤝 Оба бойца падают одновременно. Ничья!",
        "💥 Взаимный удар – никто не выжил. Ничья."
    ],
    ultimate_not_ready: "Ультимейт ещё не готов",
    battle_error: "Ошибка боя"
};

// Кэш для загруженных переводов
let cachedRu = null;
let cachedEn = null;
let loaded = false;

function loadTranslations() {
    if (loaded) return;
    try {
        const ruPath = path.join(__dirname, '..', '..', 'client', 'locales', 'ru.json');
        const enPath = path.join(__dirname, '..', '..', 'client', 'locales', 'en.json');

        console.log(`[battlePhrases] Загружаю ru.json из: ${ruPath}`);
        console.log(`[battlePhrases] Загружаю en.json из: ${enPath}`);

        if (fs.existsSync(ruPath)) {
            console.log('[battlePhrases] ru.json найден, загружаю');
            const ruData = JSON.parse(fs.readFileSync(ruPath, 'utf-8'));
            cachedRu = ruData.battle || {};
        } else {
            console.error('[battlePhrases] ru.json НЕ НАЙДЕН!');
        }
        if (fs.existsSync(enPath)) {
            console.log('[battlePhrases] en.json найден, загружаю');
            const enData = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
            cachedEn = enData.battle || {};
        } else {
            console.error('[battlePhrases] en.json НЕ НАЙДЕН!');
        }

        loaded = true;
        console.log('✅ Battle phrases loaded from locales');
    } catch (e) {
        console.error('❌ Ошибка загрузки battle phrases:', e.message);
        loaded = true;
    }
}

/**
 * Возвращает объект с фразами для указанного языка.
 * Если перевода для языка нет, используется fallback (русский).
 * @param {string} lang - 'ru' или 'en'
 * @returns {object} – объект с фразами
 */
function getPhrases(lang = 'ru') {
    loadTranslations();
    // Если запрошен английский и есть переводы – мержим с default (чтобы заполнить возможные пропуски)
    if (lang === 'en' && cachedEn) {
        return { ...defaultPhrases, ...cachedEn };
    }
    // Если запрошен русский и есть переводы – мержим с default
    if (lang === 'ru' && cachedRu) {
        return { ...defaultPhrases, ...cachedRu };
    }
    // В любом другом случае возвращаем fallback (русский)
    return defaultPhrases;
}

// Экспортируем основную функцию и для обратной совместимости старые константы
module.exports = {
    getPhrases,
    // Старые экспорты (будут использоваться, если где-то в коде напрямую require)
    attackPhrases: defaultPhrases.attackPhrases,
    dodgePhrases: defaultPhrases.dodgePhrases,
    critPhrases: defaultPhrases.critPhrases,
    vampPhrase: defaultPhrases.vampPhrase,
    reflectPhrase: defaultPhrases.reflectPhrase,
    poisonStackPhrase: defaultPhrases.poisonStackPhrase,
    burnStackPhrase: defaultPhrases.burnStackPhrase,
    freezeStackPhrase: defaultPhrases.freezeStackPhrase,
    poisonDamagePhrase: defaultPhrases.poisonDamagePhrase,
    burnDamagePhrase: defaultPhrases.burnDamagePhrase,
    frozenPhrase: defaultPhrases.frozenPhrase,
    frozenContinuePhrase: defaultPhrases.frozenContinuePhrase,
    frozenEndPhrase: defaultPhrases.frozenEndPhrase,
    frozenAlreadyPhrase: defaultPhrases.frozenAlreadyPhrase,
    selfDamagePhrase: defaultPhrases.selfDamagePhrase,
    ultPhrases: defaultPhrases.ultPhrases,
    // Добавляем недостающие, чтобы старый код не ломался
    block_phrase: defaultPhrases.block_phrase,
    mana_steal_phrase: defaultPhrases.mana_steal_phrase,
    poison_stack_phrase: defaultPhrases.poison_stack_phrase,
    burn_stack_phrase: defaultPhrases.burn_stack_phrase,
    freeze_stack_accumulate: defaultPhrases.freeze_stack_accumulate,
    freeze_stack_full: defaultPhrases.freeze_stack_full,
    mana_regen_disabled: defaultPhrases.mana_regen_disabled,
    mana_regen_halved: defaultPhrases.mana_regen_halved,
    cannot_use_skill: defaultPhrases.cannot_use_skill,
    does_nothing: defaultPhrases.does_nothing,
    mouse_blade_ultimate: defaultPhrases.mouse_blade_ultimate,
    mouse_antimag_ultimate: defaultPhrases.mouse_antimag_ultimate,
    mouse_paladin_ultimate: defaultPhrases.mouse_paladin_ultimate,
    mouse_alchemist_ultimate: defaultPhrases.mouse_alchemist_ultimate,
    mouse_shadow_ultimate: defaultPhrases.mouse_shadow_ultimate,
    mouse_necromancer_revive: defaultPhrases.mouse_necromancer_revive,
    shadow_attack: defaultPhrases.shadow_attack,
    miss_mana_effect: defaultPhrases.miss_mana_effect,
    stunned_mana_effect: defaultPhrases.stunned_mana_effect,
    victory_phrases: defaultPhrases.victory_phrases,
    defeat_phrases: defaultPhrases.defeat_phrases,
    draw_phrases: defaultPhrases.draw_phrases,
    ultimate_not_ready: defaultPhrases.ultimate_not_ready,
    battle_error: defaultPhrases.battle_error
};
