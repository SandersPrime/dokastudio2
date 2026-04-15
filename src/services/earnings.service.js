// src/services/earnings.service.js

const earningsRepository = require('../repositories/earnings.repository');
const { createHttpError } = require('../utils/http-error');
const {
  validatePayoutRequestPayload,
  validateAdminNotePayload,
  validatePayoutRequestId,
} = require('../validators/earnings.validator');
const { PAYOUT_STATUSES } = require('../constants/payout-statuses');
const { ROLES } = require('../constants/roles');

function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

function assertAdmin(user) {
  if (!isAdmin(user)) {
    throw createHttpError(403, 'Доступно только администратору');
  }
}

function serializePayoutRequest(request) {
  return {
    id: request.id,
    authorId: request.authorId,
    author: request.author ? { id: request.author.id, name: request.author.name, email: request.author.email } : null,
    amount: request.amount,
    status: request.status,
    payoutMethod: request.payoutMethod,
    payoutDetails: request.payoutDetails,
    adminNote: request.adminNote,
    requestedAt: request.requestedAt,
    processedAt: request.processedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function serializeSale(purchase) {
  return {
    purchaseId: purchase.id,
    quizId: purchase.quizId,
    quizTitle: purchase.quiz?.title || 'Квиз',
    buyerId: purchase.userId,
    pricePaid: purchase.pricePaid,
    platformFee: purchase.platformFee,
    authorRevenue: purchase.authorRevenue,
    createdAt: purchase.createdAt,
  };
}

async function getSummary({ currentUser }) {
  const [sales, user, payouts] = await Promise.all([
    earningsRepository.purchase.findMany({
      where: { authorId: currentUser.id },
      select: {
        pricePaid: true,
        platformFee: true,
        authorRevenue: true,
      },
    }),
    earningsRepository.user.findUnique({
      where: { id: currentUser.id },
      select: { balance: true },
    }),
    earningsRepository.payoutRequest.findMany({
      where: { authorId: currentUser.id },
      select: {
        amount: true,
        status: true,
      },
    }),
  ]);

  const pendingPayoutAmount = payouts
    .filter((item) => [PAYOUT_STATUSES.PENDING, PAYOUT_STATUSES.APPROVED].includes(item.status))
    .reduce((sum, item) => sum + item.amount, 0);
  const paidOutAmount = payouts
    .filter((item) => item.status === PAYOUT_STATUSES.PAID)
    .reduce((sum, item) => sum + item.amount, 0);

  return {
    summary: {
      totalSalesCount: sales.length,
      grossRevenue: sumMoney(sales, 'pricePaid'),
      totalPlatformFee: sumMoney(sales, 'platformFee'),
      totalAuthorRevenue: sumMoney(sales, 'authorRevenue'),
      availableBalance: user?.balance || 0,
      pendingPayoutAmount,
      paidOutAmount,
    },
  };
}

function sumMoney(items, key) {
  return Math.round(items.reduce((sum, item) => sum + (Number(item[key]) || 0), 0) * 100) / 100;
}

async function getSales({ currentUser }) {
  const purchases = await earningsRepository.purchase.findMany({
    where: { authorId: currentUser.id },
    orderBy: { createdAt: 'desc' },
    include: {
      quiz: { select: { id: true, title: true } },
    },
  });

  return { sales: purchases.map(serializeSale) };
}

async function createPayoutRequest({ currentUser, payload }) {
  const data = validatePayoutRequestPayload(payload);

  const result = await earningsRepository.transaction(async (tx) => {
    const existingPending = await tx.payoutRequest.findFirst({
      where: {
        authorId: currentUser.id,
        status: PAYOUT_STATUSES.PENDING,
      },
      select: { id: true },
    });

    if (existingPending) {
      throw createHttpError(400, 'У вас уже есть заявка в статусе PENDING');
    }

    const user = await tx.user.findUnique({
      where: { id: currentUser.id },
      select: { balance: true },
    });

    if (!user || data.amount > user.balance) {
      throw createHttpError(400, 'Недостаточно доступного баланса');
    }

    await tx.user.update({
      where: { id: currentUser.id },
      data: {
        balance: { decrement: data.amount },
      },
    });

    return tx.payoutRequest.create({
      data: {
        authorId: currentUser.id,
        amount: data.amount,
        payoutMethod: data.payoutMethod,
        payoutDetails: data.payoutDetails,
      },
    });
  });

  return { payoutRequest: serializePayoutRequest(result) };
}

async function getPayoutRequests({ currentUser }) {
  const requests = await earningsRepository.payoutRequest.findMany({
    where: { authorId: currentUser.id },
    orderBy: { createdAt: 'desc' },
  });

  return { payoutRequests: requests.map(serializePayoutRequest) };
}

async function getAdminPayoutRequests({ currentUser }) {
  assertAdmin(currentUser);

  const requests = await earningsRepository.payoutRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return { payoutRequests: requests.map(serializePayoutRequest) };
}

async function approvePayoutRequest({ id, currentUser, payload }) {
  assertAdmin(currentUser);
  const requestId = validatePayoutRequestId(id);
  const { adminNote } = validateAdminNotePayload(payload);
  const request = await getPayoutRequestOrThrow(requestId);

  if (request.status !== PAYOUT_STATUSES.PENDING) {
    throw createHttpError(400, 'Approve доступен только для PENDING заявки');
  }

  const updated = await earningsRepository.payoutRequest.update({
    where: { id: requestId },
    data: {
      status: PAYOUT_STATUSES.APPROVED,
      adminNote,
    },
  });

  return { payoutRequest: serializePayoutRequest(updated) };
}

async function rejectPayoutRequest({ id, currentUser, payload }) {
  assertAdmin(currentUser);
  const requestId = validatePayoutRequestId(id);
  const { adminNote } = validateAdminNotePayload(payload);

  const updated = await earningsRepository.transaction(async (tx) => {
    const request = await tx.payoutRequest.findUnique({ where: { id: requestId } });
    if (!request) throw createHttpError(404, 'Заявка не найдена');
    if (request.status === PAYOUT_STATUSES.REJECTED) throw createHttpError(400, 'Заявка уже отклонена');
    if (request.status === PAYOUT_STATUSES.PAID) throw createHttpError(400, 'Оплаченную заявку нельзя отклонить');

    await tx.user.update({
      where: { id: request.authorId },
      data: {
        balance: { increment: request.amount },
      },
    });

    return tx.payoutRequest.update({
      where: { id: requestId },
      data: {
        status: PAYOUT_STATUSES.REJECTED,
        adminNote,
        processedAt: new Date(),
      },
    });
  });

  return { payoutRequest: serializePayoutRequest(updated) };
}

async function markPayoutPaid({ id, currentUser, payload }) {
  assertAdmin(currentUser);
  const requestId = validatePayoutRequestId(id);
  const { adminNote } = validateAdminNotePayload(payload);
  const request = await getPayoutRequestOrThrow(requestId);

  if (request.status !== PAYOUT_STATUSES.APPROVED) {
    throw createHttpError(400, 'Оплатить можно только APPROVED заявку');
  }

  const updated = await earningsRepository.payoutRequest.update({
    where: { id: requestId },
    data: {
      status: PAYOUT_STATUSES.PAID,
      adminNote,
      processedAt: new Date(),
    },
  });

  return { payoutRequest: serializePayoutRequest(updated) };
}

async function getPayoutRequestOrThrow(id) {
  const request = await earningsRepository.payoutRequest.findUnique({ where: { id } });
  if (!request) throw createHttpError(404, 'Заявка не найдена');
  return request;
}

module.exports = {
  getSummary,
  getSales,
  createPayoutRequest,
  getPayoutRequests,
  getAdminPayoutRequests,
  approvePayoutRequest,
  rejectPayoutRequest,
  markPayoutPaid,
};
