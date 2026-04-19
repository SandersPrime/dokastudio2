// src/utils/http-error.js
// Унифицированная ошибка приложения

class HttpError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

function createHttpError(statusCode, message, details = null) {
  return new HttpError(statusCode, message, details);
}

module.exports = {
  HttpError,
  createHttpError,
};
