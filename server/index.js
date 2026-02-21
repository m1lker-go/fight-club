const express = require('express');
const cors = require('cors');
const path = require('path'); // подключаем path для работы с путями
const { initDB } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Раздача статических файлов из папки client (находится уровнем выше)
app.use(express.static(path.join(__dirname, '../client')));

// Подключаем маршруты API
app.use('/auth', require('./routes/auth'));
app.use('/player', require('./routes/player'));
app.use('/inventory', require('./routes/inventory'));
app.use('/shop', require('./routes/shop'));
app.use('/market', require('./routes/market'));
app.use('/battle', require('./routes/battle'));
app.use('/tasks', require('./routes/tasks'));

const PORT = process.env.PORT || 3000;

initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
});
