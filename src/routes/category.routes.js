const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/category.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const validate = require('../middlewares/validate.middleware');

router.get('/categories', ctrl.getAllCategories);
router.get('/categories/:categoryId/courses', ctrl.getCoursesByCategory);
router.post('/admin/categories', protect, restrictTo('admin'), [body('name').notEmpty().trim()], validate, ctrl.createCategory);
router.put('/admin/categories/:categoryId', protect, restrictTo('admin'), ctrl.updateCategory);
router.delete('/admin/categories/:categoryId', protect, restrictTo('admin'), ctrl.deleteCategory);
router.get('/tags', ctrl.getAllTags);
router.post('/admin/tags', protect, restrictTo('admin'), [body('name').notEmpty().trim()], validate, ctrl.createTag);
router.delete('/admin/tags/:tagId', protect, restrictTo('admin'), ctrl.deleteTag);

module.exports = router;
