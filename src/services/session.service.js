// src/services/session.service.js

const { prisma } = require('../config/prisma');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Генерирует уникальный 6-значный PIN-код.
 * @returns {Promise<string>}
 */
async function generateUniquePinCode() {
  let pinCode;
  let exists = true;

  while (exists) {
    pinCode = String(Math.floor(100000 + Math.random() * 900000));
    const session = await prisma.gameSession.findUnique({ where: { pinCode } });
    exists = !!session;
  }

  return pinCode;
}

/**
 * Формирует payload лобби для рассылки клиентам.
 * @param {Object} session
 * @returns {Object}
 */
function buildLobbyPayload(session) {
  return {
    sessionId: session.id,
    pinCode: session.pinCode,
    status: session.status,
    playerCount: session.players?.length ?? 0,
    players: (session.players || []).map((p) => ({
      id: p.id,
      nickname: p.nickname,
      score: p.score,
    })),
  };
}

/**
 * Формирует payload вопроса для хоста и игроков.
 * @param {Object} question
 * @returns {{ hostPayload: Object, playerPayload: Object }}
 */
function buildQuestionPayload(question) {
  const base = {
    questionId: question.id,
    text: question.text,
    type: question.type,
    points: question.points,
    timeLimit: question.timeLimit,
    order: question.order,
    imageUrl: question.imageUrl || null,
    audioUrl: question.audioUrl || null,
    videoUrl: question.videoUrl || null,
  };

  const hostPayload = {
    ...base,
    answers: (question.answers || []).map((a) => ({
      id: a.id,
      text: a.text,
      isCorrect: a.isCorrect,
      order: a.order,
    })),
  };

  const playerPayload = {
    ...base,
    answers: (question.answers || []).map((a) => ({
      id: a.id,
      text: a.text,
      order: a.order,
    })),
  };

  return { hostPayload, playerPayload };
}

/**
 * Формирует payload таблицы лидеров.
 * @param {Array} players
 * @returns {Object}
 */
function buildLeaderboardPayload(players) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  return {
    leaderboard: sorted.map((p, index) => ({
      rank: index + 1,
      playerId: p.id,
      nickname: p.nickname,
      score: p.score,
      correctAnswers: p.correctAnswers,
    })),
  };
}

// ─── Session CRUD ────────────────────────────────────────────────────────────

/**
 * Создаёт новую игровую сессию.
 * @param {{ quizId: string, currentUser: Object }} params
 * @returns {Promise<Object>}
 */
async function createSession({ quizId, currentUser }) {
  if (!quizId) throw new Error('quizId обязателен');

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { include: { answers: true }, orderBy: { order: 'asc' } } },
  });

  if (!quiz) throw new Error('Квиз не найден');

  const pinCode = await generateUniquePinCode();

  const session = await prisma.gameSession.create({
    data: {
      quizId,
      hostId: currentUser.id,
      pinCode,
      status: 'LOBBY',
      currentQuestionIndex: 0,
    },
    include: { players: true },
  });

  return {
    session: {
      id: session.id,
      pinCode: session.pinCode,
      status: session.status,
      quizId: session.quizId,
    },
  };
}

/**
 * Получает сессию по PIN-коду.
 * @param {string} pinCode
 * @returns {Promise<Object>}
 */
async function getSessionByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { players: true },
  });

  if (!session) throw new Error('Сессия не найдена');

  return { session: { ...session, playerCount: session.players.length } };
}

/**
 * Получает сессию по ID.
 * @param {{ sessionId: string, currentUser: Object }} params
 * @returns {Promise<Object>}
 */
async function getSessionById({ sessionId, currentUser }) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { players: true },
  });

  if (!session) throw new Error('Сессия не найдена');
  if (session.hostId !== currentUser.id) throw new Error('Нет доступа к сессии');

  return { session: { ...session, playerCount: session.players.length } };
}

// ─── Host Socket Methods ─────────────────────────────────────────────────────

/**
 * Проверяет права хоста на управление комнатой.
 * @param {{ pinCode: string, sessionId: string, token: string }} params
 * @returns {Promise<{ pinCode: string, sessionId: string, hostId: string }>}
 */
async function verifyHostRoomAccess({ pinCode, sessionId, token }) {
  const { prisma: db } = require('../config/prisma');
  const { env } = require('../config/env');
  const jwt = require('jsonwebtoken');

  if (!token) throw new Error('Токен авторизации обязателен');

  let decoded;
  try {
    decoded = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new Error('Недействительный токен');
  }

  const userId = decoded.id || decoded.userId || decoded.sub;
  if (!userId) throw new Error('Недействительный токен');

  let session;

  if (pinCode) {
    session = await prisma.gameSession.findUnique({ where: { pinCode } });
  } else if (sessionId) {
    session = await prisma.gameSession.findUnique({ where: { id: sessionId } });
  }

  if (!session) throw new Error('Сессия не найдена');
  if (session.hostId !== userId) throw new Error('Нет прав хоста для этой сессии');

  // Сохраняем hostSocketId в сессии (через отдельное поле или кэш)
  // Используем временное хранилище в памяти (достаточно для single-instance)
  hostSocketMap.set(session.pinCode, null); // будет обновлено после регистрации

  return {
    pinCode: session.pinCode,
    sessionId: session.id,
    hostId: userId,
  };
}

