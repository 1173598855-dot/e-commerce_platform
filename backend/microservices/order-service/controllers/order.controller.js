const { sendRes, sendError } = require('../../shared');
const { orderService } = require('../services/order.service');

function health(req, res) {
  return sendRes(res, { service: 'order-service', status: 'running' }, 'OK');
}

async function cartList(req, res) {
  try {
    const result = await orderService.getCart(req.user.userId);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function cartAdd(req, res) {
  try {
    await orderService.addToCart(req.user.userId, req.body);
    return sendRes(res, null, 'Added to cart');
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function cartUpdate(req, res) {
  try {
    await orderService.updateCartItem(req.user.userId, req.params.id, req.body);
    return sendRes(res, null, 'Updated');
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function cartDelete(req, res) {
  try {
    await orderService.deleteCartItem(req.user.userId, req.params.id);
    return sendRes(res, null, 'Removed');
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function cartClear(req, res) {
  try {
    await orderService.clearCart(req.user.userId);
    return sendRes(res, null, 'Cart cleared');
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function list(req, res) {
  try {
    const result = await orderService.listOrders(req.user.userId, req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function create(req, res) {
  try {
    const result = await orderService.createOrder(req.user.userId, req.body);
    return sendRes(res, result, 'Order created');
  } catch (err) { return sendError(res, err.message || 'Create failed', err.httpStatus || 500); }
}

async function detail(req, res) {
  try {
    const result = await orderService.getOrder(req.user.userId, req.params.id);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function cancel(req, res) {
  try {
    await orderService.cancelOrder(req.user.userId, req.params.id);
    return sendRes(res, null, 'Order cancelled');
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function confirm(req, res) {
  try {
    await orderService.confirmOrder(req.user.userId, req.params.id);
    return sendRes(res, null, 'Confirmed');
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function mockPayment(req, res) {
  try {
    const result = await orderService.mockPayment(req.user.userId, req.body);
    return sendRes(res, result, 'Payment success');
  } catch (err) { return sendError(res, 'Payment failed', err.httpStatus || 500); }
}

async function paymentStatus(req, res) {
  try {
    const result = await orderService.paymentStatus(req.user.userId, req.params.orderId);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function paymentHistory(req, res) {
  try {
    const result = await orderService.paymentHistory(req.user.userId, req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

async function logistics(req, res) {
  try {
    const result = await orderService.logistics(req.user.userId, req.params.orderId);
    return sendRes(res, result);
  } catch (err) { return sendError(res, 'Failed: ' + err.message, err.httpStatus || 500); }
}

module.exports = {
  health,
  cartList,
  cartAdd,
  cartUpdate,
  cartDelete,
  cartClear,
  list,
  create,
  detail,
  cancel,
  confirm,
  mockPayment,
  paymentStatus,
  paymentHistory,
  logistics,
};
