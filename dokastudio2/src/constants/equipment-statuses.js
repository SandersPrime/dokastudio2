// src/constants/equipment-statuses.js

const EQUIPMENT_REQUEST_TYPES = Object.freeze({
  SALE: 'SALE',
  RENTAL: 'RENTAL',
  PACKAGE: 'PACKAGE',
});

const EQUIPMENT_REQUEST_STATUSES = Object.freeze({
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  COMPLETED: 'COMPLETED',
});

module.exports = {
  EQUIPMENT_REQUEST_TYPES,
  EQUIPMENT_REQUEST_STATUSES,
};
