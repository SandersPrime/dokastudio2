// src/routes/marketplace.routes.js

const express = require('express');
const marketplaceController = require('../controllers/marketplace.controller');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.post('/publish/:quizId', authenticateToken, asyncHandler(marketplaceController.publish));
router.get('/my', authenticateToken, asyncHandler(marketplaceController.my));
router.get('/pending', authenticateToken, asyncHandler(marketplaceController.pending));
router.put('/:quizId', authenticateToken, asyncHandler(marketplaceController.update));
router.post('/:quizId/approve', authenticateToken, asyncHandler(marketplaceController.approve));
router.post('/:quizId/reject', authenticateToken, asyncHandler(marketplaceController.reject));
router.post('/:quizId/buy', authenticateToken, asyncHandler(marketplaceController.buy));

module.exports = router;
