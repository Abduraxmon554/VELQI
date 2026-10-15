const express = require('express');
const router = express.Router();
const {
  createPaymentIntent, confirmPayment, getPaymentHistory,
  enrollFree, getAllOrders, buyLesson
} = require('../controllers/paymentController');
const {
  getPaymentProviders, startProviderCheckout, getPaymentStatus,
  clickCallback, paymeCallback
} = require('../controllers/providerController');
const { protect, authorize } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/security');

router.post('/create-intent', protect, apiLimiter, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);
router.get('/providers', getPaymentProviders);
router.post('/checkout', protect, apiLimiter, startProviderCheckout);
router.get('/status/:orderId', protect, getPaymentStatus);
router.post('/click/callback', clickCallback);
router.post('/payme/callback', paymeCallback);
router.post('/enroll-free', protect, enrollFree);
router.post('/buy-lesson', protect, buyLesson);
router.get('/history', protect, getPaymentHistory);
router.get('/all-orders', protect, authorize('admin'), getAllOrders);

module.exports = router;
