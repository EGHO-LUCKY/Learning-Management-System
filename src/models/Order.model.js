const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courses: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    price: Number,
    instructorShare: Number,
  }],
  subtotal: Number,
  discount: { type: Number, default: 0 },
  total: Number,
  currency: { type: String, default: 'USD' },
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: String,
  status: { type: String, enum: ['pending', 'completed', 'refunded', 'failed'], default: 'pending' },
  paymentProvider: { type: String, default: 'stripe' },
  stripeSessionId: String,
  stripePaymentIntentId: String,
  refundedAt: Date,
  refundReason: String,
  invoiceUrl: String,
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
