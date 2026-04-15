// src/routes/index.js

const express = require('express');
const authRoutes = require('./auth.routes');
const uploadRoutes = require('./upload.routes');
const quizRoutes = require('./quiz.routes');
const questionRoutes = require('./question.routes');
const sessionRoutes = require('./session.routes');
const homeworkRoutes = require('./homework.routes');
const catalogRoutes = require('./catalog.routes');
const marketplaceRoutes = require('./marketplace.routes');
const earningsRoutes = require('./earnings.routes');
const equipmentRoutes = require('./equipment.routes');

function registerRoutes(app) {
  const api = express.Router();

  api.use('/auth', authRoutes);
  api.use('/upload', uploadRoutes);
  api.use('/quizzes', quizRoutes);
  api.use('/questions', questionRoutes);
  api.use('/sessions', sessionRoutes);
  api.use('/homework', homeworkRoutes);
  api.use('/catalog', catalogRoutes);
  api.use('/marketplace', marketplaceRoutes);
  api.use('/earnings', earningsRoutes);
  api.use('/equipment', equipmentRoutes);

  app.use('/api', api);
}

module.exports = { registerRoutes };
