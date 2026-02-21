const express = require('express');
const cors = require('cors');
const { initDB } = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Подключаем маршруты
app.use('/auth', require('./routes/auth'));
app.use('/player', require('./routes/player'));
app.use('/inventory', require('./routes/inventory'));
app.use('/shop', require('./routes/shop'));
app.use('/market', require('./routes/market'));
app.use('/battle', require('./routes/battle'));
app.use('/tasks', require('./routes/tasks'));

const PORT = process.env.PORT || 3000;

initDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});