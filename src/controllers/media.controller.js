const { Lecture, MediaUpload } = require('../models/index');
const { AppError } = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const cloudinaryService = require('../services/cloudinary.service');
const { v4: uuidv4 } = require('uuid');

exports.uploadImage = catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('Please upload an image file', 400);
  const result = await cloudinaryService.uploadImage(req.file.buffer, 'lms/general');
  res.json({ success: true, data: { url: result.secure_url, publicId: result.public_id, width: result.width, height: result.height } });
});

exports.initiateVideoUpload = catchAsync(async (req, res) => {
  const { filename, size, mimeType } = req.body;
  if (!filename || !size) throw new AppError('filename and size are required', 400);

  const uploadId = `lms_up_${uuidv4()}`;
  const partSize = 6 * 1024 * 1024; // 6MB
  const numParts = Math.ceil(size / partSize);

  await MediaUpload.create({
    uploadId,
    instructor: req.user._id,
    filename,
    totalSize: size,
    mimeType,
    status: 'pending',
    provider: 'cloudinary',
  });

  res.json({ success: true, data: { uploadId, numParts, partSize, expiresIn: 3600 } });
});

exports.uploadVideoPart = catchAsync(async (req, res) => {
  const { uploadId, partNumber } = req.params;
  const upload = await MediaUpload.findOne({ uploadId });
  if (!upload) throw new AppError('Upload session not found', 404);
  if (upload.status !== 'pending') throw new AppError(`Cannot upload part to a ${upload.status} session`, 400);

  if (!req.file) throw new AppError('No data received for this part', 400);

  // Upload part as a raw resource to Cloudinary for temporary storage
  const result = await cloudinaryService.uploadRaw(
    req.file.buffer,
    `lms/tmp/${uploadId}`,
    `part_${partNumber}`
  );

  upload.parts.push({
    partNumber: +partNumber,
    etag: result.etag,
    publicId: result.public_id,
  });
  await upload.save();

  res.json({ success: true, data: { uploadId, partNumber: +partNumber, etag: result.etag } });
});

exports.completeVideoUpload = catchAsync(async (req, res) => {
  const { uploadId } = req.params;
  const upload = await MediaUpload.findOne({ uploadId });
  if (!upload) throw new AppError('Upload session not found', 404);
  if (upload.status !== 'pending') throw new AppError(`Cannot complete a ${upload.status} session`, 400);

  // In production with S3:
  // await s3.completeMultipartUpload({ ... }).promise();
  
  // With Cloudinary simulation: 
  // In a real scenario, we'd use their chunked upload API directly or combine these.
  // For this capstone, we mark as completed and the background worker (if any) would handle it.
  upload.status = 'completed';
  await upload.save();

  res.json({ 
    success: true, 
    message: 'Upload complete. Video is being processed.', 
    data: { uploadId, videoId: `vid_${uuidv4()}`, status: 'processing' } 
  });
});

exports.abortVideoUpload = catchAsync(async (req, res) => {
  const { uploadId } = req.params;
  const upload = await MediaUpload.findOne({ uploadId });
  if (!upload) throw new AppError('Upload session not found', 404);

  // 1. Clean up temporary chunks from Cloudinary
  if (upload.parts && upload.parts.length > 0) {
    const deletePromises = upload.parts.map(part => 
      cloudinaryService.deleteFile(part.publicId, 'raw')
    );
    await Promise.all(deletePromises);
  }

  // 2. Mark as aborted
  upload.status = 'aborted';
  await upload.save();

  res.json({ 
    success: true, 
    message: 'Upload aborted and temporary chunks were successfully purged from storage', 
    data: { uploadId } 
  });
});

exports.getStreamingUrl = catchAsync(async (req, res) => {
  const lecture = await Lecture.findById(req.params.videoId).select('video course');
  if (!lecture) throw new AppError('Video not found', 404);
  if (!lecture.video?.publicId) throw new AppError('Video not yet uploaded for this lecture', 404);

  const streamUrl = cloudinaryService.getSignedStreamingUrl(lecture.video.publicId);
  res.json({ success: true, data: { streamUrl, type: 'hls', expiresIn: 3600 } });
});

exports.getCaptions = catchAsync(async (req, res) => {
  const lecture = await Lecture.findById(req.params.videoId).select('captions title');
  if (!lecture) throw new AppError('Lecture not found', 404);
  res.json({ success: true, data: lecture.captions || [] });
});

exports.uploadCaptions = catchAsync(async (req, res) => {
  if (!req.file) throw new AppError('Please upload a caption file (.vtt or .srt)', 400);
  const lecture = await Lecture.findById(req.params.videoId);
  if (!lecture) throw new AppError('Lecture not found', 404);

  const language = req.body.language || 'en';
  const label = req.body.label || language.toUpperCase();

  const result = await cloudinaryService.uploadRaw(
    req.file.buffer,
    `lms/captions/${lecture._id}`,
    `${language}_${req.file.originalname}`
  );

  const existingIdx = lecture.captions.findIndex(c => c.language === language);
  const captionEntry = { language, label, url: result.secure_url, publicId: result.public_id };

  if (existingIdx > -1) lecture.captions[existingIdx] = captionEntry;
  else lecture.captions.push(captionEntry);

  await lecture.save();
  res.status(201).json({ success: true, message: `Captions uploaded for language: ${language}`, data: lecture.captions });
});
