// src/config/logger.js
// Единый структурированный логгер для всего приложения.
// Использует console под капотом, форматирует JSON в production,
// читаемый текст в development.

const { env } = require('./env');

const LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? (env.nodeEnv === 'production' ? LEVELS.info : LEVELS.debug);

function shouldLog(level) {
  return (LEVELS[level] ?? 0) >= CURRENT_LEVEL;
}

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const SENSITIVE_KEYS = new Set([
    'password', 'passwordHash', 'password_hash',
    'token', 'accessToken', 'refreshToken', 'access_token', 'refresh_token',
    'authorization', 'Authorization',
    'secret', 'jwtSecret',
    'payoutDetails', 'payout_details',
    'adminNote',
  ]);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = sanitize(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const safeMeta = meta ? sanitize(meta) : undefined;

  if (env.nodeEnv === 'production') {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...(safeMeta || {}),
    });
  }

  const metaStr = safeMeta ? ' ' + JSON.stringify(safeMeta) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

function log(level, message, meta) {
  if (!shouldLog(level)) return;

  const output = formatMessage(level, message, meta);

  if (level === 'error') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

const logger = {
  debug: (message, meta) => log('debug', message, meta),
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

module.exports = { logger };
