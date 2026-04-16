// src/services/question.service.js

const questionRepository = require('../repositories/question.repository');
const { createHttpError } = require('../utils/http-error');
const quizService = require('./quiz.service');
const {
  validateCreateQuestionPayload,
  validateUpdateQuestionPayload,
} = require('../validators/question.validator');

async function getQuestionOrThrow(questionId) {
  const question = await questionRepository.question.findUnique({
    where: { id: questionId },
    include: {
      answers: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!question) {
    throw createHttpError(404, 'Вопрос не найден');
  }

  return question;
}

async function createQuestion({ quizId, currentUser, payload }) {
  await quizService.assertQuizWriteAccess(quizId, currentUser);

  const data = validateCreateQuestionPayload(payload);

  const questionCount = await questionRepository.question.count({
    where: { quizId },
  });

  const question = await questionRepository.question.create({
    data: {
      quizId,
      text: data.text,
      subtitle: data.subtitle ?? null,
      type: data.type,
      layoutType: data.layoutType,
      gameMode: data.gameMode ?? data.type,
      backgroundColor: data.backgroundColor ?? null,
      backgroundImageUrl: data.backgroundImageUrl ?? null,
      configJson: data.configJson ?? null,
      imageUrl: data.imageUrl ?? null,
      audioUrl: data.audioUrl ?? null,
      videoUrl: data.videoUrl ?? null,
      points: data.points,
      order: payload.order ?? questionCount,
      timeLimit: data.timeLimit,
      pointsAtStart: data.pointsAtStart,
      pointsAtEnd: data.pointsAtEnd,
      penaltyPoints: data.penaltyPoints,
      penaltyNoAnswer: data.penaltyNoAnswer,
      speedBonus1: data.speedBonus1,
      speedBonus2: data.speedBonus2,
      speedBonus3: data.speedBonus3,
      autoJudge: data.autoJudge,
      lockoutOnWrong: data.lockoutOnWrong,
      showCorrectAnswer: data.showCorrectAnswer,
      countdownMode: data.countdownMode ?? 'auto',
      textReveal: data.textReveal ?? 'none',
      jokersEnabled: data.jokersEnabled,
      demographicGroup: data.demographicGroup ?? null,
      slideRouting: data.slideRouting ?? null,
      notes: data.notes ?? null,
      answers: {
        create: data.answers.map((answer, index) => ({
          text: answer.text,
          imageUrl: answer.imageUrl,
          isCorrect: answer.isCorrect,
          order: index,
        })),
      },
    },
    include: {
      answers: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return { question };
}

async function updateQuestion({ questionId, currentUser, payload }) {
  const existingQuestion = await getQuestionOrThrow(questionId);

  await quizService.assertQuizWriteAccess(existingQuestion.quizId, currentUser);

  const data = validateUpdateQuestionPayload(payload);

  const updatedQuestion = await questionRepository.transaction(async (tx) => {
    const question = await tx.question.update({
      where: { id: questionId },
      data: {
        text: data.text,
        subtitle: data.subtitle,
        type: data.type,
        layoutType: data.layoutType,
        gameMode: data.gameMode,
        backgroundColor: data.backgroundColor,
        backgroundImageUrl: data.backgroundImageUrl,
        configJson: data.configJson,
        imageUrl: data.imageUrl ?? null,
        audioUrl: data.audioUrl ?? null,
        videoUrl: data.videoUrl ?? null,
        points: data.points,
        timeLimit: data.timeLimit,
        pointsAtStart: data.pointsAtStart,
        pointsAtEnd: data.pointsAtEnd,
        penaltyPoints: data.penaltyPoints,
        penaltyNoAnswer: data.penaltyNoAnswer,
        speedBonus1: data.speedBonus1,
        speedBonus2: data.speedBonus2,
        speedBonus3: data.speedBonus3,
        autoJudge: data.autoJudge,
        lockoutOnWrong: data.lockoutOnWrong,
        showCorrectAnswer: data.showCorrectAnswer,
        countdownMode: data.countdownMode ?? 'auto',
        textReveal: data.textReveal ?? 'none',
        jokersEnabled: data.jokersEnabled,
        demographicGroup: data.demographicGroup ?? null,
        slideRouting: data.slideRouting ?? null,
        notes: data.notes ?? null,
      },
    });

    if (Array.isArray(data.answers)) {
      await tx.answer.deleteMany({
        where: { questionId },
      });

      if (data.answers.length) {
        await tx.answer.createMany({
          data: data.answers.map((answer, index) => ({
            questionId,
            text: answer.text,
            imageUrl: answer.imageUrl,
            isCorrect: answer.isCorrect,
            order: index,
          })),
        });
      }
    }

    return question;
  });

  const fullQuestion = await questionRepository.question.findUnique({
    where: { id: updatedQuestion.id },
    include: {
      answers: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return { question: fullQuestion };
}

async function deleteQuestion({ questionId, currentUser }) {
  const existingQuestion = await getQuestionOrThrow(questionId);

  await quizService.assertQuizWriteAccess(existingQuestion.quizId, currentUser);

  await questionRepository.question.delete({
    where: { id: questionId },
  });

  const remainingQuestions = await questionRepository.question.findMany({
    where: { quizId: existingQuestion.quizId },
    orderBy: { order: 'asc' },
    select: { id: true },
  });

  await questionRepository.transaction(
    remainingQuestions.map((question, index) =>
      questionRepository.question.update({
        where: { id: question.id },
        data: { order: index },
      })
    )
  );

  return {
    success: true,
    message: 'Вопрос удалён',
  };
}

module.exports = {
  createQuestion,
  updateQuestion,
  deleteQuestion,
};
