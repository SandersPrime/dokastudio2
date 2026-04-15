// src/services/marketplace.service.js

const marketplaceRepository = require('../repositories/marketplace.repository');
const { createHttpError } = require('../utils/http-error');
const { cloneQuizToUser } = require('./quiz.service');
const {
  validateQuizId,
  validatePublishPayload,
  validateRejectPayload,
} = require('../validators/marketplace.validator');
const { MARKETPLACE_STATUSES } = require('../constants/marketplace-statuses');
const { ROLES } = require('../constants/roles');

function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

function assertAdmin(user) {
  if (!isAdmin(user)) {
    throw createHttpError(403, 'Доступно только администратору');
  }
}

function serializeMarketplaceQuiz(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    thumbnailUrl: quiz.thumbnailUrl || null,
    author: quiz.author ? { id: quiz.author.id, name: quiz.author.name } : null,
    price: quiz.price,
    isPaid: quiz.isPaid,
    category: quiz.category || null,
    ageGroup: quiz.ageGroup || null,
    format: quiz.format || null,
    marketplaceStatus: quiz.marketplaceStatus,
    licenseType: quiz.licenseType || null,
    publishedAt: quiz.publishedAt || null,
    rejectionReason: quiz.rejectionReason || null,
    questionCount: quiz._count?.questions ?? quiz.questions?.length ?? 0,
  };
}

async function getOwnQuizOrThrow(quizId, currentUser) {
  const quiz = await marketplaceRepository.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        select: { id: true },
      },
    },
  });

  if (!quiz) {
    throw createHttpError(404, 'Квиз не найден');
  }

  if (quiz.authorId !== currentUser.id && !isAdmin(currentUser)) {
    throw createHttpError(403, 'Можно публиковать только свой квиз');
  }

  return quiz;
}

async function publishQuiz({ quizId, currentUser, payload }) {
  const safeQuizId = validateQuizId(quizId);
  const data = validatePublishPayload(payload);
  const quiz = await getOwnQuizOrThrow(safeQuizId, currentUser);

  if (!quiz.questions.length) {
    throw createHttpError(400, 'Квиз должен иметь хотя бы 1 вопрос');
  }

  const updated = await marketplaceRepository.quiz.update({
    where: { id: quiz.id },
    data: {
      ...data,
      marketplaceStatus: MARKETPLACE_STATUSES.PENDING_REVIEW,
      rejectionReason: null,
    },
    include: marketplaceInclude(),
  });

  return { quiz: serializeMarketplaceQuiz(updated) };
}

async function updateMarketplaceQuiz({ quizId, currentUser, payload }) {
  const safeQuizId = validateQuizId(quizId);
  await getOwnQuizOrThrow(safeQuizId, currentUser);
  const data = validatePublishPayload(payload);

  const updated = await marketplaceRepository.quiz.update({
    where: { id: safeQuizId },
    data,
    include: marketplaceInclude(),
  });

  return { quiz: serializeMarketplaceQuiz(updated) };
}

function marketplaceInclude() {
  return {
    author: {
      select: {
        id: true,
        name: true,
      },
    },
    _count: {
      select: {
        questions: true,
      },
    },
  };
}

async function getMyMarketplace({ currentUser }) {
  const quizzes = await marketplaceRepository.quiz.findMany({
    where: { authorId: currentUser.id },
    orderBy: { updatedAt: 'desc' },
    include: marketplaceInclude(),
  });

  return {
    quizzes: quizzes.map(serializeMarketplaceQuiz),
  };
}

async function getPendingQuizzes({ currentUser }) {
  assertAdmin(currentUser);

  const quizzes = await marketplaceRepository.quiz.findMany({
    where: { marketplaceStatus: MARKETPLACE_STATUSES.PENDING_REVIEW },
    orderBy: { updatedAt: 'asc' },
    include: marketplaceInclude(),
  });

  return {
    quizzes: quizzes.map(serializeMarketplaceQuiz),
  };
}

