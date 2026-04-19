// src/config/socket.js

const { Server } = require('socket.io');
const { env } = require('./env');
const { registerSessionSocket } = require('../sockets/session.socket');

function initSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: env.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  registerSessionSocket(io);

  return io;
}

module.exports = { initSocketServer };
