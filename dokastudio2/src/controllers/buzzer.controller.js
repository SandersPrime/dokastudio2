// src/controllers/buzzer.controller.js

const { buzzerService } = require('../services/buzzer.service');

async function getStatus(req, res) {
  const status = await buzzerService.fetchStatus();
  return res.json({ status, online: buzzerService.getSnapshot().online });
}

async function getDevices(req, res) {
  const devices = await buzzerService.fetchDevices();
  return res.json({ devices });
}

async function testStart(req, res) {
  const payload = await buzzerService.testStart();
  return res.json(payload);
}

async function testStop(req, res) {
  const payload = await buzzerService.testStop();
  return res.json(payload);
}

async function testPress(req, res) {
  const buttonId = String(req.body?.buttonId || 'A1');
  const payload = await buzzerService.testPress({ buttonId });
  return res.json(payload);
}

async function reset(req, res) {
  const providerId = req.body?.providerId ? String(req.body.providerId) : undefined;
  const payload = await buzzerService.reset({ providerId });
  return res.json(payload);
}

async function getAssignments(req, res) {
  return res.json({ assignments: buzzerService.getAssignments() });
}

async function upsertAssignment(req, res) {
  const assignment = buzzerService.upsertAssignment(req.body || {});
  return res.json({ assignment });
}

async function setMode(req, res) {
  const runtime = buzzerService.setMode(req.body?.mode);
  return res.json({ runtime });
}

async function resetLock(req, res) {
  buzzerService.resetLockState();
  return res.json({ runtime: buzzerService.getRuntime() });
}

async function getRuntime(req, res) {
  return res.json({ runtime: buzzerService.getRuntime() });
}

module.exports = {
  getStatus,
  getDevices,
  testStart,
  testStop,
  testPress,
  reset,
  getAssignments,
  upsertAssignment,
  setMode,
  resetLock,
  getRuntime,
};