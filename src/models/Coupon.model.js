const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percentage', 'fixed'], required: true },
  value: { type: Number, required: true },
  maxUses: { type: Number, default: null },
  usedCount: { type: Number, default: 0 },
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }], // empty = all courses
  minOrderAmount: { type: Number, default: 0 },
  expiresAt: Date,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
