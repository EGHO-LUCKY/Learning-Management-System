const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  lecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  title: { type: String, required: true },
  passScore: { type: Number, default: 70 }, // percentage
  timeLimitSeconds: Number,
  questions: [{
    question: { type: String, required: true },
    options: [String],
    correctIndex: { type: Number, required: true },
    explanation: String,
    points: { type: Number, default: 1 },
  }],
}, { timestamps: true });

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