async function approveQuiz({ quizId, currentUser }) {
  assertAdmin(currentUser);
  const safeQuizId = validateQuizId(quizId);

  const quiz = await marketplaceRepository.quiz.findUnique({
    where: { id: safeQuizId },
    include: { questions: { select: { id: true } } },
  });

  if (!quiz) throw createHttpError(404, 'Квиз не найден');
  if (!quiz.questions.length) throw createHttpError(400, 'Нельзя опубликовать квиз без вопросов');

  const updated = await marketplaceRepository.quiz.update({
    where: { id: safeQuizId },
    data: {
      marketplaceStatus: MARKETPLACE_STATUSES.PUBLISHED,
      isPublished: true,
      isTemplate: true,
      publishedAt: new Date(),
      rejectionReason: null,
    },
    include: marketplaceInclude(),
  });

  return { quiz: serializeMarketplaceQuiz(updated) };
}

async function rejectQuiz({ quizId, currentUser, payload }) {
  assertAdmin(currentUser);
  const safeQuizId = validateQuizId(quizId);
  const { rejectionReason } = validateRejectPayload(payload);

  const updated = await marketplaceRepository.quiz.update({
    where: { id: safeQuizId },
    data: {
      marketplaceStatus: MARKETPLACE_STATUSES.REJECTED,
      isPublished: false,
      isTemplate: false,
      rejectionReason,
    },
    include: marketplaceInclude(),
  });

  return { quiz: serializeMarketplaceQuiz(updated) };
}

async function buyQuiz({ quizId, currentUser }) {
  const safeQuizId = validateQuizId(quizId);
  const quiz = await marketplaceRepository.quiz.findUnique({
    where: { id: safeQuizId },
    include: marketplaceInclude(),
  });

  if (!quiz) throw createHttpError(404, 'Квиз не найден');
  if (quiz.authorId === currentUser.id) throw createHttpError(400, 'Нельзя купить свой квиз');
  if (quiz.marketplaceStatus !== MARKETPLACE_STATUSES.PUBLISHED || !quiz.isPublished || !quiz.isTemplate) {
    throw createHttpError(400, 'Квиз недоступен для покупки');
  }
  if (!quiz.isPaid || Number(quiz.price) <= 0) {
    throw createHttpError(400, 'Этот квиз бесплатный, добавьте его из каталога');
  }

  const existingPurchase = await marketplaceRepository.purchase.findUnique({
    where: {
      userId_quizId: {
        userId: currentUser.id,
        quizId: quiz.id,
      },
    },
  });

  if (existingPurchase) {
    throw createHttpError(400, 'Этот квиз уже куплен');
  }

  const pricePaid = Number(quiz.price) || 0;
  const platformFee = Math.round(pricePaid * 0.2 * 100) / 100;
  const authorRevenue = Math.max(0, pricePaid - platformFee);

  const result = await marketplaceRepository.transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        userId: currentUser.id,
        authorId: quiz.authorId,
        quizId: quiz.id,
        amount: pricePaid,
        pricePaid,
        platformFee,
        authorEarning: authorRevenue,
        authorRevenue,
      },
    });

    await tx.quiz.update({
      where: { id: quiz.id },
      data: {
        salesCount: { increment: 1 },
      },
    });

    await tx.user.update({
      where: { id: quiz.authorId },
      data: {
        balance: { increment: authorRevenue },
      },
    });

    const clonedQuiz = await cloneQuizToUser({
      sourceQuizId: quiz.id,
      userId: currentUser.id,
      db: tx,
    });

    return { purchase, clonedQuiz };
  });

  return {
    purchase: result.purchase,
    quiz: result.clonedQuiz,
  };
}

module.exports = {
  publishQuiz,
  updateMarketplaceQuiz,
  getMyMarketplace,
  getPendingQuizzes,
  approveQuiz,
  rejectQuiz,
  buyQuiz,
};
