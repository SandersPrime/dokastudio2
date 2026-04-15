// src/services/auth.service.js
// Сервис авторизации и регистрации.
// Совместим с текущей Prisma-моделью User:
// email, passwordHash, name, role, balance

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const { env } = require('../config/env');
const { createHttpError } = require('../utils/http-error');
const { ROLES } = require('../constants/roles');

const SALT_ROUNDS = 10;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeName(name) {
  return String(name || '').trim();
}

function createAuthResponse(user) {
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: '7d',
    }
  );

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      balance: user.balance,
    },
  };
}

async function register({ email, password, name }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = normalizeName(name);
  const rawPassword = String(password || '');

  if (!normalizedEmail || !rawPassword || !normalizedName) {
    throw createHttpError(400, 'Все поля обязательны');
  }

  if (!normalizedEmail.includes('@')) {
    throw createHttpError(400, 'Некорректный email');
  }

  if (rawPassword.length < 6) {
    throw createHttpError(400, 'Пароль минимум 6 символов');
  }

  const existingUser = await userRepository.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw createHttpError(400, 'Пользователь уже существует');
  }

  const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

  const user = await userRepository.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: normalizedName,
      role: ROLES.USER,
    },
  });

  return {
    message: 'Регистрация успешна',
    ...createAuthResponse(user),
  };
}

async function login({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const rawPassword = String(password || '');

  if (!normalizedEmail || !rawPassword) {
    throw createHttpError(400, 'Email и пароль обязательны');
  }

  const user = await userRepository.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw createHttpError(401, 'Неверный email или пароль');
  }

  const isValidPassword = await bcrypt.compare(rawPassword, user.passwordHash);

  if (!isValidPassword) {
    throw createHttpError(401, 'Неверный email или пароль');
  }

  return {
    message: 'Вход выполнен',
    ...createAuthResponse(user),
  };
}

async function getCurrentUser(userId) {
  if (!userId) {
    throw createHttpError(401, 'Требуется авторизация');
  }

  const user = await userRepository.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      balance: true,
    },
  });

  if (!user) {
    throw createHttpError(404, 'Пользователь не найден');
  }

  return { user };
}

module.exports = {
  register,
  login,
  getCurrentUser,
};