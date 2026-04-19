// src/routes/upload.routes.js

const express = require('express');
const uploadController = require('../controllers/upload.controller');
const { authenticateToken } = require('../middlewares/auth');
const { uploadMiddleware } = require('../services/upload.service');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

// Оставляем одинарную загрузку поля file,
// потому что так уже работает текущий frontend.
router.post(
  '/',
  authenticateToken,
  uploadMiddleware.single('file'),
  asyncHandler(uploadController.uploadFile)
);

module.exports = router;