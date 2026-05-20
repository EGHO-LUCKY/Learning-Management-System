const mongoose = require('mongoose');

const lectureSchema = new mongoose.Schema({
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true, index: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  type: { type: String, enum: ['video', 'article', 'quiz'], default: 'video' },
  order: { type: Number, required: true, default: 0 },
  description: String,
  isFree: { type: Boolean, default: false },
  video: {
    url: String,
    publicId: String,
    duration: Number,
    hlsUrl: String,
    dashUrl: String,
    status: { type: String, enum: ['pending', 'processing', 'ready', 'failed'], default: 'pending' },
  },
  article: { content: String },
  attachments: [{
    name: String,
    url: String,
    publicId: String,
    size: Number,
    mimeType: String,
  }],
  captions: [{
    language: String,
    url: String,
    publicId: String,
  }],
}, { timestamps: true });

const Lecture = mongoose.model('Lecture', lectureSchema);

module.exports = Lecture;
