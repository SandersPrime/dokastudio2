// src/services/session.service.js

const QRCode = require('qrcode');
const jwt = require('jsonwebtoken');
const sessionRepository = require('../repositories/session.repository');
const { env } = require('../config/env');
const { createHttpError } = require('../utils/http-error');

const { SESSION_STATUSES } = require('../constants/session-statuses');

function serializeQuestion(question, options = {}) {
  const payload = {
    id: question.id,
    text: question.text,
    type: question.type,
    points: question.points,
    timeLimit: question.timeLimit || 30,
    imageUrl: question.imageUrl || null,
    audioUrl: question.audioUrl || null,
    videoUrl: question.videoUrl || null,
    answers: (question.answers || []).map((answer) => ({
      id: answer.id,
      text: answer.text,
      imageUrl: answer.imageUrl || null,
      order: answer.order,
    })),
  };

  if (options.includeHostNotes) {
    payload.notes = question.notes || '';
  }

  return {
    ...payload,
  };
}

function serializeLeaderboard(players = []) {
  return players
    .map((player) => ({
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      correctAnswers: player.correctAnswers,
      connected: player.connected,
      teamId: player.teamId || null,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.correctAnswers - a.correctAnswers;
    });
}

async function generateUniquePinCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pinCode = String(Math.floor(100000 + Math.random() * 900000));

    const existing = await sessionRepository.gameSession.findUnique({
      where: { pinCode },
      select: { id: true },
    });

    if (!existing) {
      return pinCode;
    }
  }

  throw createHttpError(500, 'Не удалось сгенерировать PIN-код');
}

async function getQuizForSessionOrThrow(quizId, currentUser) {
  const quiz = await sessionRepository.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          answers: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!quiz) {
    throw createHttpError(404, 'Квиз не найден');
  }

  if (quiz.authorId !== currentUser.id && currentUser.role !== 'ADMIN') {
    throw createHttpError(403, 'Нет прав на запуск этого квиза');
  }

  if (!quiz.questions.length) {
    throw createHttpError(400, 'В квизе нет вопросов');
  }

  return quiz;
}

async function createSession({ quizId, currentUser }) {
  const quiz = await getQuizForSessionOrThrow(quizId, currentUser);
  const pinCode = await generateUniquePinCode();

  const session = await sessionRepository.gameSession.create({
    data: {
      quizId: quiz.id,
      hostId: currentUser.id,
      pinCode,
      status: SESSION_STATUSES.LOBBY,
      currentQuestionIndex: 0,
    },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          description: true,
          timePerQuestion: true,
          showLeaderboard: true,
        },
      },
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const joinUrl = `${env.clientUrl}/play/${pinCode}`;
  const qrCode = await QRCode.toDataURL(joinUrl);

  return {
    session,
    joinUrl,
    qrCode,
  };
}

async function getSessionByPin(pinCode) {
  const session = await sessionRepository.gameSession.findUnique({
    where: { pinCode },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          description: true,
          allowReconnect: true,
          timePerQuestion: true,
        },
      },
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session) {
    throw createHttpError(404, 'Игра не найдена');
  }

  if (session.status === SESSION_STATUSES.FINISHED) {
    throw createHttpError(410, 'Игра уже завершена');
  }

  return {
    session: {
      id: session.id,
      pinCode: session.pinCode,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      quiz: session.quiz,
      playerCount: session.players.length,
    },
  };
}

async function getSessionById({ sessionId, currentUser }) {
  const session = await sessionRepository.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answers: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
      players: {
        orderBy: { score: 'desc' },
      },
    },
  });

  if (!session) {
    throw createHttpError(404, 'Сессия не найдена');
  }

  if (session.hostId !== currentUser.id && currentUser.role !== 'ADMIN') {
    throw createHttpError(403, 'Нет доступа к сессии');
  }

  return {
    session: {
      ...session,
      leaderboard: serializeLeaderboard(session.players),
    },
  };
}

