// src/validators/marketplace.validator.js

const { createHttpError } = require('../utils/http-error');
const { MARKETPLACE_STATUSES } = require('../constants/marketplace-statuses');

function normalizeOptionalString(value, maxLength = 500) {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeOptionalPrice(value) {
  if (value === undefined || value === null || value === '') return undefined;

  const price = Number(value);
  if (!Number.isFinite(price) || price < 0 || price > 1000000) {
    throw createHttpError(400, 'price должен быть числом от 0 до 1000000');
  }

  return price;
}

function validateQuizId(id) {
  const normalized = String(id || '').trim();
  if (!normalized) {
    throw createHttpError(400, 'quizId обязателен');
  }
  return normalized;
}

function validatePublishPayload(payload = {}) {
  const price = normalizeOptionalPrice(payload.price);
  const data = {};

  if (price !== undefined) {
    data.price = price;
    data.isPaid = price > 0;
  }

  const optionalFields = [
    'category',
    'ageGroup',
    'format',
    'thumbnailUrl',
    'description',
    'licenseType',
  ];

  for (const field of optionalFields) {
    if (payload[field] !== undefined) {
      data[field] = normalizeOptionalString(payload[field], field === 'description' ? 2000 : 200);
    }
  }

  return data;
}

function validateRejectPayload(payload = {}) {
  const rejectionReason = normalizeOptionalString(payload.rejectionReason, 1000);

  if (!rejectionReason) {
    throw createHttpError(400, 'Укажите причину отклонения');
  }

  return { rejectionReason };
}

module.exports = {
  MARKETPLACE_STATUSES,
  validateQuizId,
  validatePublishPayload,
  validateRejectPayload,
};
