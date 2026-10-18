const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../config/database');

// JWT bilan himoyalash
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.session && req.session.token) {
    token = req.session.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Kirish uchun tizimga kiring' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'eduplatform_super_secret_jwt_key_2024_uzbekistan');
    if (decoded.role === 'admin') {
      req.user = {
        _id: decoded.id || '000000000000000000000001',
        name: 'Administrator',
        email: 'admin@eduplatform.uz',
        role: 'admin',
        isActive: true,
        enrolledCourses: [],
        wishlist: [],
        purchasedLessons: []
      };
      return next();
    }

    if (require('mongoose').connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Baza ulanmagan' });
    }

    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }
    if (!req.user.isActive) {
      return res.status(401).json({ success: false, message: 'Hisobingiz faol emas' });
    }
    next();
  } catch (err) {
    logger.error('Auth middleware xatosi:', err.message);
    return res.status(401).json({ success: false, message: 'Token yaroqsiz' });
  }
};

// Rolga asoslangan ruxsat
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `${req.user.role} roli bu amalni bajarishga ruxsatsiz`
      });
    }
    next();
  };
};

// Kurs yoki darsga kirish huquqini tekshirish
exports.checkEnrollment = async (req, res, next) => {
  const courseId = req.params.courseId || req.params.id;
  const lessonId = req.params.lessonId || req.query.lessonId;
  const user = req.user;
  
  if (user.role === 'admin' || user.role === 'instructor') {
    return next();
  }

  const isEnrolled = user.enrolledCourses.some(
    e => e.course.toString() === courseId
  );
  
  if (isEnrolled) {
    return next();
  }

  // Bitta dars sotib olinganmi?
  if (lessonId && user.purchasedLessons && user.purchasedLessons.some(
    pl => pl.course.toString() === courseId && pl.lessonId.toString() === lessonId.toString()
  )) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Bu dars yoki kursga kirish uchun xarid qilishingiz kerak.'
  });
};

// Opsional auth (login qilmagan ham ko'rishi mumkin)
exports.optionalAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id);
    } catch (err) {
      req.user = null;
    }
  }
  next();
};
