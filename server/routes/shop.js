const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Словарь названий предметов: класс -> тип -> редкость -> массив из 5 названий
const itemNames = {
    warrior: {
        weapon: {
            common: [
                'Ржавый меч',
                'Тупой клинок',
                'Сломанный меч',
                'Зазубренный меч',
                'Старый палаш'
            ],
            uncommon: [
                'Качественный меч',
                'Солдатский меч',
                'Длинный меч',
                'Широкий клинок',
                'Меч пехотинца'
            ],
            rare: [
                'Стальной меч',
                'Меч легионера',
                'Широкий меч',
                'Пламенный клинок',
                'Меч стража'
            ],
            epic: [
                'Меч героя',
                'Клеймор',
                'Пылающий клинок',
                'Меч правосудия',
                'Двуручный меч'
            ],
            legendary: [
                'Экскалибур',
                'Меч света',
                'Драконий клинок',
                'Клинок тьмы',
                'Меч древнего короля'
            ]
        },
        armor: {
            common: [
                'Потёртая кираса',
                'Ржавая броня',
                'Кожаный нагрудник',
                'Старый панцирь',
                'Треснувший доспех'
            ],
            uncommon: [
                'Кольчуга',
                'Латный доспех',
                'Стальной нагрудник',
                'Броня стражника',
                'Кираса'
            ],
            rare: [
                'Латный доспех',
                'Броня стража',
                'Кираса легионера',
                'Доспех воина',
                'Нагрудник паладина'
            ],
            epic: [
                'Доспех паладина',
                'Кираса титана',
                'Броня героя',
                'Латы света',
                'Панцирь воина'
            ],
            legendary: [
                'Броня небес',
                'Доспех древнего короля',
                'Латы бога войны',
                'Кираса бессмертия',
                'Облачение света'
            ]
        },
        helmet: {
            common: [
                'Ржавый шлем',
                'Треснувший шлем',
                'Кожаный шлем',
                'Старый шишак',
                'Потёртый шелом'
            ],
            uncommon: [
                'Стальной шлем',
                'Шлем стражника',
                'Открытый шлем',
                'Шлем пехотинца',
                'Кожаный шишак'
            ],
            rare: [
                'Шлем с забралом',
                'Латный шлем',
                'Шлем легионера',
                'Шлем воина',
                'Закрытый шлем'
            ],
            epic: [
                'Шлем вождя',
                'Рогатый шлем',
                'Шлем паладина',
                'Шлем света',
                'Венец воина'
            ],
            legendary: [
                'Шлем Одина',
                'Венец победителя',
                'Шлем бога войны',
                'Корона древнего короля',
                'Шлем бессмертия'
            ]
        },
        gloves: {
            common: [
                'Рваные рукавицы',
                'Старые перчатки',
                'Кожаные наручи',
                'Потёртые рукавицы',
                'Тряпичные перчатки'
            ],
            uncommon: [
                'Кожаные перчатки',
                'Рукавицы воина',
                'Наручи стражника',
                'Перчатки пехотинца',
                'Кожаные наручи'
            ],
            rare: [
                'Стальные рукавицы',
                'Латные рукавицы',
                'Наручи легионера',
                'Рукавицы стража',
                'Перчатки воина'
            ],
            epic: [
                'Перчатки титана',
                'Рукавицы героя',
                'Наручи паладина',
                'Рукавицы света',
                'Перчатки воина'
            ],
            legendary: [
                'Перчатки бога войны',
                'Длань правосудия',
                'Рукавицы древних',
                'Наручи бессмертия',
                'Перчатки света'
            ]
        },
        boots: {
            common: [
                'Стоптанные сапоги',
                'Дырявые ботинки',
                'Кожаные сапоги',
                'Старые башмаки',
                'Потёртые сапоги'
            ],
            uncommon: [
                'Сапоги пехотинца',
                'Походные сапоги',
                'Кожаные башмаки',
                'Сапоги стражника',
                'Ботинки'
            ],
            rare: [
                'Стальные сапоги',
                'Сапоги легионера',
                'Латные башмаки',
                'Сапоги воина',
                'Башмаки стража'
            ],
            epic: [
                'Сапоги ветра',
                'Башмаки титана',
                'Сапоги героя',
                'Сапоги света',
                'Ботинки паладина'
            ],
            legendary: [
                'Сапоги Гермеса',
                'Поступь бога',
                'Сапоги древнего воина',
                'Башмаки бессмертия',
                'Сапоги небес'
            ]
        },
        accessory: {
            common: [
                'Медное кольцо',
                'Простое кольцо',
                'Кольцо из стали',
                'Железное кольцо',
                'Потёртое кольцо'
            ],
            uncommon: [
                'Кольцо силы',
                'Кольцо стойкости',
                'Железное кольцо',
                'Кольцо воина',
                'Латунное кольцо'
            ],
            rare: [
                'Кольцо защиты',
                'Кольцо воина',
                'Кольцо с рубином',
                'Кольцо стойкости',
                'Стальное кольцо'
            ],
            epic: [
                'Кольцо мудрости',
                'Кольцо героя',
                'Кольцо власти',
                'Кольцо света',
                'Кольцо паладина'
            ],
            legendary: [
                'Кольцо всевластия',
                'Кольцо бессмертия',
                'Кольцо древних королей',
                'Кольцо судьбы',
                'Кольцо богов'
            ]
        }
    },
    assassin: {
        weapon: {
            common: [
                'Обломок кинжала',
                'Зазубренный клинок',
                'Тупой кинжал',
                'Ржавый кинжал',
                'Сломанный клинок'
            ],
            uncommon: [
                'Острый кинжал',
                'Клинок тени',
                'Кинжал вора',
                'Короткий клинок',
                'Стальной кинжал'
            ],
            rare: [
                'Отравленный кинжал',
                'Кинжал убийцы',
                'Клинок ночи',
                'Кинжал тени',
                'Лезвие вора'
            ],
            epic: [
                'Клинок тьмы',
                'Кинжал ночи',
                'Лезвие призрака',
                'Кинжал бездны',
                'Клинок смерти'
            ],
            legendary: [
                'Кинжал судьбы',
                'Лезвие хаоса',
                'Клинок бездны',
                'Кинжал вечности',
                'Лезвие тени'
            ]
        },
        armor: {
            common: [
                'Потёртая куртка',
                'Рваный плащ',
                'Кожаный доспех',
                'Старая кожаная броня',
                'Дырявая куртка'
            ],
            uncommon: [
                'Теневой плащ',
                'Кожаный доспех',
                'Куртка убийцы',
                'Плащ вора',
                'Лёгкая броня'
            ],
            rare: [
                'Броня ассасина',
                'Плащ невидимости',
                'Костюм теней',
                'Доспех убийцы',
                'Облачение тени'
            ],
            epic: [
                'Доспех теней',
                'Облачение ночи',
                'Костюм убийцы',
                'Броня призрака',
                'Плащ бездны'
            ],
            legendary: [
                'Облачение призрака',
                'Доспех ночного стража',
                'Теневой доспех',
                'Броня смерти',
                'Плащ хаоса'
            ]
        },
        helmet: {
            common: [
                'Старый капюшон',
                'Грязная маска',
                'Тряпичный капюшон',
                'Потёртый капюшон',
                'Рваная маска'
            ],
            uncommon: [
                'Кожаный капюшон',
                'Маска скрытности',
                'Капюшон вора',
                'Теневой капюшон',
                'Льняная маска'
            ],
            rare: [
                'Капюшон ассасина',
                'Маска тени',
                'Капюшон убийцы',
                'Маска ночи',
                'Капюшон скрытности'
            ],
            epic: [
                'Маска убийцы',
                'Капюшон невидимости',
                'Личина тени',
                'Маска призрака',
                'Капюшон бездны'
            ],
            legendary: [
                'Личина призрака',
                'Венец тьмы',
                'Маска бездны',
                'Капюшон смерти',
                'Маска хаоса'
            ]
        },
        gloves: {
            common: [
                'Рваные перчатки',
                'Старые наручи',
                'Кожаные перчатки',
                'Потёртые перчатки',
                'Дырявые наручи'
            ],
            uncommon: [
                'Перчатки вора',
                'Кожаные наручи',
                'Перчатки скрытности',
                'Наручи тени',
                'Лёгкие перчатки'
            ],
            rare: [
                'Перчатки ассасина',
                'Наручи тени',
                'Рукавицы убийцы',
                'Перчатки ночи',
                'Наручи скрытности'
            ],
            epic: [
                'Перчатки теней',
                'Рукавицы призрака',
                'Наручи ночи',
                'Перчатки бездны',
                'Рукавицы смерти'
            ],
            legendary: [
                'Перчатки призрака',
                'Длань ночи',
                'Рукавицы бездны',
                'Перчатки хаоса',
                'Наручи вечности'
            ]
        },
        boots: {
            common: [
                'Стоптанные сапоги',
                'Дырявые ботинки',
                'Кожаные сапоги',
                'Старые башмаки',
                'Рваные сапоги'
            ],
            uncommon: [
                'Сапоги вора',
                'Сапоги скорохода',
                'Кожаные башмаки',
                'Ботинки тени',
                'Лёгкие сапоги'
            ],
            rare: [
                'Сапоги бесшумности',
                'Башмаки тени',
                'Сапоги убийцы',
                'Сапоги ночи',
                'Ботинки скрытности'
            ],
            epic: [
                'Сапоги ветра',
                'Шаги призрака',
                'Башмаки ночи',
                'Сапоги бездны',
                'Ботинки смерти'
            ],
            legendary: [
                'Поступь ночи',
                'Сапоги безмолвия',
                'Шаги смерти',
                'Башмаки хаоса',
                'Сапоги вечности'
            ]
        },
        accessory: {
            common: [
                'Медное кольцо',
                'Простое кольцо',
                'Кольцо из стали',
                'Железное кольцо',
                'Потёртое кольцо'
            ],
            uncommon: [
                'Кольцо ловкости',
                'Кольцо скрытности',
                'Кольцо вора',
                'Латунное кольцо',
                'Стальное кольцо'
            ],
            rare: [
                'Кольцо убийцы',
                'Кольцо теней',
                'Кольцо ночи',
                'Кольцо тени',
                'Кольцо вора'
            ],
            epic: [
                'Кольцо призрака',
                'Кольцо тьмы',
                'Кольцо бездны',
                'Кольцо смерти',
                'Кольцо теней'
            ],
            legendary: [
                'Кольцо судьбы',
                'Кольцо хаоса',
                'Кольцо теней',
                'Кольцо вечности',
                'Кольцо призрака'
            ]
        }
    },
    mage: {
        weapon: {
            common: [
                'Сломанный посох',
                'Старая палка',
                'Простой жезл',
                'Треснувший посох',
                'Деревянная ветвь'
            ],
            uncommon: [
                'Деревянный посох',
                'Жезл ученика',
                'Посох подмастерья',
                'Магическая трость',
                'Костяной жезл'
            ],
            rare: [
                'Посох мага',
                'Жезл чародея',
                'Посох волшебника',
                'Жезл стихий',
                'Эбонитовый посох'
            ],
            epic: [
                'Посох архимага',
                'Жезл стихий',
                'Посох мудрости',
                'Кристальный посох',
                'Жезл пламени'
            ],
            legendary: [
                'Посох богов',
                'Жезл бесконечности',
                'Посох творения',
                'Посох времени',
                'Жезл судьбы'
            ]
        },
        armor: {
            common: [
                'Потёртая мантия',
                'Рваная роба',
                'Старая накидка',
                'Грязная мантия',
                'Дырявая роба'
            ],
            uncommon: [
                'Мантия ученика',
                'Роба чародея',
                'Одеяние подмастерья',
                'Льняная мантия',
                'Шёлковая роба'
            ],
            rare: [
                'Мантия мага',
                'Роба волшебника',
                'Одеяние чародея',
                'Мантия стихий',
                'Шёлковая мантия'
            ],
            epic: [
                'Мантия архимага',
                'Роба стихий',
                'Одеяние мудреца',
                'Мантия времени',
                'Роба пламени'
            ],
            legendary: [
                'Облачение бога',
                'Мантия всевластия',
                'Роба бессмертия',
                'Мантия вечности',
                'Роба судьбы'
            ]
        },
        helmet: {
            common: [
                'Старый капюшон',
                'Потёртая шапка',
                'Тряпичный капюшон',
                'Дырявый колпак',
                'Грязная накидка'
            ],
            uncommon: [
                'Капюшон ученика',
                'Шляпа чародея',
                'Колпак подмастерья',
                'Теневой капюшон',
                'Льняной колпак'
            ],
            rare: [
                'Капюшон мага',
                'Корона волшебника',
                'Тиара чародея',
                'Капюшон стихий',
                'Шляпа мага'
            ],
            epic: [
                'Капюшон архимага',
                'Венец мудрости',
                'Корона стихий',
                'Тиара времени',
                'Капюшон пламени'
            ],
            legendary: [
                'Корона всевластия',
                'Тиара богов',
                'Венец бессмертия',
                'Корона вечности',
                'Тиара судьбы'
            ]
        },
        gloves: {
            common: [
                'Рваные перчатки',
                'Старые рукавицы',
                'Тряпичные перчатки',
                'Потёртые перчатки',
                'Дырявые рукавицы'
            ],
            uncommon: [
                'Перчатки ученика',
                'Рукавицы чародея',
                'Перчатки подмастерья',
                'Льняные перчатки',
                'Шёлковые рукавицы'
            ],
            rare: [
                'Перчатки мага',
                'Рукавицы волшебника',
                'Перчатки чародея',
                'Перчатки стихий',
                'Шёлковые перчатки'
            ],
            epic: [
                'Перчатки архимага',
                'Рукавицы стихий',
                'Перчатки мудреца',
                'Рукавицы времени',
                'Перчатки пламени'
            ],
            legendary: [
                'Перчатки бога',
                'Длань созидания',
                'Рукавицы бессмертия',
                'Перчатки вечности',
                'Длань судьбы'
            ]
        },
        boots: {
            common: [
                'Стоптанные башмаки',
                'Дырявые туфли',
                'Кожаные сандалии',
                'Старые сапоги',
                'Потёртые башмаки'
            ],
            uncommon: [
                'Башмаки ученика',
                'Сапоги чародея',
                'Туфли подмастерья',
                'Лёгкие сапоги',
                'Шёлковые башмаки'
            ],
            rare: [
                'Сапоги мага',
                'Башмаки волшебника',
                'Сапоги чародея',
                'Сапоги стихий',
                'Шёлковые сапоги'
            ],
            epic: [
                'Сапоги архимага',
                'Башмаки стихий',
                'Сапоги мудреца',
                'Башмаки времени',
                'Сапоги пламени'
            ],
            legendary: [
                'Сапоги Гермеса',
                'Поступь времени',
                'Башмаки бессмертия',
                'Сапоги вечности',
                'Башмаки судьбы'
            ]
        },
        accessory: {
            common: [
                'Медное кольцо',
                'Простое кольцо',
                'Кольцо из стали',
                'Железное кольцо',
                'Потёртое кольцо'
            ],
            uncommon: [
                'Кольцо маны',
                'Кольцо ученика',
                'Кольцо подмастерья',
                'Латунное кольцо',
                'Стальное кольцо'
            ],
            rare: [
                'Кольцо мага',
                'Кольцо чародея',
                'Кольцо волшебника',
                'Кольцо стихий',
                'Кольцо мудрости'
            ],
            epic: [
                'Кольцо архимага',
                'Кольцо стихий',
                'Кольцо мудрости',
                'Кольцо времени',
                'Кольцо пламени'
            ],
            legendary: [
                'Кольцо всевластия',
                'Кольцо богов',
                'Кольцо бесконечности',
                'Кольцо вечности',
                'Кольцо судьбы'
            ]
        }
    }
};

