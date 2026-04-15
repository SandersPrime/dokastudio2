// src/controllers/homework.controller.js

const homeworkService = require('../services/homework.service');

async function create(req, res) {
  const result = await homeworkService.createHomework({
    currentUser: req.user,
    payload: req.body,
  });

  return res.status(201).json(result);
}

async function list(req, res) {
  const result = await homeworkService.listHomework({
    currentUser: req.user,
  });

  return res.json(result);
}

async function getById(req, res) {
  const result = await homeworkService.getHomeworkById({
    homeworkId: req.params.id,
    currentUser: req.user,
  });

  return res.json(result);
}

async function update(req, res) {
  const result = await homeworkService.updateHomework({
    homeworkId: req.params.id,
    currentUser: req.user,
    payload: req.body,
  });

  return res.json(result);
}

async function remove(req, res) {
  const result = await homeworkService.deleteHomework({
    homeworkId: req.params.id,
    currentUser: req.user,
  });

  return res.json(result);
}

async function report(req, res) {
  const result = await homeworkService.getHomeworkReport({
    homeworkId: req.params.id,
    currentUser: req.user,
  });

  return res.json(result);
}

async function getByPin(req, res) {
  const result = await homeworkService.getHomeworkByPin({
    pinCode: req.params.pinCode,
  });

  return res.json(result);
}

async function startAttempt(req, res) {
  const result = await homeworkService.startHomeworkAttempt({
    pinCode: req.params.pinCode,
    payload: req.body,
  });

  return res.status(201).json(result);
}

async function submitAttempt(req, res) {
  const result = await homeworkService.submitHomeworkAttempt({
    pinCode: req.params.pinCode,
    payload: req.body,
  });

  return res.json(result);
}

async function getResults(req, res) {
  const result = await homeworkService.getStudentResults({
    pinCode: req.params.pinCode,
    submissionId: req.params.submissionId,
  });

  return res.json(result);
}

module.exports = {
  create,
  list,
  getById,
  update,
  remove,
  report,
  getByPin,
  startAttempt,
  submitAttempt,
  getResults,
};
