const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Course = require('../models/Course.model');
const { Order, Coupon, Enrollment, Payout, Transaction } = require('../models/index');
const { AppError } = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const notificationService = require('../services/notification.service');
const emailService = require('../services/email.service');

const INSTRUCTOR_SHARE = parseFloat(process.env.INSTRUCTOR_REVENUE_SHARE || 70) / 100;

// ─── Create Checkout Session ───────────────────────────────────────────────────
exports.createCheckout = catchAsync(async (req, res) => {
  const { courseId, couponCode } = req.body;

  const course = await Course.findOne({ _id: courseId, status: 'published' })
    .populate('instructor', 'name');
  if (!course) throw new AppError('Course not found', 404);

  // Check if already enrolled
  const alreadyEnrolled = await Enrollment.exists({ student: req.user._id, course: courseId });
  if (alreadyEnrolled) throw new AppError('You are already enrolled in this course', 400);

  let finalPrice = course.price;
  let discount = 0;
  let appliedCoupon = null;

  // Apply coupon
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (!coupon) throw new AppError('Invalid or expired coupon code', 400);
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new AppError('Coupon has expired', 400);
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) throw new AppError('Coupon usage limit reached', 400);
    if (coupon.courses.length > 0 && !coupon.courses.includes(courseId)) {
      throw new AppError('Coupon is not valid for this course', 400);
    }

    discount = coupon.type === 'percentage'
      ? (course.price * coupon.value) / 100
      : Math.min(coupon.value, course.price);

    finalPrice = Math.max(0, course.price - discount);
    appliedCoupon = coupon;
  }

  // Free course enrollment — bypass Stripe
  if (finalPrice === 0) {
    const order = await Order.create({
      student: req.user._id,
      courses: [{ course: courseId, price: 0, instructorShare: 0 }],
      subtotal: course.price,
      discount,
      total: 0,
      coupon: appliedCoupon?._id,
      couponCode: appliedCoupon?.code,
      status: 'completed',
      paymentProvider: 'free',
    });

    await Enrollment.create({ student: req.user._id, course: courseId, order: order._id });
    if (appliedCoupon) await Coupon.findByIdAndUpdate(appliedCoupon._id, { $inc: { usedCount: 1 } });

    // Create transaction for instructor (even if 0)
    await Transaction.create({
      user: course.instructor._id,
      type: 'sale',
      amount: 0,
      currency: course.currency || 'USD',
      description: `Free enrollment: ${course.title}`,
      order: order._id,
      course: course._id,
    });

    return res.json({ success: true, message: 'Enrolled for free!', data: { order, enrolled: true } });
  }

  // Stripe session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: req.user.email,
    line_items: [{
      price_data: {
        currency: course.currency?.toLowerCase() || 'usd',
        product_data: {
          name: course.title,
          images: course.thumbnail?.url ? [course.thumbnail.url] : [],
          metadata: { courseId: courseId.toString(), instructorId: course.instructor._id.toString() },
        },
        unit_amount: Math.round(finalPrice * 100), // Stripe uses cents
      },
      quantity: 1,
    }],
    discounts: discount > 0 ? [] : undefined, // handled manually
    success_url: `${process.env.FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/course/${course.slug}`,
    metadata: {
      userId: req.user._id.toString(),
      courseId: courseId.toString(),
      couponId: appliedCoupon?._id?.toString() || '',
      discount: discount.toString(),
    },
  });

  // Pre-create pending order
  await Order.create({
    student: req.user._id,
    courses: [{ course: courseId, price: finalPrice, instructorShare: finalPrice * INSTRUCTOR_SHARE }],
    subtotal: course.price,
    discount,
    total: finalPrice,
    coupon: appliedCoupon?._id,
    couponCode: appliedCoupon?.code,
    status: 'pending',
    stripeSessionId: session.id,
  });

  res.json({ success: true, data: { sessionId: session.id, sessionUrl: session.url } });
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
exports.stripeWebhook = catchAsync(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, courseId, couponId } = session.metadata;

      const order = await Order.findOneAndUpdate(
        { stripeSessionId: session.id },
        { status: 'completed', stripePaymentIntentId: session.payment_intent },
        { new: true }
      );

      if (order && order.status === 'completed') {
        await Enrollment.create({ student: userId, course: courseId, order: order._id });

        if (couponId) await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } });

        const user = await require('../models/User.model').findById(userId);
        const course = await Course.findById(courseId).populate('instructor');

        // Create transaction for instructor
        await Transaction.create({
          user: course.instructor._id,
          type: 'sale',
          amount: order.courses[0]?.instructorShare || 0,
          currency: order.currency,
          description: `Sale of course: ${course.title}`,
          order: order._id,
          course: course._id,
        });

        await notificationService.send({
          userId,
          type: 'payment',
          title: 'Enrollment Confirmed!',
          message: `You're now enrolled in "${course.title}"`,
          data: { courseId, orderId: order._id },
        });

        await emailService.sendEnrollmentConfirmation(user.email, user.name, course.title);
      }
      break;
    }

    case 'charge.dispute.created': {
      const charge = event.data.object;
      const order = await Order.findOne({ stripePaymentIntentId: charge.payment_intent });
      if (order) {
        order.status = 'refunded';
        await order.save();
      }
      break;
    }
  }

  res.json({ received: true });
});

