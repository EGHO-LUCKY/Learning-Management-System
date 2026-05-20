const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, maxlength: 200 },
  body: { type: String, required: true, maxlength: 5000 },
  answers: [{
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    body: { type: String, required: true },
    upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isMarkedCorrect: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
  }],
  isResolved: { type: Boolean, default: false },
}, { timestamps: true });

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
