const express = require('express');
const { getDashboard, getCourses } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(protect, authorize('admin'));
router.get('/dashboard', getDashboard);
router.get('/courses', getCourses);

module.exports = router;
