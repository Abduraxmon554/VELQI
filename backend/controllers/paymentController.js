const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;
const Order = require('../models/Order');
const Course = require('../models/Course');
const User = require('../models/User');
const { logger } = require('../config/database');

// @desc    To'lov intent yaratish
// @route   POST /api/payment/create-intent
// @access  Private
exports.createPaymentIntent = async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ success: false, message: 'Stripe to\'lov xizmati sozlanmagan' });
    }

    const { courseIds } = req.body;
    
    const courses = await Course.find({ _id: { $in: courseIds } });
    if (!courses.length) {
      return res.status(404).json({ success: false, message: 'Kurslar topilmadi' });
    }
    
    const totalAmount = courses.reduce((acc, course) => {
      const price = course.currentPrice;
      return acc + price;
    }, 0);
    
    // Stripe payment intent (UZS so'mda, Stripe uchun tiyin)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // so'mni tiyin/cent ga o'tkazish
      currency: 'usd', // Stripe UZS ni qo'llamaydi
      metadata: {
        userId: req.user.id,
        courseIds: courseIds.join(',')
      }
    });
    
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      courses: courses.map(c => ({ id: c._id, title: c.title, price: c.currentPrice }))
    });
  } catch (err) {
    next(err);
  }
};

// @desc    To'lovni tasdiqlash
// @route   POST /api/payment/confirm
// @access  Private
exports.confirmPayment = async (req, res, next) => {
  try {
    if (!stripe) {
      return res.status(503).json({ success: false, message: 'Stripe to\'lov xizmati sozlanmagan' });
    }

    const { paymentIntentId, courseIds } = req.body;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: 'To\'lov tasdiqlanmagan' });
    }
    
    const courses = await Course.find({ _id: { $in: courseIds } });
    const totalAmount = courses.reduce((acc, c) => acc + c.currentPrice, 0);
    
    const order = await Order.create({
      user: req.user.id,
      courses: courses.map(c => ({ course: c._id, price: c.currentPrice, title: c.title })),
      totalAmount,
      paymentMethod: 'stripe',
      paymentStatus: 'completed',
      stripePaymentIntentId: paymentIntentId,
      status: 'completed'
    });
    
    // Foydalanuvchiga kurslarni qo'shish
    const user = await User.findById(req.user.id);
    for (const course of courses) {
      const alreadyEnrolled = user.enrolledCourses.some(
        e => e.course.toString() === course._id.toString()
      );
      if (!alreadyEnrolled) {
        user.enrolledCourses.push({ course: course._id });
        user.purchases.push({
          course: course._id,
          amount: course.currentPrice,
          paymentId: paymentIntentId
        });
        course.enrolledStudents += 1;
        await course.save();
      }
    }
    await user.save();
    
    logger.info(`To'lov muvaffaqiyatli: User ${req.user.id}, Amount ${totalAmount}`);
    
    res.status(200).json({
      success: true,
      message: 'To\'lov muvaffaqiyatli! Kurslarga yozildingiz.',
      order
    });
  } catch (err) {
    next(err);
  }
};

// @desc    To'lov tarixi
// @route   GET /api/payment/history
// @access  Private
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('courses.course', 'title thumbnail')
      .sort({ createdAt: -1 });
    
    res.status(200).json({ success: true, data: orders });
  } catch (err) {
    next(err);
  }
};

// @desc    Kurs bepul olish (bepul kurslar uchun)
// @route   POST /api/payment/enroll-free
// @access  Private
exports.enrollFree = async (req, res, next) => {
  try {
    const course = await Course.findById(req.body.courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    if (!course.isFree) return res.status(400).json({ success: false, message: 'Bu kurs bepul emas' });
    
    const user = await User.findById(req.user.id);
    const alreadyEnrolled = user.enrolledCourses.some(
      e => e.course.toString() === course._id.toString()
    );
    
    if (alreadyEnrolled) {
      return res.status(200).json({ success: true, message: 'Siz bu kursga allaqachon yozilgansiz' });
    }
    
    user.enrolledCourses.push({ course: course._id });
    await user.save();
    course.enrolledStudents += 1;
    await course.save();
    
    res.status(200).json({ success: true, message: 'Bepul kursga muvaffaqiyatli yozildingiz!' });
  } catch (err) {
    next(err);
  }
};

// @desc    Admin uchun barcha buyurtmalar
// @route   GET /api/payment/all-orders
// @access  Private (admin)
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate('courses.course', 'title')
      .sort({ createdAt: -1 });
    
    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'completed')
      .reduce((acc, o) => acc + o.totalAmount, 0);
    
    res.status(200).json({ success: true, data: orders, totalRevenue });
  } catch (err) {
    next(err);
  }
};

// @desc    Bitta darsni soatbay tarif asosida sotib olish
// @route   POST /api/payment/buy-lesson
// @access  Private
exports.buyLesson = async (req, res, next) => {
  try {
    logger.warn(`Dars xaridi to'lov provayderi ulanmagani uchun rad etildi: User ${req.user.id}`);
    return res.status(503).json({
      success: false,
      message: 'Pullik dars xaridi hozircha mavjud emas: to‘lov provayderi sozlanmagan.'
    });
  } catch (err) {
    next(err);
  }
};
