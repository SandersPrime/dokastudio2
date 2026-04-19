// src/sockets/session.socket.js

const { registerHostSocket } = require('./host.socket');
const { registerPlayerSocket } = require('./player.socket');
const { registerBuzzerSocket } = require('./buzzer.socket');
const sessionService = require('../services/session.service');

/**
 * Центральный регистрационный слой сокетов.
 * Подключает все сокет-обработчики.
 * @param {SocketIO.Server} io
 */
function registerSessionSocket(io) {
  io.on('connection', (socket) => {
    registerHostSocket(io, socket);
    registerPlayerSocket(io, socket);
    registerBuzzerSocket(io, socket);

    socket.on('disconnect', async () => {
      try {
        // Уведомляем сервис об отключении сокета для корректной очистки
        await sessionService.disconnectPlayerBySocketId(socket.id);

        // Обновляем лобби при отключении игрока
        if (socket.data.playerPinCode) {
          try {
            const lobby = await sessionService.getSessionByPin(socket.data.playerPinCode);
            io.to(`session:${socket.data.playerPinCode}`).emit('lobby:update', {
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

module.exports = { registerSessionSocket };
