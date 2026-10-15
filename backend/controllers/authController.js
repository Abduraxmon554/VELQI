const User = require('../models/User');
const { logger } = require('../config/database');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Token yuborish yordamchi funksiya
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  
  const options = {
    expires: new Date(Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res.status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        isVerified: user.isVerified
      }
    });
};

// @desc    Ro'yxatdan o'tish
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Bu email allaqachon ro\'yxatdan o\'tgan' });
    }

    const user = await User.create({ name, email, password, phone });
    
    // Verification email
    const verifyToken = user.getVerificationToken();
    await user.save({ validateBeforeSave: false });
    
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verifyToken}`;
    
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: 'VELQI - Email tasdiqlash',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">🎓 VELQI</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Salom, ${user.name}!</h2>
              <p>VELQI-ga xush kelibsiz! Emailingizni tasdiqlash uchun quyidagi tugmani bosing:</p>
              <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; margin: 20px 0; font-weight: bold;">
                Emailni Tasdiqlash
              </a>
              <p style="color: #666; font-size: 14px;">Ushbu havola 24 soat davomida amal qiladi.</p>
            </div>
          </div>
        `
      });
    } catch (emailErr) {
      logger.error('Email yuborishda xato:', emailErr.message);
    }

    logger.info(`Yangi foydalanuvchi: ${email}`);
    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Tizimga kirish
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email va parol kiritish majburiy' });
    }

    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri' });
    }

    if (user.isLocked) {
      return res.status(423).json({ success: false, message: 'Hisobingiz vaqtincha bloklangan' });
    }

    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + 30 * 60 * 1000;
      }
      await user.save({ validateBeforeSave: false });
      return res.status(401).json({ success: false, message: 'Email yoki parol noto\'g\'ri' });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    logger.info(`Foydalanuvchi kirdi: ${email}`);
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Tizimdan chiqish
// @route   GET /api/auth/logout
// @access  Private
exports.logout = (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ success: true, message: 'Tizimdan chiqdingiz' });
};

// @desc    Joriy foydalanuvchi
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  const user = await User.findById(req.user.id).populate('enrolledCourses.course wishlist');
  res.status(200).json({ success: true, data: user });
};

// @desc    Parolni yangilash
// @route   PUT /api/auth/update-password
// @access  Private
exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('+password');
    
    if (!(await user.matchPassword(req.body.currentPassword))) {
      return res.status(401).json({ success: false, message: 'Joriy parol noto\'g\'ri' });
    }
    
    user.password = req.body.newPassword;
    await user.save();
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Parolni tiklash so'rovi
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Bu email bilan foydalanuvchi topilmadi' });
    }
    
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: 'VELQI - Parolni tiklash',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎓 VELQI</h1>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2>Parolni tiklash</h2>
            <p>Parolni tiklash uchun quyidagi tugmani bosing:</p>
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border-radius: 25px; text-decoration: none; margin: 20px 0; font-weight: bold;">
              Parolni Tiklash
            </a>
            <p style="color: #666; font-size: 14px;">Ushbu havola 10 daqiqa davomida amal qiladi. Agar siz so'rov yubormagan bo'lsangiz, bu emailni e'tiborsiz qoldiring.</p>
          </div>
        </div>
      `
    });
    
    res.status(200).json({ success: true, message: 'Parolni tiklash linki emailingizga yuborildi' });
  } catch (err) {
    next(err);
  }
};

// @desc    Parolni tiklash
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Token yaroqsiz yoki muddati tugagan' });
    }
    
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
};

// @desc    Email tasdiqlash
// @route   GET /api/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res, next) => {
  try {
    const verificationToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    
    const user = await User.findOne({
      verificationToken,
      verificationExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Token yaroqsiz yoki muddati tugagan' });
    }
    
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpire = undefined;
    await user.save();
    
    res.status(200).json({ success: true, message: 'Email muvaffaqiyatli tasdiqlandi' });
  } catch (err) {
    next(err);
  }
};