// Вспомогательная функция для генерации предмета по типу сундука
function generateItemFromChest(chestType) {
    // Случайно выбираем класс и тип
    const classes = ['warrior', 'assassin', 'mage'];
    const className = classes[Math.floor(Math.random() * classes.length)];
    
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Определяем редкость в зависимости от типа сундука
    let rarity;
    if (chestType === 'common') {
        const r = Math.random();
        if (r < 0.85) rarity = 'common';
        else rarity = 'uncommon';
    } else if (chestType === 'uncommon') {
        const r = Math.random();
        if (r < 0.25) rarity = 'common';
        else if (r < 0.90) rarity = 'uncommon';
        else rarity = 'rare';
    } else if (chestType === 'rare') {
        const r = Math.random();
        if (r < 0.7) rarity = 'rare';
        else rarity = 'epic';
    } else if (chestType === 'epic') {
        const r = Math.random();
        if (r < 0.7) rarity = 'epic';
        else rarity = 'legendary';
    } else if (chestType === 'legendary') {
        const r = Math.random();
        if (r < 0.7) rarity = 'legendary';
        else rarity = 'epic';
    } else {
        rarity = 'common';
    }

    // Выбираем название из соответствующего массива
    const namesArray = itemNames[className][type][rarity];
    const name = namesArray[Math.floor(Math.random() * namesArray.length)];

    // Базовые бонусы для каждой редкости
    const bonuses = {
        common: { atk: 1, def: 1, hp: 2 },
        uncommon: { atk: 2, def: 2, hp: 4 },
        rare: { atk: 3, def: 3, hp: 6 },
        epic: { atk: 5, def: 5, hp: 10 },
        legendary: { atk: 7, def: 7, hp: 15 }
    };
    const b = bonuses[rarity];

    // Случайно выбираем 2 бонуса
    const possibleStats = ['atk', 'def', 'hp', 'spd', 'crit', 'crit_dmg', 'agi', 'int', 'vamp', 'reflect'];
    const selected = [];
    while (selected.length < 2) {
        const stat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
        if (!selected.includes(stat)) selected.push(stat);
    }

    const item = {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: className,
        atk_bonus: 0,
        def_bonus: 0,
        hp_bonus: 0,
        spd_bonus: 0,
        crit_bonus: 0,
        crit_dmg_bonus: 0,
        agi_bonus: 0,
        int_bonus: 0,
        vamp_bonus: 0,
        reflect_bonus: 0
    };

    selected.forEach(stat => {
        if (stat === 'atk') item.atk_bonus = Math.floor(b.atk * (0.8 + 0.4*Math.random()));
        else if (stat === 'def') item.def_bonus = Math.floor(b.def * (0.8 + 0.4*Math.random()));
        else if (stat === 'hp') item.hp_bonus = Math.floor(b.hp * (0.8 + 0.4*Math.random()));
        else if (stat === 'spd') item.spd_bonus = Math.floor(b.atk * 0.5 + 1);
        else if (stat === 'crit') item.crit_bonus = Math.floor(b.atk * 2);
        else if (stat === 'crit_dmg') item.crit_dmg_bonus = Math.floor(b.atk * 5);
        else if (stat === 'agi') item.agi_bonus = Math.floor(b.atk * 2);
        else if (stat === 'int') item.int_bonus = Math.floor(b.atk * 2);
        else if (stat === 'vamp') item.vamp_bonus = Math.floor(b.atk * 2);
        else if (stat === 'reflect') item.reflect_bonus = Math.floor(b.atk * 2);
    });

    return item;
}

