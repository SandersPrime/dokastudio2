// src/routes/session.routes.js

const express = require('express');
const sessionController = require('../controllers/session.controller');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.post('/', authenticateToken, asyncHandler(sessionController.create));
router.get('/pin/:pinCode', optionalAuth, asyncHandler(sessionController.getByPin));
router.get('/:id', authenticateToken, asyncHandler(sessionController.getById));

module.exports = router;