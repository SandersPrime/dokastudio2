// app.js - Главный сервер DokaStudio 2.0
// Архитектура: Express + Socket.IO + Prisma + JWT

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const QRCode = require('qrcode');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp3|wav|mp4|webm/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый тип файла'));
    }
  }
});

// Инициализация
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});
const prisma = new PrismaClient();

// Константы
const JWT_SECRET = process.env.JWT_SECRET || 'doka-studio-secret-key-2024-change-in-production';
const SALT_ROUNDS = 10;

// ============================================
// MIDDLEWARES
// ============================================
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000", credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// Rate Limiting
//const limiter = rateLimit({
//  windowMs: 15 * 60 * 1000,
 // max: 100,
 // message: 'Слишком много запросов. Попробуйте позже.',
  //standardHeaders: true,
  //legacyHeaders: false,
//});
//app.use('/api/', limiter);

//const authLimiter = rateLimit({
//  windowMs: 15 * 60 * 1000,
//  max: 5,
 // skipSuccessfulRequests: true,
//});
//app.use('/api/auth/login', authLimiter);
//app.use('/api/auth/register', authLimiter);

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Требуется авторизация' });

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Недействительный токен' });
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, role: true, balance: true }
      });
      if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
      req.user = user;
      next();
    } catch (error) {
      res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
  });
};

const generatePinCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// ============================================
// AUTH API
// ============================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) return res.status(400).json({ error: 'Все поля обязательны' });
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Пользователь уже существует' });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: { email, passwordHash, name, role: 'USER' }
    });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Регистрация успешна', token, user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance } });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ error: 'Неверный email или пароль' });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Вход выполнен', token, user: { id: user.id, email: user.email, name: user.name, role: user.role, balance: user.balance } });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => res.json({ user: req.user }));

// ============================================
// UPLOAD API
// ============================================
app.post('/api/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

// ============================================
// QUIZ API
// ============================================
app.get('/api/quizzes', async (req, res) => {
  try {
    const { authorId } = req.query;
    const where = { OR: [{ isPublished: true }, { authorId: req.user?.id }] };
    if (authorId) where.authorId = authorId;
    
    const quizzes = await prisma.quiz.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { id: true, name: true } }, _count: { select: { questions: true } } }
    });
    res.json({ quizzes });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/quizzes/:id', async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { name: true } },
        questions: { orderBy: { order: 'asc' }, include: { answers: { orderBy: { order: 'asc' } } } }
      }
    });
    if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
    res.json({ quiz });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/quizzes', authenticateToken, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Название обязательно' });
    const quiz = await prisma.quiz.create({
      data: { title, description, authorId: req.user.id }
    });
    res.status(201).json({ quiz });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/quizzes/:id', authenticateToken, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
    if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
    if (quiz.authorId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Нет прав' });

    const updated = await prisma.quiz.update({
      where: { id: req.params.id },
      data: { ...req.body }
    });
    res.json({ quiz: updated });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создание вопроса с расширенными настройками
app.post('/api/quizzes/:quizId/questions', authenticateToken, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.params.quizId } });
    if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });
    if (quiz.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Нет прав' });
    }

    const question = await prisma.question.create({
      data: {
        quizId: req.params.quizId,
        text: req.body.text,
        type: req.body.type || 'TEXT',
        points: req.body.points || 100,
        timeLimit: req.body.timeLimit,
        imageUrl: req.body.imageUrl,
        audioUrl: req.body.audioUrl,
        videoUrl: req.body.videoUrl,
        order: req.body.order || 0,
        // Расширенные настройки
        pointsAtStart: req.body.pointsAtStart ?? 100,
        pointsAtEnd: req.body.pointsAtEnd ?? 100,
        penaltyPoints: req.body.penaltyPoints ?? 0,
        penaltyNoAnswer: req.body.penaltyNoAnswer ?? 0,
        speedBonus1: req.body.speedBonus1 ?? 0,
        speedBonus2: req.body.speedBonus2 ?? 0,
        speedBonus3: req.body.speedBonus3 ?? 0,
        autoJudge: req.body.autoJudge ?? true,
        lockoutOnWrong: req.body.lockoutOnWrong ?? true,
        showCorrectAnswer: req.body.showCorrectAnswer ?? true,
        countdownMode: req.body.countdownMode ?? 'auto',
        textReveal: req.body.textReveal ?? 'none',
        jokersEnabled: req.body.jokersEnabled ?? true,
        demographicGroup: req.body.demographicGroup,
        slideRouting: req.body.slideRouting,
        notes: req.body.notes,
        answers: {
          create: req.body.answers || []
        }
      },
      include: { answers: true }
    });
    res.status(201).json({ question });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновление вопроса
