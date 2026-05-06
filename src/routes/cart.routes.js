const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/cart.controller');
const { protect } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middlewares/validate.middleware');

router.get('/', protect, ctrl.getCart);
router.post('/', protect, [body('courseId').notEmpty().isMongoId()], validate, ctrl.addToCart);
router.delete('/coupon', protect, ctrl.removeCoupon);
router.post('/coupon', protect, [body('code').notEmpty().trim()], validate, ctrl.applyCoupon);
router.delete('/:courseId', protect, ctrl.removeFromCart);
router.delete('/', protect, ctrl.clearCart);

module.exports = router;
