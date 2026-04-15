// src/controllers/question.controller.js

const questionService = require('../services/question.service');

async function create(req, res) {
  const result = await questionService.createQuestion({
    quizId: req.params.quizId,
    currentUser: req.user,
    payload: req.body,
  });

  return res.status(201).json(result);
}

async function update(req, res) {
  const result = await questionService.updateQuestion({
    questionId: req.params.id,
    currentUser: req.user,
    payload: req.body,
  });

  return res.json(result);
}

async function remove(req, res) {
  const result = await questionService.deleteQuestion({
    questionId: req.params.id,
    currentUser: req.user,
  });

  return res.json(result);
}

module.exports = {
  create,
  update,
  remove,
};