// src/validators/quiz.validator.js

const { createHttpError } = require('../utils/http-error');

const QUIZ_TITLE_MAX_LENGTH = 160;
const QUIZ_DESCRIPTION_MAX_LENGTH = 2000;
const QUIZ_META_MAX_LENGTH = 80;
const QUIZ_URL_MAX_LENGTH = 2048;

function toOptionalString(value) {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function assertMaxLength(value, maxLength, fieldLabel) {
  if (value !== null && value !== undefined && String(value).length > maxLength) {
    throw createHttpError(400, `${fieldLabel} слишком длинное`);
  }
}

function toOptionalUrl(value, fieldLabel) {
  const str = toOptionalString(value);
  if (!str) return null;

  assertMaxLength(str, QUIZ_URL_MAX_LENGTH, fieldLabel);

  try {
    const parsed = new URL(str, 'http://localhost');
    const isAbsolute = parsed.origin !== 'http://localhost' || /^https?:\/\//i.test(str);
    const isLocalPath = str.startsWith('/');

    if (!isAbsolute && !isLocalPath) {
      throw new Error('Invalid URL');
    }

    if (isAbsolute && !['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }

    return str;
  } catch (error) {
    throw createHttpError(400, `${fieldLabel} должен быть URL или локальным путём`);
  }
}

function normalizeQuizMeta(payload = {}) {
  const description = toOptionalString(payload.description);
  const thumbnailUrl = toOptionalUrl(payload.thumbnailUrl, 'Обложка');
  const category = toOptionalString(payload.category);
  const ageGroup = toOptionalString(payload.ageGroup);
  const format = toOptionalString(payload.format);

  assertMaxLength(description, QUIZ_DESCRIPTION_MAX_LENGTH, 'Описание');
  assertMaxLength(category, QUIZ_META_MAX_LENGTH, 'Категория');
  assertMaxLength(ageGroup, QUIZ_META_MAX_LENGTH, 'Возрастная группа');
  assertMaxLength(format, QUIZ_META_MAX_LENGTH, 'Формат');

  return {
    description,
    thumbnailUrl,
    category,
    ageGroup,
    format,
  };
}

function toOptionalBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 1 || value === '1') return true;
  if (value === 0 || value === '0') return false;
  return Boolean(value);
}

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw createHttpError(400, 'Некорректное числовое значение');
  }
  return num;
}

function validateCreateQuizPayload(payload = {}) {
  const title = String(payload.title || '').trim();
  const meta = normalizeQuizMeta(payload);

  if (!title) {
    throw createHttpError(400, 'Название квиза обязательно');
  }

  assertMaxLength(title, QUIZ_TITLE_MAX_LENGTH, 'Название');

  return {
    title,
    ...meta,
    isPrivate: false,
    hasTimer: true,
    timePerQuestion: 30,
    showLeaderboard: true,
    allowReconnect: true,
    isPublished: false,
    isTemplate: false,
    isPaid: false,
    price: 0,
    discount: 0,
  };
}

function validateUpdateQuizPayload(payload = {}) {
  const data = {};

  if (payload.title !== undefined) {
    const title = String(payload.title).trim();
    if (!title) {
      throw createHttpError(400, 'Название квиза не может быть пустым');
    }
    assertMaxLength(title, QUIZ_TITLE_MAX_LENGTH, 'Название');
    data.title = title;
  }

  if (payload.description !== undefined) {
    const description = toOptionalString(payload.description);
    assertMaxLength(description, QUIZ_DESCRIPTION_MAX_LENGTH, 'Описание');
    data.description = description;
  }

  if (payload.thumbnailUrl !== undefined) {
    data.thumbnailUrl = toOptionalUrl(payload.thumbnailUrl, 'Обложка');
  }

  if (payload.isPrivate !== undefined) {
    data.isPrivate = toOptionalBoolean(payload.isPrivate);
  }

  if (payload.hasTimer !== undefined) {
    data.hasTimer = toOptionalBoolean(payload.hasTimer);
  }

  if (payload.timePerQuestion !== undefined) {
    const value = toOptionalNumber(payload.timePerQuestion);
    if (value < 1 || value > 3600) {
      throw createHttpError(400, 'timePerQuestion должен быть от 1 до 3600');
    }
    data.timePerQuestion = value;
  }

  if (payload.showLeaderboard !== undefined) {
    data.showLeaderboard = toOptionalBoolean(payload.showLeaderboard);
  }

  if (payload.allowReconnect !== undefined) {
    data.allowReconnect = toOptionalBoolean(payload.allowReconnect);
  }

  if (payload.isPublished !== undefined) {
    data.isPublished = toOptionalBoolean(payload.isPublished);
  }

  if (payload.isTemplate !== undefined) {
    data.isTemplate = toOptionalBoolean(payload.isTemplate);
  }

  if (payload.isPaid !== undefined) {
    data.isPaid = toOptionalBoolean(payload.isPaid);
  }

  if (payload.price !== undefined) {
    const value = toOptionalNumber(payload.price);
    if (value < 0) {
      throw createHttpError(400, 'price не может быть отрицательным');
    }
    data.price = value;
  }

  if (payload.discount !== undefined) {
    const value = toOptionalNumber(payload.discount);
    if (value < 0) {
      throw createHttpError(400, 'discount не может быть отрицательным');
    }
    data.discount = value;
  }

  if (payload.category !== undefined) {
    const category = toOptionalString(payload.category);
    assertMaxLength(category, QUIZ_META_MAX_LENGTH, 'Категория');
    data.category = category;
  }

  if (payload.ageGroup !== undefined) {
    const ageGroup = toOptionalString(payload.ageGroup);
    assertMaxLength(ageGroup, QUIZ_META_MAX_LENGTH, 'Возрастная группа');
    data.ageGroup = ageGroup;
  }

  if (payload.format !== undefined) {
    const format = toOptionalString(payload.format);
    assertMaxLength(format, QUIZ_META_MAX_LENGTH, 'Формат');
    data.format = format;
  }

  if (!Object.keys(data).length) {
    throw createHttpError(400, 'Нет данных для обновления');
  }

  return data;
}

function validateReorderPayload(payload = {}) {
  const questionIds = Array.isArray(payload.questionIds) ? payload.questionIds : [];

  if (!questionIds.length) {
    throw createHttpError(400, 'questionIds обязателен');
  }

  if (questionIds.some((id) => typeof id !== 'string' || !id.trim())) {
    throw createHttpError(400, 'Некорректный список questionIds');
  }

  return { questionIds };
}

module.exports = {
  validateCreateQuizPayload,
  validateUpdateQuizPayload,
  validateReorderPayload,
};
