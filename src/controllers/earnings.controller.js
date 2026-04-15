// src/controllers/earnings.controller.js

const earningsService = require('../services/earnings.service');

async function summary(req, res) {
  const result = await earningsService.getSummary({ currentUser: req.user });
  return res.json(result);
}

async function sales(req, res) {
  const result = await earningsService.getSales({ currentUser: req.user });
  return res.json(result);
}

async function createPayoutRequest(req, res) {
  const result = await earningsService.createPayoutRequest({
    currentUser: req.user,
    payload: req.body,
  });
  return res.status(201).json(result);
}

async function payoutRequests(req, res) {
  const result = await earningsService.getPayoutRequests({ currentUser: req.user });
  return res.json(result);
}

async function adminPayoutRequests(req, res) {
  const result = await earningsService.getAdminPayoutRequests({ currentUser: req.user });
  return res.json(result);
}

async function approvePayoutRequest(req, res) {
  const result = await earningsService.approvePayoutRequest({
    id: req.params.id,
    currentUser: req.user,
    payload: req.body,
  });
  return res.json(result);
}

async function rejectPayoutRequest(req, res) {
  const result = await earningsService.rejectPayoutRequest({
    id: req.params.id,
    currentUser: req.user,
    payload: req.body,
  });
  return res.json(result);
}

async function markPayoutPaid(req, res) {
  const result = await earningsService.markPayoutPaid({
    id: req.params.id,
    currentUser: req.user,
    payload: req.body,
  });
  return res.json(result);
}

module.exports = {
  summary,
  sales,
  createPayoutRequest,
  payoutRequests,
  adminPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest,
  markPayoutPaid,
};
