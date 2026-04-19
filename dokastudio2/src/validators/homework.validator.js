// src/validators/homework.validator.js

const { createHttpError } = require('../utils/http-error');
const { HOMEWORK_STATUSES } = require('../constants/homework-statuses');

const ALLOWED_HOMEWORK_STATUSES = new Set(Object.values(HOMEWORK_STATUSES));

function validateHomeworkStatus(status) {
  const normalized = String(status || '').trim().toUpperCase();

  if (!ALLOWED_HOMEWORK_STATUSES.has(normalized)) {
    throw new Error(`Некорректный статус homework: ${status}`);
  }

  return normalized;
}

module.exports = {
  ALLOWED_HOMEWORK_STATUSES,
  validateHomeworkStatus,
};

function optionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized || null;
}

function optionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(400, `${fieldName} должен быть корректной датой`);
  }

  return date;
}

function optionalPositiveInt(value, fieldName, fallback) {
  if (value === undefined || value === null || value === '') return fallback;

  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 1 || normalized > 100) {
    throw createHttpError(400, `${fieldName} должен быть целым числом от 1 до 100`);
  }

  return normalized;
}

function optionalBoolean(value, fallback) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function validateCreateHomeworkPayload(payload = {}) {
  const title = requireString(payload.title ?? payload.name, 'title');

  return {
    quizId: requireString(payload.quizId, 'quizId'),
    title,
    description: optionalString(payload.description),
    dueDate: optionalDate(payload.dueDate ?? payload.deadline, 'dueDate'),
    maxAttempts: optionalPositiveInt(payload.maxAttempts, 'maxAttempts', 1),
    showCorrectAnswers: optionalBoolean(
      payload.showCorrectAnswers ?? payload.showAnswersAfter,
      false
    ),
    status: HOMEWORK_STATUSES.ACTIVE,
  };
}

function validateUpdateHomeworkPayload(payload = {}) {
  const data = {};

  if (payload.title !== undefined || payload.name !== undefined) {
    data.title = requireString(payload.title ?? payload.name, 'title');
  }

  if (payload.description !== undefined) {
    data.description = optionalString(payload.description);
  }

  if (payload.dueDate !== undefined || payload.deadline !== undefined) {
    data.dueDate = optionalDate(payload.dueDate ?? payload.deadline, 'dueDate');
  }

  if (payload.maxAttempts !== undefined) {
    data.maxAttempts = optionalPositiveInt(payload.maxAttempts, 'maxAttempts', 1);
  }

  if (payload.showCorrectAnswers !== undefined || payload.showAnswersAfter !== undefined) {
    data.showCorrectAnswers = optionalBoolean(
      payload.showCorrectAnswers ?? payload.showAnswersAfter,
      false
    );
  }

  if (payload.status !== undefined) {
    const status = String(payload.status || '').trim().toUpperCase();
    if (!ALLOWED_HOMEWORK_STATUSES.has(status)) {
      throw createHttpError(400, 'Некорректный статус homework');
    }
    data.status = status;
  }

  return data;
}

function validatePinCode(pinCode) {
  const normalizedPinCode = String(pinCode || '').trim();

  if (!/^\d{6}$/.test(normalizedPinCode)) {
    throw createHttpError(400, 'PIN-код должен состоять из 6 цифр');
  }

  return normalizedPinCode;
}

function validateStudentName(payload = {}) {
  const studentName = requireString(payload.studentName, 'studentName');

  if (studentName.length > 80) {
    throw createHttpError(400, 'studentName не должен быть длиннее 80 символов');
  }

  return studentName;
}

function validateStartPayload(payload = {}) {
  return {
    studentName: validateStudentName(payload),
  };
}

function validateSubmitPayload(payload = {}) {
  const studentName = validateStudentName(payload);
  const submissionId = requireString(payload.submissionId, 'submissionId');

  if (!Array.isArray(payload.answers)) {
    throw createHttpError(400, 'answers должен быть массивом');
  }

  const answers = payload.answers.map((answer) => {
    const questionId = requireString(answer.questionId, 'questionId');
    const answerId =
      answer.answerId === undefined || answer.answerId === null || answer.answerId === ''
        ? null
        : requireString(answer.answerId, 'answerId');

    return {
      questionId,
      answerId,
    };
  });

  return {
    studentName,
    submissionId,
    answers,
  };
}

module.exports = {
  HOMEWORK_STATUSES,
  validateCreateHomeworkPayload,
  validateUpdateHomeworkPayload,
  validatePinCode,
  validateStartPayload,
  validateSubmitPayload,
};