router.post('/buychest', async (req, res) => {
    console.log('=== ПОКУПКА СУНДУКА ===');
    console.log('tg_id:', req.body.tg_id);
    console.log('chestType:', req.body.chestType);

    const { tg_id, chestType } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const user = await client.query('SELECT id, coins, diamonds, last_free_common_chest FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        let coins = user.rows[0].coins;
        const diamonds = user.rows[0].diamonds;
        let lastFree = user.rows[0].last_free_common_chest;

        let price = 0;
        let isFree = false;

        const now = new Date();
        const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
        const today = moscowTime.toISOString().split('T')[0];

        if (chestType === 'common') {
            if (!lastFree || new Date(lastFree).toISOString().split('T')[0] !== today) {
                isFree = true;
                price = 0;
            } else {
                price = 50;
            }
        } else if (chestType === 'uncommon') {
            price = 200;
        } else if (chestType === 'rare') {
            price = 800;
        } else if (chestType === 'epic') {
            price = 1800;
        } else if (chestType === 'legendary') {
            price = 3500;
        } else {
            throw new Error('Invalid chest type');
        }

        if (!isFree) {
            if (coins < price) throw new Error('Not enough coins');
            await client.query('UPDATE users SET coins = coins - $1 WHERE id = $2', [price, userId]);
        } else {
            await client.query('UPDATE users SET last_free_common_chest = $1 WHERE id = $2', [moscowTime, userId]);
        }

        const item = generateItemFromChest(chestType);
        console.log('Сгенерирован предмет:', item);
        console.log('Редкость:', item.rarity);

        // Вставляем предмет в таблицу items
        const itemRes = await client.query(
            `INSERT INTO items (name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
            [item.name, item.type, item.rarity, 'any', item.owner_class,
             item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
             item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
        );
        const itemId = itemRes.rows[0].id;
        console.log('ID созданного предмета в items:', itemId);

        // Добавляем в инвентарь со всеми полями (дублируем данные для упрощения)
        await client.query(
            `INSERT INTO inventory (
                user_id, item_id, equipped,
                name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [userId, itemId, false,
             item.name, item.type, item.rarity, 'any', item.owner_class,
             item.atk_bonus, item.def_bonus, item.hp_bonus, item.spd_bonus,
             item.crit_bonus, item.crit_dmg_bonus, item.agi_bonus, item.int_bonus, item.vamp_bonus, item.reflect_bonus]
        );
        console.log('Предмет добавлен в инвентарь пользователя', userId);

        await client.query('COMMIT');
        console.log('=== ТРАНЗАКЦИЯ ЗАВЕРШЕНА, предмет добавлен ===');
        res.json({ success: true, item: { ...item, id: itemId } });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Ошибка при покупке сундука:', e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
