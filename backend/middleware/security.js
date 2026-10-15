const rateLimit = require('express-rate-limit');
const { logger } = require('../config/database');

// Umumiy rate limit
exports.generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 100,
  skip: req => [
    '/api/payment/click/callback',
    '/api/payment/payme/callback'
  ].includes(req.originalUrl.split('?')[0]),
  message: {
    success: false,
    message: 'Juda ko\'p so\'rov. 15 daqiqadan keyin qayta urinib ko\'ring.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit oshdi: ${req.ip} - ${req.originalUrl}`);
    res.status(429).json(options.message);
  }
});

// Auth uchun qattiq limit
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Juda ko\'p kirish urinishlari. 15 daqiqadan keyin qayta urinib ko\'ring.'
  },
  skipSuccessfulRequests: true
});

// API uchun limit
exports.apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: {
    success: false,
    message: 'API chekloviga yetdingiz. Bir daqiqadan keyin qayta urinib ko\'ring.'
  }
});

// Xatoliklarni boshqarish middleware
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  logger.error(`Xato: ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });

  // Mongoose validation xatosi
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = { statusCode: 400, message: message.join(', ') };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    error = { statusCode: 400, message: `Bu ${field} allaqachon mavjud` };
  }

  // JWT xatosi
  if (err.name === 'JsonWebTokenError') {
    error = { statusCode: 401, message: 'Token yaroqsiz' };
  }

  if (err.name === 'TokenExpiredError') {
    error = { statusCode: 401, message: 'Token muddati tugagan' };
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server xatosi yuz berdi',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
exports.notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `${req.originalUrl} manzili topilmadi`
  });
};

// Xavfsizlik headerlarini qo'shish
exports.securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};
