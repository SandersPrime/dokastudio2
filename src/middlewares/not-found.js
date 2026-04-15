// src/middlewares/not-found.js

const { createHttpError } = require('../utils/http-error');

function notFound(req, res, next) {
  return next(createHttpError(404, 'API route not found', { path: req.originalUrl }));
}

module.exports = { notFound };
