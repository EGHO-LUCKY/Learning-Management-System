const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/media.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const { uploadImage, uploadVideo, uploadCaption } = require('../middlewares/upload.middleware');
const { body } = require('express-validator');
const validate = require('../middlewares/validate.middleware');

router.post('/upload/image', protect, uploadImage, ctrl.uploadImage);
router.post('/upload/video/initiate', protect, restrictTo('instructor', 'admin'),
  [body('filename').notEmpty(), body('size').isNumeric()], validate, ctrl.initiateVideoUpload);
router.put('/upload/video/:uploadId/part/:partNumber', protect, restrictTo('instructor', 'admin'), uploadVideo, ctrl.uploadVideoPart);
router.post('/upload/video/:uploadId/complete', protect, restrictTo('instructor', 'admin'), ctrl.completeVideoUpload);
router.delete('/upload/video/:uploadId/abort', protect, restrictTo('instructor', 'admin'), ctrl.abortVideoUpload);
router.get('/video/:videoId/stream', protect, ctrl.getStreamingUrl);
router.get('/video/:videoId/captions', protect, ctrl.getCaptions);
router.post('/video/:videoId/captions', protect, restrictTo('instructor', 'admin'), uploadCaption, ctrl.uploadCaptions);

module.exports = router;
