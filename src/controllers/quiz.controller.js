// src/controllers/quiz.controller.js

const quizService = require('../services/quiz.service');

async function list(req, res) {
  const result = await quizService.getQuizList({
    authorId: req.query.authorId || null,
    currentUserId: req.user?.id || null,
  });

  return res.json(result);
}

async function getById(req, res) {
  const result = await quizService.getQuizById({
    quizId: req.params.id,
    currentUserId: req.user?.id || null,
  });

  return res.json(result);
}

async function create(req, res) {
  const result = await quizService.createQuiz({
    userId: req.user.id,
    payload: req.body,
  });

  return res.status(201).json(result);
}

async function update(req, res) {
  const result = await quizService.updateQuiz({
    quizId: req.params.id,
    currentUser: req.user,
    payload: req.body,
  });

  return res.json(result);
}

async function remove(req, res) {
  const result = await quizService.deleteQuiz({
    quizId: req.params.id,
    currentUser: req.user,
  });

  return res.json(result);
}

async function reorderQuestions(req, res) {
  const result = await quizService.reorderQuestions({
    quizId: req.params.quizId,
    currentUser: req.user,
    payload: req.body,
  });

  return res.json(result);
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  reorderQuestions,
};