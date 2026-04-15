// src/services/upload.service.js
// Централизованная конфигурация загрузки файлов через multer.
// Совместима с текущим проектом: загрузка в public/uploads,
// ответ в формате { url, filename }.

const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { createHttpError } = require('../utils/http-error');

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function getAllowedExtensions() {
  return new Set([
    '.jpeg',
    '.jpg',
    '.png',
    '.gif',
    '.webp',
    '.mp3',
    '.wav',
    '.mp4',
    '.webm',
  ]);
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    try {
      ensureUploadDir();
      cb(null, UPLOAD_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = getAllowedExtensions();

  if (!allowedExtensions.has(ext)) {
    return cb(createHttpError(400, 'Неподдерживаемый тип файла'));
  }

  return cb(null, true);
}

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

function buildUploadResponse(file) {
  if (!file) {
    throw createHttpError(400, 'Файл не загружен');
  }

  return {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

module.exports = {
  uploadMiddleware,
  buildUploadResponse,
};