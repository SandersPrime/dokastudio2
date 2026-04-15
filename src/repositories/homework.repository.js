// src/repositories/homework.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  homework: prisma.homework,
  homeworkSubmission: prisma.homeworkSubmission,
  quiz: prisma.quiz,
  transaction: prisma.$transaction.bind(prisma),
};
