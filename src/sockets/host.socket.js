// src/sockets/host.socket.js

const sessionService = require('../services/session.service');
const { emitSocketError, assertHostSocket } = require('./socket-guards');

const getSessionRoom = (pinCode) => `session:${pinCode}`;

const emitQuestion = (io, socket, pinCode, result) => {
  socket.emit('game:question', result.hostPayload);
  socket.to(getSessionRoom(pinCode)).emit('game:question', result.playerPayload);
};

const emitLeaderboard = (io, socket, pinCode, payload) => {
  socket.emit('game:leaderboard', payload);
  socket.to(getSessionRoom(pinCode)).emit('game:leaderboard', payload);
};

const emitLeaderboardUpdate = (io, socket, pinCode, payload) => {
  socket.emit('game:leaderboard-update', payload);
  socket.to(getSessionRoom(pinCode)).emit('game:leaderboard-update', payload);
};

const registerHostSocket = (io, socket) => {
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

      socket.join(getSessionRoom(access.pinCode));
      socket.data.hostSocketId = socket.id;
      socket.data.hostPinCode = access.pinCode;
      socket.data.sessionId = access.sessionId;
      socket.data.hostId = access.hostId;

      // Регистрируем socketId хоста в сервисе для последующей проверки прав
      sessionService.registerHostSocket(access.pinCode, socket.id);

      socket.emit('host:room-created', {
        sessionId: access.sessionId,
        pinCode: access.pinCode,
      });
    } catch (error) {
      emitSocketError(socket, error.message || 'Ошибка создания комнаты');
    }
  });

  socket.on('host:start-game', async (payload = {}) => {
    try {
      const pinCode = await assertHostSocket(socket, payload.pinCode, 'старта игры');
      if (!pinCode) return;

      const questionPayload = await sessionService.startGameByPin(pinCode);
      emitQuestion(io, socket, pinCode, questionPayload);
    } catch (error) {
      emitSocketError(socket, error.message || 'Ошибка запуска игры');
    }
  });

  socket.on('host:show-answer', async (payload = {}) => {
    try {
      const pinCode = await assertHostSocket(socket, payload.pinCode, 'показа ответа');
      if (!pinCode) return;

      const revealPayload = await sessionService.getCurrentAnswerRevealByPin(pinCode);
      io.to(getSessionRoom(pinCode)).emit('game:answer-reveal', revealPayload);
    } catch (error) {
      emitSocketError(socket, error.message || 'Ошибка показа ответа');
    }
  });

  socket.on('host:pause-question', async (payload = {}) => {
    try {
      const pinCode = await assertHostSocket(socket, payload.pinCode, 'паузы вопроса');
      if (!pinCode) return;

      const pausePayload = await sessionService.pauseQuestionByPin(pinCode);
      io.to(getSessionRoom(pinCode)).emit('game:paused', pausePayload);
    } catch (error) {
      emitSocketError(socket, error.message || 'Ошибка паузы вопроса');
    }
  });

  socket.on('host:resume-question', async (payload = {}) => {
    try {
      const pinCode = await assertHostSocket(socket, payload.pinCode, 'продолжения вопроса');
      if (!pinCode) return;

      const resumePayload = await sessionService.resumeQuestionByPin(pinCode);
      io.to(getSessionRoom(pinCode)).emit('game:resumed', resumePayload);
    } catch (error) {
      emitSocketError(socket, error.message || 'Ошибка продолжения вопроса');
    }
  });

  socket.on('host:show-leaderboard', async (payload = {}) => {
    try {
      const pinCode = await assertHostSocket(socket, payload.pinCode, 'показа рейтинга');
      if (!pinCode) return;

      const leaderboardPayload = await sessionService.showLeaderboardByPin(pinCode);
      emitLeaderboard(io, socket, pinCode, leaderboardPayload);
    } catch (error) {
      emitSocketError(socket, error.message || 'Ошибка показа рейтинга');
    }
  });

  socket.on('host:adjust-score', async (payload = {}) => {
    try {
      const pinCode = await assertHostSocket(socket, payload.pinCode, 'корректировки очков');
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
      const pinCode = await assertHostSocket(socket, payload.pinCode, 'перехода к следующему вопросу');
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
      const pinCode = await assertHostSocket(socket, payload.pinCode, 'завершения игры');
      if (!pinCode) return;

      const result = await sessionService.finishSessionByPin(pinCode);
      io.to(getSessionRoom(pinCode)).emit('game:finished', result.payload);
    } catch (error) {
      emitSocketError(socket, error.message || 'Ошибка завершения игры');
    }
  });
};

module.exports = { registerHostSocket };
