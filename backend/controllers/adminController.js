const Course = require('../models/Course');
const User = require('../models/User');
const Order = require('../models/Order');

exports.getDashboard = async (req, res, next) => {
  try {
    const [totalUsers, totalCourses, activeCourses, completedOrders] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Course.countDocuments({ isPublished: true, isApproved: true }),
      Order.find({ paymentStatus: 'completed' }).select('totalAmount')
    ]);

    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    res.status(200).json({
      success: true,
      data: { totalUsers, totalCourses, activeCourses, totalRevenue, completedOrders: completedOrders.length }
    });
  } catch (err) {
    next(err);
  }
};

exports.getCourses = async (req, res, next) => {
  try {
    const courses = await Course.find()
      .select('title category price pricePerLesson isPublished isApproved enrolledStudents')
      .populate('instructor', 'name')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    next(err);
  }
};
