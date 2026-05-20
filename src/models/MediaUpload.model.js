const mongoose = require('mongoose');

const mediaUploadSchema = new mongoose.Schema({
  uploadId: { type: String, required: true, unique: true },
  instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: String,
  totalSize: Number,
  mimeType: String,
  status: { type: String, enum: ['pending', 'completed', 'aborted'], default: 'pending' },
  provider: { type: String, enum: ['cloudinary', 's3'], default: 'cloudinary' },
  providerUploadId: String, // Cloudinary's unique_upload_id or S3's UploadId
  parts: [{
    partNumber: Number,
    etag: String,
    publicId: String, // If we store parts individually in Cloudinary
  }],
  metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

const MediaUpload = mongoose.model('MediaUpload', mediaUploadSchema);

module.exports = MediaUpload;
