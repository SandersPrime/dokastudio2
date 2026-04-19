// src/sockets/socket-guards.js

const sessionService = require('../services/session.service');

const emitSocketError = (socket, message) => {
  socket.emit('error', { message });
};

/**
 * Проверяет, что сокет является валидным хостом для указанного pinCode.
 * @param {Socket} socket
 * @param {string} pinCode
 * @param {string} actionName
 * @returns {string|null} Возвращает pinCode, если проверка пройдена, иначе null.
 */
const assertHostSocket = async (socket, pinCode, actionName = 'управления игрой') => {
  const safePinCode = String(pinCode || '').trim();

  if (!safePinCode) {
    emitSocketError(socket, `Недостаточно прав для ${actionName}`);
    return null;
  }

  const hostSocketId = socket.data.hostSocketId;
  const expectedSocketId = await sessionService.getHostSocketIdByPin(safePinCode);

  if (!expectedSocketId || expectedSocketId !== hostSocketId) {
    emitSocketError(socket, `Недостаточно прав для ${actionName}`);
    return null;
  }

  if (socket.data.hostPinCode !== safePinCode) {
    emitSocketError(socket, `Недостаточно прав для ${actionName}`);
    return null;
  }

  return safePinCode;
};

/**
 * Проверяет, что сокет является валидным игроком для указанного pinCode.
 * @param {Socket} socket
 * @param {string} pinCode
 * @param {string} playerId
 * @returns {Object|null} Возвращает объект с playerId и pinCode, если проверка пройдена, иначе null.
 */
const assertPlayerSocket = (socket, pinCode, playerId) => {
  const safePinCode = String(pinCode || '').trim();
  const safePlayerId = String(playerId || '').trim();

  if (!safePinCode || !safePlayerId) {
    emitSocketError(socket, 'Недостаточно прав для отправки ответа');
    return null;
  }

  if (socket.data.playerId !== safePlayerId) {
    emitSocketError(socket, 'Нельзя отправить ответ за другого игрока');
    return null;
  }

  if (socket.data.playerPinCode !== safePinCode) {
    emitSocketError(socket, 'Недостаточно прав для отправки ответа');
    return null;
  }

  return { playerId: safePlayerId, pinCode: safePinCode };
};

module.exports = {
  assertHostSocket,
  assertPlayerSocket,
  emitSocketError,
};
