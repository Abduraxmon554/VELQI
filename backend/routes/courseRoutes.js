const express = require('express');
const router = express.Router();
const {
  getCourses, getCourse, createCourse, updateCourse,
  deleteCourse, addReview, getFeaturedCourses, getStats
} = require('../controllers/courseController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');

router.get('/featured', getFeaturedCourses);
router.get('/stats', getStats);
router.get('/', apiLimiter, optionalAuth, getCourses);
router.get('/:id', optionalAuth, getCourse);
router.post('/', protect, authorize('instructor', 'admin'), createCourse);
router.put('/:id', protect, authorize('instructor', 'admin'), updateCourse);
router.delete('/:id', protect, authorize('instructor', 'admin'), deleteCourse);
router.post('/:id/reviews', protect, addReview);

module.exports = router;
