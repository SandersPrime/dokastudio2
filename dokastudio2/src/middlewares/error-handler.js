// src/middlewares/error-handler.js

const { env } = require('../config/env');
const { HttpError } = require('../utils/http-error');

function getStatusCode(error) {
  if (error instanceof HttpError) return error.statusCode;
  if (error?.message === 'Неподдерживаемый тип файла') return 400;
  if (Number.isInteger(error?.statusCode)) return error.statusCode;
  if (Number.isInteger(error?.status)) return error.status;
  return 500;
}

function getPublicMessage(error, statusCode) {
  if (statusCode >= 500 && env.nodeEnv === 'production') return 'Internal server error';
  return error?.message || 'Internal server error';
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const statusCode = getStatusCode(error);
  const requestId = req.requestId || null;
  const logPayload = {
    requestId,
    method: req.method,
    url: req.originalUrl,
    statusCode,
    message: error?.message,
  };

  if (statusCode >= 500) {
    console.error('[ErrorHandler]', logPayload, error);
  } else {
    console.warn('[ErrorHandler]', logPayload);
  }

  return res.status(statusCode).json({
    error: getPublicMessage(error, statusCode),
    details: error?.details || undefined,
    requestId,
  });
}

module.exports = { errorHandler };