app.put('/api/questions/:id', authenticateToken, async (req, res) => {
  try {
    const question = await prisma.question.findUnique({ 
      where: { id: req.params.id }, 
      include: { quiz: true } 
    });
    if (!question) return res.status(404).json({ error: 'Вопрос не найден' });
    if (question.quiz.authorId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Нет прав' });
    }

    const updated = await prisma.question.update({
      where: { id: req.params.id },
      data: {
        text: req.body.text,
        type: req.body.type,
        points: req.body.points,
        timeLimit: req.body.timeLimit,
        imageUrl: req.body.imageUrl,
        audioUrl: req.body.audioUrl,
        videoUrl: req.body.videoUrl,
        // Расширенные настройки
        pointsAtStart: req.body.pointsAtStart,
        pointsAtEnd: req.body.pointsAtEnd,
        penaltyPoints: req.body.penaltyPoints,
        penaltyNoAnswer: req.body.penaltyNoAnswer,
        speedBonus1: req.body.speedBonus1,
        speedBonus2: req.body.speedBonus2,
        speedBonus3: req.body.speedBonus3,
        autoJudge: req.body.autoJudge,
        lockoutOnWrong: req.body.lockoutOnWrong,
        showCorrectAnswer: req.body.showCorrectAnswer,
        countdownMode: req.body.countdownMode,
        textReveal: req.body.textReveal,
        jokersEnabled: req.body.jokersEnabled,
        demographicGroup: req.body.demographicGroup,
        slideRouting: req.body.slideRouting,
        notes: req.body.notes,
        answers: req.body.answers ? {
          deleteMany: {},
          create: req.body.answers
        } : undefined
      },
      include: { answers: true }
    });
    res.json({ question: updated });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/api/questions/:id', authenticateToken, async (req, res) => {
  try {
    const question = await prisma.question.findUnique({ where: { id: req.params.id }, include: { quiz: true } });
    if (!question) return res.status(404).json({ error: 'Вопрос не найден' });
    if (question.quiz.authorId !== req.user.id) return res.status(403).json({ error: 'Нет прав' });

    await prisma.question.delete({ where: { id: req.params.id } });
    res.json({ message: 'Вопрос удалён' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/api/quizzes/:quizId/questions/reorder', authenticateToken, async (req, res) => {
  try {
    const { questionIds } = req.body;
    for (let i = 0; i < questionIds.length; i++) {
      await prisma.question.update({ where: { id: questionIds[i] }, data: { order: i } });
    }
    res.json({ message: 'Порядок обновлён' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================================
// FLASHCARDS API
// ============================================
app.get('/api/flashcards', async (req, res) => {
  try {
    const sets = await prisma.flashcardSet.findMany({
      where: { isPublished: true },
      include: { author: { select: { name: true } }, _count: { select: { cards: true } } }
    });
    res.json({ sets });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/flashcards', authenticateToken, async (req, res) => {
  try {
    const set = await prisma.flashcardSet.create({
      data: { title: req.body.title, description: req.body.description, authorId: req.user.id }
    });
    res.status(201).json({ set });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/flashcards/:id', async (req, res) => {
  try {
    const set = await prisma.flashcardSet.findUnique({
      where: { id: req.params.id },
      include: { cards: { orderBy: { order: 'asc' } } }
    });
    if (!set) return res.status(404).json({ error: 'Набор не найден' });
    res.json({ set });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/flashcards/:setId/cards', authenticateToken, async (req, res) => {
  try {
    const card = await prisma.flashcard.create({
      data: { setId: req.params.setId, term: req.body.term, definition: req.body.definition, order: req.body.order || 0 }
    });
    res.status(201).json({ card });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================================
// GAME SESSIONS API
// ============================================
app.post('/api/sessions', authenticateToken, async (req, res) => {
  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: req.body.quizId } });
    if (!quiz) return res.status(404).json({ error: 'Квиз не найден' });

    let pinCode;
    do { pinCode = generatePinCode(); } while (await prisma.gameSession.findUnique({ where: { pinCode } }));

    const session = await prisma.gameSession.create({
      data: { quizId: req.body.quizId, hostId: req.user.id, pinCode, status: 'LOBBY' }
    });

    const joinUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/play/${pinCode}`;
    const qrCode = await QRCode.toDataURL(joinUrl);

    res.status(201).json({ session, joinUrl, qrCode });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/sessions/pin/:pinCode', async (req, res) => {
  try {
    const session = await prisma.gameSession.findUnique({
      where: { pinCode: req.params.pinCode },
      include: { quiz: { select: { title: true } }, host: { select: { name: true } } }
    });
    if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// ============================================
// SOCKET.IO - REAL-TIME ДВИЖОК
// ============================================
const activeGames = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 Подключение: ${socket.id}`);

  socket.on('host:create-room', async (data) => {
    const { sessionId, pinCode } = data;
    socket.join(pinCode);
    if (!activeGames.has(pinCode)) {
      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: { quiz: { include: { questions: { orderBy: { order: 'asc' }, include: { answers: true } } } } }
      });
      activeGames.set(pinCode, {
        sessionId, quiz: session.quiz, currentQuestionIndex: 0,
        players: new Map(), status: 'LOBBY', hostSocketId: socket.id
      });
    }
    socket.emit('host:room-created', { success: true, pinCode });
  });

  socket.on('player:join', async (data) => {
    const { pinCode, nickname } = data;
    const game = activeGames.get(pinCode);
    if (!game || game.status !== 'LOBBY') return;

    socket.join(pinCode);
    const player = await prisma.gamePlayer.create({
      data: { sessionId: game.sessionId, nickname, socketId: socket.id }
    });
    game.players.set(socket.id, { id: player.id, nickname, score: 0, socketId: socket.id });
    io.to(game.hostSocketId).emit('host:player-joined', { players: Array.from(game.players.values()) });
    io.to(pinCode).emit('lobby:update', { playerCount: game.players.size });
    socket.emit('player:joined', { success: true, playerId: player.id });
  });

  socket.on('host:start-game', (data) => {
    const game = activeGames.get(data.pinCode);
    if (!game) return;
    game.status = 'QUESTION';
    const q = game.quiz.questions[0];
    io.to(data.pinCode).emit('game:question', {
      question: { id: q.id, text: q.text, type: q.type, points: q.points, timeLimit: q.timeLimit || 30, answers: q.answers.map(a => ({ id: a.id, text: a.text })) },
      questionNumber: 1, totalQuestions: game.quiz.questions.length
    });
  });

  socket.on('player:answer', async (data) => {
    const game = activeGames.get(data.pinCode);
    if (!game) return;
    const player = game.players.get(socket.id);
    if (!player) return;

    const question = game.quiz.questions.find(q => q.id === data.questionId);
    const isCorrect = question.answers.find(a => a.id === data.answerId)?.isCorrect || false;
    let points = 0;
    if (isCorrect) {
      const bonus = Math.max(0, Math.floor((question.timeLimit || 30) * 1000 - data.responseTimeMs) / 100);
      points = question.points + Math.floor(bonus);
      player.score += points;
    }

    await prisma.playerAnswer.create({
      data: { playerId: player.id, questionId: data.questionId, answerId: data.answerId, isCorrect, pointsAwarded: points, responseTimeMs: data.responseTimeMs }
    });
    socket.emit('player:answer-result', { isCorrect, pointsAwarded: points, totalScore: player.score });
  });

  socket.on('host:show-answer', async (data) => {
    const game = activeGames.get(data.pinCode);
    if (!game) return;
    const q = game.quiz.questions[game.currentQuestionIndex];
    
    const answers = await prisma.playerAnswer.findMany({
      where: { questionId: q.id, player: { sessionId: game.sessionId } },
      select: { answerId: true }
    });
    const stats = {};
    answers.forEach(a => { if (a.answerId) stats[a.answerId] = (stats[a.answerId] || 0) + 1; });
    const statistics = Object.entries(stats).map(([answerId, count]) => ({ answerId, _count: { answerId: count } }));

    io.to(data.pinCode).emit('game:answer-reveal', {
      correctAnswerId: q.answers.find(a => a.isCorrect)?.id,
      statistics,
      leaderboard: Array.from(game.players.values()).sort((a, b) => b.score - a.score).slice(0, 10)
    });
  });

  socket.on('host:next-question', (data) => {
    const game = activeGames.get(data.pinCode);
    if (!game) return;
    game.currentQuestionIndex++;
    if (game.currentQuestionIndex >= game.quiz.questions.length) {
      io.to(data.pinCode).emit('game:finished', { leaderboard: Array.from(game.players.values()).sort((a, b) => b.score - a.score) });
      activeGames.delete(data.pinCode);
    } else {
      const q = game.quiz.questions[game.currentQuestionIndex];
      io.to(data.pinCode).emit('game:question', {
        question: { id: q.id, text: q.text, type: q.type, points: q.points, timeLimit: q.timeLimit || 30, answers: q.answers.map(a => ({ id: a.id, text: a.text })) },
        questionNumber: game.currentQuestionIndex + 1, totalQuestions: game.quiz.questions.length
      });
    }
  });

  socket.on('disconnect', () => {
    for (const [pinCode, game] of activeGames) {
      if (game.players.has(socket.id)) {
        game.players.delete(socket.id);
        io.to(pinCode).emit('lobby:update', { playerCount: game.players.size });
        break;
      }
    }
  });
});
// ============================================
// HOMEWORK API (Домашние задания)
// ============================================

// Модель Homework (добавь в schema.prisma)
/*
model Homework {
  id              String        @id @default(cuid())
  name            String
  description     String?
  quizId          String
  quiz            Quiz          @relation(fields: [quizId], references: [id])
  authorId        String
  author          User          @relation(fields: [authorId], references: [id])
  pinCode         String        @unique
  deadline        DateTime
  timeLimit       Int           @default(0)  // в минутах, 0 = без ограничений
  maxAttempts     Int           @default(1)
  shuffleQuestions Boolean      @default(false)
  showAnswersAfter Boolean      @default(true)
  createdAt       DateTime      @default(now())
  submissions     HomeworkSubmission[]
}

model HomeworkSubmission {
  id          String   @id @default(cuid())
  homeworkId  String
  homework    Homework @relation(fields: [homeworkId], references: [id], onDelete: Cascade)
  studentName String
  studentId   String?
  startedAt   DateTime @default(now())
  completedAt DateTime?
  score       Int      @default(0)
  timeSpent   Int      @default(0)  // в секундах
  answers     Json     // [{ questionId, answerIndex, isCorrect }]
  attempt     Int      @default(1)
  
  @@unique([homeworkId, studentName, attempt])
}
*/

// Генерация PIN для домашки
const generateHomeworkPin = () => Math.floor(100000 + Math.random() * 900000).toString();

// Создать домашнее задание
app.post('/api/homework', authenticateToken, async (req, res) => {
  try {
    const { quizId, name, description, deadline, timeLimit, maxAttempts, shuffleQuestions, showAnswersAfter } = req.body;
    
    let pinCode;
    do { pinCode = generateHomeworkPin(); } while (await prisma.homework.findUnique({ where: { pinCode } }));
    
    const homework = await prisma.homework.create({
      data: {
        name,
        description,
        quizId,
        authorId: req.user.id,
        pinCode,
        deadline: new Date(deadline),
        timeLimit: timeLimit || 0,
        maxAttempts: maxAttempts || 1,
        shuffleQuestions: shuffleQuestions || false,
        showAnswersAfter: showAnswersAfter !== false
      }
    });
    
    res.status(201).json({ homework });
  } catch (error) {
    console.error('Create homework error:', error);
    res.status(500).json({ error: 'Ошибка создания задания' });
  }
});

// Получить список домашних заданий преподавателя
app.get('/api/homework/my', authenticateToken, async (req, res) => {
  try {
    const homework = await prisma.homework.findMany({
      where: { authorId: req.user.id },
      include: {
        quiz: { select: { title: true, questions: { select: { id: true } } } },
        _count: { select: { submissions: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Добавляем подсчёт выполненных
    const enriched = await Promise.all(homework.map(async (h) => {
      const completed = await prisma.homeworkSubmission.count({
        where: { homeworkId: h.id, completedAt: { not: null } }
      });
      return { ...h, _count: { ...h._count, completed } };
    }));
    
    res.json({ homework: enriched });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить детали задания
app.get('/api/homework/:id', authenticateToken, async (req, res) => {
  try {
    const homework = await prisma.homework.findUnique({
      where: { id: req.params.id },
      include: {
        quiz: { include: { questions: true } },
        submissions: {
          orderBy: { completedAt: 'desc' }
        }
      }
    });
    
    if (!homework) return res.status(404).json({ error: 'Задание не найдено' });
    if (homework.authorId !== req.user.id) return res.status(403).json({ error: 'Нет доступа' });
    
    res.json({ homework });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получить задание по PIN (для учеников)
app.get('/api/homework/code/:pin', async (req, res) => {
  try {
    const homework = await prisma.homework.findUnique({
      where: { pinCode: req.params.pin },
      include: { quiz: { select: { id: true, title: true, description: true } } }
    });
    
    if (!homework) return res.status(404).json({ error: 'Задание не найдено' });
    
    // Не отправляем лишнюю информацию ученику
    const { authorId, createdAt, ...publicInfo } = homework;
    res.json({ homework: publicInfo });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Начать выполнение задания
app.post('/api/homework/:id/start', async (req, res) => {
  try {
    const { studentName } = req.body;
    const homeworkId = req.params.id;
    
    // Считаем количество попыток
    const attemptCount = await prisma.homeworkSubmission.count({
      where: { homeworkId, studentName }
    });
    
    const homework = await prisma.homework.findUnique({
      where: { id: homeworkId }
    });
    
    if (attemptCount >= homework.maxAttempts) {
      return res.status(400).json({ error: 'Превышено количество попыток' });
    }
    
    const submission = await prisma.homeworkSubmission.create({
      data: {
        homeworkId,
        studentName,
        attempt: attemptCount + 1,
        answers: []
      }
    });
    
    res.json({ submission });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Отправить результаты
app.post('/api/homework/:id/submit', async (req, res) => {
  try {
    const { studentName, answers, score, timeSpent } = req.body;
    const homeworkId = req.params.id;
    
    // Находим последнюю незавершённую попытку
    const submission = await prisma.homeworkSubmission.findFirst({
      where: { homeworkId, studentName, completedAt: null },
      orderBy: { attempt: 'desc' }
    });
    
    if (!submission) {
      return res.status(404).json({ error: 'Попытка не найдена' });
    }
    
    const updated = await prisma.homeworkSubmission.update({
      where: { id: submission.id },
      data: {
        completedAt: new Date(),
        score,
        timeSpent,
        answers
      }
    });
    
    res.json({ submission: updated });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
// ============================================
// ЗАПУСК СЕРВЕРА
// ============================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════╗`);
  console.log(`║     🎮 DOKASTUDIO 2.0 СЕРВЕР ЗАПУЩЕН      ║`);
  console.log(`╠════════════════════════════════════════════╣`);
  console.log(`║  Порт: ${PORT}                               ║`);
  console.log(`║  API: http://localhost:${PORT}/api           ║`);
  console.log(`╚════════════════════════════════════════════╝\n`);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Завершение работы...');
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});