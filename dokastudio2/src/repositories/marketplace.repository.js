// src/repositories/marketplace.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  quiz: prisma.quiz,
  purchase: prisma.purchase,
  user: prisma.user,
  transaction: prisma.$transaction.bind(prisma),
};
