// src/sockets/session.socket.js

const sessionService = require('../services/session.service');

const hostSocketsByPin = new Map();

function getSessionRoom(pinCode) {
  return `session:${pinCode}`;
}

function emitSocketError(socket, message) {
  socket.emit('error', { message });
}

function assertHostSocket(socket, pinCode, actionName = 'управления игрой') {
  const safePinCode = String(pinCode || '').trim();

  if (!safePinCode || hostSocketsByPin.get(safePinCode) !== socket.id) {
    emitSocketError(socket, `Недостаточно прав для ${actionName}`);
    return null;
  }

  if (socket.data.hostPinCode !== safePinCode) {
    emitSocketError(socket, `Недостаточно прав для ${actionName}`);
    return null;
  }

  return safePinCode;
}

function emitQuestion(io, socket, pinCode, result) {
  socket.emit('game:question', result.hostPayload);
  socket.to(getSessionRoom(pinCode)).emit('game:question', result.playerPayload);
}

function emitLeaderboard(io, socket, pinCode, payload) {
  socket.emit('game:leaderboard', payload);
  socket.to(getSessionRoom(pinCode)).emit('game:leaderboard', payload);
}

function emitLeaderboardUpdate(io, socket, pinCode, payload) {
  socket.emit('game:leaderboard-update', payload);
  socket.to(getSessionRoom(pinCode)).emit('game:leaderboard-update', payload);
}

