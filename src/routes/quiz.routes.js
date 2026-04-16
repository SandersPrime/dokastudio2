// src/routes/quiz.routes.js

const express = require('express');
const quizController = require('../controllers/quiz.controller');
const questionController = require('../controllers/question.controller');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(quizController.list));
router.get('/:id', authenticateToken, asyncHandler(quizController.getById));
router.post('/', authenticateToken, asyncHandler(quizController.create));
router.put('/:id', authenticateToken, asyncHandler(quizController.update));
router.delete('/:id', authenticateToken, asyncHandler(quizController.remove));

router.post(
  '/:quizId/questions',
  authenticateToken,
  asyncHandler(questionController.create)
);

router.put(
  '/:quizId/questions/reorder',
  authenticateToken,
  asyncHandler(quizController.reorderQuestions)
);

module.exports = router;
