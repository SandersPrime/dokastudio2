// src/middlewares/request-id.js

const crypto = require('crypto');

function createRequestId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
}

function requestId(req, res, next) {
  const incomingId = req.headers['x-request-id'];
  req.requestId = typeof incomingId === 'string' && incomingId.trim() ? incomingId.trim() : createRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  return next();
}

module.exports = { requestId };
