// src/controllers/catalog.controller.js

const catalogService = require('../services/catalog.service');

async function list(req, res) {
  const result = await catalogService.getCatalog(req.query);
  return res.json(result);
}

async function getById(req, res) {
  const result = await catalogService.getCatalogQuizById(req.params.id);
  return res.json(result);
}

async function clone(req, res) {
  const result = await catalogService.cloneCatalogQuiz({
    id: req.params.id,
    currentUser: req.user,
  });

  return res.status(201).json(result);
}

module.exports = {
  list,
  getById,
  clone,
};