/**
 * Получает hostSocketId по pinCode из in-memory кэша.
 * @param {string} pinCode
 * @returns {Promise<string|null>}
 */
async function getHostSocketIdByPin(pinCode) {
  return hostSocketMap.get(pinCode) || null;
}

/**
 * Регистрирует socketId хоста для pinCode.
 * @param {string} pinCode
 * @param {string} socketId
 */
function registerHostSocket(pinCode, socketId) {
  hostSocketMap.set(pinCode, socketId);
}

/**
 * Удаляет запись хоста из кэша при отключении.
 * @param {string} socketId
 */
function unregisterHostBySocketId(socketId) {
  for (const [pin, sid] of hostSocketMap.entries()) {
    if (sid === socketId) {
      hostSocketMap.delete(pin);
      break;
    }
  }
}

// In-memory хранилище socketId хостов (достаточно для single-instance деплоя)
const hostSocketMap = new Map();

// ─── Game Flow ───────────────────────────────────────────────────────────────

/**
 * Запускает игру по PIN-коду.
 * @param {string} pinCode
 * @returns {Promise<{ hostPayload: Object, playerPayload: Object }>}
 */
async function startGameByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: {
      quiz: {
        include: {
          questions: { include: { answers: true }, orderBy: { order: 'asc' } },
        },
      },
    },
  });

  if (!session) throw new Error('Сессия не найдена');
  if (session.status !== 'LOBBY') throw new Error('Игра уже запущена');

  const questions = session.quiz.questions;
  if (!questions.length) throw new Error('В квизе нет вопросов');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'QUESTION', currentQuestionIndex: 0, startedAt: new Date() },
  });

  return buildQuestionPayload(questions[0]);
}

/**
 * Переходит к следующему вопросу.
 * @param {string} pinCode
 * @returns {Promise<Object>}
 */
async function goToNextQuestionByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: {
      quiz: {
        include: {
          questions: { include: { answers: true }, orderBy: { order: 'asc' } },
        },
      },
      players: true,
    },
  });

  if (!session) throw new Error('Сессия не найдена');

  const questions = session.quiz.questions;
  const nextIndex = session.currentQuestionIndex + 1;

  if (nextIndex >= questions.length) {
    return finishSessionByPin(pinCode);
  }

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'QUESTION', currentQuestionIndex: nextIndex },
  });

  return buildQuestionPayload(questions[nextIndex]);
}

/**
 * Завершает сессию.
 * @param {string} pinCode
 * @returns {Promise<{ finished: true, payload: Object }>}
 */
async function finishSessionByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { players: true },
  });

  if (!session) throw new Error('Сессия не найдена');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'FINISHED', finishedAt: new Date() },
  });

  const leaderboard = buildLeaderboardPayload(session.players);

  return {
    finished: true,
    payload: {
      ...leaderboard,
      sessionId: session.id,
      pinCode: session.pinCode,
    },
  };
}

/**
 * Показывает правильный ответ на текущий вопрос.
 * @param {string} pinCode
 * @returns {Promise<Object>}
 */
async function getCurrentAnswerRevealByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: {
      quiz: {
        include: {
          questions: { include: { answers: true }, orderBy: { order: 'asc' } },
        },
      },
    },
  });

  if (!session) throw new Error('Сессия не найдена');

  const question = session.quiz.questions[session.currentQuestionIndex];
  if (!question) throw new Error('Вопрос не найден');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'SHOW_ANSWER' },
  });

  return {
    questionId: question.id,
    answers: question.answers.map((a) => ({
      id: a.id,
      text: a.text,
      isCorrect: a.isCorrect,
      order: a.order,
    })),
  };
}

/**
 * Ставит вопрос на паузу.
 * @param {string} pinCode
 * @returns {Promise<Object>}
 */
async function pauseQuestionByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({ where: { pinCode } });
  if (!session) throw new Error('Сессия не найдена');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'PAUSED' },
  });

  return { pinCode, status: 'PAUSED' };
}

/**
 * Возобновляет вопрос после паузы.
 * @param {string} pinCode
 * @returns {Promise<Object>}
 */
async function resumeQuestionByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({ where: { pinCode } });
  if (!session) throw new Error('Сессия не найдена');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'QUESTION' },
  });

  return { pinCode, status: 'QUESTION' };
}

/**
 * Показывает таблицу лидеров.
 * @param {string} pinCode
 * @returns {Promise<Object>}
 */
async function showLeaderboardByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { players: true },
  });

  if (!session) throw new Error('Сессия не найдена');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'LEADERBOARD' },
  });

  return buildLeaderboardPayload(session.players);
}

