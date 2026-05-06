const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/wishlist.controller');
const { protect } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middlewares/validate.middleware');

router.get('/', protect, ctrl.getWishlist);
router.post('/', protect, [body('courseId').notEmpty().isMongoId()], validate, ctrl.addToWishlist);
router.delete('/:courseId', protect, ctrl.removeFromWishlist);

module.exports = router;
