const { sendRes, sendError } = require('../../shared');
const { productService } = require('../services/product.service');

function health(req, res) {
  return sendRes(res, { service: 'product-service', status: 'running' }, 'OK');
}

async function list(req, res) {
  try {
    const result = await productService.list(req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function hot(req, res) {
  try {
    const result = await productService.hot(req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function recommend(req, res) {
  try {
    const result = await productService.recommend(req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function dashboardOverview(req, res) {
  try {
    const result = await productService.dashboardOverview();
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function dashboardSalesTrend(req, res) {
  try {
    const result = await productService.salesTrend(req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function dashboardTopProducts(req, res) {
  try {
    const result = await productService.topProducts(req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function categories(req, res) {
  try {
    const result = await productService.categories();
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function categoriesAll(req, res) {
  return categories(req, res);
}

async function categoryDetail(req, res) {
  try {
    const result = await productService.category(req.params.id);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function detail(req, res) {
  try {
    const result = await productService.detail(req.params.id);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function reviewsByProduct(req, res) {
  try {
    const result = await productService.reviewsByProduct(req.params.id, req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function submitReview(req, res) {
  try {
    const result = await productService.submitReview(req.user.userId, req.body);
    return sendRes(res, result, 'Review submitted');
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function myReviews(req, res) {
  try {
    const result = await productService.reviewsMine(req.user.userId, req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function skuOptions(req, res) {
  try {
    const result = await productService.skuOptions(req.params.productId);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function skuList(req, res) {
  try {
    const result = await productService.skuList(req.params.productId);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function skuFind(req, res) {
  try {
    const result = await productService.skuFind(req.params.productId, req.body);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

module.exports = {
  health,
  list,
  hot,
  recommend,
  dashboardOverview,
  dashboardSalesTrend,
  dashboardTopProducts,
  categories,
  categoriesAll,
  categoryDetail,
  detail,
  reviewsByProduct,
  submitReview,
  myReviews,
  skuOptions,
  skuList,
  skuFind,
};
