// src/validators/question.validator.js

const { createHttpError } = require('../utils/http-error');

const ALLOWED_TYPES = new Set([
  'EVERYONE_ANSWERS',
  'FASTEST_FINGER',
  'MULTIPLE_CORRECT',
  'ORDERED',
  'TEXT',
  'IMAGE',
  'AUDIO',
  'VIDEO',
  'TRUEFALSE',
  'TRUE_FALSE',
  'DECREASING_POINTS',
  'WAGER',
  'MAJORITY_RULES',
  'LAST_MAN_STANDING',
  'JEOPARDY_ROUND',
  'MILLIONAIRE_ROUND',
  'INFO_SLIDE',
  'ROUND_INTRO',
  'WORDCLOUD',
  'MAJORITYRULES',
  'BILLBOARD',
  'RATING',
]);

const ALLOWED_LAYOUT_TYPES = new Set([
  'QUESTION',
  'INFO_SLIDE',
  'ROUND_INTRO',
  'GAME_ROUND',
]);

const ALLOWED_ELEMENT_TYPES = new Set([
  'QUESTION',
  'INFO_SLIDE',
  'ROUND_INTRO',
  'GAME_ROUND',
]);

function normalizeType(type) {
  const normalized = String(type || '').trim().toUpperCase();
  if (normalized === 'TRUEFALSE') return 'TRUE_FALSE';
  if (normalized === 'MULTIPLE') return 'EVERYONE_ANSWERS';
  if (normalized === 'MAJORITYRULES') return 'MAJORITY_RULES';
  return normalized;
}

function inferElementType(type, explicitElementType) {
  const normalized = String(explicitElementType || '').trim().toUpperCase();

  if (normalized) {
    if (!ALLOWED_ELEMENT_TYPES.has(normalized)) {
      throw createHttpError(400, `Unsupported elementType: ${normalized}`);
    }
    return normalized;
  }

  if (type === 'INFO_SLIDE') return 'INFO_SLIDE';
  if (type === 'ROUND_INTRO') return 'ROUND_INTRO';
  if (['JEOPARDY_ROUND', 'MILLIONAIRE_ROUND'].includes(type)) return 'GAME_ROUND';
  return 'QUESTION';
}

function toOptionalString(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return null;
  }

  return String(value).trim();
}

