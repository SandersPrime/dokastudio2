// src/repositories/session.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  gameSession: prisma.gameSession,
  gamePlayer: prisma.gamePlayer,
  playerAnswer: prisma.playerAnswer,
  quiz: prisma.quiz,
  user: prisma.user,
  transaction: prisma.$transaction.bind(prisma),
};
