// src/services/homework.service.js

const homeworkRepository = require('../repositories/homework.repository');
const { env } = require('../config/env');
const { createHttpError } = require('../utils/http-error');
const {
  validateCreateHomeworkPayload,
  validateUpdateHomeworkPayload,
  validatePinCode,
  validateStartPayload,
  validateSubmitPayload,
} = require('../validators/homework.validator');
const { HOMEWORK_STATUSES } = require('../constants/homework-statuses');
const { ROLES } = require('../constants/roles');

const SUPPORTED_QUESTION_TYPES = new Set(['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'TRUEFALSE']);

function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

function isHomeworkExpired(homework) {
  return Boolean(homework.dueDate && new Date(homework.dueDate).getTime() < Date.now());
}

function getEffectiveStatus(homework) {
  if (homework.status === HOMEWORK_STATUSES.COMPLETED) return HOMEWORK_STATUSES.COMPLETED;
  if (isHomeworkExpired(homework)) return HOMEWORK_STATUSES.EXPIRED;
  return homework.status;
}

function serializeAnswer(answer, options = {}) {
  const payload = {
    id: answer.id,
    text: answer.text,
    imageUrl: answer.imageUrl || null,
    order: answer.order,
  };

  if (options.includeCorrect) {
    payload.isCorrect = answer.isCorrect;
  }

  return payload;
}

function serializeQuestion(question, options = {}) {
  return {
    id: question.id,
    text: question.text,
    type: question.type,
    points: question.points,
    timeLimit: question.timeLimit || null,
    imageUrl: question.imageUrl || null,
    audioUrl: question.audioUrl || null,
    videoUrl: question.videoUrl || null,
    answers: (question.answers || []).map((answer) => serializeAnswer(answer, options)),
  };
}

function serializeHomework(homework, options = {}) {
  const shareUrl = `${env.clientUrl}/homework/${homework.pinCode}`;

  return {
    id: homework.id,
    quizId: homework.quizId,
    teacherId: homework.teacherId,
    title: homework.title,
    description: homework.description,
    pinCode: homework.pinCode,
    status: getEffectiveStatus(homework),
    dueDate: homework.dueDate,
    maxAttempts: homework.maxAttempts,
    showCorrectAnswers: homework.showCorrectAnswers,
    createdAt: homework.createdAt,
    updatedAt: homework.updatedAt,
    shareUrl,
    quiz: homework.quiz
      ? {
          id: homework.quiz.id,
          title: homework.quiz.title,
          description: homework.quiz.description,
          questions: options.includeQuestions
            ? (homework.quiz.questions || []).map((question) =>
                serializeQuestion(question, { includeCorrect: options.includeCorrectAnswers })
              )
            : undefined,
          _count: homework.quiz._count,
        }
      : undefined,
    submissions: options.includeSubmissions
      ? (homework.submissions || []).map(serializeSubmission)
      : undefined,
    _count: homework._count,
  };
}

function serializeSubmission(submission) {
  return {
    id: submission.id,
    homeworkId: submission.homeworkId,
    studentName: submission.studentName,
    attemptNumber: submission.attemptNumber,
    score: submission.score,
    maxScore: submission.maxScore,
    startedAt: submission.startedAt,
    completedAt: submission.completedAt,
    isCompleted: submission.isCompleted,
  };
}

function buildBestResults(submissions = []) {
  const bestByStudent = new Map();

  for (const submission of submissions) {
    if (!submission.isCompleted) continue;

    const key = submission.studentName.trim().toLowerCase();
    const current = bestByStudent.get(key);

    if (
      !current ||
      submission.score > current.score ||
      (submission.score === current.score && submission.completedAt < current.completedAt)
    ) {
      bestByStudent.set(key, serializeSubmission(submission));
    }
  }

  return Array.from(bestByStudent.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.studentName.localeCompare(b.studentName, 'ru');
  });
}

async function generateUniquePinCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const pinCode = String(Math.floor(100000 + Math.random() * 900000));
    const existing = await homeworkRepository.homework.findUnique({
      where: { pinCode },
      select: { id: true },
    });

    if (!existing) return pinCode;
  }

  throw createHttpError(500, 'Не удалось сгенерировать PIN-код');
}

async function getTeacherHomeworkOrThrow(homeworkId, currentUser) {
  const homework = await homeworkRepository.homework.findUnique({
    where: { id: homeworkId },
  });

  if (!homework) {
    throw createHttpError(404, 'Домашнее задание не найдено');
  }

  if (homework.teacherId !== currentUser.id && !isAdmin(currentUser)) {
    throw createHttpError(403, 'Нет доступа к этому домашнему заданию');
  }

  return homework;
}

