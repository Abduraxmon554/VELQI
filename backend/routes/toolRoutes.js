const express = require('express');
const rateLimit = require('express-rate-limit');
const { run, languages, translate } = require('../controllers/toolController');

const router = express.Router();

const runLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Juda tez-tez ishga tushiryapsiz. Bir daqiqa kuting.' }
});
const translateLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Juda ko\'p tarjima so\'rovi. Bir daqiqa kuting.' }
});

router.get('/languages', languages);
router.post('/run', runLimiter, run);
router.post('/translate', translateLimiter, translate);

module.exports = router;
