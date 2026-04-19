// src/utils/async-handler.js
// Обёртка для async route handlers/controllers,
// чтобы не писать try/catch в каждом роуте.

function asyncHandler(fn) {
  return function wrappedAsyncHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { asyncHandler };