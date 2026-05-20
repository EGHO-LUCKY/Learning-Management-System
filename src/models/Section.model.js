const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  order: { type: Number, required: true, default: 0 },
}, { timestamps: true, toJSON: { virtuals: true } });

sectionSchema.virtual('lectures', {
  ref: 'Lecture',
  localField: '_id',
  foreignField: 'section',
  options: { sort: { order: 1 } },
});

const Section = mongoose.model('Section', sectionSchema);

module.exports = Section;
