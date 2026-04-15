// src/routes/homework.routes.js

const express = require('express');
const homeworkController = require('../controllers/homework.controller');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/pin/:pinCode', asyncHandler(homeworkController.getByPin));
router.post('/pin/:pinCode/start', asyncHandler(homeworkController.startAttempt));
router.post('/pin/:pinCode/submit', asyncHandler(homeworkController.submitAttempt));
router.get('/pin/:pinCode/results/:submissionId', asyncHandler(homeworkController.getResults));

router.post('/', authenticateToken, asyncHandler(homeworkController.create));
router.get('/', authenticateToken, asyncHandler(homeworkController.list));
router.get('/:id/report', authenticateToken, asyncHandler(homeworkController.report));
router.get('/:id', authenticateToken, asyncHandler(homeworkController.getById));
router.put('/:id', authenticateToken, asyncHandler(homeworkController.update));
router.delete('/:id', authenticateToken, asyncHandler(homeworkController.remove));

module.exports = router;
