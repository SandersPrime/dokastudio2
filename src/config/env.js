// src/config/env.js
// Единая точка чтения env-переменных

const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  jwtSecret:
    process.env.JWT_SECRET || 'doka-studio-secret-key-2024-change-in-production',
  uploadsDir: process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads'),
};

module.exports = { env };