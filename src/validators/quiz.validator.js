// src/validators/quiz.validator.js

const { createHttpError } = require('../utils/http-error');

function toOptionalString(value) {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function toOptionalBoolean(value) {
  if (value === undefined) return undefined;
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
  const description = toOptionalString(payload.description);
  const thumbnailUrl = toOptionalString(payload.thumbnailUrl);

  if (!title) {
    throw createHttpError(400, 'Название квиза обязательно');
  }

  return {
    title,
    description,
    thumbnailUrl,
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
    category: toOptionalString(payload.category),
    ageGroup: toOptionalString(payload.ageGroup),
    format: toOptionalString(payload.format),
  };
}

function validateUpdateQuizPayload(payload = {}) {
  const data = {};

  if (payload.title !== undefined) {
    const title = String(payload.title).trim();
    if (!title) {
      throw createHttpError(400, 'Название квиза не может быть пустым');
    }
    data.title = title;
  }

  if (payload.description !== undefined) {
    data.description = toOptionalString(payload.description);
  }

  if (payload.thumbnailUrl !== undefined) {
    data.thumbnailUrl = toOptionalString(payload.thumbnailUrl);
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
    data.category = toOptionalString(payload.category);
  }

  if (payload.ageGroup !== undefined) {
    data.ageGroup = toOptionalString(payload.ageGroup);
  }

  if (payload.format !== undefined) {
    data.format = toOptionalString(payload.format);
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
