// ─── payment.routes.js ────────────────────────────────────────────────────────
const express = require('express');
const payRouter = express.Router();
const payCtrl = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middlewares/validate.middleware');

payRouter.post('/checkout', protect, [body('courseId').notEmpty()], validate, payCtrl.createCheckout);
payRouter.get('/checkout/:sessionId', protect, payCtrl.getCheckoutSession);
payRouter.post('/webhooks/stripe', payCtrl.stripeWebhook);
payRouter.get('/orders', protect, payCtrl.getOrders);
payRouter.get('/orders/:orderId', protect, payCtrl.getOrderById);
payRouter.post('/orders/:orderId/refund', protect, [
  body('reason').notEmpty().withMessage('Reason is required').isString().isLength({ max: 500 }),
  body('amount').optional().isNumeric().custom((val) => val > 0),
  body('items').optional().isArray(),
], validate, payCtrl.requestRefund);
payRouter.get('/orders/:orderId/invoice', protect, async (req, res, next) => {
  try {
    const { Order } = require('../models/index');
    const order = await Order.findOne({ _id: req.params.orderId, student: req.user._id })
      .populate('courses.course', 'title').populate('student', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    // Redirect to invoiceUrl or generate basic invoice
    res.json({ success: true, data: { invoiceUrl: order.invoiceUrl || null, order } });
  } catch (err) { next(err); }
});
payRouter.post('/coupons/validate', protect, payCtrl.validateCoupon);
payRouter.post('/admin/coupons', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { Coupon } = require('../models/index');
    const coupon = await Coupon.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ success: true, data: coupon });
  } catch (err) { next(err); }
});
payRouter.get('/admin/coupons', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { Coupon } = require('../models/index');
    const coupons = await Coupon.find().sort('-createdAt');
    res.json({ success: true, data: coupons });
  } catch (err) { next(err); }
});
payRouter.put('/admin/coupons/:couponId', protect, restrictTo('admin'), payCtrl.updateCoupon);
payRouter.delete('/admin/coupons/:couponId', protect, restrictTo('admin'), payCtrl.deleteCoupon);
payRouter.get('/instructor/earnings', protect, restrictTo('instructor', 'admin'), payCtrl.getEarnings);
payRouter.get('/instructor/earnings/history', protect, restrictTo('instructor', 'admin'), async (req, res, next) => {
  try {
    const { Transaction } = require('../models/index');
    const { page = 1, limit = 20 } = req.query;
    
    const transactions = await Transaction.find({ user: req.user._id })
      .populate('course', 'title')
      .populate('order', 'total status')
      .populate('payout', 'amount status method')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(+limit);

    const total = await Transaction.countDocuments({ user: req.user._id });

    res.json({ 
      success: true, 
      data: transactions,
      meta: { total, page: +page, limit: +limit, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) { next(err); }
});
payRouter.post('/instructor/payouts/request', protect, restrictTo('instructor', 'admin'), payCtrl.requestPayout);
payRouter.get('/instructor/payouts', protect, restrictTo('instructor', 'admin'), async (req, res, next) => {
  try {
    const { Payout } = require('../models/index');
    const payouts = await Payout.find({ instructor: req.user._id }).sort('-createdAt');
    res.json({ success: true, data: payouts });
  } catch (err) { next(err); }
});
payRouter.post('/admin/payouts/:payoutId/approve', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { Payout } = require('../models/index');
    const payout = await Payout.findByIdAndUpdate(req.params.payoutId,
      { status: 'approved', processedBy: req.user._id, processedAt: new Date() }, { new: true });
    res.json({ success: true, data: payout });
  } catch (err) { next(err); }
});
payRouter.post('/admin/payouts/:payoutId/reject', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const { Payout } = require('../models/index');
    const payout = await Payout.findByIdAndUpdate(req.params.payoutId,
      { status: 'rejected', rejectionReason: req.body.reason, processedBy: req.user._id, processedAt: new Date() }, { new: true });
    res.json({ success: true, data: payout });
  } catch (err) { next(err); }
});

module.exports = payRouter;
