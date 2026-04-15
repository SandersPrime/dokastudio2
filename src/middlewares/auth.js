// src/middlewares/auth.js
// Middleware авторизации.
// Используется в routes и controllers.
// Совместим с текущей JWT-моделью проекта.

const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const userRepository = require('../repositories/user.repository');
const { createHttpError } = require('../utils/http-error');

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

async function authenticateToken(req, res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      return next(createHttpError(401, 'Требуется авторизация'));
    }

    const decoded = jwt.verify(token, env.jwtSecret);

    if (!decoded?.userId) {
      return next(createHttpError(401, 'Недействительный токен'));
    }

    const user = await userRepository.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        balance: true,
      },
    });

    if (!user) {
      return next(createHttpError(404, 'Пользователь не найден'));
    }

    req.user = user;
    req.token = token;

    return next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(createHttpError(401, 'Срок действия токена истёк'));
    }

    return next(createHttpError(403, 'Недействительный токен'));
  }
}

function optionalAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, env.jwtSecret, async (verifyError, decoded) => {
    if (verifyError || !decoded?.userId) {
      req.user = null;
      return next();
    }

    try {
      const user = await userRepository.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          balance: true,
        },
      });

      req.user = user || null;
      return next();
    } catch (error) {
      req.user = null;
      return next();
    }
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createHttpError(401, 'Требуется авторизация'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(createHttpError(403, 'Недостаточно прав'));
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
};
