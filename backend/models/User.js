const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Ism kiritish majburiy'],
    trim: true,
    maxlength: [50, 'Ism 50 belgidan oshmasin']
  },
  email: {
    type: String,
    required: [true, 'Email kiritish majburiy'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email noto\'g\'ri']
  },
  password: {
    type: String,
    minlength: [6, 'Parol kamida 6 ta belgi bo\'lishi kerak'],
    select: false
  },
  role: {
    type: String,
    enum: ['student', 'instructor', 'admin'],
    default: 'student'
  },
  avatar: {
    type: String,
    default: '/images/default-avatar.svg'
  },
  googleId: String,
  phone: {
    type: String,
    match: [/^(\+998|998|0)?[0-9]{9}$/, 'Telefon raqam noto\'g\'ri']
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio 500 belgidan oshmasin']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  verificationToken: String,
  verificationExpire: Date,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  enrolledCourses: [{
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    },
    certificate: String
  }],
  wishlist: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Course'
  }],
  purchases: [{
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course'
    },
    amount: Number,
    paymentId: String,
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  purchasedLessons: [{
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course'
    },
    lessonId: {
      type: String
    },
    lessonTitle: String,
    amount: {
      type: Number,
      default: 70000
    },
    paymentId: String,
    purchasedAt: {
      type: Date,
      default: Date.now
    }
  }],
  stripeCustomerId: String,
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Parolni hash qilish
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// JWT token yaratish
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Parolni tekshirish
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Reset password token
userSchema.methods.getResetPasswordToken = function() {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

// Email verification token
userSchema.methods.getVerificationToken = function() {
  const verifyToken = crypto.randomBytes(20).toString('hex');
  this.verificationToken = crypto.createHash('sha256').update(verifyToken).digest('hex');
  this.verificationExpire = Date.now() + 24 * 60 * 60 * 1000;
  return verifyToken;
};

// Account lock tekshirish
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

const User = mongoose.model('User', userSchema);
module.exports = User;
