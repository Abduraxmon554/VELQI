const express = require('express');
const router = express.Router();
const {
  updateProfile, uploadAvatar, updateProgress,
  toggleWishlist, getAllUsers, toggleUserStatus, getDashboard
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.get('/dashboard', protect, getDashboard);
router.put('/profile', protect, uploadAvatar, updateProfile);
router.put('/progress/:courseId', protect, updateProgress);
router.put('/wishlist/:courseId', protect, toggleWishlist);
router.get('/', protect, authorize('admin'), getAllUsers);
router.put('/:id/toggle-status', protect, authorize('admin'), toggleUserStatus);

module.exports = router;
