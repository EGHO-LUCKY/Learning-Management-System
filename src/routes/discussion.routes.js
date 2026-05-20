const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const discussionController = require('../controllers/discussion.controller');

const router = express.Router({ mergeParams: true });

/**
 * Interaction Module (Discussions & Q&A)
 * This router consolidates forum threads and course questions as per the Interaction module spec.
 */

// ─── Discussions ───────────────────────────────────────────────────────────

// Public discovery
router.get('/discussions/courses/:courseId/discussions', discussionController.getThreads);
router.get('/discussions/courses/:courseId/discussions/search', discussionController.searchThreads);
router.get('/discussions/discussions/:threadId', discussionController.getThread);
router.get('/discussions/discussions/:threadId/replies', discussionController.getReplies);

// Protected actions
router.post('/discussions/courses/:courseId/discussions', protect, discussionController.createThread);
router.post('/discussions/discussions/:threadId/replies', protect, discussionController.createReply);
router.post('/discussions/replies/:replyId/vote', protect, discussionController.voteReply);
router.patch('/discussions/discussions/:threadId/pin', protect, discussionController.pinThread);
router.patch('/discussions/discussions/:threadId/resolve', protect, discussionController.markAsAnswer);
router.patch('/discussions/replies/:replyId/answer/:threadId', protect, discussionController.markAsAnswer);
router.delete('/discussions/discussions/:threadId', protect, discussionController.deleteThread);


// ─── Q&A (Course Questions) ────────────────────────────────────────────────

// Public/Student discovery
router.get('/courses/:courseId/questions', (req, res, next) => {
  req.query.threadType = 'question';
  discussionController.getThreads(req, res, next);
});

// Protected actions
router.post('/courses/:courseId/questions', protect, (req, res, next) => {
  req.body.threadType = 'question';
  discussionController.createThread(req, res, next);
});

router.put('/questions/:threadId', protect, discussionController.updateThread);
router.delete('/questions/:threadId', protect, discussionController.deleteThread);

// Answers
router.post('/questions/:threadId/answers', protect, discussionController.createReply);
router.put('/questions/:threadId/answers/:replyId', protect, discussionController.updateReply);
router.delete('/questions/:threadId/answers/:replyId', protect, discussionController.deleteReply);

// Answer actions
router.post('/questions/:threadId/answers/:replyId/upvote', protect, (req, res, next) => {
  req.body.action = 'upvote';
  discussionController.voteReply(req, res, next);
});

router.post('/questions/:threadId/answers/:replyId/mark-correct', protect, discussionController.markAsAnswer);

module.exports = router;
