// app.js
// Главная точка входа сервера после второго шага реорганизации.
// Уже вынесены:
// - auth
// - upload
// - base route registry
// Остальная логика постепенно выносится дальше.

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const { env } = require('./src/config/env');
const { prisma } = require('./src/config/prisma');
const { registerRoutes } = require('./src/routes');
const { initSocketServer } = require('./src/config/socket');
const { requestId } = require('./src/middlewares/request-id');
const { notFound } = require('./src/middlewares/not-found');
const { errorHandler } = require('./src/middlewares/error-handler');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = initSocketServer(server);
app.locals.prisma = prisma;
app.locals.io = io;

// Пути
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Middlewares
app.use(requestId);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: env.clientUrl,
    credentials: true,
  })
);

app.use(compression());
morgan.token('request-id', (req) => req.requestId || '-');
app.use(morgan(env.nodeEnv === 'production' ? ':request-id :remote-addr :method :url :status :res[content-length] - :response-time ms' : ':request-id :method :url :status :response-time ms'));

app.use(
  express.json({
    limit: '10mb',
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
  })
);

// Static files
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));

// Healthcheck
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.status(200).json({
      ok: true,
      service: 'dokastudio-api',
      env: env.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'Database unavailable',
    });
  }
});

// API
registerRoutes(app);

// 404 для API
app.use('/api/*splat', notFound);

// HTML routes
app.get('/constructor', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'constructor.html'));
});

app.get('/host', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'host.html'));
});

app.get('/play', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'play.html'));
});

app.get('/play/:pinCode', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'play.html'));
});

app.get('/homework', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'homework.html'));
});

app.get('/homework/:pinCode', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'do-homework.html'));
});

app.get('/flashcards', (req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'flashcards.html'));
});

// Fallback
app.use((req, res) => {
  return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Error handler
app.use(errorHandler);

async function start() {
  try {
    await prisma.$connect();

    server.listen(env.port, () => {
      console.log(`DokaStudio server started on port ${env.port}`);
      console.log(`Client URL: ${env.clientUrl}`);
      console.log(`Environment: ${env.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  try {
    await prisma.$disconnect();
    server.close(() => {
      process.exit(0);
    });
  } catch (error) {
    console.error('Shutdown error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  start();
}

module.exports = { app, server };
