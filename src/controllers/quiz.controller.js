const { Quiz, QuizAttempt, Lecture } = require('../models/index');
const Course = require('../models/Course.model');
const { AppError } = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ─── QUIZZES ──────────────────────────────────────────────────────────────────

exports.createQuiz = catchAsync(async (req, res) => {
  const lecture = await Lecture.findById(req.params.lectureId);
  if (!lecture) throw new AppError('Lecture not found', 404);
  await requireInstructor(lecture.course, req.user._id);

  const quiz = await Quiz.create({
    lecture: req.params.lectureId,
    course: lecture.course,
    title: req.body.title,
    passScore: req.body.passScore || 70,
    timeLimitSeconds: req.body.timeLimitSeconds,
  });

  res.status(201).json({ success: true, data: quiz });
});

exports.updateQuiz = catchAsync(async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);
  await requireInstructor(quiz.course, req.user._id);

  const allowed = ['title', 'passScore', 'timeLimitSeconds'];
  allowed.forEach(f => { if (req.body[f] !== undefined) quiz[f] = req.body[f]; });
  await quiz.save();

  res.json({ success: true, data: quiz });
});

exports.addQuestions = catchAsync(async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);
  await requireInstructor(quiz.course, req.user._id);

  const questions = Array.isArray(req.body) ? req.body : [req.body];
  questions.forEach(q => {
    if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
      throw new AppError('Each question must have text and at least 2 options', 400);
    }
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      throw new AppError('correctIndex out of range', 400);
    }
    quiz.questions.push(q);
  });
  await quiz.save();

  res.status(201).json({ success: true, data: quiz });
});

exports.updateQuestion = catchAsync(async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);
  await requireInstructor(quiz.course, req.user._id);

  const question = quiz.questions.id(req.params.questionId);
  if (!question) throw new AppError('Question not found', 404);

  const allowed = ['question', 'options', 'correctIndex', 'explanation', 'points'];
  allowed.forEach(f => { if (req.body[f] !== undefined) question[f] = req.body[f]; });
  await quiz.save();

  res.json({ success: true, data: quiz });
});

exports.deleteQuestion = catchAsync(async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);
  await requireInstructor(quiz.course, req.user._id);

  quiz.questions.id(req.params.questionId)?.deleteOne();
  await quiz.save();

  res.json({ success: true, message: 'Question deleted' });
});

// ─── QUIZ ATTEMPTS ────────────────────────────────────────────────────────────

exports.submitAttempt = catchAsync(async (req, res) => {
  const quiz = await Quiz.findById(req.params.quizId);
  if (!quiz) throw new AppError('Quiz not found', 404);

  const { answers, timeTakenSeconds } = req.body;
  if (!Array.isArray(answers)) throw new AppError('answers must be an array', 400);

  let earned = 0;
  let totalPoints = 0;
  const gradedAnswers = quiz.questions.map((q, i) => {
    const answer = answers.find(a => a.questionIndex === i);
    const isCorrect = answer?.selectedIndex === q.correctIndex;
    const pts = q.points || 1;
    totalPoints += pts;
    if (isCorrect) earned += pts;
    return { questionIndex: i, selectedIndex: answer?.selectedIndex ?? -1, isCorrect };
  });

  const score = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;
  const isPassed = score >= quiz.passScore;

  const attempt = await QuizAttempt.create({
    quiz: quiz._id,
    student: req.user._id,
    answers: gradedAnswers,
    score,
    isPassed,
    timeTakenSeconds,
  });

  // Include correct answers in response
  const withExplanations = quiz.questions.map((q, i) => ({
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
    explanation: q.explanation,
    yourAnswer: gradedAnswers[i].selectedIndex,
    isCorrect: gradedAnswers[i].isCorrect,
  }));

  res.status(201).json({
    success: true,
    data: {
      attemptId: attempt._id,
      score,
      isPassed,
      passScore: quiz.passScore,
      earned,
      totalPoints,
      questions: withExplanations,
    },
  });
});

exports.getAttempts = catchAsync(async (req, res) => {
  const attempts = await QuizAttempt.find({ quiz: req.params.quizId, student: req.user._id })
    .sort('-createdAt')
    .select('-answers');
  res.json({ success: true, data: attempts });
});

exports.getAttemptDetail = catchAsync(async (req, res) => {
  const attempt = await QuizAttempt.findOne({
    _id: req.params.attemptId,
    student: req.user._id,
  }).populate('quiz', 'title questions passScore');
  if (!attempt) throw new AppError('Attempt not found', 404);
  res.json({ success: true, data: attempt });
});

// ─── Helper ───────────────────────────────────────────────────────────────────
async function requireInstructor(courseId, userId) {
  const course = await Course.findOne({ _id: courseId, instructor: userId });
  if (!course) throw new AppError('Access denied', 403);
  return course;
}

