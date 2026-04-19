// src/routes/question.routes.js

const express = require('express');
const questionController = require('../controllers/question.controller');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.put('/:id', authenticateToken, asyncHandler(questionController.update));
router.delete('/:id', authenticateToken, asyncHandler(questionController.remove));

module.exports = router;