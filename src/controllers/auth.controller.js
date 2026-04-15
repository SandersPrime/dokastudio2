// src/controllers/auth.controller.js
// Контроллеры auth.
// Здесь только разбор req/res, бизнес-логика в service.

const authService = require('../services/auth.service');

async function register(req, res) {
  const result = await authService.register({
    email: req.body.email,
    password: req.body.password,
    name: req.body.name,
  });

  return res.status(201).json(result);
}

async function login(req, res) {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
  });

  return res.json(result);
}

async function me(req, res) {
  const result = await authService.getCurrentUser(req.user.id);
  return res.json(result);
}

module.exports = {
  register,
  login,
  me,
};