const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{ course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, price: Number }],
  coupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
  couponCode: String,
  total: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

module.exports = Cart;
