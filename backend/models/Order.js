const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  courses: [{
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: true
    },
    price: Number,
    title: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'UZS'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'click', 'payme', 'uzcard', 'humo'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  stripePaymentIntentId: String,
  stripePaymentMethodId: String,
  providerTransactionId: String,
  providerState: Number,
  providerTransactionTime: Number,
  providerPerformTime: Number,
  providerCancelTime: Number,
  providerCancelReason: Number,
  providerPrepareId: Number,
  receiptUrl: String,
  paidAt: Date,
  status: {
    type: String,
    enum: ['processing', 'completed', 'cancelled', 'refunded'],
    default: 'processing'
  },
  refundReason: String,
  refundedAt: Date,
  notes: String
}, {
  timestamps: true
});

orderSchema.index(
  { paymentMethod: 1, providerTransactionId: 1 },
  { unique: true, partialFilterExpression: { providerTransactionId: { $type: 'string' } } }
);

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
