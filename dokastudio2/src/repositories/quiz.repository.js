// src/repositories/quiz.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  quiz: prisma.quiz,
  question: prisma.question,
  answer: prisma.answer,
  purchase: prisma.purchase,
  transaction: prisma.$transaction.bind(prisma),
};
