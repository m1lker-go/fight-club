const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
require('dotenv').config();

console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('BOT_USERNAME:', process.env.BOT_USERNAME);

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use('/auth', require('./routes/auth'));
app.use('/player', require('./routes/player'));
app.use('/inventory', require('./routes/inventory'));
app.use('/shop', require('./routes/shop'));
app.use('/market', require('./routes/market'));
app.use('/battle', require('./routes/battle'));
app.use('/tasks', require('./routes/tasks'));
app.use('/avatars', require('./routes/avatars'));
app.use('/rank', require('./routes/rank'));
app.use('/forge', require('./routes/forge-server')); // переименованный файл кузницы

const { updatePlayerPower } = require('./utils/power');

app.get('/admin/recalc-power', async (req, res) => {
    const client = await pool.connect();
    try {
        const users = await client.query('SELECT id FROM users');
        for (const user of users.rows) {
            const classes = await client.query('SELECT class FROM user_classes WHERE user_id = $1', [user.id]);
            for (const cls of classes.rows) {
                await updatePlayerPower(client, user.id, cls.class);
            }
        }
        res.send('Сила пересчитана для всех пользователей');
    } catch (e) {
        console.error(e);
        res.status(500).send('Ошибка');
    } finally {
        client.release();
    }
});

// Webhook для Telegram (обработка команд)
app.post('/webhook', async (req, res) => {
    const { message } = req.body;
    if (!message) return res.sendStatus(200);

    const chatId = message.chat.id;
    const text = message.text;

    if (text === '/start') {
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

        const inlineKeyboard = {
            inline_keyboard: [[
                {
                    text: '⚔️ Начать игру',
                    web_app: {
                        url: 'https://fight-club-ecru.vercel.app' // Ваш Vercel URL
                    }
                }
            ]]
        };

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
    }

    res.sendStatus(200);
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
