// src/services/session.service.js

const { prisma } = require('../config/prisma');
const { buzzerService } = require('./buzzer.service');

const DEFAULT_TEAM_NAMES = ['Команда 1', 'Команда 2', 'Команда 3', 'Команда 4'];
const TEAM_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#facc15', '#ef4444'];

function getTeamColor(teamId = '') {
  const base = String(teamId);
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) % 997;
  }
  return TEAM_COLORS[hash % TEAM_COLORS.length];
}

function buildTeamsPayload(teams = []) {
  return (teams || []).map((team) => ({
    id: team.id,
    name: team.name,
    score: team.score || 0,
    color: getTeamColor(team.id),
  }));
}

async function ensureSessionTeams(session) {
  if (session?.teams?.length) return session.teams;

  const fallbackTeams = DEFAULT_TEAM_NAMES.map((name) => ({
    sessionId: session.id,
    name,
  }));

  if (fallbackTeams.length) {
    await prisma.team.createMany({ data: fallbackTeams });
  }

  return prisma.team.findMany({
    where: { sessionId: session.id },
    orderBy: { name: 'asc' },
  });
}

function ensureTeamLimit(teams = []) {
  if (teams.length < 2 || teams.length > 6) {
    throw new Error('Команд должно быть от 2 до 6');
  }
}

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
    teams: buildTeamsPayload(session.teams || []),
  };
}

/**
 * Формирует payload вопроса для хоста и игроков.
 * @param {Object} question
 * @returns {{ hostPayload: Object, playerPayload: Object }}
 */
function getBuzzerModeForQuestion(question) {
  const elementType = String(question?.elementType || '').trim().toUpperCase();
  if (elementType && elementType !== 'QUESTION') return 'IDLE';

  const mode = String(question?.gameMode || question?.type || '').trim().toUpperCase();
  if (mode === 'FASTEST_FINGER') return 'FASTEST_FINGER';
  if (mode === 'EVERYONE_ANSWERS') return 'EVERYONE_ANSWERS';
  return 'IDLE';
}

function setIdleForSession(pinCode) {
  buzzerService.setMode('IDLE', {
    source: 'session',
    pinCode,
    questionId: null,
    reset: true,
  });
}

function buildQuestionPayload({ question, questionNumber, totalQuestions, buzzerMode, teams }) {
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
    question,
    questionNumber,
    totalQuestions,
    buzzerMode,
    teams: buildTeamsPayload(teams || []),
    answers: (question.answers || []).map((a) => ({
      id: a.id,
      text: a.text,
      isCorrect: a.isCorrect,
      order: a.order,
    })),
  };

  const playerPayload = {
    ...base,
    question,
    questionNumber,
    totalQuestions,
    buzzerMode,
    teams: buildTeamsPayload(teams || []),
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
    include: { players: true, teams: true },
  });

  await ensureSessionTeams(session);

  const updatedSession = await prisma.gameSession.findUnique({
    where: { id: session.id },
    include: { players: true, teams: true },
  });

  return {
    session: {
      id: updatedSession.id,
      pinCode: updatedSession.pinCode,
      status: updatedSession.status,
      quizId: updatedSession.quizId,
      teams: buildTeamsPayload(updatedSession.teams || []),
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
    include: { players: true, teams: true },
  });

  if (!session) throw new Error('Сессия не найдена');

  const teams = await ensureSessionTeams(session);

  return {
    session: {
      ...session,
      playerCount: session.players.length,
      teams: buildTeamsPayload(teams),
    },
  };
}

/**
 * Получает сессию по ID.
 * @param {{ sessionId: string, currentUser: Object }} params
 * @returns {Promise<Object>}
 */
async function getSessionById({ sessionId, currentUser }) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { players: true, teams: true },
  });

  if (!session) throw new Error('Сессия не найдена');
  if (session.hostId !== currentUser.id) throw new Error('Нет доступа к сессии');

  const teams = await ensureSessionTeams(session);

  return {
    session: {
      ...session,
      playerCount: session.players.length,
      teams: buildTeamsPayload(teams),
    },
  };
}

async function getSessionTeamsByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { teams: true },
  });

  if (!session) throw new Error('Сессия не найдена');

  const teams = await ensureSessionTeams(session);
  return {
    sessionId: session.id,
    pinCode: session.pinCode,
    teams: buildTeamsPayload(teams),
  };
}

