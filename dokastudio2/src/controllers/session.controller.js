// src/controllers/session.controller.js

const sessionService = require('../services/session.service');
const {
  validateCreateSessionPayload,
  validatePinCodeParam,
  validateSessionIdParam,
} = require('../validators/session.validator');

async function create(req, res) {
  const payload = validateCreateSessionPayload(req.body);
  const result = await sessionService.createSession({
    quizId: payload.quizId,
    currentUser: req.user,
  });

  return res.status(201).json(result);
}

async function getByPin(req, res) {
  const pinCode = validatePinCodeParam(req.params.pinCode);
  const result = await sessionService.getSessionByPin(pinCode);
  return res.json(result);
}

async function getById(req, res) {
  const sessionId = validateSessionIdParam(req.params.id);
  const result = await sessionService.getSessionById({
    sessionId,
    currentUser: req.user,
  });

  return res.json(result);
}

async function getTeams(req, res) {
  const pinCode = validatePinCodeParam(req.params.pinCode);
  const result = await sessionService.getSessionTeamsByPin(pinCode);
  return res.json(result);
}

async function updateTeams(req, res) {
  const pinCode = validatePinCodeParam(req.params.pinCode);
  const result = await sessionService.updateSessionTeamsByPin(pinCode, req.body);
  return res.json(result);
}

module.exports = {
  create,
  getByPin,
  getById,
  getTeams,
  updateTeams,
};