function registerSessionSocket(io) {
  io.on('connection', (socket) => {
    socket.on('host:create-room', async (payload = {}) => {
      try {
        const pinCode = String(payload.pinCode || '').trim();
        const sessionId = String(payload.sessionId || '').trim();
        const token = String(payload.token || '').trim();

        const access = await sessionService.verifyHostRoomAccess({
          pinCode,
          sessionId,
          token,
        });

        hostSocketsByPin.set(access.pinCode, socket.id);
        socket.join(getSessionRoom(access.pinCode));
        socket.data.hostPinCode = access.pinCode;
        socket.data.sessionId = access.sessionId;
        socket.data.hostId = access.hostId;

        socket.emit('host:room-created', {
          sessionId: access.sessionId,
          pinCode: access.pinCode,
        });
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка создания комнаты');
      }
    });

    socket.on('player:join', async (payload = {}) => {
      try {
        const pinCode = String(payload.pinCode || '').trim();
        const nickname = String(payload.nickname || '').trim();

        const result = await sessionService.joinPlayer({
          pinCode,
          nickname,
          socketId: socket.id,
        });

        socket.join(getSessionRoom(pinCode));
        socket.data.playerId = result.player.id;
        socket.data.playerPinCode = pinCode;

        socket.emit('player:joined', {
          playerId: result.player.id,
          nickname: result.player.nickname,
          score: result.player.score,
        });

        io.to(getSessionRoom(pinCode)).emit('lobby:update', result.lobby);
        io.to(getSessionRoom(pinCode)).emit('host:player-joined', result.lobby);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка подключения игрока');
      }
    });

    socket.on('host:start-game', async (payload = {}) => {
      try {
        const pinCode = assertHostSocket(socket, payload.pinCode, 'старта игры');
        if (!pinCode) return;

        const questionPayload = await sessionService.startGameByPin(pinCode);
        emitQuestion(io, socket, pinCode, questionPayload);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка запуска игры');
      }
    });

    socket.on('player:submit-answer', async (payload = {}) => {
      try {
        if (!socket.data.playerId || socket.data.playerId !== payload.playerId) {
          emitSocketError(socket, 'Нельзя отправить ответ за другого игрока');
          return;
        }

        const result = await sessionService.submitPlayerAnswer({
          pinCode: payload.pinCode,
          playerId: payload.playerId,
          questionId: payload.questionId,
          answerId: payload.answerId || null,
          answerText: payload.answerText || null,
          responseTimeMs: payload.responseTimeMs || 0,
        });

        socket.emit('player:answer-result', result);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка отправки ответа');
      }
    });

    socket.on('host:show-answer', async (payload = {}) => {
      try {
        const pinCode = assertHostSocket(socket, payload.pinCode, 'показа ответа');
        if (!pinCode) return;

        const revealPayload = await sessionService.getCurrentAnswerRevealByPin(pinCode);
        io.to(getSessionRoom(pinCode)).emit('game:answer-reveal', revealPayload);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка показа ответа');
      }
    });

    socket.on('host:pause-question', async (payload = {}) => {
      try {
        const pinCode = assertHostSocket(socket, payload.pinCode, 'паузы вопроса');
        if (!pinCode) return;

        const pausePayload = await sessionService.pauseQuestionByPin(pinCode);
        io.to(getSessionRoom(pinCode)).emit('game:paused', pausePayload);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка паузы вопроса');
      }
    });

    socket.on('host:resume-question', async (payload = {}) => {
      try {
        const pinCode = assertHostSocket(socket, payload.pinCode, 'продолжения вопроса');
        if (!pinCode) return;

        const resumePayload = await sessionService.resumeQuestionByPin(pinCode);
        io.to(getSessionRoom(pinCode)).emit('game:resumed', resumePayload);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка продолжения вопроса');
      }
    });

    socket.on('host:show-leaderboard', async (payload = {}) => {
      try {
        const pinCode = assertHostSocket(socket, payload.pinCode, 'показа рейтинга');
        if (!pinCode) return;

        const leaderboardPayload = await sessionService.showLeaderboardByPin(pinCode);
        emitLeaderboard(io, socket, pinCode, leaderboardPayload);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка показа рейтинга');
      }
    });

    socket.on('host:adjust-score', async (payload = {}) => {
      try {
        const pinCode = assertHostSocket(socket, payload.pinCode, 'корректировки очков');
        if (!pinCode) return;

        const leaderboardPayload = await sessionService.adjustPlayerScoreByPin({
          pinCode,
          playerId: payload.playerId,
          delta: payload.delta,
        });

        emitLeaderboardUpdate(io, socket, pinCode, leaderboardPayload);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка корректировки очков');
      }
    });

    socket.on('host:next-question', async (payload = {}) => {
      try {
        const pinCode = assertHostSocket(socket, payload.pinCode, 'перехода к следующему вопросу');
        if (!pinCode) return;

        const result = await sessionService.goToNextQuestionByPin(pinCode);

        if (result.finished) {
          io.to(getSessionRoom(pinCode)).emit('game:finished', result.payload);
          return;
        }

        emitQuestion(io, socket, pinCode, result);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка перехода к следующему вопросу');
      }
    });

    socket.on('host:finish-game', async (payload = {}) => {
      try {
        const pinCode = assertHostSocket(socket, payload.pinCode, 'завершения игры');
        if (!pinCode) return;

        const result = await sessionService.finishSessionByPin(pinCode);
        io.to(getSessionRoom(pinCode)).emit('game:finished', result.payload);
      } catch (error) {
        emitSocketError(socket, error.message || 'Ошибка завершения игры');
      }
    });

    socket.on('disconnect', async () => {
      try {
        const hostPinCode = socket.data.hostPinCode;
        if (hostPinCode && hostSocketsByPin.get(hostPinCode) === socket.id) {
          hostSocketsByPin.delete(hostPinCode);
        }

        await sessionService.disconnectPlayerBySocketId(socket.id);

        if (socket.data.playerPinCode) {
          try {
            const lobby = await sessionService.getSessionByPin(socket.data.playerPinCode);
            io.to(getSessionRoom(socket.data.playerPinCode)).emit('lobby:update', {
              sessionId: lobby.session.id,
              pinCode: lobby.session.pinCode,
              status: lobby.session.status,
              playerCount: lobby.session.playerCount,
              players: [],
            });
          } catch (error) {
            // Игнорируем, если сессия уже завершена/удалена
          }
        }
      } catch (error) {
        // Не бросаем исключение на disconnect
      }
    });
  });
}

module.exports = {
  registerSessionSocket,
};
