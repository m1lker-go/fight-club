const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
require('dotenv').config();

console.log('Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('BOT_USERNAME:', process.env.BOT_USERNAME);

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client')));

app.use('/auth', require('./routes/auth'));
app.use('/player', require('./routes/player'));
app.use('/inventory', require('./routes/inventory'));
app.use('/shop', require('./routes/shop'));
//app.use('/market', require('./routes/market'));
//app.use('/battle', require('./routes/battle'));
//app.use('/tasks', require('./routes/tasks'));
app.use('/avatars', require('./routes/avatars'));

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