async function updateSessionTeamsByPin(pinCode, payload = {}) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { teams: true },
  });

  if (!session) throw new Error('Сессия не найдена');
  if (session.status !== 'LOBBY') {
    throw new Error('Команды можно менять только до старта игры');
  }

  const incoming = Array.isArray(payload.teams) ? payload.teams : [];
  ensureTeamLimit(incoming);

  const normalized = incoming.map((team, index) => ({
    id: team?.id ? String(team.id).trim() : null,
    name: String(team?.name || '').trim() || `Команда ${index + 1}`,
  }));

  await prisma.$transaction(async (tx) => {
    const existingIds = session.teams.map((team) => team.id);
    const keepIds = normalized.map((team) => team.id).filter(Boolean);
    const removeIds = existingIds.filter((id) => !keepIds.includes(id));

    if (removeIds.length) {
      await tx.team.deleteMany({ where: { id: { in: removeIds } } });
    }

    for (const team of normalized) {
      if (team.id && existingIds.includes(team.id)) {
        await tx.team.update({
          where: { id: team.id },
          data: { name: team.name },
        });
      } else {
        await tx.team.create({
          data: {
            sessionId: session.id,
            name: team.name,
          },
        });
      }
    }
  });

  const updatedTeams = await prisma.team.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
  });

  const payloadTeams = buildTeamsPayload(updatedTeams);
  buzzerService.setTeamsForSession(pinCode, payloadTeams);

  return {
    sessionId: session.id,
    pinCode: session.pinCode,
    teams: payloadTeams,
  };
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
      teams: true,
    },
  });

  if (!session) throw new Error('Сессия не найдена');
  if (session.status !== 'LOBBY') throw new Error('Игра уже запущена');

  const questions = session.quiz.questions;
  if (!questions.length) throw new Error('В квизе нет вопросов');

  const teams = await ensureSessionTeams(session);

  const question = questions[0];
  const buzzerMode = getBuzzerModeForQuestion(question);
  buzzerService.applyQuestionMode({
    pinCode,
    questionId: question.id,
    mode: buzzerMode,
  });

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'QUESTION', currentQuestionIndex: 0, startedAt: new Date() },
  });

  return buildQuestionPayload({
    question,
    questionNumber: 1,
    totalQuestions: questions.length,
    buzzerMode,
    teams: buildTeamsPayload(teams),
  });
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
      teams: true,
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

  const teams = await ensureSessionTeams(session);

  const question = questions[nextIndex];
  const buzzerMode = getBuzzerModeForQuestion(question);
  buzzerService.applyQuestionMode({
    pinCode,
    questionId: question.id,
    mode: buzzerMode,
  });

  return buildQuestionPayload({
    question,
    questionNumber: nextIndex + 1,
    totalQuestions: questions.length,
    buzzerMode,
    teams: buildTeamsPayload(teams),
  });
}

/**
 * Завершает сессию.
 * @param {string} pinCode
 * @returns {Promise<{ finished: true, payload: Object }>}
 */
async function finishSessionByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: { players: true, teams: true },
  });

  if (!session) throw new Error('Сессия не найдена');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'FINISHED', finishedAt: new Date() },
  });

  setIdleForSession(pinCode);

  const leaderboard = buildLeaderboardPayload(session.players);

  return {
    finished: true,
    payload: {
      ...leaderboard,
      sessionId: session.id,
      pinCode: session.pinCode,
      teams: buildTeamsPayload(session.teams || []),
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
      teams: true,
    },
  });

  if (!session) throw new Error('Сессия не найдена');

  const question = session.quiz.questions[session.currentQuestionIndex];
  if (!question) throw new Error('Вопрос не найден');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'SHOW_ANSWER' },
  });

  setIdleForSession(pinCode);

  return {
    questionId: question.id,
    answers: question.answers.map((a) => ({
      id: a.id,
      text: a.text,
      isCorrect: a.isCorrect,
      order: a.order,
    })),
    teams: buildTeamsPayload(session.teams || []),
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

  setIdleForSession(pinCode);

  return { pinCode, status: 'PAUSED' };
}

/**
 * Возобновляет вопрос после паузы.
 * @param {string} pinCode
 * @returns {Promise<Object>}
 */
async function resumeQuestionByPin(pinCode) {
  const session = await prisma.gameSession.findUnique({
    where: { pinCode },
    include: {
      quiz: {
        include: {
          questions: { include: { answers: true }, orderBy: { order: 'asc' } },
        },
      },
      teams: true,
    },
  });
  if (!session) throw new Error('Сессия не найдена');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'QUESTION' },
  });

  const question = session.quiz.questions[session.currentQuestionIndex];
  if (question) {
    const buzzerMode = getBuzzerModeForQuestion(question);
    buzzerService.applyQuestionMode({
      pinCode,
      questionId: question.id,
      mode: buzzerMode,
    });
  }

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
    include: { players: true, teams: true },
  });

  if (!session) throw new Error('Сессия не найдена');

  await prisma.gameSession.update({
    where: { pinCode },
    data: { status: 'LEADERBOARD' },
  });

  setIdleForSession(pinCode);

  return {
    ...buildLeaderboardPayload(session.players),
    teams: buildTeamsPayload(session.teams || []),
  };
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
    include: { players: true, teams: true },
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
    include: { players: true, teams: true },
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
  getSessionTeamsByPin,
  updateSessionTeamsByPin,
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