/**
 * Корректирует очки игрока.
 * @param {{ pinCode: string, playerId: string, delta: number }} params
 * @returns {Promise<Object>}
 */
async function adjustPlayerScoreByPin({ pinCode, playerId, delta }) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { players: true },
  });

  if (!session) throw new Error('Сессия не найдена');

  const player = session.players.find((p) => p.id === playerId);
  if (!player) throw new Error('Игрок не найден');

  const newScore = Math.max(0, player.score + (Number(delta) || 0));

  await prisma.gamePlayer.update({
    where: { id: playerId },
    data: { score: newScore },
  });

  const updatedPlayers = session.players.map((p) =>
    p.id === playerId ? { ...p, score: newScore } : p
  );

  return buildLeaderboardPayload(updatedPlayers);
}

// ─── Player Socket Methods ───────────────────────────────────────────────────

/**
 * Подключает игрока к сессии.
 * @param {{ pinCode: string, nickname: string, socketId: string }} params
 * @returns {Promise<{ player: Object, lobby: Object }>}
 */
async function joinPlayer({ pinCode, nickname, socketId }) {
  if (!pinCode) throw new Error('PIN-код обязателен');
  if (!nickname) throw new Error('Никнейм обязателен');

  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { players: true },
  });

  if (!session) throw new Error('Сессия не найдена');
  if (session.status !== 'LOBBY') throw new Error('Игра уже началась');

  const existing = session.players.find(
    (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
  );

  if (existing) throw new Error('Никнейм уже занят');

  const player = await prisma.gamePlayer.create({
    data: {
      sessionId: session.id,
      nickname,
      socketId,
      score: 0,
      correctAnswers: 0,
      connected: true,
    },
  });

  const updatedSession = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { players: true },
  });

  return {
    player: {
      id: player.id,
      nickname: player.nickname,
      score: player.score,
    },
    lobby: buildLobbyPayload(updatedSession),
  };
}

/**
 * Принимает ответ игрока.
 * @param {{ pinCode: string, playerId: string, questionId: string, answerId: string|null, answerText: string|null, responseTimeMs: number }} params
 * @returns {Promise<Object>}
 */
async function submitPlayerAnswer({
  pinCode,
  playerId,
  questionId,
  answerId,
  answerText,
  responseTimeMs,
}) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: {
      quiz: {
        include: {
          questions: { include: { answers: true } },
        },
      },
    },
  });

  if (!session) throw new Error('Сессия не найдена');
  if (session.status !== 'QUESTION') throw new Error('Сейчас не время для ответов');

  const question = session.quiz.questions.find((q) => q.id === questionId);
  if (!question) throw new Error('Вопрос не найден');

  const existing = await prisma.playerAnswer.findFirst({
    where: { playerId, questionId },
  });

  if (existing) throw new Error('Ответ уже отправлен');

  let isCorrect = false;
  let pointsAwarded = 0;

  if (answerId) {
    const answer = question.answers.find((a) => a.id === answerId);
    isCorrect = answer?.isCorrect ?? false;
  } else if (answerText && question.type === 'TEXT') {
    const correctAnswer = question.answers.find((a) => a.isCorrect);
    isCorrect = correctAnswer
      ? correctAnswer.text.toLowerCase().trim() === answerText.toLowerCase().trim()
      : false;
  }

  if (isCorrect) {
    pointsAwarded = question.points || 100;
  }

  await prisma.playerAnswer.create({
    data: {
      playerId,
      questionId,
      answerId: answerId || null,
      answerText: answerText || null,
      isCorrect,
      pointsAwarded,
      responseTimeMs: responseTimeMs || 0,
    },
  });

  if (isCorrect) {
    await prisma.gamePlayer.update({
      where: { id: playerId },
      data: {
        score: { increment: pointsAwarded },
        correctAnswers: { increment: 1 },
      },
    });
  }

  return {
    isCorrect,
    pointsAwarded,
    questionId,
  };
}

/**
 * Обрабатывает отключение игрока по socketId.
 * @param {string} socketId
 * @returns {Promise<void>}
 */
async function disconnectPlayerBySocketId(socketId) {
  if (!socketId) return;

  await prisma.gamePlayer.updateMany({
    where: { socketId },
    data: { connected: false },
  });

  unregisterHostBySocketId(socketId);
}

module.exports = {
  createSession,
  getSessionByPin,
  getSessionById,
  verifyHostRoomAccess,
  getHostSocketIdByPin,
  registerHostSocket,
  unregisterHostBySocketId,
  startGameByPin,
  goToNextQuestionByPin,
  finishSessionByPin,
  getCurrentAnswerRevealByPin,
  pauseQuestionByPin,
  resumeQuestionByPin,
  showLeaderboardByPin,
  adjustPlayerScoreByPin,
  joinPlayer,
  submitPlayerAnswer,
  disconnectPlayerBySocketId,
};