async function assertQuizCanBeAssigned(quizId, currentUser) {
  const quiz = await homeworkRepository.quiz.findUnique({
    where: { id: quizId },
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
    throw createHttpError(404, 'Квиз не найден');
  }

  if (quiz.authorId !== currentUser.id && !isAdmin(currentUser)) {
    throw createHttpError(403, 'Можно назначить только свой квиз');
  }

  if (!quiz.questions.length) {
    throw createHttpError(400, 'В квизе нет вопросов');
  }

  const unsupportedQuestion = quiz.questions.find(
    (question) => !SUPPORTED_QUESTION_TYPES.has(question.type)
  );

  if (unsupportedQuestion) {
    throw createHttpError(
      400,
      `Homework v1 не поддерживает тип вопроса ${unsupportedQuestion.type}`
    );
  }

  return quiz;
}

async function createHomework({ currentUser, payload }) {
  const data = validateCreateHomeworkPayload(payload);
  await assertQuizCanBeAssigned(data.quizId, currentUser);

  const pinCode = await generateUniquePinCode();

  const homework = await homeworkRepository.homework.create({
    data: {
      ...data,
      teacherId: currentUser.id,
      pinCode,
    },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          description: true,
          _count: {
            select: { questions: true },
          },
        },
      },
      _count: {
        select: { submissions: true },
      },
    },
  });

  return { homework: serializeHomework(homework) };
}

async function listHomework({ currentUser }) {
  const homeworks = await homeworkRepository.homework.findMany({
    where: isAdmin(currentUser) ? {} : { teacherId: currentUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          _count: {
            select: { questions: true },
          },
        },
      },
      _count: {
        select: { submissions: true },
      },
    },
  });

  return {
    homework: homeworks.map((item) => serializeHomework(item)),
  };
}

async function getHomeworkById({ homeworkId, currentUser }) {
  await getTeacherHomeworkOrThrow(homeworkId, currentUser);

  const homework = await homeworkRepository.homework.findUnique({
    where: { id: homeworkId },
    include: {
      quiz: {
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
      },
      submissions: {
        orderBy: [
          { studentName: 'asc' },
          { attemptNumber: 'asc' },
        ],
      },
    },
  });

  return {
    homework: serializeHomework(homework, {
      includeQuestions: true,
      includeCorrectAnswers: true,
      includeSubmissions: true,
    }),
  };
}

async function updateHomework({ homeworkId, currentUser, payload }) {
  await getTeacherHomeworkOrThrow(homeworkId, currentUser);
  const data = validateUpdateHomeworkPayload(payload);

  if (data.quizId) {
    await assertQuizCanBeAssigned(data.quizId, currentUser);
  }

  const homework = await homeworkRepository.homework.update({
    where: { id: homeworkId },
    data,
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
          _count: {
            select: { questions: true },
          },
        },
      },
      _count: {
        select: { submissions: true },
      },
    },
  });

  return { homework: serializeHomework(homework) };
}

async function deleteHomework({ homeworkId, currentUser }) {
  await getTeacherHomeworkOrThrow(homeworkId, currentUser);

  await homeworkRepository.homework.delete({
    where: { id: homeworkId },
  });

  return {
    success: true,
    message: 'Домашнее задание удалено',
  };
}

async function getHomeworkReport({ homeworkId, currentUser }) {
  await getTeacherHomeworkOrThrow(homeworkId, currentUser);

  const homework = await homeworkRepository.homework.findUnique({
    where: { id: homeworkId },
    include: {
      quiz: {
        select: {
          id: true,
          title: true,
        },
      },
      submissions: {
        orderBy: [
          { studentName: 'asc' },
          { attemptNumber: 'asc' },
        ],
      },
    },
  });

  const submissions = homework.submissions.map(serializeSubmission);
  const completed = submissions.filter((submission) => submission.isCompleted);

  return {
    homework: serializeHomework(homework),
    report: {
      submissions,
      bestResults: buildBestResults(homework.submissions),
      summary: {
        totalSubmissions: submissions.length,
        completedSubmissions: completed.length,
        averageScore: completed.length
          ? Math.round(completed.reduce((sum, item) => sum + item.score, 0) / completed.length)
          : 0,
      },
    },
  };
}

async function getHomeworkByPin({ pinCode }) {
  const safePinCode = validatePinCode(pinCode);
  const homework = await getPublicHomeworkByPinOrThrow(safePinCode);

  return {
    homework: serializeHomework(homework, { includeQuestions: true }),
  };
}

async function getPublicHomeworkByPinOrThrow(pinCode) {
  const homework = await homeworkRepository.homework.findUnique({
    where: { pinCode },
    include: {
      quiz: {
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
      },
    },
  });

  if (!homework) {
    throw createHttpError(404, 'Домашнее задание не найдено');
  }

  return homework;
}

function assertHomeworkAvailableForAttempt(homework) {
  if (homework.status === HOMEWORK_STATUSES.DRAFT || homework.status === HOMEWORK_STATUSES.COMPLETED) {
    throw createHttpError(400, 'Домашнее задание недоступно');
  }

  if (isHomeworkExpired(homework)) {
    throw createHttpError(410, 'Срок выполнения домашнего задания истёк');
  }
}

