const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/admin/login');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || 'eduplatform_super_secret_jwt_key_2024_uzbekistan');
  } catch (err) {
    return res.redirect('/admin/login');
  }

  if (decoded.role === 'admin') {
    req.admin = {
      _id: decoded.id || '000000000000000000000001',
      name: 'Administrator',
      email: 'admin@eduplatform.uz',
      role: 'admin',
      isActive: true
    };
    return next();
  }

  return res.redirect('/admin/login?error=Ruxsat%20berilmadi');
};
