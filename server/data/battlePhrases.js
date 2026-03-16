// server/data/battlePhrases.js

const attackPhrases = {
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
};

const critPhrases = {
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
};

const dodgePhrases = [
    "%s ловко уворачивается от атаки %s. Уворот.",
    "%s уклоняется от смертельного удара %s. Уворот.",
    "%s использует неуловимый манёвр, избегая атаки %s. Уворот."
];

const vampPhrase = "Вампиризм +%d.";

const reflectPhrase = "Отражение -%d.";

const poisonStackPhrase = "Яд накапливается. Уровень %d.";
const burnStackPhrase = "Огонь разгорается. Уровень %d.";
const freezeStackPhrase = "Лед накапливается. Уровень %d.";

const poisonDamagePhrase = "%s получает %d урона от яда.";
const burnDamagePhrase = "%s получает %d урона от огня.";

const frozenPhrase = "%s застывает во льду! Заморозка.";
const frozenContinuePhrase = "%s скован льдом ещё %d хода.";
const frozenEndPhrase = "%s освобождается ото льда.";
const frozenAlreadyPhrase = "%s заморожен и пропускает ход.";

const selfDamagePhrase = "%s наносит порез себе. Урон -%d .";

const ultPhrases = {
    guardian: "%s активирует божественную защиту. Здоровье +%d.",
    berserker: "%s впадает в ярость. Урон -%d, самоповреждение -%d.",
    knight: "%s поднимает щит, отражая 50%% урона 2 хода. Защита.",
    assassin: "%s исчезает в тени и наносит смертельный удар %s. Урон -%d.",
    venom_blade: "%s отравляет цель, нанося урон ядом. Урон -%d.",
    blood_hunter: "%s активирует кровавую жажду. Урон -%d, вампиризм усилен.",
    pyromancer: "%s призывает огненный шторм, сжигая %s. Урон -%d.",
    cryomancer: {
    normal: "%s замораживает %s. Урон -%d (x2 от интеллекта), заморозка.",
    frozen: "%s замораживает %s. Урон -%d (x3 от интеллекта), заморозка."
},
    illusionist: "%s создаёт иллюзию, заставляя %s атаковать себя. Урон -%d."
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
    poisonDamagePhrase,
    burnDamagePhrase,
    frozenPhrase,
    frozenContinuePhrase,
    frozenEndPhrase,
    frozenAlreadyPhrase,
    selfDamagePhrase,
    ultPhrases
};