async function getFullSessionByPinOrThrow(pinCode) {
  const session = await sessionRepository.gameSession.findUnique({
    where: { pinCode },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answers: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session) {
    throw createHttpError(404, 'Сессия не найдена');
  }

  return session;
}

function buildLobbyPayload(session) {
  return {
    sessionId: session.id,
    pinCode: session.pinCode,
    status: session.status,
    playerCount: session.players.length,
    players: serializeLeaderboard(session.players),
  };
}

function buildQuestionPayload(session, options = {}) {
  const questions = session.quiz.questions || [];
  const question = questions[session.currentQuestionIndex];

  if (!question) {
    return null;
  }

  return {
    sessionId: session.id,
    pinCode: session.pinCode,
    status: session.status,
    questionNumber: session.currentQuestionIndex + 1,
    totalQuestions: questions.length,
    question: serializeQuestion(question, options),
    leaderboard: serializeLeaderboard(session.players),
  };
}

function buildLeaderboardPayload(session) {
  return {
    sessionId: session.id,
    pinCode: session.pinCode,
    status: session.status,
    questionNumber: session.currentQuestionIndex + 1,
    totalQuestions: session.quiz?.questions?.length || 0,
    leaderboard: serializeLeaderboard(session.players),
  };
}

async function verifyHostRoomAccess({ pinCode, sessionId, token }) {
  const safePinCode = String(pinCode || '').trim();
  const safeSessionId = String(sessionId || '').trim();
  const safeToken = String(token || '').trim();

  if (!safePinCode || !safeSessionId || !safeToken) {
    throw createHttpError(401, 'Требуется авторизация ведущего');
  }

  let decoded;
  try {
    decoded = jwt.verify(safeToken, env.jwtSecret);
  } catch (error) {
    throw createHttpError(401, 'Недействительный токен ведущего');
  }

  if (!decoded?.userId) {
    throw createHttpError(401, 'Недействительный токен ведущего');
  }

  const session = await sessionRepository.gameSession.findUnique({
    where: { id: safeSessionId },
    select: {
      id: true,
      pinCode: true,
      hostId: true,
      status: true,
    },
  });

  const user = await sessionRepository.user.findUnique({
    where: { id: decoded.userId },
    select: {
      id: true,
      role: true,
    },
  });

  if (!session || session.pinCode !== safePinCode) {
    throw createHttpError(404, 'Сессия не найдена');
  }

  if (!user || (session.hostId !== user.id && user.role !== 'ADMIN')) {
    throw createHttpError(403, 'Нет прав на управление этой сессией');
  }

  return {
    sessionId: session.id,
    pinCode: session.pinCode,
    hostId: session.hostId,
  };
}

async function startGameByPin(pinCode) {
  const session = await getFullSessionByPinOrThrow(pinCode);

  if (!session.players.length) {
    throw createHttpError(400, 'Нельзя начать игру без игроков');
  }

  if (!session.quiz.questions.length) {
    throw createHttpError(400, 'В квизе нет вопросов');
  }

  const updated = await sessionRepository.gameSession.update({
    where: { id: session.id },
    data: {
      status: SESSION_STATUSES.QUESTION,
      startedAt: session.startedAt || new Date(),
      currentQuestionIndex: 0,
    },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answers: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return {
    hostPayload: buildQuestionPayload(updated, { includeHostNotes: true }),
    playerPayload: buildQuestionPayload(updated),
  };
}

async function joinPlayer({ pinCode, nickname, socketId }) {
  const normalizedNickname = String(nickname || '').trim();

  if (!normalizedNickname) {
    throw createHttpError(400, 'Имя игрока обязательно');
  }

  const session = await sessionRepository.gameSession.findUnique({
    where: { pinCode },
    include: {
      quiz: {
        select: {
          allowReconnect: true,
        },
      },
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!session) {
    throw createHttpError(404, 'Игра не найдена');
  }

  if (session.status === SESSION_STATUSES.FINISHED) {
    throw createHttpError(410, 'Игра уже завершена');
  }

  const existingPlayer = session.players.find(
    (player) => player.nickname.trim().toLowerCase() === normalizedNickname.toLowerCase()
  );

  let player;

  if (existingPlayer) {
    if (!session.quiz.allowReconnect) {
      throw createHttpError(400, 'Игрок с таким именем уже существует');
    }

    player = await sessionRepository.gamePlayer.update({
      where: { id: existingPlayer.id },
      data: {
        connected: true,
        socketId,
      },
    });
  } else {
    player = await sessionRepository.gamePlayer.create({
      data: {
        sessionId: session.id,
        nickname: normalizedNickname,
        socketId,
        connected: true,
      },
    });
  }

  const freshSession = await sessionRepository.gameSession.findUnique({
    where: { id: session.id },
    include: {
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return {
    player,
    lobby: buildLobbyPayload(freshSession),
  };
}

async function disconnectPlayerBySocketId(socketId) {
  if (!socketId) return;

  const player = await sessionRepository.gamePlayer.findFirst({
    where: { socketId },
    select: { id: true },
  });

  if (!player) return;

  await sessionRepository.gamePlayer.update({
    where: { id: player.id },
    data: {
      connected: false,
      socketId: null,
    },
  });
}

async function submitPlayerAnswer({
  pinCode,
  playerId,
  questionId,
  answerId = null,
  answerText = null,
  responseTimeMs = 0,
}) {
  const session = await getFullSessionByPinOrThrow(pinCode);
  const question = session.quiz.questions[session.currentQuestionIndex];

  if (!question) {
    throw createHttpError(400, 'Нет активного вопроса');
  }

  if (session.status !== SESSION_STATUSES.QUESTION) {
    throw createHttpError(400, 'Сейчас нельзя отвечать');
  }

  if (question.id !== questionId) {
    throw createHttpError(400, 'Ответ относится не к текущему вопросу');
  }

  const player = await sessionRepository.gamePlayer.findUnique({
    where: { id: playerId },
  });

  if (!player || player.sessionId !== session.id) {
    throw createHttpError(404, 'Игрок не найден');
  }

  const existingAnswer = await sessionRepository.playerAnswer.findFirst({
    where: {
      playerId,
      questionId,
    },
  });

  if (existingAnswer) {
    throw createHttpError(400, 'Ответ уже отправлен');
  }

  const correctAnswers = question.answers.filter((answer) => answer.isCorrect);
  const correctAnswerIds = new Set(correctAnswers.map((answer) => answer.id));

  let isCorrect = false;

  if (answerId) {
    isCorrect = correctAnswerIds.has(answerId);
  } else if (answerText && question.type === 'TRUEFALSE') {
    const normalizedText = String(answerText).trim().toLowerCase();
    const correctTextSet = new Set(
      correctAnswers.map((answer) => answer.text.trim().toLowerCase())
    );
    isCorrect = correctTextSet.has(normalizedText);
  }

  const safeResponseTime = Math.max(0, Number(responseTimeMs) || 0);
  const awardedPoints = isCorrect ? question.points : 0;

  await sessionRepository.transaction(async (tx) => {
    await tx.playerAnswer.create({
      data: {
        playerId,
        questionId,
        answerId: answerId || null,
        answerText: answerText ? String(answerText).trim() : null,
        isCorrect,
        pointsAwarded: awardedPoints,
        responseTimeMs: safeResponseTime,
      },
    });

    await tx.gamePlayer.update({
      where: { id: playerId },
      data: {
        score: {
          increment: awardedPoints,
        },
        correctAnswers: {
          increment: isCorrect ? 1 : 0,
        },
      },
    });
  });

  const updatedPlayer = await sessionRepository.gamePlayer.findUnique({
    where: { id: playerId },
  });

  return {
    playerId: updatedPlayer.id,
    isCorrect,
    pointsAwarded: awardedPoints,
    score: updatedPlayer.score,
    correctAnswerIds: Array.from(correctAnswerIds),
  };
}

async function getCurrentAnswerRevealByPin(pinCode) {
  const session = await getFullSessionByPinOrThrow(pinCode);
  const question = session.quiz.questions[session.currentQuestionIndex];

  if (!question) {
    throw createHttpError(400, 'Нет текущего вопроса');
  }

  const answersStats = await sessionRepository.playerAnswer.findMany({
    where: {
      player: {
        sessionId: session.id,
      },
      questionId: question.id,
    },
    select: {
      answerId: true,
      isCorrect: true,
      playerId: true,
    },
  });

  const countsByAnswerId = {};
  for (const item of answersStats) {
    if (!item.answerId) continue;
    countsByAnswerId[item.answerId] = (countsByAnswerId[item.answerId] || 0) + 1;
  }

  const leaderboard = serializeLeaderboard(session.players);

  await sessionRepository.gameSession.update({
    where: { id: session.id },
    data: {
      status: SESSION_STATUSES.SHOW_ANSWER,
    },
  });

  return {
    sessionId: session.id,
    pinCode: session.pinCode,
    questionId: question.id,
    correctAnswerIds: question.answers.filter((answer) => answer.isCorrect).map((answer) => answer.id),
    correctAnswers: question.answers.filter((answer) => answer.isCorrect).map((answer) => ({
      id: answer.id,
      text: answer.text,
    })),
    answerStats: question.answers.map((answer) => ({
      answerId: answer.id,
      text: answer.text,
      count: countsByAnswerId[answer.id] || 0,
      isCorrect: answer.isCorrect,
    })),
    leaderboard,
  };
}

async function pauseQuestionByPin(pinCode) {
  const session = await getFullSessionByPinOrThrow(pinCode);
  const question = session.quiz.questions[session.currentQuestionIndex];

  if (!question) {
    throw createHttpError(400, 'Нет активного вопроса');
  }

  if (session.status !== SESSION_STATUSES.QUESTION) {
    throw createHttpError(400, 'Поставить на паузу можно только активный вопрос');
  }

  const updated = await sessionRepository.gameSession.update({
    where: { id: session.id },
    data: { status: SESSION_STATUSES.PAUSED },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answers: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return {
    sessionId: updated.id,
    pinCode: updated.pinCode,
    status: updated.status,
    questionId: question.id,
    leaderboard: serializeLeaderboard(updated.players),
  };
}

async function resumeQuestionByPin(pinCode) {
  const session = await getFullSessionByPinOrThrow(pinCode);
  const question = session.quiz.questions[session.currentQuestionIndex];

  if (!question) {
    throw createHttpError(400, 'Нет активного вопроса');
  }

  if (session.status !== SESSION_STATUSES.PAUSED) {
    throw createHttpError(400, 'Продолжить можно только вопрос на паузе');
  }

  const updated = await sessionRepository.gameSession.update({
    where: { id: session.id },
    data: { status: SESSION_STATUSES.QUESTION },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answers: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return {
    sessionId: updated.id,
    pinCode: updated.pinCode,
    status: updated.status,
    questionId: question.id,
    leaderboard: serializeLeaderboard(updated.players),
  };
}

async function showLeaderboardByPin(pinCode) {
  const session = await getFullSessionByPinOrThrow(pinCode);

  if (session.status === SESSION_STATUSES.FINISHED) {
    throw createHttpError(400, 'Игра уже завершена');
  }

  const updated = await sessionRepository.gameSession.update({
    where: { id: session.id },
    data: { status: SESSION_STATUSES.LEADERBOARD },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answers: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
      players: {
        orderBy: { score: 'desc' },
      },
    },
  });

  return buildLeaderboardPayload(updated);
}

async function adjustPlayerScoreByPin({ pinCode, playerId, delta }) {
  const safeDelta = Number(delta);

  if (!Number.isInteger(safeDelta) || safeDelta === 0 || Math.abs(safeDelta) > 100000) {
    throw createHttpError(400, 'Некорректное изменение очков');
  }

  const session = await getFullSessionByPinOrThrow(pinCode);
  const player = session.players.find((item) => item.id === playerId);

  if (!player) {
    throw createHttpError(404, 'Игрок не найден в этой сессии');
  }

  await sessionRepository.gamePlayer.update({
    where: { id: player.id },
    data: {
      score: {
        increment: safeDelta,
      },
    },
  });

  const updated = await getFullSessionByPinOrThrow(pinCode);

  return buildLeaderboardPayload(updated);
}

async function goToNextQuestionByPin(pinCode) {
  const session = await getFullSessionByPinOrThrow(pinCode);
  const nextIndex = session.currentQuestionIndex + 1;
  const totalQuestions = session.quiz.questions.length;

  if (nextIndex >= totalQuestions) {
    return finishSessionByPin(pinCode);
  }

  const updated = await sessionRepository.gameSession.update({
    where: { id: session.id },
    data: {
      status: SESSION_STATUSES.QUESTION,
      currentQuestionIndex: nextIndex,
    },
    include: {
      quiz: {
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: {
              answers: {
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      },
      players: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return {
    finished: false,
    hostPayload: buildQuestionPayload(updated, { includeHostNotes: true }),
    playerPayload: buildQuestionPayload(updated),
  };
}

async function finishSessionByPin(pinCode) {
  const session = await getFullSessionByPinOrThrow(pinCode);

  const updated = await sessionRepository.gameSession.update({
    where: { id: session.id },
    data: {
      status: SESSION_STATUSES.FINISHED,
      finishedAt: new Date(),
    },
    include: {
      players: {
        orderBy: { score: 'desc' },
      },
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return {
    finished: true,
    payload: {
      sessionId: updated.id,
      pinCode: updated.pinCode,
      quiz: updated.quiz,
      leaderboard: serializeLeaderboard(updated.players),
    },
  };
}

module.exports = {
  createSession,
  getSessionByPin,
  getSessionById,
  verifyHostRoomAccess,
  startGameByPin,
  joinPlayer,
  disconnectPlayerBySocketId,
  submitPlayerAnswer,
  getCurrentAnswerRevealByPin,
  pauseQuestionByPin,
  resumeQuestionByPin,
  showLeaderboardByPin,
  adjustPlayerScoreByPin,
  goToNextQuestionByPin,
  finishSessionByPin,
  buildLobbyPayload,
  SESSION_STATUSES,
};
