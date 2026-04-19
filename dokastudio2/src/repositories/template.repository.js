// src/repositories/template.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  template: prisma.template,
};