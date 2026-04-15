// src/validators/earnings.validator.js

const { createHttpError } = require('../utils/http-error');
const { PAYOUT_STATUSES } = require('../constants/payout-statuses');

function validatePayoutRequestPayload(payload = {}) {
  const amount = Number(payload.amount);
  const payoutMethod = String(payload.payoutMethod || '').trim();
  const payoutDetails = String(payload.payoutDetails || '').trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw createHttpError(400, 'amount должен быть больше 0');
  }

  if (!payoutMethod) {
    throw createHttpError(400, 'payoutMethod обязателен');
  }

  if (!payoutDetails) {
    throw createHttpError(400, 'payoutDetails обязателен');
  }

  return {
    amount: Math.round(amount * 100) / 100,
    payoutMethod: payoutMethod.slice(0, 120),
    payoutDetails: payoutDetails.slice(0, 2000),
  };
}

function validateAdminNotePayload(payload = {}) {
  const adminNote =
    payload.adminNote === undefined || payload.adminNote === null
      ? null
      : String(payload.adminNote).trim().slice(0, 2000) || null;

  return { adminNote };
}

function validatePayoutRequestId(id) {
  const normalized = String(id || '').trim();

  if (!normalized) {
    throw createHttpError(400, 'id заявки обязателен');
  }

  return normalized;
}

module.exports = {
  PAYOUT_STATUSES,
  validatePayoutRequestPayload,
  validateAdminNotePayload,
  validatePayoutRequestId,
};
