const User = require('../models/User');
const Course = require('../models/Course');
const { logger } = require('../config/database');
const multer = require('multer');
const path = require('path');

// Rasm yuklash konfiguratsiyasi
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/avatars'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.user.id}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Faqat rasm fayllari qabul qilinadi'), false);
    }
  }
});

exports.uploadAvatar = upload.single('avatar');

// @desc    Profilni yangilash
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, bio } = req.body;
    const updateData = { name, phone, bio };
    
    if (req.file) {
      updateData.avatar = `/uploads/avatars/${req.file.filename}`;
    }
    
    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// @desc    Kurs progressini yangilash
// @route   PUT /api/users/progress/:courseId
// @access  Private
exports.updateProgress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const courseEnrollment = user.enrolledCourses.find(
      e => e.course.toString() === req.params.courseId
    );
    
    if (!courseEnrollment) {
      return res.status(404).json({ success: false, message: 'Kursga yozilmagan' });
    }
    
    courseEnrollment.progress = req.body.progress;
    if (req.body.progress >= 100) {
      courseEnrollment.completed = true;
      courseEnrollment.certificate = `CERT-${req.user.id}-${req.params.courseId}`;
    }
    
    await user.save();
    res.status(200).json({ success: true, data: courseEnrollment });
  } catch (err) {
    next(err);
  }
};

// @desc    Wishlist ga qo'shish/olib tashlash
// @route   PUT /api/users/wishlist/:courseId
// @access  Private
exports.toggleWishlist = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const courseId = req.params.courseId;
    
    const idx = user.wishlist.indexOf(courseId);
    let message;
    if (idx === -1) {
      user.wishlist.push(courseId);
      message = 'Wish listga qo\'shildi';
    } else {
      user.wishlist.splice(idx, 1);
      message = 'Wish listdan olib tashlandi';
    }
    
    await user.save();
    res.status(200).json({ success: true, message, wishlist: user.wishlist });
  } catch (err) {
    next(err);
  }
};

// @desc    Barcha foydalanuvchilar (Admin)
// @route   GET /api/users
// @access  Private (admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments();
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Foydalanuvchini faol/nofaol qilish (Admin)
// @route   PUT /api/users/:id/toggle-status
// @access  Private (admin)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'O‘z hisobingizni bloklay olmaysiz' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    
    user.isActive = !user.isActive;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: `Foydalanuvchi ${user.isActive ? 'faollashtirildi' : 'nofaollashtirildi'}`,
      data: user
    });
  } catch (err) {
    next(err);
  }
};

// @desc    O'quvchi dashboard ma'lumotlari
// @route   GET /api/users/dashboard
// @access  Private
exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate({
        path: 'enrolledCourses.course',
        select: 'title thumbnail category instructor totalLessons rating',
        populate: { path: 'instructor', select: 'name' }
      })
      .populate('wishlist', 'title thumbnail price currentPrice rating instructor')
      .populate('purchases.course', 'title thumbnail');
    
    const completedCourses = user.enrolledCourses.filter(e => e.completed).length;
    const inProgressCourses = user.enrolledCourses.filter(e => !e.completed && e.progress > 0).length;
    
    res.status(200).json({
      success: true,
      data: {
        user,
        stats: {
          totalEnrolled: user.enrolledCourses.length,
          completed: completedCourses,
          inProgress: inProgressCourses,
          wishlistCount: user.wishlist.length,
          certificates: user.enrolledCourses.filter(e => e.certificate).length
        }
      }
    });
  } catch (err) {
    next(err);
  }
};
