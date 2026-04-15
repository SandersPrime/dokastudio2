// src/controllers/equipment.controller.js

const equipmentService = require('../services/equipment.service');

async function list(req, res) {
  const result = await equipmentService.listProducts(req.query);
  return res.json(result);
}

async function getBySlug(req, res) {
  const result = await equipmentService.getProductBySlug(req.params.slug);
  return res.json(result);
}

async function createRequest(req, res) {
  const result = await equipmentService.createRequest(req.body);
  return res.status(201).json(result);
}

async function adminCreateProduct(req, res) {
  const result = await equipmentService.adminCreateProduct({
    currentUser: req.user,
    payload: req.body,
  });
  return res.status(201).json(result);
}

async function adminListProducts(req, res) {
  const result = await equipmentService.adminListProducts({
    currentUser: req.user,
    query: req.query,
  });
  return res.json(result);
}

async function adminUpdateProduct(req, res) {
  const result = await equipmentService.adminUpdateProduct({
    currentUser: req.user,
    productId: req.params.id,
    payload: req.body,
  });
  return res.json(result);
}

async function adminDeleteProduct(req, res) {
  const result = await equipmentService.adminDeleteProduct({
    currentUser: req.user,
    productId: req.params.id,
  });
  return res.json(result);
}

async function adminListRequests(req, res) {
  const result = await equipmentService.adminListRequests({
    currentUser: req.user,
    query: req.query,
  });
  return res.json(result);
}

async function adminUpdateRequest(req, res) {
  const result = await equipmentService.adminUpdateRequest({
    currentUser: req.user,
    requestId: req.params.id,
    payload: req.body,
  });
  return res.json(result);
}

module.exports = {
  list,
  getBySlug,
  createRequest,
  adminCreateProduct,
  adminListProducts,
  adminUpdateProduct,
  adminDeleteProduct,
  adminListRequests,
  adminUpdateRequest,
};
