const express = require('express');
const cors = require('cors');
const { pool, initDB } = require('./db');
const { updatePlayerPower } = require('./utils/power');
const { sendTelegramNotification } = require('./utils/telegram');
require('dotenv').config();

console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('BOT_USERNAME:', process.env.BOT_USERNAME);

const app = express();

// Временное упрощение CORS – разрешить все источники
app.use(cors({
    origin: '*',
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

// Заглушка для VK callback (на случай редиректа)
app.post('/auth/vk/callback', (req, res) => {
    console.log('Received VK callback (unexpected, low-code uses callback mode)');
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

    // Исправлено: теперь используется правильный домен, а не vercel
    let webAppUrl = 'https://cat-fight.ru';
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

// ==================== ФУНКЦИЯ ПЕРЕПОДКЛЮЧЕНИЯ СЛУШАТЕЛЯ ====================
let currentListener = null;
let reconnectTimeout = null;

async function setupListener() {
    if (currentListener) {
        try {
            await currentListener.end();
        } catch (e) {}
        currentListener = null;
    }
    if (reconnectTimeout) clearTimeout(reconnectTimeout);

    try {
        const { Pool } = require('pg');
        const dedicatedPool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
        const dbClient = await dedicatedPool.connect();
        await dbClient.query('LISTEN message_inserted');
        console.log('✅ Успешно подписались на канал message_inserted');
        
        dbClient.on('notification', async (msg) => {
            console.log('📩 Получено уведомление от БД:', msg.payload);
            try {
                const payload = JSON.parse(msg.payload);
                const { user_id, subject, body, reward_type, reward_amount } = payload;
                const userRes = await pool.query('SELECT telegram_chat_id FROM users WHERE id = $1', [user_id]);
                const chatId = userRes.rows[0]?.telegram_chat_id;
                if (chatId) {
                    let rewardText = '';
                    if (reward_type && reward_amount) {
                        if (reward_type === 'coins') rewardText = `${reward_amount} монет`;
                        else if (reward_type === 'diamonds') rewardText = `${reward_amount} алмазов`;
                        else if (reward_type === 'exp') rewardText = `${reward_amount} опыта`;
                        else rewardText = `${reward_amount} ${reward_type}`;
                    }
                    await sendTelegramNotification(chatId, subject, body, rewardText);
                    console.log(`✅ Уведомление отправлено в Telegram для chatId ${chatId}`);
                } else {
                    console.log(`⚠️ Нет telegram_chat_id для user_id ${user_id}`);
                }
            } catch (err) {
                console.error('Ошибка при обработке уведомления:', err);
            }
        });
        dbClient.on('error', (err) => {
            console.error('❌ Ошибка соединения слушателя:', err.message);
            setTimeout(setupListener, 5000);
        });
        currentListener = dbClient;
        console.log('✅ Слушатель уведомлений PostgreSQL запущен');
    } catch (err) {
        console.error('❌ Ошибка при создании слушателя:', err.message);
        reconnectTimeout = setTimeout(setupListener, 10000);
    }
}

// ==================== ЗАПУСК СЕРВЕРА И НАСТРОЙКА УВЕДОМЛЕНИЙ ====================
async function startServer() {
    try {
        await initDB();

        await pool.query(`
            CREATE OR REPLACE FUNCTION notify_message_inserted()
            RETURNS TRIGGER AS $$
            BEGIN
                PERFORM pg_notify('message_inserted', 
                    json_build_object(
                        'user_id', NEW.user_id,
                        'subject', NEW.subject,
                        'body', NEW.body,
                        'reward_type', NEW.reward_type,
                        'reward_amount', NEW.reward_amount
                    )::text
                );
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

        await pool.query(`
            DROP TRIGGER IF EXISTS message_inserted_trigger ON user_messages;
            CREATE TRIGGER message_inserted_trigger
            AFTER INSERT ON user_messages
            FOR EACH ROW
            EXECUTE FUNCTION notify_message_inserted();
        `);
        console.log('✅ Триггер и функция для уведомлений созданы');

        await setupListener();

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error('❌ Ошибка при запуске сервера:', err);
        process.exit(1);
    }
}

startServer();
