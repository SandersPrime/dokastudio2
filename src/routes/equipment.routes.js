// src/routes/equipment.routes.js

const express = require('express');
const equipmentController = require('../controllers/equipment.controller');
const { authenticateToken } = require('../middlewares/auth');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/admin/products', authenticateToken, asyncHandler(equipmentController.adminListProducts));
router.post('/admin/products', authenticateToken, asyncHandler(equipmentController.adminCreateProduct));
router.put('/admin/products/:id', authenticateToken, asyncHandler(equipmentController.adminUpdateProduct));
router.delete('/admin/products/:id', authenticateToken, asyncHandler(equipmentController.adminDeleteProduct));
router.get('/admin/requests', authenticateToken, asyncHandler(equipmentController.adminListRequests));
router.put('/admin/requests/:id', authenticateToken, asyncHandler(equipmentController.adminUpdateRequest));

router.get('/', asyncHandler(equipmentController.list));
router.post('/requests', asyncHandler(equipmentController.createRequest));
router.get('/:slug', asyncHandler(equipmentController.getBySlug));

module.exports = router;
