
// Словарь для перевода подклассов
const roleDescriptions = {
    // Воин
   guardian: {
    name: 'Страж',
    passive: 'Живой щит – Увеличивает защиту на +5 единиц (Макс. 75), 10% шанс блока.',
    active: 'Несокрушимость – Восстанавливает 20% от максимального HP. Снимает отрицательные эффекты.'
},
berserker: {
    name: 'Берсерк',
    passive: 'Ярость – Чем меньше HP, тем выше урон. Каждая атака наносит 10% от текущего урона себе (Не может себя убить).',
    active: 'Теряет 30% текущего HP. Гарантированный крит, +50% крит. урона.'
},
    knight: {
    name: 'Рыцарь',
    passive: 'Зеркальный щит – Отражение +20% полученного физического урона.',
    active: 'Щит правосудия – На 2 хода: отражение +50%. Снимает все негативные эффекты.'
},
    // Ассасин
    assassin: {
        name: 'Убийца',
        passive: 'Смертельное касание – Критический урон +50%.',
        active: 'Смертельный удар – Гарантированный крит, урон +150% к крит. урону (может превышать лимит).'
    },
     venom_blade: {
        name: 'Ядовитый клинок',
        passive: 'Ядовитый укус – Каждая атака накладывает яд (макс. 5 стаков). Урон стака: 2 + ловкость/5. Действует в конце раунда.',
        active: 'Ядовитая волна – Чистый урон: атака + урон от стаков яда (2 + ловкость/5 за стак) + бонус за сжигание (От 5 до 30). Игнорирует защиту, отражение и вампиризм. Все стаки сгорают'
    },
    blood_hunter: {
        name: 'Кровавый охотник',
        passive: 'Вампиризм – Вампиризм + 20%',
        active: 'Кровавая жатва – На 2 хода: вампиризм +50%, крит. урон +100% (может превышать лимит).'
    },
    // Маг
pyromancer: {
    name: 'Поджигатель',
    passive: 'Горящие души – Каждая атака поджигает цель (макс. 5 стаков). Урон стака: 2 + ловкость/5. Действует в конце раунда.',
    active: 'Огненный шторм – Наносит мощный урон огнём и сжигает все стаки. (Интеллект×1.8 + урон от стаков).'
},
    cryomancer: {
    name: 'Ледяной маг',
    passive: 'Ледяная кровь – Каждая атака накапливает стак холода. При 3 стаках замораживает цель на 1 ход.',
    active: 'Вечная зима – Наносит урон и замораживает цель на 1 ход. (Интеллект ×1.6, если цель заморожена ×2.5)'
},
    illusionist: {
        name: 'Иллюзионист',
        passive: 'Мираж – Гарантированный уворот каждый 4-й ход.',
        active: 'Зазеркалье – Враг атакует себя (урон = его атака×2×(1+инт/100).Урон врага - минимум 12'
    }
};

// Базовые характеристики классов
const baseStats = {
    warrior: { hp: 35, atk: 3, def: 5, agi: 2, int: 0, spd: 10, crit: 2, critDmg: 1.5, vamp: 0, reflect: 0 },
    assassin: { hp: 20, atk: 4, def: 1, agi: 5, int: 0, spd: 14, crit: 5, critDmg: 1.5, vamp: 0, reflect: 0 },
    mage: { hp: 20, atk: 3, def: 1, agi: 3, int: 6, spd: 14, crit: 3, critDmg: 1.5, vamp: 0, reflect: 0 }
};

// Веса характеристик для расчёта силы
const importance = {
    warrior: {
        hp: 2.0, atk: 2.0, def: 2.0,
        crit: 1.5, reflect: 1.5, critDmg: 1.5,
        agi: 1.0, int: 1.0, spd: 1.0, vamp: 0.5
    },
    assassin: {
        atk: 2.0, agi: 2.0, vamp: 2.0,
        hp: 1.5, crit: 1.5, critDmg: 1.5,
        def: 1.0, int: 1.0, spd: 1.0, reflect: 1.0
    },
    mage: {
        atk: 2.0, int: 2.0, agi: 2.0,
        hp: 1.5, crit: 1.5, critDmg: 1.5,
        def: 1.0, spd: 1.0, vamp: 0.5, reflect: 0.5
    }
};

