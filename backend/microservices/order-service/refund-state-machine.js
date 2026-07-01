const REFUND_STATUSES = new Set(['requested', 'approved', 'rejected', 'refunding', 'refunded', 'failed']);
const REFUNDABLE_ORDER_STATUSES = new Set(['paid', 'shipped', 'completed']);

const TRANSITIONS = {
  requested: new Set(['approved', 'rejected']),
  approved: new Set(['refunding']),
  refunding: new Set(['refunded', 'failed']),
  failed: new Set(['refunding']),
  refunded: new Set([]),
  rejected: new Set([]),
};

function normalizeRefundStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!REFUND_STATUSES.has(normalized)) {
    throw Object.assign(new Error(`Unsupported refund status: ${normalized}`), { httpStatus: 400 });
  }
  return normalized;
}

function canRequestRefundForOrder(order) {
  return REFUNDABLE_ORDER_STATUSES.has(String(order?.status || '').toLowerCase());
}

function assertRefundTransition(fromStatus, toStatus) {
  const from = normalizeRefundStatus(fromStatus);
  const to = normalizeRefundStatus(toStatus);
  if (!TRANSITIONS[from].has(to)) {
    throw Object.assign(new Error(`Invalid refund transition: ${from} -> ${to}`), { httpStatus: 400 });
  }
  return true;
}

function buildRefundIdempotencyKey({ orderId, refundType = 'full' }) {
  if (!orderId) {
    throw Object.assign(new Error('orderId required'), { httpStatus: 400 });
  }
  return `refund:order:${orderId}:type:${String(refundType || 'full').toLowerCase()}`;
}

module.exports = {
  assertRefundTransition,
  buildRefundIdempotencyKey,
  canRequestRefundForOrder,
  normalizeRefundStatus,
};