async function startHomeworkAttempt({ pinCode, payload }) {
  const safePinCode = validatePinCode(pinCode);
  const { studentName } = validateStartPayload(payload);
  const homework = await getPublicHomeworkByPinOrThrow(safePinCode);

  assertHomeworkAvailableForAttempt(homework);

  const attemptsCount = await homeworkRepository.homeworkSubmission.count({
    where: {
      homeworkId: homework.id,
      studentName,
    },
  });

  if (attemptsCount >= homework.maxAttempts) {
    throw createHttpError(400, 'Лимит попыток исчерпан');
  }

  const maxScore = calculateMaxScore(homework.quiz.questions);

  const submission = await homeworkRepository.homeworkSubmission.create({
    data: {
      homeworkId: homework.id,
      studentName,
      attemptNumber: attemptsCount + 1,
      maxScore,
    },
  });

  return {
    homework: serializeHomework(homework, { includeQuestions: true }),
    submission: serializeSubmission(submission),
  };
}

function calculateMaxScore(questions = []) {
  return questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0);
}

function evaluateAnswers(questions = [], submittedAnswers = []) {
  const submittedByQuestionId = new Map(
    submittedAnswers.map((answer) => [answer.questionId, answer.answerId])
  );

  let score = 0;

  const results = questions.map((question) => {
    const answerId = submittedByQuestionId.get(question.id) || null;
    const correctAnswers = question.answers.filter((answer) => answer.isCorrect);
    const correctAnswerIds = correctAnswers.map((answer) => answer.id);
    const isCorrect = Boolean(answerId && correctAnswerIds.includes(answerId));
    const pointsAwarded = isCorrect ? question.points : 0;

    score += pointsAwarded;

    return {
      questionId: question.id,
      answerId,
      isCorrect,
      pointsAwarded,
      correctAnswerIds,
    };
  });

  return {
    score,
    maxScore: calculateMaxScore(questions),
    results,
  };
}

async function submitHomeworkAttempt({ pinCode, payload }) {
  const safePinCode = validatePinCode(pinCode);
  const { studentName, submissionId, answers } = validateSubmitPayload(payload);
  const homework = await getPublicHomeworkByPinOrThrow(safePinCode);

  const submission = await homeworkRepository.homeworkSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.homeworkId !== homework.id) {
    throw createHttpError(404, 'Попытка не найдена');
  }

  if (submission.studentName !== studentName) {
    throw createHttpError(403, 'Нельзя отправить попытку другого ученика');
  }

  if (submission.isCompleted) {
    throw createHttpError(400, 'Эта попытка уже завершена');
  }

  const evaluation = evaluateAnswers(homework.quiz.questions, answers);

  const updated = await homeworkRepository.homeworkSubmission.update({
    where: { id: submission.id },
    data: {
      score: evaluation.score,
      maxScore: evaluation.maxScore,
      completedAt: new Date(),
      isCompleted: true,
      answersJson: JSON.stringify(evaluation.results),
    },
  });

  return {
    submission: serializeSubmission(updated),
    results: buildStudentResultsPayload(homework, evaluation.results),
  };
}

function parseAnswersJson(submission) {
  try {
    return JSON.parse(submission.answersJson || '[]');
  } catch (error) {
    return [];
  }
}

function buildStudentResultsPayload(homework, answerResults) {
  if (!homework.showCorrectAnswers) {
    return {
      showCorrectAnswers: false,
      answers: [],
    };
  }

  const resultByQuestionId = new Map(answerResults.map((result) => [result.questionId, result]));

  return {
    showCorrectAnswers: true,
    answers: homework.quiz.questions.map((question) => {
      const result = resultByQuestionId.get(question.id) || {};
      return {
        questionId: question.id,
        text: question.text,
        answerId: result.answerId || null,
        isCorrect: Boolean(result.isCorrect),
        pointsAwarded: result.pointsAwarded || 0,
        correctAnswers: question.answers
          .filter((answer) => answer.isCorrect)
          .map((answer) => ({
            id: answer.id,
            text: answer.text,
          })),
      };
    }),
  };
}

async function getStudentResults({ pinCode, submissionId }) {
  const safePinCode = validatePinCode(pinCode);
  const homework = await getPublicHomeworkByPinOrThrow(safePinCode);

  const submission = await homeworkRepository.homeworkSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission || submission.homeworkId !== homework.id) {
    throw createHttpError(404, 'Результат не найден');
  }

  return {
    submission: serializeSubmission(submission),
    results: buildStudentResultsPayload(homework, parseAnswersJson(submission)),
  };
}

module.exports = {
  createHomework,
  listHomework,
  getHomeworkById,
  updateHomework,
  deleteHomework,
  getHomeworkReport,
  getHomeworkByPin,
  startHomeworkAttempt,
  submitHomeworkAttempt,
  getStudentResults,
};
