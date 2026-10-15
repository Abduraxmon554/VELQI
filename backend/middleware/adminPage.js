const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/admin/login');

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.redirect('/admin/login');
  }

  try {
    const user = await User.findById(decoded.id).select('role isActive');
    if (!user || !user.isActive || user.role !== 'admin') {
      return res.redirect('/admin/login?error=Ruxsat%20berilmadi');
    }
    req.admin = user;
    next();
  } catch (err) {
    next(err);
  }
};
