// src/routes/catalog.routes.js

const express = require('express');
const catalogController = require('../controllers/catalog.controller');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/', asyncHandler(catalogController.list));
router.get('/:id', asyncHandler(catalogController.getById));
router.post('/:id/clone', authenticateToken, asyncHandler(catalogController.clone));

module.exports = router;
