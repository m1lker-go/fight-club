const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// ==================== СЛОВАРИ НАЗВАНИЙ ПРЕДМЕТОВ (из shop.js) ====================
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

// Фиксированные бонусы для каждой редкости
const fixedBonuses = {
    common: {
        atk: 1, def: 1, hp: 2, spd: 1,
        crit: 2, crit_dmg: 5, agi: 2, int: 2, vamp: 2, reflect: 2
    },
    uncommon: {
        atk: 2, def: 2, hp: 4, spd: 2,
        crit: 4, crit_dmg: 10, agi: 4, int: 4, vamp: 4, reflect: 4
    },
    rare: {
        atk: 3, def: 3, hp: 6, spd: 3,
        crit: 6, crit_dmg: 15, agi: 6, int: 6, vamp: 6, reflect: 6
    },
    epic: {
        atk: 5, def: 5, hp: 10, spd: 4,
        crit: 10, crit_dmg: 25, agi: 10, int: 10, vamp: 10, reflect: 10
    },
    legendary: {
        atk: 10, def: 10, hp: 20, spd: 5,
        crit: 15, crit_dmg: 40, agi: 15, int: 15, vamp: 15, reflect: 15
    }
};

// Функция генерации предмета по редкости и классу
function generateItemByRarity(rarity, ownerClass = null) {
    const classes = ['warrior', 'assassin', 'mage'];
    const chosenClass = ownerClass || classes[Math.floor(Math.random() * classes.length)];
    const types = ['weapon', 'armor', 'helmet', 'gloves', 'boots', 'accessory'];
    const type = types[Math.floor(Math.random() * types.length)];
    const namesArray = itemNames[chosenClass][type][rarity];
    const name = namesArray[Math.floor(Math.random() * namesArray.length)];

    // Выбираем две характеристики случайно (с возможностью повтора)
    const possibleStats = ['atk', 'def', 'hp', 'spd', 'crit', 'crit_dmg', 'agi', 'int', 'vamp', 'reflect'];
    const stat1 = possibleStats[Math.floor(Math.random() * possibleStats.length)];
    const stat2 = possibleStats[Math.floor(Math.random() * possibleStats.length)];

    const item = {
        name: name,
        type: type,
        rarity: rarity,
        class_restriction: 'any',
        owner_class: chosenClass,
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

    const bonus = fixedBonuses[rarity];

    const addBonus = (stat) => {
        switch (stat) {
            case 'atk': item.atk_bonus += bonus.atk; break;
            case 'def': item.def_bonus += bonus.def; break;
            case 'hp': item.hp_bonus += bonus.hp; break;
            case 'spd': item.spd_bonus += bonus.spd; break;
            case 'crit': item.crit_bonus += bonus.crit; break;
            case 'crit_dmg': item.crit_dmg_bonus += bonus.crit_dmg; break;
            case 'agi': item.agi_bonus += bonus.agi; break;
            case 'int': item.int_bonus += bonus.int; break;
            case 'vamp': item.vamp_bonus += bonus.vamp; break;
            case 'reflect': item.reflect_bonus += bonus.reflect; break;
        }
    };

    addBonus(stat1);
    addBonus(stat2);

    return item;
}

// Добавить предмет в кузницу
router.post('/add', async (req, res) => {
    const { tg_id, item_id, tab } = req.body;
    if (!tab || (tab !== 'forge' && tab !== 'smelt')) {
        return res.status(400).json({ error: 'Invalid tab' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const item = await client.query(
            'SELECT id FROM inventory WHERE id = $1 AND user_id = $2 AND equipped = false AND for_sale = false AND in_forge = false',
            [item_id, userId]
        );
        if (item.rows.length === 0) throw new Error('Item not available');

        await client.query(
            'UPDATE inventory SET in_forge = true, forge_tab = $1 WHERE id = $2',
            [tab, item_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Убрать предмет из кузницы
router.post('/remove', async (req, res) => {
    const { tg_id, item_id } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const item = await client.query(
            'SELECT id FROM inventory WHERE id = $1 AND user_id = $2 AND in_forge = true',
            [item_id, userId]
        );
        if (item.rows.length === 0) throw new Error('Item not in forge');

        await client.query(
            'UPDATE inventory SET in_forge = false, forge_tab = NULL WHERE id = $1',
            [item_id]
        );

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Получить список ID предметов в указанной вкладке кузницы
router.get('/current', async (req, res) => {
    const { tg_id, tab } = req.query;
    if (!tg_id) return res.status(400).json({ error: 'tg_id required' });
    if (!tab || (tab !== 'forge' && tab !== 'smelt')) {
        return res.status(400).json({ error: 'Invalid tab' });
    }

    try {
        const user = await pool.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const userId = user.rows[0].id;

        const result = await pool.query(
            'SELECT id FROM inventory WHERE user_id = $1 AND in_forge = true AND forge_tab = $2',
            [userId, tab]
        );
        res.json(result.rows.map(row => row.id));
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Database error' });
    }
});

// Ковка: объединение 3 предметов в один более высокой редкости
router.post('/craft', async (req, res) => {
    const { tg_id, item_ids, chosen_class } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length !== 3) {
        return res.status(400).json({ error: 'Need exactly 3 items' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;

        const items = await client.query(
            'SELECT * FROM inventory WHERE id = ANY($1::int[]) AND user_id = $2 AND equipped = false AND for_sale = false AND in_forge = true',
            [item_ids, userId]
        );
        if (items.rows.length !== 3) throw new Error('Items not found or not available');

        const rarities = items.rows.map(i => i.rarity);
        const firstRarity = rarities[0];
        if (!rarities.every(r => r === firstRarity)) {
            throw new Error('Items must have the same rarity');
        }

        const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const currentIndex = rarityOrder.indexOf(firstRarity);
        if (currentIndex === -1 || currentIndex === rarityOrder.length - 1) {
            throw new Error('Cannot upgrade this rarity');
        }
        const newRarity = rarityOrder[currentIndex + 1];

        await client.query('DELETE FROM inventory WHERE id = ANY($1::int[])', [item_ids]);

        const newItem = generateItemByRarity(newRarity, chosen_class || null);
        const itemRes = await client.query(
            `INSERT INTO items (name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
            [newItem.name, newItem.type, newItem.rarity, 'any', newItem.owner_class,
             newItem.atk_bonus, newItem.def_bonus, newItem.hp_bonus, newItem.spd_bonus,
             newItem.crit_bonus, newItem.crit_dmg_bonus, newItem.agi_bonus, newItem.int_bonus, newItem.vamp_bonus, newItem.reflect_bonus]
        );
        const newItemId = itemRes.rows[0].id;

        // Вставляем в инвентарь со всеми полями
        await client.query(
            `INSERT INTO inventory (
                user_id, item_id, equipped, in_forge,
                name, type, rarity, class_restriction, owner_class,
                atk_bonus, def_bonus, hp_bonus, spd_bonus,
                crit_bonus, crit_dmg_bonus, agi_bonus, int_bonus, vamp_bonus, reflect_bonus
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
            [userId, newItemId, false, false,
             newItem.name, newItem.type, newItem.rarity, 'any', newItem.owner_class,
             newItem.atk_bonus, newItem.def_bonus, newItem.hp_bonus, newItem.spd_bonus,
             newItem.crit_bonus, newItem.crit_dmg_bonus, newItem.agi_bonus, newItem.int_bonus, newItem.vamp_bonus, newItem.reflect_bonus]
        );

        await client.query('COMMIT');
        res.json({ success: true, item: { ...newItem, id: newItemId } });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

// Плавка: превращение предметов в ресурсы (можно от 1 до 5 предметов)
router.post('/smelt', async (req, res) => {
    const { tg_id, item_ids } = req.body;
    if (!Array.isArray(item_ids) || item_ids.length === 0 || item_ids.length > 5) {
        return res.status(400).json({ error: 'Need 1 to 5 items' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const user = await client.query('SELECT id, coins, diamonds FROM users WHERE tg_id = $1', [tg_id]);
        if (user.rows.length === 0) throw new Error('User not found');
        const userId = user.rows[0].id;
        let coinsGain = 0;
        let diamondsGain = 0;

        const items = await client.query(
            'SELECT * FROM inventory WHERE id = ANY($1::int[]) AND user_id = $2 AND equipped = false AND for_sale = false AND in_forge = true',
            [item_ids, userId]
        );
        if (items.rows.length === 0) throw new Error('Items not found');

        await client.query('DELETE FROM inventory WHERE id = ANY($1::int[])', [item_ids]);

        for (const item of items.rows) {
            switch (item.rarity) {
                case 'common':
                    coinsGain += Math.floor(Math.random() * 21) + 65; // 65–85
                    break;
                case 'uncommon':
                    coinsGain += Math.floor(Math.random() * 41) + 120; // 120–160
                    break;
                case 'rare':
                    coinsGain += Math.floor(Math.random() * 201) + 400; // 400–600
                    break;
                case 'epic':
                    coinsGain += Math.floor(Math.random() * 501) + 1000; // 1000–1500
                    if (Math.random() < 0.5) diamondsGain += 1;
                    break;
                case 'legendary':
                    coinsGain += Math.floor(Math.random() * 1001) + 2000; // 2000–3000
                    diamondsGain += 2 + Math.floor(Math.random() * 4); // 2–5
                    break;
            }
        }

        await client.query('UPDATE users SET coins = coins + $1, diamonds = diamonds + $2 WHERE id = $3',
            [coinsGain, diamondsGain, userId]);

        await client.query('COMMIT');
        res.json({ success: true, coins: coinsGain, diamonds: diamondsGain });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(400).json({ error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
