const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 2000 },
  instructorResponse: String,
  instructorResponseAt: Date,
  helpfulCount: { type: Number, default: 0 },
  helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isReported: { type: Boolean, default: false },
  reportReason: String,
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

reviewSchema.index({ course: 1, student: 1 }, { unique: true });

reviewSchema.statics.recalculateCourseRating = async function (courseId) {
  const Course = mongoose.model('Course');
  const stats = await this.aggregate([
    { $match: { course: courseId } },
    { $group: { _id: '$course', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  if (stats.length > 0) {
    await Course.findByIdAndUpdate(courseId, {
      'stats.averageRating': Math.round(stats[0].avgRating * 10) / 10,
      'stats.totalReviews': stats[0].count,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.recalculateCourseRating(this.course);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