// ─── Get Checkout Session Status ──────────────────────────────────────────────
exports.getCheckoutSession = catchAsync(async (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId || !sessionId.startsWith('cs_')) {
    throw new AppError('Invalid session ID', 400);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    res.json({
      success: true,
      data: {
        status: session.payment_status,
        sessionId: session.id,
        customerEmail: session.customer_email,
      },
    });
  } catch (error) {
    throw new AppError('Checkout session not found', 404);
  }
});

// ─── Get Single Order ─────────────────────────────────────────────────────────
exports.getOrderById = catchAsync(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, student: req.user._id })
    .populate('courses.course', 'title thumbnail slug');

  if (!order) throw new AppError('Order not found', 404);

  res.json({ success: true, data: order });
});

// ─── Order History ────────────────────────────────────────────────────────────
exports.getOrders = catchAsync(async (req, res) => {
  const orders = await Order.find({ student: req.user._id })
    .populate('courses.course', 'title thumbnail slug')
    .sort('-createdAt');

  res.json({ success: true, data: orders });
});

// ─── Refund Request ───────────────────────────────────────────────────────────
exports.requestRefund = catchAsync(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.orderId, student: req.user._id });
  if (!order) throw new AppError('Order not found', 404);
  if (order.status !== 'completed') throw new AppError('Order cannot be refunded in current state', 400);

  // 30-day refund window
  const daysSincePurchase = (Date.now() - order.createdAt) / (1000 * 60 * 60 * 24);
  if (daysSincePurchase > 30) throw new AppError('Refund window has expired (30 days)', 400);

  if (order.stripePaymentIntentId) {
    await stripe.refunds.create({ payment_intent: order.stripePaymentIntentId });
  }

  order.status = 'refunded';
  order.refundedAt = new Date();
  order.refundReason = req.body.reason;
  await order.save();

  // Remove enrollment
  await Enrollment.deleteOne({ student: req.user._id, course: order.courses[0].course });

  res.json({ success: true, message: 'Refund processed successfully', data: order });
});

// ─── Validate Coupon ───────────────────────────────────────────────────────────
exports.validateCoupon = catchAsync(async (req, res) => {
  const { code, courseId } = req.body;
  const coupon = await Coupon.findOne({ code: code.toUpperCase(), isActive: true });

  if (!coupon || (coupon.expiresAt && coupon.expiresAt < new Date())) {
    throw new AppError('Invalid or expired coupon', 400);
  }
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    throw new AppError('Coupon usage limit reached', 400);
  }
  if (coupon.courses.length > 0 && !coupon.courses.includes(courseId)) {
    throw new AppError('Coupon not valid for this course', 400);
  }

  const course = await Course.findById(courseId);
  const discount = coupon.type === 'percentage'
    ? (course.price * coupon.value) / 100
    : Math.min(coupon.value, course.price);

  res.json({
    success: true,
    data: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discount: Math.round(discount * 100) / 100,
      finalPrice: Math.max(0, course.price - discount),
    },
  });
});

// ─── Admin: Manage Coupons ───────────────────────────────────────────────────
exports.updateCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.couponId, req.body, {
    new: true,
    runValidators: true,
  });
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ success: true, data: coupon });
});

exports.deleteCoupon = catchAsync(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.couponId);
  if (!coupon) throw new AppError('Coupon not found', 404);
  res.json({ success: true, message: 'Coupon deleted' });
});

// ─── Instructor: Earnings Summary ─────────────────────────────────────────────
exports.getEarnings = catchAsync(async (req, res) => {
  const [sales, payouts] = await Promise.all([
    Transaction.find({ user: req.user._id, type: 'sale', status: 'completed' }),
    Transaction.find({ user: req.user._id, type: 'payout', status: 'completed' }),
  ]);

  const totalEarnings = sales.reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = Math.abs(payouts.reduce((sum, t) => sum + t.amount, 0));

  res.json({
    success: true,
    data: {
      total: Math.round(totalEarnings * 100) / 100,
      paid: Math.round(totalPaid * 100) / 100,
      pending: Math.round((totalEarnings - totalPaid) * 100) / 100,
      currency: 'USD',
    },
  });
});

// ─── Instructor: Request Payout ────────────────────────────────────────────────
exports.requestPayout = catchAsync(async (req, res) => {
  const { amount, method } = req.body;
  if (!['bank', 'paypal'].includes(method)) throw new AppError('Invalid payout method', 400);

  const payout = await Payout.create({
    instructor: req.user._id,
    amount,
    method,
    status: 'pending',
  });

  // Create transaction entry for payout
  await Transaction.create({
    user: req.user._id,
    type: 'payout',
    amount: -amount, // Payouts are negative in the ledger
    currency: 'USD',
    status: 'pending',
    description: `Payout request via ${method}`,
    payout: payout._id,
  });

  res.status(201).json({ success: true, message: 'Payout request submitted', data: payout });
});