function normalizeConfigJson(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch (error) {
      throw createHttpError(400, 'configJson должен быть валидным JSON');
    }
  }

  try {
    return JSON.stringify(value);
  } catch (error) {
    throw createHttpError(400, 'configJson должен быть сериализуемым объектом');
  }
}

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
  if (type === 'TRUEFALSE' || type === 'TRUE_FALSE') {
    return;
  }

  if (type === 'INFO_SLIDE' || type === 'ROUND_INTRO' || type === 'JEOPARDY_ROUND') {
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
    const type = normalizeType(payload.type || 'EVERYONE_ANSWERS');
    if (!ALLOWED_TYPES.has(type)) {
      throw createHttpError(400, `Неподдерживаемый тип вопроса: ${type}`);
    }
    data.type = type;
  }

  if (!isUpdate || payload.layoutType !== undefined) {
    const fallbackLayout = data.type === 'INFO_SLIDE'
      ? 'INFO_SLIDE'
      : data.type === 'ROUND_INTRO'
        ? 'ROUND_INTRO'
        : ['JEOPARDY_ROUND', 'MILLIONAIRE_ROUND'].includes(data.type)
          ? 'GAME_ROUND'
          : 'QUESTION';
    const layoutType = String(payload.layoutType || fallbackLayout).trim().toUpperCase();
    if (!ALLOWED_LAYOUT_TYPES.has(layoutType)) {
      throw createHttpError(400, `Неподдерживаемый layoutType: ${layoutType}`);
    }
    data.layoutType = layoutType;
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
    'subtitle',
    'imageUrl',
    'audioUrl',
    'videoUrl',
    'gameMode',
    'backgroundColor',
    'backgroundImageUrl',
    'countdownMode',
    'textReveal',
    'demographicGroup',
    'slideRouting',
    'notes',
  ];

  for (const field of optionalStringFields) {
    if (!isUpdate || payload[field] !== undefined) {
      data[field] = toOptionalString(payload[field]);
    }
  }

  if (!isUpdate || payload.configJson !== undefined) {
    data.configJson = normalizeConfigJson(payload.configJson);
  }

  // Совместимость с текущим фронтом, где медиа могло прийти как mediaUrl
  if (payload.mediaUrl) {
    const mediaUrl = String(payload.mediaUrl).trim();
    const type = data.type || normalizeType(payload.type || 'EVERYONE_ANSWERS');

    if (type === 'IMAGE') data.imageUrl = mediaUrl;
    if (type === 'AUDIO') data.audioUrl = mediaUrl;
    if (type === 'VIDEO') data.videoUrl = mediaUrl;
  }

  if (!isUpdate || payload.answers !== undefined) {
    const type = data.type || normalizeType(payload.type || 'EVERYONE_ANSWERS');
    let answers = normalizeAnswers(payload.answers || []);

    if (type === 'TRUEFALSE' || type === 'TRUE_FALSE') {
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

const STUDIO_ELEMENT_TYPES = new Set([
  'QUESTION',
  'INFO_SLIDE',
  'ROUND_INTRO',
  'GAME_ROUND',
]);

function normalizeStudioMode(mode) {
  return normalizeType(mode || 'EVERYONE_ANSWERS');
}

function inferStudioElementType(mode, elementType) {
  const normalizedElementType = String(elementType || '').trim().toUpperCase();

  if (normalizedElementType) {
    if (!STUDIO_ELEMENT_TYPES.has(normalizedElementType)) {
      throw createHttpError(400, `Unsupported elementType: ${normalizedElementType}`);
    }
    return normalizedElementType;
  }

  if (mode === 'INFO_SLIDE') return 'INFO_SLIDE';
  if (mode === 'ROUND_INTRO') return 'ROUND_INTRO';
  if (['JEOPARDY_ROUND', 'MILLIONAIRE_ROUND'].includes(mode)) return 'GAME_ROUND';
  return 'QUESTION';
}

function normalizeStudioQuestionPayload(payload = {}, isUpdate = false) {
  const patchedPayload = { ...payload };
  const mode = normalizeStudioMode(payload.gameMode || payload.mode || payload.type);

  if (!isUpdate || payload.type !== undefined || payload.gameMode !== undefined || payload.mode !== undefined) {
    if (!ALLOWED_TYPES.has(mode)) {
      throw createHttpError(400, `Unsupported question mode: ${mode}`);
    }

    patchedPayload.type = mode;
    patchedPayload.gameMode = mode;
  }

  const data = normalizeQuestionPayload(patchedPayload, isUpdate);

  if (!isUpdate || payload.elementType !== undefined || payload.type !== undefined || payload.gameMode !== undefined || payload.mode !== undefined) {
    data.elementType = inferStudioElementType(mode, payload.elementType);
  }

  if (!isUpdate || payload.layoutType !== undefined || payload.elementType !== undefined || payload.type !== undefined || payload.gameMode !== undefined || payload.mode !== undefined) {
    data.layoutType = String(payload.layoutType || data.elementType || inferStudioElementType(mode, payload.elementType)).trim().toUpperCase();

    if (!ALLOWED_LAYOUT_TYPES.has(data.layoutType)) {
      throw createHttpError(400, `Unsupported layoutType: ${data.layoutType}`);
    }
  }

  return data;
}

function validateCreateStudioQuestionPayload(payload = {}) {
  return normalizeStudioQuestionPayload(payload, false);
}

function validateUpdateStudioQuestionPayload(payload = {}) {
  return normalizeStudioQuestionPayload(payload, true);
}

module.exports = {
  validateCreateQuestionPayload: validateCreateStudioQuestionPayload,
  validateUpdateQuestionPayload: validateUpdateStudioQuestionPayload,
};
