// src/validators/equipment.validator.js

const { createHttpError } = require('../utils/http-error');
const {
  EQUIPMENT_REQUEST_TYPES,
  EQUIPMENT_REQUEST_STATUSES,
} = require('../constants/equipment-statuses');

const REQUEST_TYPES = new Set(Object.values(EQUIPMENT_REQUEST_TYPES));
const REQUEST_STATUSES = new Set(Object.values(EQUIPMENT_REQUEST_STATUSES));

function optionalString(value, max = 1000) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = String(value).trim();
  return normalized ? normalized.slice(0, max) : null;
}

function requiredString(value, fieldName, max = 300) {
  const normalized = String(value || '').trim();
  if (!normalized) throw createHttpError(400, `${fieldName} обязателен`);
  return normalized.slice(0, max);
}

function optionalNumber(value, fieldName, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw createHttpError(400, `${fieldName} должен быть неотрицательным числом`);
  }
  return Math.round(number * 100) / 100;
}

function optionalInt(value, fieldName, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw createHttpError(400, `${fieldName} должен быть неотрицательным целым числом`);
  }
  return number;
}

function optionalBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  if (String(value).toLowerCase() === 'true') return true;
  if (String(value).toLowerCase() === 'false') return false;
  return Boolean(value);
}

function optionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw createHttpError(400, `${fieldName} должен быть корректной датой`);
  return date;
}

function normalizeSlug(value, fallbackTitle = '') {
  const raw = String(value || fallbackTitle || '').trim().toLowerCase();
  const slug = raw
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  if (!slug) throw createHttpError(400, 'slug обязателен');
  return slug;
}

function normalizeGalleryJson(value) {
  if (value === undefined || value === null || value === '') return '[]';
  if (Array.isArray(value)) return JSON.stringify(value.map((item) => String(item).trim()).filter(Boolean));
  try {
    const parsed = JSON.parse(String(value));
    if (!Array.isArray(parsed)) throw new Error('galleryJson должен быть массивом');
    return JSON.stringify(parsed.map((item) => String(item).trim()).filter(Boolean));
  } catch (error) {
    throw createHttpError(400, 'galleryJson должен быть JSON-массивом');
  }
}

function validateProductPayload(payload = {}, isUpdate = false) {
  const data = {};
  const titleSource = payload.title;

  if (!isUpdate || payload.title !== undefined) data.title = requiredString(payload.title, 'title');
  if (!isUpdate || payload.slug !== undefined) data.slug = normalizeSlug(payload.slug, titleSource);
  if (!isUpdate || payload.description !== undefined) data.description = optionalString(payload.description, 5000);
  if (!isUpdate || payload.shortDescription !== undefined) data.shortDescription = optionalString(payload.shortDescription, 500);
  if (!isUpdate || payload.imageUrl !== undefined) data.imageUrl = optionalString(payload.imageUrl, 1000);
  if (!isUpdate || payload.galleryJson !== undefined) data.galleryJson = normalizeGalleryJson(payload.galleryJson);
  if (!isUpdate || payload.category !== undefined) data.category = optionalString(payload.category, 120);
  if (!isUpdate || payload.scenarioType !== undefined) data.scenarioType = optionalString(payload.scenarioType, 120);
  if (!isUpdate || payload.price !== undefined) data.price = optionalNumber(payload.price, 'price', 0);
  if (!isUpdate || payload.rentalPriceDay !== undefined) data.rentalPriceDay = optionalNumber(payload.rentalPriceDay, 'rentalPriceDay', 0);
  if (!isUpdate || payload.depositAmount !== undefined) data.depositAmount = optionalNumber(payload.depositAmount, 'depositAmount', 0);
  if (!isUpdate || payload.stockQty !== undefined) data.stockQty = optionalInt(payload.stockQty, 'stockQty', 0);
  if (!isUpdate || payload.availableForSale !== undefined) data.availableForSale = optionalBoolean(payload.availableForSale, true);
  if (!isUpdate || payload.availableForRent !== undefined) data.availableForRent = optionalBoolean(payload.availableForRent, true);
  if (!isUpdate || payload.isPublished !== undefined) data.isPublished = optionalBoolean(payload.isPublished, false);

  return data;
}

function validateRequestPayload(payload = {}) {
  const type = requiredString(payload.type, 'type').toUpperCase();
  if (!REQUEST_TYPES.has(type)) throw createHttpError(400, 'type должен быть SALE, RENTAL или PACKAGE');
  const rentalDays = payload.rentalDays === undefined || payload.rentalDays === null || payload.rentalDays === ''
    ? null
    : optionalInt(payload.rentalDays, 'rentalDays', 1);
  if (type === 'RENTAL' && (!rentalDays || rentalDays < 1)) {
    throw createHttpError(400, 'Для RENTAL rentalDays должен быть >= 1');
  }
  return {
    type,
    productId: optionalString(payload.productId, 120),
    customerName: requiredString(payload.customerName, 'customerName', 160),
    customerEmail: requiredString(payload.customerEmail, 'customerEmail', 200),
    customerPhone: optionalString(payload.customerPhone, 80),
    companyName: optionalString(payload.companyName, 200),
    eventDate: optionalDate(payload.eventDate, 'eventDate'),
    rentalDays,
    quantity: Math.max(1, optionalInt(payload.quantity, 'quantity', 1)),
    message: optionalString(payload.message, 3000),
  };
}

function validateAdminRequestPayload(payload = {}) {
  const data = {};
  if (payload.status !== undefined) {
    const status = String(payload.status || '').trim().toUpperCase();
    if (!REQUEST_STATUSES.has(status)) throw createHttpError(400, 'Некорректный status заявки');
    data.status = status;
  }
  if (payload.adminNote !== undefined) data.adminNote = optionalString(payload.adminNote, 3000);
  return data;
}

function validateEquipmentQuery(query = {}) {
  return {
    q: optionalString(query.q, 120),
    category: optionalString(query.category, 120),
    scenarioType: optionalString(query.scenarioType, 120),
    availableForSale: query.availableForSale === undefined || query.availableForSale === '' ? null : String(query.availableForSale) === 'true',
    availableForRent: query.availableForRent === undefined || query.availableForRent === '' ? null : String(query.availableForRent) === 'true',
  };
}

module.exports = {
  validateProductPayload,
  validateRequestPayload,
  validateAdminRequestPayload,
  validateEquipmentQuery,
};
