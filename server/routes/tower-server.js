const express = require('express');
const router = express.Router();

console.log('✅ tower-server.js loaded');

router.get('/status', (req, res) => {
    res.json({ test: 'ok' });
});

module.exports = router;
