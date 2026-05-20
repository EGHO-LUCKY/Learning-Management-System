const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  completedLectures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }],
  lecturePositions: { type: Map, of: Number, default: {} }, // lectureId -> positionSeconds
  completionPercentage: { type: Number, default: 0 },
  isCompleted: { type: Boolean, default: false },
  completedAt: Date,
  certificateIssued: { type: Boolean, default: false },
  lastAccessedAt: Date,
}, { timestamps: true });

enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;
