// server/data/battlePhrases.js

const attackPhrases = {
    warrior: [
        '%s сокрушает %s мощным ударом, нанося <span style="color:#e74c3c;">%d</span> урона!',
        '%s обрушивает топор на %s — <span style="color:#e74c3c;">%d</span> единиц боли!',
        '%s пробивает броню %s, оставляя кровавую рану на <span style="color:#e74c3c;">%d</span> HP.',
        '%s яростно атакует %s, выбивая <span style="color:#e74c3c;">%d</span> жизней.',
        '%s с размаху бьёт щитом по голове %s — <span style="color:#e74c3c;">%d</span> урона.'
    ],
    assassin: [
        '%s вонзает кинжал в спину %s, нанося <span style="color:#e74c3c;">%d</span> смертельного урона!',
        '%s бесшумно подкрадывается и режет горло %s — <span style="color:#e74c3c;">%d</span> HP.',
        '%s отравляет клинок и атакует %s — <span style="color:#e74c3c;">%d</span> урона.',
        '%s делает выпад и пронзает %s, забирая <span style="color:#e74c3c;">%d</span> жизней.',
        '%s исчезает в тени и наносит удар из ниоткуда — <span style="color:#e74c3c;">%d</span> урона.'
    ],
    mage: [
        '%s выпускает огненный шар в %s, испепеляя на <span style="color:#e74c3c;">%d</span> HP!',
        '%s читает заклинание ледяной стрелы, поражая %s — <span style="color:#e74c3c;">%d</span> урона.',
        '%s призывает молнию, которая разит %s, отнимая <span style="color:#e74c3c;">%d</span> здоровья.',
        '%s создаёт магический взрыв вокруг %s, нанося <span style="color:#e74c3c;">%d</span> урона.',
        '%s проклинает %s, и тот теряет <span style="color:#e74c3c;">%d</span> HP от магии.'
    ]
};

const dodgePhrases = [
    '<span style="color:#2ecc71;">%s ловко уклоняется от атаки %s!</span>',
    '<span style="color:#2ecc71;">%s уворачивается, и удар %s уходит в пустоту.</span>',
    '<span style="color:#2ecc71;">%s использует неуловимый манёвр, избегая удара %s.</span>'
];

const critPhrases = {
    warrior: [
        '%s с невероятной силой обрушивается на %s, нанося <span style="color:#e74c3c;">%d</span> КРИТИЧЕСКОГО урона!',
        '%s вкладывает всю ярость в удар — <span style="color:#e74c3c;">%d</span> единиц боли по %s!'
    ],
    assassin: [
        '%s находит уязвимое место и наносит сокрушительный удар — <span style="color:#e74c3c;">%d</span> смертельного крита!',
        '%s вонзает клинок по самую рукоять, нанося <span style="color:#e74c3c;">%d</span> критического урона %s!'
    ],
    mage: [
        '%s заряжает заклинание магией хаоса — <span style="color:#e74c3c;">%d</span> КРИТИЧЕСКОГО магического урона по %s!',
        '%s произносит слово силы, и взрыв выжигает <span style="color:#e74c3c;">%d</span> HP у %s!'
    ]
};

const vampPhrase = '%s восстанавливает <span style="color:#2ecc71;">%d</span> очков здоровья благодаря вампиризму.';
const reflectPhrase = '%s отражает <span style="color:#e74c3c;">%d</span> урона обратно в %s!';

// Исправленные фразы для стаков с эмодзи и цветами
const poisonStackPhrase = '<span style="color:#27ae60;">☠️ Яд накапливается на %s (+%d стак, всего %d).</span>';
const burnStackPhrase = '<span style="color:#e67e22;">🔥 Пламя усиливается на %s (+%d стак, всего %d).</span>';

// НОВЫЕ ФРАЗЫ ДЛЯ ЛЕДЯНОГО МАГА
const freezeStackPhrase = '<span style="color:#3498db;">❄️ %s накапливает лёд (%d/3). Мороз усиливается...</span>';
const frozenPhrase = '<span style="color:#00aaff; font-weight:bold;">❄️❄️❄️ %s ПРЕВРАЩАЕТСЯ В ЛЕДЯНУЮ ГЛЫБУ! Следующий ход будет пропущен! ❄️❄️❄️</span>';
const frozenContinuePhrase = '<span style="color:#00aaff;">❄️ %s остаётся в ледяном плену. Осталось %d хода.</span>';
const frozenEndPhrase = '<span style="color:#3498db;">❄️ Лёд тает! %s освобождается из ледяной тюрьмы.</span>';
const frozenAlreadyPhrase = '<span style="color:#3498db;">❄️ %s уже в ледяной глыбе, стаки не накапливаются.</span>';

const poisonPhrases = [
    '<span style="color:#27ae60;">☠️ Яд разъедает плоть %s, нанося %d урона.</span>',
    '<span style="color:#27ae60;">☠️ %s страдает от яда, теряя %d HP.</span>',
    '<span style="color:#27ae60;">☠️ Отравление усиливается: %s получает %d урона.</span>'
];
const burnPhrases = [
    '<span style="color:#e67e22;">🔥 Пламя пожирает %s, нанося %d урона.</span>',
    '<span style="color:#e67e22;">🔥 Огонь обжигает %s — %d единиц боли.</span>',
    '<span style="color:#e67e22;">🔥 Горящие души терзают %s, отнимая %d HP.</span>'
];
const selfDamagePhrase = '<span style="color:#e74c3c;">%s жертвует частью своей жизни, теряя %d HP.</span>';

const ultPhrases = {
    guardian: '<span style="color:#3498db;">🛡️ %s использует НЕСОКРУШИМОСТЬ и восстанавливает %d HP!</span>',
    berserker: '<span style="color:#3498db;">⚔️ %s применяет КРОВОПУСКАНИЕ, нанося %d урона ценой %d HP!</span>',
    knight: '<span style="color:#3498db;">🛡️ %s активирует ЩИТ ПРАВОСУДИЯ, увеличивая отражение на 50%% на 2 хода!</span>',
    assassin: '<span style="color:#3498db;">🗡️ %s наносит СМЕРТЕЛЬНЫЙ УДАР, критически поражая %s на %d урона!</span>',
    venom_blade: '<span style="color:#3498db;">☠️ %s применяет ЯДОВИТУЮ ВОЛНУ, нанося %d урона ядом!</span>',
    blood_hunter: '<span style="color:#3498db;">🩸 %s активирует КРОВАВУЮ ЖАТВУ, усиливая вампиризм и нанося %d урона!</span>',
    pyromancer: '<span style="color:#3498db;">🔥 %s обрушивает ОГНЕННЫЙ ШТОРМ на %s, нанося %d урона!</span>',
    cryomancer: '<span style="color:#3498db;">❄️ %s призывает ВЕЧНУЮ ЗИМУ, замораживая %s и нанося %d урона!</span>',
    illusionist: '<span style="color:#3498db;">✨ %s создаёт ЗАЗЕРКАЛЬЕ, заставляя %s атаковать себя, нанося %d урона!</span>'
};

module.exports = {
    attackPhrases,
    dodgePhrases,
    critPhrases,
    vampPhrase,
    reflectPhrase,
    poisonStackPhrase,
    burnStackPhrase,
    freezeStackPhrase,
    frozenPhrase,
    frozenContinuePhrase,
    frozenEndPhrase,
    frozenAlreadyPhrase,
    poisonPhrases,
    burnPhrases,
    selfDamagePhrase,
    ultPhrases
};
