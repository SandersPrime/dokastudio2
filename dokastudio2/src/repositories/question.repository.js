// src/repositories/question.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  question: prisma.question,
  answer: prisma.answer,
  transaction: prisma.$transaction.bind(prisma),
};
