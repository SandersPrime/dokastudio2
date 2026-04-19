// src/routes/earnings.routes.js

const express = require('express');
const earningsController = require('../controllers/earnings.controller');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/summary', authenticateToken, asyncHandler(earningsController.summary));
router.get('/sales', authenticateToken, asyncHandler(earningsController.sales));
router.post('/payout-request', authenticateToken, asyncHandler(earningsController.createPayoutRequest));
router.get('/payout-requests', authenticateToken, asyncHandler(earningsController.payoutRequests));

router.get('/admin/payout-requests', authenticateToken, asyncHandler(earningsController.adminPayoutRequests));
router.post('/admin/payout-requests/:id/approve', authenticateToken, asyncHandler(earningsController.approvePayoutRequest));
router.post('/admin/payout-requests/:id/reject', authenticateToken, asyncHandler(earningsController.rejectPayoutRequest));
router.post('/admin/payout-requests/:id/mark-paid', authenticateToken, asyncHandler(earningsController.markPayoutPaid));

module.exports = router;
