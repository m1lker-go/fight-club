const express = require('express');
const cors = require('cors');
const { pool, initDB } = require('./db');
const { updatePlayerPower } = require('./utils/power');
require('dotenv').config();

console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('BOT_USERNAME:', process.env.BOT_USERNAME);

const app = express();

// Настройка CORS
const allowedOrigins = [
    'https://cat-fight.ru',
    'https://fight-club-ecru.vercel.app',
    'https://fight-club-api-4och.onrender.com'
];
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

// API routes
app.use('/auth', require('./routes/auth-ext'));
app.use('/player', require('./routes/player'));
app.use('/inventory', require('./routes/inventory'));
app.use('/shop', require('./routes/shop'));
app.use('/market', require('./routes/market'));
app.use('/battle', require('./routes/battle'));
app.use('/tasks', require('./routes/tasks'));
app.use('/avatars', require('./routes/avatars'));
app.use('/forge', require('./routes/forge-server'));
app.use('/tower', require('./routes/tower-server'));
app.use('/rank', require('./routes/rank'));

// Заглушка для VK callback (на случай, если VK решит сделать редирект)
app.post('/auth/vk/callback', (req, res) => {
    console.log('Received VK callback (unexpected, because low-code uses callback mode)');
    res.status(400).json({ error: 'This endpoint is not used. Please use low-code flow.' });
});

// Webhook для Telegram
app.post('/webhook', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    let text = message.text || '';

    let referralCode = null;
    if (text.startsWith('/start')) {
        const parts = text.split(' ');
        if (parts.length > 1) {
            referralCode = parts[1];
        }
    }

    let webAppUrl = 'https://fight-club-ecru.vercel.app';
    if (referralCode) {
        webAppUrl += `?startapp=${referralCode}`;
    }

    const inlineKeyboard = {
        inline_keyboard: [[
            {
                text: '⚔️ Начать игру',
                web_app: { url: webAppUrl }
            }
        ]]
    };

    const welcomeMessage = `
😺 **МЯУ! Добро пожаловать в Кошачий Файтинг!**  

Ты попал в мир, где отважные коты сражаются за звание чемпиона. Здесь ты сможешь:

⚔️ **Выбрать класс** – Воин, Ассасин или Маг, каждый с уникальными способностями.  
🛡️ **Снаряжать героя** – находи и надевай крутую экипировку.  
🏆 **Сражаться с другими игроками** – поднимайся в рейтинге и становись легендой.  
🔨 **Улучшать предметы в кузнице** – превращай обычные вещи в легендарные.  
🎁 **Открывать сундуки** – получай редкие сокровища и бонусы.

Готов начать? Жми кнопку ниже и покажи всем, на что способен твой кот! 😼
    `;

    try {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: welcomeMessage,
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboard
            })
        });
    } catch (error) {
        console.error('Failed to send welcome message:', error);
    }

    res.sendStatus(200);
});

// Временный маршрут для обновления старых предметов
app.get('/admin/update-items', async (req, res) => {
    const client = await pool.connect();
    try {
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

        const fields = [
            'atk_bonus', 'def_bonus', 'hp_bonus', 'spd_bonus',
            'crit_bonus', 'crit_dmg_bonus', 'agi_bonus', 'int_bonus',
            'vamp_bonus', 'reflect_bonus'
        ];
        const fieldToStat = {
            atk_bonus: 'atk',
            def_bonus: 'def',
            hp_bonus: 'hp',
            spd_bonus: 'spd',
            crit_bonus: 'crit',
            crit_dmg_bonus: 'crit_dmg',
            agi_bonus: 'agi',
            int_bonus: 'int',
            vamp_bonus: 'vamp',
            reflect_bonus: 'reflect'
        };

        const items = await client.query('SELECT * FROM items');
        let itemsUpdated = 0;
        for (const item of items.rows) {
            const rarity = item.rarity;
            if (!fixedBonuses[rarity]) continue;

            const activeFields = fields.filter(f => item[f] > 0);
            if (activeFields.length === 0) continue;

            const zeroQuery = `UPDATE items SET ${fields.map(f => `${f} = 0`).join(', ')} WHERE id = $1`;
            await client.query(zeroQuery, [item.id]);

            for (const field of activeFields) {
                const stat = fieldToStat[field];
                const bonus = fixedBonuses[rarity][stat];
                await client.query(
                    `UPDATE items SET ${field} = ${field} + $1 WHERE id = $2`,
                    [bonus, item.id]
                );
            }
            itemsUpdated++;
        }

        const invItems = await client.query('SELECT * FROM inventory');
        let invUpdated = 0;
        for (const inv of invItems.rows) {
            const rarity = inv.rarity;
            if (!fixedBonuses[rarity]) continue;

            const activeFields = fields.filter(f => inv[f] > 0);
            if (activeFields.length === 0) continue;

            const zeroQuery = `UPDATE inventory SET ${fields.map(f => `${f} = 0`).join(', ')} WHERE id = $1`;
            await client.query(zeroQuery, [inv.id]);

            for (const field of activeFields) {
                const stat = fieldToStat[field];
                const bonus = fixedBonuses[rarity][stat];
                await client.query(
                    `UPDATE inventory SET ${field} = ${field} + $1 WHERE id = $2`,
                    [bonus, inv.id]
                );
            }
            invUpdated++;
        }

        res.send(`Обновлено предметов: ${itemsUpdated} в items, ${invUpdated} в inventory`);
    } catch (e) {
        console.error(e);
        res.status(500).send('Ошибка: ' + e.message);
    } finally {
        client.release();
    }
});

// Временный маршрут для пересчёта силы всех пользователей
app.get('/admin/recalc-power', async (req, res) => {
    const client = await pool.connect();
    try {
        const users = await client.query('SELECT id FROM users');
        let count = 0;
        for (const user of users.rows) {
            const classes = await client.query('SELECT class FROM user_classes WHERE user_id = $1', [user.id]);
            for (const cls of classes.rows) {
                await updatePlayerPower(client, user.id, cls.class);
                count++;
            }
        }
        res.send(`Сила пересчитана для ${count} записей`);
    } catch (e) {
        console.error(e);
        res.status(500).send('Ошибка: ' + e.message);
    } finally {
        client.release();
    }
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

initDB().then(() => {
    console.log('Database initialized');
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});
