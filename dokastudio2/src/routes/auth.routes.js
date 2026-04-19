// src/routes/auth.routes.js

const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.post('/register', asyncHandler(authController.register));
router.post('/login', asyncHandler(authController.login));
router.get('/me', authenticateToken, asyncHandler(authController.me));

module.exports = router;