const express = require('express');
const router = express.Router();
const {
  register, login, logout, getMe,
  updatePassword, forgotPassword, resetPassword, verifyEmail
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/security');
const { body } = require('express-validator');
const passport = require('../config/passport');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Ism kiritish majburiy').isLength({ max: 50 }),
  body('email').isEmail().withMessage('Email noto\'g\'ri').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Parol kamida 6 ta belgi bo\'lishi kerak')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.get('/logout', logout);
router.get('/me', protect, getMe);
router.put('/update-password', protect, updatePassword);
router.post('/forgot-password', authLimiter, forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    const token = req.user.getSignedJwtToken();
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.redirect('/dashboard');
  }
);

module.exports = router;
