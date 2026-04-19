// src/routes/buzzer.routes.js

const express = require('express');
const buzzerController = require('../controllers/buzzer.controller');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/status', asyncHandler(buzzerController.getStatus));
router.get('/devices', asyncHandler(buzzerController.getDevices));
router.post('/test/start', asyncHandler(buzzerController.testStart));
router.post('/test/stop', asyncHandler(buzzerController.testStop));
router.post('/test/press', asyncHandler(buzzerController.testPress));
router.post('/reset', asyncHandler(buzzerController.reset));
router.get('/assignments', asyncHandler(buzzerController.getAssignments));
router.post('/assignments', asyncHandler(buzzerController.upsertAssignment));
router.post('/mode', asyncHandler(buzzerController.setMode));
router.post('/reset-lock', asyncHandler(buzzerController.resetLock));
router.get('/runtime', asyncHandler(buzzerController.getRuntime));

module.exports = router;