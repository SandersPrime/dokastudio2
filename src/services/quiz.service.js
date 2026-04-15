// src/services/quiz.service.js

const quizRepository = require('../repositories/quiz.repository');
const { createHttpError } = require('../utils/http-error');
const { ROLES } = require('../constants/roles');
const {
  validateCreateQuizPayload,
  validateUpdateQuizPayload,
  validateReorderPayload,
} = require('../validators/quiz.validator');

function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

async function getQuizOrThrow(quizId) {
  const quiz = await quizRepository.quiz.findUnique({
    where: { id: quizId },
  });

  if (!quiz) {
    throw createHttpError(404, 'Квиз не найден');
  }

  return quiz;
}

async function assertQuizWriteAccess(quizId, currentUser) {
  const quiz = await getQuizOrThrow(quizId);

  if (quiz.authorId !== currentUser.id && !isAdmin(currentUser)) {
    throw createHttpError(403, 'Нет прав на изменение квиза');
  }

  return quiz;
}

async function getQuizList({ authorId = null, currentUserId = null }) {
  const where = {};

  if (authorId) {
    where.authorId = authorId;
  } else if (!currentUserId) {
    where.isPublished = true;
  } else {
    where.OR = [
      { isPublished: true },
      { authorId: currentUserId },
    ];
  }

  const quizzes = await quizRepository.quiz.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          questions: true,
          purchases: true,
        },
      },
    },
  });

  return { quizzes };
}

async function getQuizById({ quizId, currentUserId = null }) {
  const quiz = await quizRepository.quiz.findUnique({
    where: { id: quizId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
        },
      },
      questions: {
        orderBy: { order: 'asc' },
        include: {
          answers: {
            orderBy: { order: 'asc' },
          },
        },
      },
      rounds: {
        orderBy: { order: 'asc' },
      },
    },
  });

  if (!quiz) {
    throw createHttpError(404, 'Квиз не найден');
  }

  const canRead =
    quiz.isPublished || quiz.authorId === currentUserId;

  if (!canRead) {
    throw createHttpError(403, 'Нет доступа к квизу');
  }

  return { quiz };
}

async function createQuiz({ userId, payload }) {
  const data = validateCreateQuizPayload(payload);

  const quiz = await quizRepository.quiz.create({
    data: {
      ...data,
      authorId: userId,
    },
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  return { quiz };
}

async function updateQuiz({ quizId, currentUser, payload }) {
  await assertQuizWriteAccess(quizId, currentUser);

  const data = validateUpdateQuizPayload(payload);

  const quiz = await quizRepository.quiz.update({
    where: { id: quizId },
    data,
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  return { quiz };
}

async function deleteQuiz({ quizId, currentUser }) {
  await assertQuizWriteAccess(quizId, currentUser);

  await quizRepository.quiz.delete({
    where: { id: quizId },
  });

  return {
    success: true,
    message: 'Квиз удалён',
  };
}

async function reorderQuestions({ quizId, currentUser, payload }) {
  await assertQuizWriteAccess(quizId, currentUser);

  const { questionIds } = validateReorderPayload(payload);

  const existingQuestions = await quizRepository.question.findMany({
    where: { quizId },
    select: { id: true },
  });

  const existingIds = new Set(existingQuestions.map((q) => q.id));

  if (questionIds.some((id) => !existingIds.has(id))) {
    throw createHttpError(400, 'В списке reorder есть чужие или несуществующие вопросы');
  }

  await quizRepository.transaction(
    questionIds.map((questionId, index) =>
      quizRepository.question.update({
        where: { id: questionId },
        data: { order: index },
      })
    )
  );

  const questions = await quizRepository.question.findMany({
    where: { quizId },
    orderBy: { order: 'asc' },
    include: {
      answers: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return {
    success: true,
    questions,
  };
}

function buildQuestionCloneData(question) {
  return {
    text: question.text,
    imageUrl: question.imageUrl,
    audioUrl: question.audioUrl,
    videoUrl: question.videoUrl,
    type: question.type,
    points: question.points,
    order: question.order,
    timeLimit: question.timeLimit,
    pointsAtStart: question.pointsAtStart,
    pointsAtEnd: question.pointsAtEnd,
    penaltyPoints: question.penaltyPoints,
    penaltyNoAnswer: question.penaltyNoAnswer,
    speedBonus1: question.speedBonus1,
    speedBonus2: question.speedBonus2,
    speedBonus3: question.speedBonus3,
    autoJudge: question.autoJudge,
    lockoutOnWrong: question.lockoutOnWrong,
    showCorrectAnswer: question.showCorrectAnswer,
    countdownMode: question.countdownMode,
    textReveal: question.textReveal,
    jokersEnabled: question.jokersEnabled,
    demographicGroup: question.demographicGroup,
    slideRouting: question.slideRouting,
    notes: question.notes,
    answers: {
      create: question.answers.map((answer) => ({
        text: answer.text,
        imageUrl: answer.imageUrl,
        isCorrect: answer.isCorrect,
        order: answer.order,
      })),
    },
  };
}

async function cloneQuizToUser({ sourceQuizId, userId, titleSuffix = ' (копия)', db = prisma }) {
  const sourceQuiz = await db.quiz.findUnique({
    where: { id: sourceQuizId },
    include: {
      questions: {
        orderBy: { order: 'asc' },
        include: {
          answers: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  if (!sourceQuiz) {
    throw createHttpError(404, 'Квиз не найден');
  }

  return db.quiz.create({
    data: {
      title: `${sourceQuiz.title}${titleSuffix}`,
      description: sourceQuiz.description,
      thumbnailUrl: sourceQuiz.thumbnailUrl,
      authorId: userId,
      isPrivate: true,
      hasTimer: sourceQuiz.hasTimer,
      timePerQuestion: sourceQuiz.timePerQuestion,
      showLeaderboard: sourceQuiz.showLeaderboard,
      allowReconnect: sourceQuiz.allowReconnect,
      isPublished: false,
      isTemplate: false,
      marketplaceStatus: 'DRAFT',
      licenseType: null,
      publishedAt: null,
      rejectionReason: null,
      isPaid: false,
      price: 0,
      discount: 0,
      salesCount: 0,
      category: sourceQuiz.category,
      ageGroup: sourceQuiz.ageGroup,
      format: sourceQuiz.format,
      questions: {
        create: sourceQuiz.questions.map(buildQuestionCloneData),
      },
    },
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });
}

module.exports = {
  getQuizList,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  reorderQuestions,
  assertQuizWriteAccess,
  cloneQuizToUser,
};
