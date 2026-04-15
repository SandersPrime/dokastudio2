// src/services/equipment.service.js

const equipmentRepository = require('../repositories/equipment.repository');
const { createHttpError } = require('../utils/http-error');
const { ROLES } = require('../constants/roles');
const {
  validateProductPayload,
  validateRequestPayload,
  validateAdminRequestPayload,
  validateEquipmentQuery,
} = require('../validators/equipment.validator');

function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

function assertAdmin(user) {
  if (!isAdmin(user)) throw createHttpError(403, 'Доступно только администратору');
}

function parseGallery(galleryJson) {
  try {
    return JSON.parse(galleryJson || '[]');
  } catch (error) {
    return [];
  }
}

function serializeProduct(product) {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    imageUrl: product.imageUrl,
    gallery: parseGallery(product.galleryJson),
    galleryJson: product.galleryJson,
    category: product.category,
    scenarioType: product.scenarioType,
    price: product.price,
    rentalPriceDay: product.rentalPriceDay,
    depositAmount: product.depositAmount,
    stockQty: product.stockQty,
    availableForSale: product.availableForSale,
    availableForRent: product.availableForRent,
    isPublished: product.isPublished,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function serializeRequest(request) {
  return {
    id: request.id,
    type: request.type,
    status: request.status,
    productId: request.productId,
    product: request.product ? serializeProduct(request.product) : null,
    customerName: request.customerName,
    customerEmail: request.customerEmail,
    customerPhone: request.customerPhone,
    companyName: request.companyName,
    eventDate: request.eventDate,
    rentalDays: request.rentalDays,
    quantity: request.quantity,
    message: request.message,
    adminNote: request.adminNote,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
}

function buildWhere(filters, publicOnly = true) {
  const where = publicOnly ? { isPublished: true } : {};
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q } },
      { description: { contains: filters.q } },
      { shortDescription: { contains: filters.q } },
    ];
  }
  if (filters.category) where.category = filters.category;
  if (filters.scenarioType) where.scenarioType = filters.scenarioType;
  if (filters.availableForSale !== null) where.availableForSale = filters.availableForSale;
  if (filters.availableForRent !== null) where.availableForRent = filters.availableForRent;
  return where;
}

async function listProducts(query = {}) {
  const filters = validateEquipmentQuery(query);
  const products = await equipmentRepository.equipmentProduct.findMany({
    where: buildWhere(filters, true),
    orderBy: { createdAt: 'desc' },
  });
  return { products: products.map(serializeProduct), filters };
}

async function getProductBySlug(slug) {
  const safeSlug = String(slug || '').trim();
  if (!safeSlug) throw createHttpError(400, 'slug обязателен');
  const product = await equipmentRepository.equipmentProduct.findFirst({
    where: { slug: safeSlug, isPublished: true },
  });
  if (!product) throw createHttpError(404, 'Товар не найден');
  return { product: serializeProduct(product) };
}

async function createRequest(payload) {
  const data = validateRequestPayload(payload);
  if (data.productId) {
    const product = await equipmentRepository.equipmentProduct.findFirst({
      where: { id: data.productId, isPublished: true },
    });
    if (!product) throw createHttpError(404, 'Товар не найден');
  }
  const request = await equipmentRepository.equipmentRequest.create({
    data,
    include: { product: true },
  });
  return { request: serializeRequest(request) };
}

async function adminCreateProduct({ currentUser, payload }) {
  assertAdmin(currentUser);
  const data = validateProductPayload(payload, false);
  const product = await equipmentRepository.equipmentProduct.create({ data });
  return { product: serializeProduct(product) };
}

async function adminListProducts({ currentUser, query = {} }) {
  assertAdmin(currentUser);
  const filters = validateEquipmentQuery(query);
  const products = await equipmentRepository.equipmentProduct.findMany({
    where: buildWhere(filters, false),
    orderBy: { createdAt: 'desc' },
  });
  return { products: products.map(serializeProduct), filters };
}

async function adminUpdateProduct({ currentUser, productId, payload }) {
  assertAdmin(currentUser);
  const data = validateProductPayload(payload, true);
  const product = await equipmentRepository.equipmentProduct.update({
    where: { id: String(productId || '').trim() },
    data,
  });
  return { product: serializeProduct(product) };
}

async function adminDeleteProduct({ currentUser, productId }) {
  assertAdmin(currentUser);
  await equipmentRepository.equipmentProduct.delete({ where: { id: String(productId || '').trim() } });
  return { success: true };
}

async function adminListRequests({ currentUser, query = {} }) {
  assertAdmin(currentUser);
  const status = query.status ? String(query.status).trim().toUpperCase() : null;
  const requests = await equipmentRepository.equipmentRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    include: { product: true },
  });
  return { requests: requests.map(serializeRequest) };
}

async function adminUpdateRequest({ currentUser, requestId, payload }) {
  assertAdmin(currentUser);
  const data = validateAdminRequestPayload(payload);
  const request = await equipmentRepository.equipmentRequest.update({
    where: { id: String(requestId || '').trim() },
    data,
    include: { product: true },
  });
  return { request: serializeRequest(request) };
}

module.exports = {
  listProducts,
  getProductBySlug,
  createRequest,
  adminCreateProduct,
  adminListProducts,
  adminUpdateProduct,
  adminDeleteProduct,
  adminListRequests,
  adminUpdateRequest,
};
