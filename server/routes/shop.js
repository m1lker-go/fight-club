const express = require('express');
const router = express.Router();

router.get('/test', (req, res) => {
    res.json({ message: 'shop works' });
});

module.exports = router;
