const { sendRes, sendError } = require('../../shared');
const { orderService } = require('../services/order.service');
const { verifyPaymentCallback } = require('../payment-callback');
const { verifyRefundCallback } = require('../refund-callback');
const { verifyRefundEvidenceScanCallback } = require('../refund-evidence-scan-callback');

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

async function paymentCallback(req, res) {
  try {
    const result = await verifyPaymentCallback({
      provider: req.params.provider,
      payload: req.body,
      headers: req.headers,
    });
    const processed = await orderService.applyPaymentCallback(result);
    return sendRes(res, processed, 'Payment callback accepted');
  } catch (err) { return sendError(res, err.message || 'Payment callback failed', err.httpStatus || 500); }
}

async function refundCallback(req, res) {
  try {
    const result = await verifyRefundCallback({
      provider: req.params.provider,
      payload: req.body,
      headers: req.headers,
    });
    const processed = await orderService.applyRefundCallback(result);
    return sendRes(res, processed, 'Refund callback accepted');
  } catch (err) { return sendError(res, err.message || 'Refund callback failed', err.httpStatus || 500); }
}

async function requestRefund(req, res) {
  try {
    const result = await orderService.requestRefund(req.user.userId, req.body);
    return sendRes(res, result, result.duplicate ? 'Refund request already exists' : 'Refund requested');
  } catch (err) { return sendError(res, err.message || 'Refund request failed', err.httpStatus || 500); }
}

async function refundList(req, res) {
  try {
    const result = await orderService.listRefunds(req.user, req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, err.message || 'Refund list failed', err.httpStatus || 500); }
}

async function refundExportPlaceholder(req, res) {
  try {
    const result = await orderService.exportRefundsPlaceholder(req.user, req.query);
    return sendRes(res, result, 'Refund export placeholder');
  } catch (err) { return sendError(res, err.message || 'Refund export failed', err.httpStatus || 500); }
}

async function fulfillmentList(req, res) {
  try {
    const result = await orderService.listFulfillmentOrders(req.user, req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, err.message || 'Fulfillment order list failed', err.httpStatus || 500); }
}

async function exportJobCreate(req, res) {
  try {
    const result = await orderService.createExportJobPlaceholder(req.user, req.body);
    return sendRes(res, result, 'Export job placeholder created');
  } catch (err) { return sendError(res, err.message || 'Export job create failed', err.httpStatus || 500); }
}

async function exportJobList(req, res) {
  try {
    const result = await orderService.listExportJobs(req.user, req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, err.message || 'Export job list failed', err.httpStatus || 500); }
}

async function operationLogList(req, res) {
  try {
    const result = await orderService.listOperationLogs(req.user, req.query);
    return sendRes(res, result);
  } catch (err) { return sendError(res, err.message || 'Operation log list failed', err.httpStatus || 500); }
}

async function refundDetail(req, res) {
  try {
    const result = await orderService.getRefund(req.user, req.params.id);
    return sendRes(res, result);
  } catch (err) { return sendError(res, err.message || 'Refund detail failed', err.httpStatus || 500); }
}

async function addRefundEvidence(req, res) {
  try {
    const result = await orderService.addRefundEvidence(req.user.userId, req.params.id, req.body);
    return sendRes(res, result, 'Refund evidence added');
  } catch (err) { return sendError(res, err.message || 'Refund evidence failed', err.httpStatus || 500); }
}

async function createRefundEvidenceUploadIntent(req, res) {
  try {
    const result = await orderService.createRefundEvidenceUploadIntent(req.user.userId, req.params.id, req.body);
    return sendRes(res, result, 'Refund evidence upload intent created');
  } catch (err) { return sendError(res, err.message || 'Refund evidence upload intent failed', err.httpStatus || 500); }
}

async function updateRefundEvidenceScan(req, res) {
  try {
    const result = await orderService.updateRefundEvidenceScan(req.user, req.params.evidenceId, req.body);
    return sendRes(res, result, 'Refund evidence scan updated');
  } catch (err) { return sendError(res, err.message || 'Refund evidence scan update failed', err.httpStatus || 500); }
}

async function refundEvidenceRetentionCleanupDryRun(req, res) {
  try {
    const result = await orderService.getRefundEvidenceRetentionCleanupDryRun(req.query);
    return sendRes(res, result, 'Refund evidence retention cleanup dry-run');
  } catch (err) { return sendError(res, err.message || 'Refund evidence retention cleanup dry-run failed', err.httpStatus || 500); }
}

async function refundEvidenceScanCallback(req, res) {
  try {
    const callback = verifyRefundEvidenceScanCallback({
      payload: req.body,
      rawBody: req.rawBody,
      headers: req.headers,
    });
    const result = await orderService.updateRefundEvidenceScan(
      { userId: 'scanner', role: 'system' },
      callback.evidenceId,
      {
        status: callback.status,
        result: callback.result,
        scannedAt: callback.scannedAt,
        idempotencyKey: callback.idempotencyKey,
        rawPayload: callback.rawPayload,
      }
    );
    return sendRes(res, result, 'Refund evidence scan callback accepted');
  } catch (err) { return sendError(res, err.message || 'Refund evidence scan callback failed', err.httpStatus || 500); }
}

async function reviewRefund(req, res) {
  try {
    const result = await orderService.reviewRefund(req.user, req.params.id, req.body);
    return sendRes(res, result, 'Refund reviewed');
  } catch (err) { return sendError(res, err.message || 'Refund review failed', err.httpStatus || 500); }
}

async function ship(req, res) {
  try {
    const result = await orderService.shipOrder(req.user, req.params.id, req.body);
    return sendRes(res, result, 'Order shipped');
  } catch (err) { return sendError(res, err.message || 'Ship order failed', err.httpStatus || 500); }
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
  paymentCallback,
  refundCallback,
  requestRefund,
  refundList,
  refundExportPlaceholder,
  fulfillmentList,
  exportJobCreate,
  exportJobList,
  operationLogList,
  refundDetail,
  addRefundEvidence,
  createRefundEvidenceUploadIntent,
  updateRefundEvidenceScan,
  refundEvidenceRetentionCleanupDryRun,
  refundEvidenceScanCallback,
  reviewRefund,
  ship,
  logistics,
};
