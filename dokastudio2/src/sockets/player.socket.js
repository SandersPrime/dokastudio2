// src/sockets/player.socket.js

const sessionService = require('../services/session.service');
const { emitSocketError, assertPlayerSocket } = require('./socket-guards');

const getSessionRoom = (pinCode) => `session:${pinCode}`;

const registerPlayerSocket = (io, socket) => {
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

  socket.on('player:submit-answer', async (payload = {}) => {
    try {
      const assertion = assertPlayerSocket(socket, payload.pinCode, payload.playerId);
      if (!assertion) return;

      const result = await sessionService.submitPlayerAnswer({
        pinCode: assertion.pinCode,
        playerId: assertion.playerId,
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
};

module.exports = { registerPlayerSocket };
