// src/controllers/upload.controller.js
// Контроллер загрузки файлов

const uploadService = require('../services/upload.service');

async function uploadFile(req, res) {
  const result = uploadService.buildUploadResponse(req.file);
  return res.json(result);
}

module.exports = {
  uploadFile,
};