// src/repositories/equipment.repository.js

const { prisma } = require('../config/prisma');

module.exports = {
  equipmentProduct: prisma.equipmentProduct,
  equipmentRequest: prisma.equipmentRequest,
};