// Словарь перевода названий предметов
const itemNameTranslations = {
    'Rusty Sword': 'Ржавый меч',
    'Wooden Shield': 'Деревянный щит',
    'Leather Helmet': 'Кожаный шлем',
    'Rag Gloves': 'Тряпичные перчатки',
    'Old Boots': 'Старые сапоги',
    'Copper Ring': 'Медное кольцо',
    'Blunt Dagger': 'Затупленный кинжал',
    'Rag Cloak': 'Тряпичный плащ',
    'Burlap Mask': 'Маска из мешковины',
    'Thief Gloves': 'Перчатки вора',
    'Torn Boots': 'Рваные сапоги',
    'Trickster Ring': 'Кольцо ловкача',
    'Broken Staff': 'Сломанный посох',
    'Worn Robe': 'Потёртая мантия',
    'Old Hood': 'Старый капюшон',
    'Rag Mitts': 'Тряпичные рукавицы',
    'Holey Shoes': 'Дырявые башмаки',
    'Novice Ring': 'Кольцо начинающего',
    'Quality Sword': 'Качественный меч',
    'Reinforced Shield': 'Укреплённый щит',
    'Visor Helmet': 'Шлем с забралом',
    'Leather Gloves': 'Кожаные перчатки',
    'Speed Boots': 'Сапоги скорохода',
    'Strength Ring': 'Кольцо силы',
    'Sharp Dagger': 'Острый кинжал',
    'Wanderer Cloak': 'Плащ странника',
    'Stealth Mask': 'Маска скрытности',
    'Nimble Gloves': 'Перчатки проворства',
    'Silent Boots': 'Сапоги бесшумные',
    'Lucky Ring': 'Кольцо удачи',
    'Unity Staff': 'Посох единства',
    'Apprentice Robe': 'Мантия ученика',
    'Wizard Hood': 'Капюшон чародея',
    'Spellcaster Gloves': 'Перчатки заклинателя',
    'Wanderer Boots': 'Сапоги странника',
    'Wisdom Ring': 'Кольцо мудрости',
    'Knights Shield': 'Щит рыцаря',
    'Warrior Sword': 'Меч воина',
    'Heavy Sword': 'Тяжелый меч',
    'Plate Armor': 'Латы',
    'Warrior Helmet': 'Шлем воина',
    'Warrior Gloves': 'Перчатки воина',
    'Warrior Boots': 'Сапоги воина',
    'Warrior Ring': 'Кольцо воина',
    'Health Ring': 'Кольцо здоровья',
    'Assassin Dagger': 'Кинжал ассасина',
    'Poison Blade': 'Отравленный клинок',
    'Shadow Cloak': 'Плащ теней',
    'Assassin Mask': 'Маска убийцы',
    'Assassin Gloves': 'Перчатки ловкача',
    'Speed Boots': 'Сапоги скорости',
    'Assassin Ring': 'Кольцо ловкости',
    'Critical Amulet': 'Амулет крита',
    'Mage Staff': 'Посох мага',
    'Fire Wand': 'Жезл огня',
    'Mage Robe': 'Мантия чародея',
    'Mage Hood': 'Капюшон мага',
    'Mage Gloves': 'Перчатки мага',
    'Mage Boots': 'Сапоги мага',
    'Mana Ring': 'Кольцо маны',
    'Resistance Amulet': 'Амулет сопротивления',
    'Legendary Sword': 'Легендарный меч',
    'Blade of Darkness': 'Клинок тьмы',
    'Elemental Staff': 'Посох стихий',
    'Titan Cuirass': 'Кираса титана',
    'Ghost Cloak': 'Плащ призрака',
    'Archmage Robe': 'Роба архимага',
    'Excalibur': 'Экскалибур',
    'Dagger of Fate': 'Кинжал судьбы',
    'Staff of Gods': 'Посох богов',
    'Ancient Armor': 'Доспех древних',
    'Invisibility Cloak': 'Плащ невидимости',
    'Omnipotence Robe': 'Мантия всевластия'
};

const rarityTranslations = {
    'common': 'Обычное',
    'uncommon': 'Необычное',
    'rare': 'Редкое',
    'epic': 'Эпическое',
    'legendary': 'Легендарное'
};

// Словарь для перевода ежедневных заданий
const dailyTaskTranslations = {
    'Warrior Winner': {
        name: 'Воин',
        description: 'Выиграйте 5 боёв, играя за Воина'
    },
    'Assassin Winner': {
        name: 'Ассасин',
        description: 'Выиграйте 5 боёв, играя за Ассасина'
    },
    'Mage Winner': {
        name: 'Маг',
        description: 'Выиграйте 5 боёв, играя за Мага'
    },
    'Experience Gain': {
        name: 'Набор опыта',
        description: 'Получите 50 очков опыта (суммарно за все классы)'
    },
    'Training Day': {
        name: 'Тренировка',
        description: 'Сыграйте 15 матчей за день (любых)'
    },
    'Curious': {
        name: 'Любознательный',
        description: 'Зайдите на страницу профиля'
    },
    'Lucky': {
        name: 'Счастливчик',
        description: 'Получите предмет редкостью не ниже «Редкий»'
    },
    'Referral': {
        name: 'Реферальная программа',
        description: 'Пригласи друга и получи 100 монет'
    },
    'Tower': {
    name: 'Башня',
    description: 'Потратить 3 билета в разделе Башня' 
    },
    'Champion': {
    name: 'Чемпион', 
    description: 'Выполнить все ежедневные задания'
    }
};

// Словарь для перевода названий скинов
const skinNameTranslations = {
    'skin1': 'Бедолага',
    'skin3': 'Зоркий глаз',
    'skin4': 'Улыбочка',
    'skin5': 'Ночная тень',
    'skin6': 'Стальная броня',
    'skin7': 'Чародей',
    'skin9': 'Магический снежок',
    'skin10': 'Страж королевства',
     'firelegend': 'Разрушитель',
    'skin11': 'Ледяной тигр'
};

function translateSkinName(englishName) {
    return skinNameTranslations[englishName] || englishName;
}
