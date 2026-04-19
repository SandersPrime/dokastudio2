// src/services/catalog.service.js

const quizRepository = require('../repositories/quiz.repository');
const { createHttpError } = require('../utils/http-error');
const { cloneQuizToUser } = require('./quiz.service');
const {
  validateCatalogQuery,
  validateCatalogId,
} = require('../validators/catalog.validator');

function serializeCatalogQuiz(quiz) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    thumbnailUrl: quiz.thumbnailUrl || null,
    author: quiz.author
      ? {
          id: quiz.author.id,
          name: quiz.author.name,
        }
      : null,
    price: quiz.price,
    isPaid: quiz.isPaid,
    category: quiz.category || null,
    ageGroup: quiz.ageGroup || null,
    format: quiz.format || null,
    questionCount: quiz._count?.questions ?? quiz.questions?.length ?? 0,
  };
}

function serializeCatalogQuizDetails(quiz) {
  return {
    ...serializeCatalogQuiz(quiz),
    isTemplate: quiz.isTemplate,
    isPublished: quiz.isPublished,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    questions: (quiz.questions || []).map((question) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      points: question.points,
      timeLimit: question.timeLimit,
      imageUrl: question.imageUrl || null,
      audioUrl: question.audioUrl || null,
      videoUrl: question.videoUrl || null,
      answers: (question.answers || []).map((answer) => ({
        id: answer.id,
        text: answer.text,
        imageUrl: answer.imageUrl || null,
        order: answer.order,
      })),
    })),
  };
}

function buildCatalogWhere(filters) {
  const where = {
    isPublished: true,
    isTemplate: true,
  };

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { description: { contains: filters.q } },
    ];
  }

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.ageGroup) {
    where.ageGroup = filters.ageGroup;
  }

  if (filters.format) {
    where.format = filters.format;
  }

  if (filters.isPaid !== null) {
    where.isPaid = filters.isPaid;
  }

  return where;
}

async function getCatalog(query = {}) {
  const filters = validateCatalogQuery(query);

  const quizzes = await quizRepository.quiz.findMany({
    where: buildCatalogWhere(filters),
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
        },
      },
    },
  });

  return {
    quizzes: quizzes.map(serializeCatalogQuiz),
    filters,
  };
}

async function getCatalogQuizById(id) {
  const quizId = validateCatalogId(id);

  const quiz = await quizRepository.quiz.findFirst({
    where: {
      id: quizId,
      isPublished: true,
      isTemplate: true,
    },
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
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  if (!quiz) {
    throw createHttpError(404, 'Шаблон не найден');
  }

  return {
    quiz: serializeCatalogQuizDetails(quiz),
  };
}

async function cloneCatalogQuiz({ id, currentUser }) {
  const quizId = validateCatalogId(id);

  const quiz = await quizRepository.quiz.findFirst({
    where: {
      id: quizId,
      isPublished: true,
      isTemplate: true,
    },
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

  if (!quiz) {
    throw createHttpError(404, 'Шаблон не найден');
  }

  if (quiz.isPaid || Number(quiz.price) > 0) {
    throw createHttpError(402, 'Платные шаблоны пока не поддерживаются');
  }

  const clonedQuiz = await cloneQuizToUser({
    sourceQuizId: quiz.id,
    userId: currentUser.id,
  });

  return {
    quiz: clonedQuiz,
  };
}

module.exports = {
  getCatalog,
  getCatalogQuizById,
  cloneCatalogQuiz,
};
