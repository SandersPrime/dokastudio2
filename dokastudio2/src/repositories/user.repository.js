// src/repositories/user.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  user: prisma.user,
};
