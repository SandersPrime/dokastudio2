// src/validators/question.validator.js

const { createHttpError } = require('../utils/http-error');

const ALLOWED_TYPES = new Set([
  'TEXT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'TRUEFALSE',
]);

function normalizeAnswer(answer = {}, index = 0) {
  const text = String(answer.text || '').trim();

  return {
    text,
    imageUrl: answer.imageUrl ? String(answer.imageUrl).trim() : null,
    isCorrect: Boolean(answer.isCorrect),
    order: Number.isInteger(answer.order) ? answer.order : index,
  };
}

function normalizeAnswers(rawAnswers = []) {
  if (!Array.isArray(rawAnswers)) {
    throw createHttpError(400, 'answers должен быть массивом');
  }

  return rawAnswers.map((answer, index) => normalizeAnswer(answer, index));
}

function ensureCorrectAnswerExists(type, answers) {
  if (type === 'TRUEFALSE') {
    return;
  }

  if (!answers.length) {
    throw createHttpError(400, 'Нужен хотя бы один вариант ответа');
  }

  if (!answers.some((answer) => answer.isCorrect)) {
    throw createHttpError(400, 'Нужен хотя бы один правильный ответ');
  }
}

function normalizeQuestionPayload(payload = {}, isUpdate = false) {
  const data = {};

  if (!isUpdate || payload.text !== undefined) {
    const text = String(payload.text || '').trim();
    if (!text) {
      throw createHttpError(400, 'Текст вопроса обязателен');
    }
    data.text = text;
  }

  if (!isUpdate || payload.type !== undefined) {
    const type = String(payload.type || '').trim().toUpperCase();
    if (!ALLOWED_TYPES.has(type)) {
      throw createHttpError(400, `Неподдерживаемый тип вопроса: ${type}`);
    }
    data.type = type;
  }

  if (!isUpdate || payload.points !== undefined) {
    const points = Number(payload.points ?? 100);
    if (!Number.isFinite(points) || points < 0) {
      throw createHttpError(400, 'Некорректное значение points');
    }
    data.points = Math.round(points);
  }

  if (!isUpdate || payload.timeLimit !== undefined) {
    const timeLimit = Number(payload.timeLimit ?? 30);
    if (!Number.isFinite(timeLimit) || timeLimit < 0 || timeLimit > 3600) {
      throw createHttpError(400, 'Некорректное значение timeLimit');
    }
    data.timeLimit = Math.round(timeLimit);
  }

  const optionalIntFields = [
    'pointsAtStart',
    'pointsAtEnd',
    'penaltyPoints',
    'penaltyNoAnswer',
    'speedBonus1',
    'speedBonus2',
    'speedBonus3',
    'order',
  ];

  for (const field of optionalIntFields) {
    if (!isUpdate || payload[field] !== undefined) {
      const raw = payload[field];
      const fallbackMap = {
        pointsAtStart: 100,
        pointsAtEnd: 100,
        penaltyPoints: 0,
        penaltyNoAnswer: 0,
        speedBonus1: 0,
        speedBonus2: 0,
        speedBonus3: 0,
        order: 0,
      };
      const value = Number(raw ?? fallbackMap[field]);
      if (!Number.isFinite(value)) {
        throw createHttpError(400, `Некорректное значение ${field}`);
      }
      data[field] = Math.round(value);
    }
  }

  const optionalBooleanFields = [
    'autoJudge',
    'lockoutOnWrong',
    'showCorrectAnswer',
    'jokersEnabled',
  ];

  for (const field of optionalBooleanFields) {
    if (!isUpdate || payload[field] !== undefined) {
      data[field] = payload[field] === undefined ? true : Boolean(payload[field]);
    }
  }

  const optionalStringFields = [
    'imageUrl',
    'audioUrl',
    'videoUrl',
    'countdownMode',
    'textReveal',
    'demographicGroup',
    'slideRouting',
    'notes',
  ];

  for (const field of optionalStringFields) {
    if (!isUpdate || payload[field] !== undefined) {
      const value = payload[field];
      data[field] =
        value === null || value === undefined || String(value).trim() === ''
          ? null
          : String(value).trim();
    }
  }

  // Совместимость с текущим фронтом, где медиа могло прийти как mediaUrl
  if (payload.mediaUrl) {
    const mediaUrl = String(payload.mediaUrl).trim();
    const type = data.type || String(payload.type || '').trim().toUpperCase();

    if (type === 'IMAGE') data.imageUrl = mediaUrl;
    if (type === 'AUDIO') data.audioUrl = mediaUrl;
    if (type === 'VIDEO') data.videoUrl = mediaUrl;
  }

  if (!isUpdate || payload.answers !== undefined) {
    const type = data.type || String(payload.type || '').trim().toUpperCase();
    let answers = normalizeAnswers(payload.answers || []);

    if (type === 'TRUEFALSE') {
      const selectedTrue =
        answers.find((a) => a.text.toLowerCase() === 'правда' && a.isCorrect) ||
        answers.find((a) => a.text.toLowerCase() === 'true' && a.isCorrect);

      answers = [
        { text: 'Правда', imageUrl: null, isCorrect: Boolean(selectedTrue), order: 0 },
        { text: 'Ложь', imageUrl: null, isCorrect: !Boolean(selectedTrue), order: 1 },
      ];
    }

    ensureCorrectAnswerExists(type, answers);
    data.answers = answers;
  }

  return data;
}

function validateCreateQuestionPayload(payload = {}) {
  return normalizeQuestionPayload(payload, false);
}

function validateUpdateQuestionPayload(payload = {}) {
  return normalizeQuestionPayload(payload, true);
}

module.exports = {
  validateCreateQuestionPayload,
  validateUpdateQuestionPayload,
};