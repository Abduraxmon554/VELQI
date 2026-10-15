const Course = require('../models/Course');
const User = require('../models/User');
const { logger } = require('../config/database');

// @desc    Barcha kurslar
// @route   GET /api/courses
// @access  Public
exports.getCourses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    let query = { isPublished: true, isApproved: true };

    // Kategoriya filtri
    if (req.query.category) query.category = req.query.category;
    if (req.query.level) query.level = req.query.level;
    if (req.query.language) query.language = req.query.language;
    if (req.query.free === 'true') query.isFree = true;

    // Narx filtri
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = parseInt(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = parseInt(req.query.maxPrice);
    }

    // Qidiruv
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { tags: { $in: [new RegExp(req.query.search, 'i')] } }
      ];
    }

    // Sort
    let sort = {};
    if (req.query.sort === 'newest') sort = { createdAt: -1 };
    else if (req.query.sort === 'oldest') sort = { createdAt: 1 };
    else if (req.query.sort === 'price-low') sort = { price: 1 };
    else if (req.query.sort === 'price-high') sort = { price: -1 };
    else if (req.query.sort === 'rating') sort = { rating: -1 };
    else if (req.query.sort === 'popular') sort = { enrolledStudents: -1 };
    else sort = { createdAt: -1 };

    const total = await Course.countDocuments(query);
    const courses = await Course.find(query)
      .populate('instructor', 'name avatar bio')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-sections');

    res.status(200).json({
      success: true,
      count: courses.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: courses
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Bitta kurs
// @route   GET /api/courses/:id
// @access  Public
exports.getCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const lookup = /^[a-f\d]{24}$/i.test(courseId)
      ? { _id: courseId }
      : { slug: courseId };

    const course = await Course.findOne(lookup)
      .populate('instructor', 'name avatar bio enrolledStudents')
      .populate('reviews.user', 'name avatar');

    if (!course) {
      return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    }

    // Foydalanuvchi yozilganmi tekshirish
    let isEnrolled = false;
    let userPurchasedLessonIds = [];
    if (req.user) {
      isEnrolled = req.user.enrolledCourses.some(
        e => e.course.toString() === course._id.toString()
      );
      if (req.user.purchasedLessons) {
        userPurchasedLessonIds = req.user.purchasedLessons
          .filter(pl => pl.course.toString() === course._id.toString())
          .map(pl => pl.lessonId.toString());
      }
    }

    // Agar to'liq kursga yozilmagan bo'lsa, faqat bepul yoki alohida sotib olingan darslarni ko'rsatish
    let courseData = course.toObject();
    if (!isEnrolled && req.user?.role !== 'admin' && req.user?.role !== 'instructor') {
      courseData.sections = courseData.sections?.map(section => ({
        ...section,
        lessons: section.lessons?.map(lesson => {
          const isPurchased = userPurchasedLessonIds.includes(lesson._id.toString());
          const hasAccess = lesson.isPreview || isPurchased;
          return {
            ...lesson,
            videoUrl: hasAccess ? lesson.videoUrl : null,
            content: hasAccess ? lesson.content : null,
            isPurchased: isPurchased
          };
        })
      }));
    }

    res.status(200).json({
      success: true,
      data: courseData,
      isEnrolled,
      purchasedLessonIds: userPurchasedLessonIds
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Kurs yaratish
// @route   POST /api/courses
// @access  Private (instructor, admin)
exports.createCourse = async (req, res, next) => {
  try {
    req.body.instructor = req.user.id;
    const course = await Course.create(req.body);
    logger.info(`Yangi kurs yaratildi: ${course.title}`);
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

// @desc    Kursni yangilash
// @route   PUT /api/courses/:id
// @access  Private
exports.updateCourse = async (req, res, next) => {
  try {
    let course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
    }
    
    course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
};

// @desc    Kursni o'chirish
// @route   DELETE /api/courses/:id
// @access  Private
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    
    if (course.instructor.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
    }
    
    await course.deleteOne();
    res.status(200).json({ success: true, message: 'Kurs o\'chirildi' });
  } catch (err) {
    next(err);
  }
};

// @desc    Kursga baho berish
// @route   POST /api/courses/:id/reviews
// @access  Private
exports.addReview = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });
    
    const alreadyReviewed = course.reviews.find(
      r => r.user.toString() === req.user.id
    );
    if (alreadyReviewed) {
      return res.status(400).json({ success: false, message: 'Allaqachon baho bergansiz' });
    }
    
    course.reviews.push({
      user: req.user.id,
      rating: req.body.rating,
      comment: req.body.comment
    });
    
    course.numReviews = course.reviews.length;
    course.rating = course.reviews.reduce((acc, r) => acc + r.rating, 0) / course.reviews.length;
    
    await course.save();
    res.status(201).json({ success: true, message: 'Bahoingiz qo\'shildi' });
  } catch (err) {
    next(err);
  }
};

// @desc    Featured kurslar
// @route   GET /api/courses/featured
// @access  Public
exports.getFeaturedCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({ isFeatured: true, isPublished: true })
      .populate('instructor', 'name avatar')
      .limit(8)
      .select('-sections');
    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
};

// @desc    Statistika
// @route   GET /api/courses/stats
// @access  Public
exports.getStats = async (req, res, next) => {
  try {
    const stats = await Course.aggregate([
      { $match: { isPublished: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgRating: { $avg: '$rating' },
          totalStudents: { $sum: '$enrolledStudents' }
        }
      }
    ]);
    
    const totalCourses = await Course.countDocuments({ isPublished: true });
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalInstructors = await User.countDocuments({ role: 'instructor' });
    
    res.status(200).json({
      success: true,
      data: { stats, totalCourses, totalStudents, totalInstructors }
    });
  } catch (err) {
    next(err);
  }
};
