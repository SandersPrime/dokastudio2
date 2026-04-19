// src/services/quiz.service.js

const quizRepository = require('../repositories/quiz.repository');
const { prisma } = require('../config/prisma');
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

const QUIZ_LIST_INCLUDE = {
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
      gameSessions: true,
    },
  },
};

function normalizeLibraryQuiz(quiz, source, extra = {}) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    thumbnailUrl: quiz.thumbnailUrl,
    author: quiz.author || null,
    authorId: quiz.authorId,
    source,
    canEdit: source !== 'PURCHASED',
    questionCount: quiz._count?.questions || 0,
    playedCount: quiz._count?.gameSessions || 0,
    purchaseCount: quiz._count?.purchases || 0,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    isPublished: quiz.isPublished,
    isTemplate: quiz.isTemplate,
    isPaid: quiz.isPaid,
    price: quiz.price,
    category: quiz.category,
    ageGroup: quiz.ageGroup,
    format: quiz.format,
    marketplaceStatus: quiz.marketplaceStatus,
    ...extra,
  };
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

async function getQuizList({ authorId = null, currentUser }) {
  const requestedAuthorId = authorId || currentUser.id;

  if (requestedAuthorId !== currentUser.id && !isAdmin(currentUser)) {
    throw createHttpError(403, 'Нет доступа к списку квизов этого пользователя');
  }

  const where = isAdmin(currentUser) && !authorId
    ? {}
    : { authorId: requestedAuthorId };

  const quizzes = await quizRepository.quiz.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: QUIZ_LIST_INCLUDE,
  });

  return { quizzes };
}

async function getQuizLibrary({ currentUser }) {
  const ownQuizzes = await quizRepository.quiz.findMany({
    where: isAdmin(currentUser) ? {} : { authorId: currentUser.id },
    orderBy: { updatedAt: 'desc' },
    include: QUIZ_LIST_INCLUDE,
  });

  const purchases = await quizRepository.purchase.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      quiz: {
        include: QUIZ_LIST_INCLUDE,
      },
    },
  });

  const itemsByKey = new Map();

  ownQuizzes.forEach((quiz) => {
    itemsByKey.set(`OWNED:${quiz.id}`, normalizeLibraryQuiz(quiz, 'OWNED'));
  });

  purchases.forEach((purchase) => {
    if (!purchase.quiz) return;

    itemsByKey.set(
      `PURCHASED:${purchase.quiz.id}`,
      normalizeLibraryQuiz(purchase.quiz, 'PURCHASED', {
        canEdit: false,
        purchasedAt: purchase.createdAt,
        purchaseId: purchase.id,
        pricePaid: purchase.pricePaid,
      })
    );
  });

  const quizzes = Array.from(itemsByKey.values()).sort((a, b) => {
    const aDate = new Date(a.purchasedAt || a.updatedAt || a.createdAt).getTime();
    const bDate = new Date(b.purchasedAt || b.updatedAt || b.createdAt).getTime();
    return bDate - aDate;
  });

  return {
    quizzes,
    meta: {
      ownCount: ownQuizzes.length,
      purchasedCount: purchases.length,
    },
  };
}

async function getQuizById({ quizId, currentUser }) {
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

  if (quiz.authorId !== currentUser.id && !isAdmin(currentUser)) {
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
    subtitle: question.subtitle,
    imageUrl: question.imageUrl,
    audioUrl: question.audioUrl,
    videoUrl: question.videoUrl,
    elementType: question.elementType,
    type: question.type,
    layoutType: question.layoutType,
    gameMode: question.gameMode,
    backgroundColor: question.backgroundColor,
    backgroundImageUrl: question.backgroundImageUrl,
    configJson: question.configJson,
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
  getQuizLibrary,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  reorderQuestions,
  assertQuizWriteAccess,
  cloneQuizToUser,
};
