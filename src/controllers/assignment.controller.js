const { Assignment, Submission, Lecture } = require('../models/index');
const Course = require('../models/Course.model');
const { AppError } = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const cloudinaryService = require('../services/cloudinary.service');
const notificationService = require('../services/notification.service');

// ─── Helper ───────────────────────────────────────────────────────────────────
async function requireInstructor(courseId, userId) {
  const course = await Course.findOne({ _id: courseId, instructor: userId });
  if (!course) throw new AppError('Access denied', 403);
  return course;
}

// ─── INSTRUCTOR: Management ───────────────────────────────────────────────────

exports.createAssignment = catchAsync(async (req, res) => {
  const lecture = await Lecture.findById(req.params.lectureId);
  if (!lecture) throw new AppError('Lecture not found', 404);
  await requireInstructor(lecture.course, req.user._id);

  const assignment = await Assignment.create({
    lecture: req.params.lectureId,
    course: lecture.course,
    title: req.body.title,
    description: req.body.description,
    dueDate: req.body.dueDate,
    maxScore: req.body.maxScore || 100,
    allowedTypes: req.body.allowedTypes || ['pdf', 'doc', 'txt'],
  });

  res.status(201).json({ success: true, data: assignment });
});

exports.updateAssignment = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) throw new AppError('Assignment not found', 404);
  await requireInstructor(assignment.course, req.user._id);

  const allowed = ['title', 'description', 'dueDate', 'maxScore', 'allowedTypes'];
  allowed.forEach(f => { if (req.body[f] !== undefined) assignment[f] = req.body[f]; });
  await assignment.save();

  res.json({ success: true, data: assignment });
});

exports.deleteAssignment = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) throw new AppError('Assignment not found', 404);
  await requireInstructor(assignment.course, req.user._id);

  await assignment.deleteOne();
  res.json({ success: true, message: 'Assignment deleted' });
});

// ─── STUDENT: Submission ──────────────────────────────────────────────────────

exports.submitAssignment = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) throw new AppError('Assignment not found', 404);

  if (assignment.dueDate && new Date() > assignment.dueDate) {
    throw new AppError('Assignment due date has passed', 400);
  }

  let fileUrl, filePublicId;
  if (req.file) {
    const result = await cloudinaryService.uploadRaw(
      req.file.buffer,
      `lms/submissions/${assignment._id}`,
      `${req.user._id}-${req.file.originalname}`
    );
    fileUrl = result.secure_url;
    filePublicId = result.public_id;
  }

  const existing = await Submission.findOne({ assignment: assignment._id, student: req.user._id });
  if (existing) {
    existing.textContent = req.body.textContent;
    existing.fileUrl = fileUrl || existing.fileUrl;
    existing.filePublicId = filePublicId || existing.filePublicId;
    existing.status = 'submitted';
    await existing.save();
    return res.json({ success: true, message: 'Submission updated', data: existing });
  }

  const submission = await Submission.create({
    assignment: assignment._id,
    student: req.user._id,
    textContent: req.body.textContent,
    fileUrl,
    filePublicId,
  });

  res.status(201).json({ success: true, data: submission });
});

// ─── INSTRUCTOR: Grading ──────────────────────────────────────────────────────

exports.getSubmissions = catchAsync(async (req, res) => {
  const assignment = await Assignment.findById(req.params.assignmentId);
  if (!assignment) throw new AppError('Assignment not found', 404);
  await requireInstructor(assignment.course, req.user._id);

  const submissions = await Submission.find({ assignment: req.params.assignmentId })
    .populate('student', 'name email avatar')
    .sort('-createdAt');

  res.json({ success: true, data: submissions });
});

exports.gradeSubmission = catchAsync(async (req, res) => {
  const { score, feedback } = req.body;
  const submission = await Submission.findById(req.params.submissionId)
    .populate({ path: 'assignment' });

  if (!submission) throw new AppError('Submission not found', 404);
  await requireInstructor(submission.assignment.course, req.user._id);

  const maxScore = submission.assignment.maxScore || 100;
  if (score < 0 || score > maxScore) throw new AppError(`Score must be between 0 and ${maxScore}`, 400);

  submission.grade = score;
  submission.feedback = feedback;
  submission.gradedBy = req.user._id;
  submission.gradedAt = new Date();
  submission.status = 'graded';
  await submission.save();

  await notificationService.send({
    userId: submission.student,
    type: 'assignment_graded',
    title: 'Assignment Graded',
    message: `Your assignment has been graded: ${score}/${maxScore}${feedback ? ` — "${feedback}"` : ''}`,
    data: { submissionId: submission._id, score, maxScore },
  });

  res.json({ success: true, data: submission });
});
