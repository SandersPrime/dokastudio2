// src/validators/catalog.validator.js

const { createHttpError } = require('../utils/http-error');

function normalizeOptionalString(value, maxLength = 120) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeOptionalBoolean(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;

  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'paid'].includes(normalized)) return true;
  if (['false', '0', 'no', 'free'].includes(normalized)) return false;

  throw createHttpError(400, 'Некорректный фильтр isPaid');
}

function validateCatalogQuery(query = {}) {
  return {
    q: normalizeOptionalString(query.q, 80),
    category: normalizeOptionalString(query.category, 80),
    ageGroup: normalizeOptionalString(query.ageGroup, 80),
    format: normalizeOptionalString(query.format, 80),
    isPaid: normalizeOptionalBoolean(query.isPaid),
  };
}

function validateCatalogId(id) {
  const normalized = String(id || '').trim();

  if (!normalized) {
    throw createHttpError(400, 'id обязателен');
  }

  return normalized;
}

module.exports = {
  validateCatalogQuery,
  validateCatalogId,
};
