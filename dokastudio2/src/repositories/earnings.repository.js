// src/repositories/earnings.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  purchase: prisma.purchase,
  user: prisma.user,
  payoutRequest: prisma.payoutRequest,
  transaction: prisma.$transaction.bind(prisma),
};
