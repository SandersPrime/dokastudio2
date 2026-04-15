// src/validators/session.validator.js

const { createHttpError } = require('../utils/http-error');

function requireStringId(value, fieldName) {
  const id = String(value || '').trim();

  if (!id) {
    throw createHttpError(400, `${fieldName} обязателен`);
  }

  return id;
}

function validateCreateSessionPayload(payload = {}) {
  return {
    quizId: requireStringId(payload.quizId, 'quizId'),
  };
}

function validatePinCodeParam(pinCode) {
  const normalizedPinCode = String(pinCode || '').trim();

  if (!/^\d{6}$/.test(normalizedPinCode)) {
    throw createHttpError(400, 'PIN-код должен состоять из 6 цифр');
  }

  return normalizedPinCode;
}

function validateSessionIdParam(sessionId) {
  return requireStringId(sessionId, 'sessionId');
}

module.exports = {
  validateCreateSessionPayload,
  validatePinCodeParam,
  validateSessionIdParam,
};
