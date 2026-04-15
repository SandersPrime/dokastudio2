// src/controllers/marketplace.controller.js

const marketplaceService = require('../services/marketplace.service');

async function publish(req, res) {
  const result = await marketplaceService.publishQuiz({
    quizId: req.params.quizId,
    currentUser: req.user,
    payload: req.body,
  });

  return res.json(result);
}

async function update(req, res) {
  const result = await marketplaceService.updateMarketplaceQuiz({
    quizId: req.params.quizId,
    currentUser: req.user,
    payload: req.body,
  });

  return res.json(result);
}

async function my(req, res) {
  const result = await marketplaceService.getMyMarketplace({
    currentUser: req.user,
  });

  return res.json(result);
}

async function pending(req, res) {
  const result = await marketplaceService.getPendingQuizzes({
    currentUser: req.user,
  });

  return res.json(result);
}

async function approve(req, res) {
  const result = await marketplaceService.approveQuiz({
    quizId: req.params.quizId,
    currentUser: req.user,
  });

  return res.json(result);
}

async function reject(req, res) {
  const result = await marketplaceService.rejectQuiz({
    quizId: req.params.quizId,
    currentUser: req.user,
    payload: req.body,
  });

  return res.json(result);
}

async function buy(req, res) {
  const result = await marketplaceService.buyQuiz({
    quizId: req.params.quizId,
    currentUser: req.user,
  });

  return res.status(201).json(result);
}

module.exports = {
  publish,
  update,
  my,
  pending,
  approve,
  reject,
  buy,
};
