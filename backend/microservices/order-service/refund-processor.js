const {
  assertRefundTransition,
  buildRefundIdempotencyKey,
  canRequestRefundForOrder,
} = require('./refund-state-machine');
const { createRefundTransaction } = require('./refund-provider');

function normalizeOperatorRole(role) {
  return String(role || 'admin').trim().toLowerCase();
}

async function assertRefundReviewScope(conn, refund, { operatorRole, merchantId }) {
  const role = normalizeOperatorRole(operatorRole);
  if (role !== 'merchant') return;
  if (!merchantId) throw Object.assign(new Error('merchantId required for merchant refund review'), { httpStatus: 403 });

  const [[scope]] = await conn.execute(
    `SELECT COUNT(DISTINCT p.merchant_id) AS merchant_count,
            SUM(CASE WHEN p.merchant_id = ? THEN 0 ELSE 1 END) AS unmatched_count
     FROM order_items oi
     INNER JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?`,
    [merchantId, refund.order_id]
  );

  if (!scope || Number(scope.merchant_count) !== 1 || Number(scope.unmatched_count) !== 0) {
    throw Object.assign(new Error('Refund request does not belong to merchant'), { httpStatus: 403 });
  }
}

async function assertRefundEvidenceScanReady(conn, refundId, { nextStatus, operatorRole, evidenceScanBypass, note }) {
  if (String(nextStatus || '').toLowerCase() !== 'approved') return;
  const role = normalizeOperatorRole(operatorRole);
  if (role === 'admin' && evidenceScanBypass === true) {
    if (!String(note || '').trim()) {
      throw Object.assign(new Error('evidence scan bypass note required'), { httpStatus: 400 });
    }
    const [evidenceRows] = await conn.execute(
      'SELECT id, scan_status FROM refund_evidence WHERE refund_id = ?',
      [refundId]
    );
    return { bypassed: true, evidenceIds: evidenceRows.map((row) => row.id) };
  }

  const [evidenceRows] = await conn.execute(
    'SELECT id, scan_status FROM refund_evidence WHERE refund_id = ?',
    [refundId]
  );
  const blockingEvidence = evidenceRows.find((row) => String(row.scan_status || 'pending').toLowerCase() !== 'passed');
  if (blockingEvidence) {
    throw Object.assign(new Error('Refund evidence scan must pass before approval'), { httpStatus: 400 });
  }
  return { bypassed: false, evidenceIds: [] };
}

async function recordRefundReviewAudit(conn, {
  refundId,
  operatorId,
  operatorRole,
  merchantId,
  action,
  decision,
  note,
  evidenceIds,
}) {
  await conn.execute(
    `INSERT INTO refund_review_audit_logs
     (refund_id, operator_id, operator_role, merchant_id, action, decision, note, evidence_ids)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [refundId, operatorId, normalizeOperatorRole(operatorRole), merchantId || null, action, decision, note || '', JSON.stringify(evidenceIds || [])]
  );
}

async function createRefundRequest(conn, userId, body) {
  const { orderId, refundType = 'full', reason = '' } = body || {};
  if (!orderId) {
    throw Object.assign(new Error('orderId required'), { httpStatus: 400 });
  }

  await conn.beginTransaction();
  try {
    const [orders] = await conn.execute(
      'SELECT id, order_no, user_id, status, total_amount FROM orders WHERE id = ? AND user_id = ? FOR UPDATE',
      [orderId, userId]
    );
    if (orders.length === 0) {
      throw Object.assign(new Error('Order not found'), { httpStatus: 404 });
    }

    const order = orders[0];
    if (!canRequestRefundForOrder(order)) {
      throw Object.assign(new Error(`Order status ${order.status} is not refundable`), { httpStatus: 400 });
    }

    const idempotencyKey = buildRefundIdempotencyKey({ orderId, refundType });
    const [insertResult] = await conn.execute(
      `INSERT INTO refund_requests
       (idempotency_key, order_id, order_no, user_id, refund_type, amount, reason, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'requested')
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [idempotencyKey, order.id, order.order_no, userId, refundType, order.total_amount, reason]
    );

    const duplicate = insertResult.affectedRows !== 1;
    if (duplicate) {
      const [existing] = await conn.execute(
        'SELECT id, status FROM refund_requests WHERE idempotency_key = ?',
        [idempotencyKey]
      );
      await conn.commit();
      return { refundId: existing[0].id, orderId: order.id, status: existing[0].status, duplicate: true };
    }

    await conn.commit();
    return { refundId: insertResult.insertId, orderId: order.id, status: 'requested', duplicate: false };
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

async function transitionRefundRequest(conn, { refundId, nextStatus, operatorId, operatorRole, merchantId, note = '', refundProvider = createRefundTransaction, provider, evidenceScanBypass = false }) {
  if (!refundId) throw Object.assign(new Error('refundId required'), { httpStatus: 400 });
  if (!operatorId) throw Object.assign(new Error('operatorId required'), { httpStatus: 400 });

  await conn.beginTransaction();
  try {
    const [refunds] = await conn.execute(
      'SELECT id, order_id, order_no, amount, status FROM refund_requests WHERE id = ? FOR UPDATE',
      [refundId]
    );
    if (refunds.length === 0) {
      throw Object.assign(new Error('Refund request not found'), { httpStatus: 404 });
    }

    const refund = refunds[0];
    await assertRefundReviewScope(conn, refund, { operatorRole, merchantId });
    const scanReview = await assertRefundEvidenceScanReady(conn, refundId, { nextStatus, operatorRole, evidenceScanBypass, note });
    assertRefundTransition(refund.status, nextStatus);

    let providerResult = null;
    if (nextStatus === 'refunding') {
      providerResult = await refundProvider({
        refundId,
        orderNo: refund.order_no,
        amount: refund.amount,
        provider,
      });
    }

    await conn.execute(
      providerResult
        ? 'UPDATE refund_requests SET status = ?, provider = ?, provider_refund_id = ?, processed_at = CASE WHEN ? IN (\'refunded\', \'rejected\') THEN NOW() ELSE processed_at END WHERE id = ?'
        : 'UPDATE refund_requests SET status = ?, processed_at = CASE WHEN ? IN (\'refunded\', \'rejected\') THEN NOW() ELSE processed_at END WHERE id = ?',
      providerResult
        ? [nextStatus, providerResult.provider, providerResult.providerRefundId, nextStatus, refundId]
        : [nextStatus, nextStatus, refundId]
    );
    await conn.execute(
      'INSERT INTO refund_events (refund_id, from_status, to_status, operator_id, note) VALUES (?, ?, ?, ?, ?)',
      [refundId, refund.status, nextStatus, operatorId, note]
    );
    if (scanReview?.bypassed) {
      await recordRefundReviewAudit(conn, {
        refundId,
        operatorId,
        operatorRole,
        merchantId,
        action: 'evidence_scan_bypass',
        decision: nextStatus,
        note,
        evidenceIds: scanReview.evidenceIds,
      });
    }

    await conn.commit();
    return {
      refundId,
      orderId: refund.order_id,
      status: nextStatus,
      ...(providerResult ? { provider: providerResult.provider, providerRefundId: providerResult.providerRefundId } : {}),
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

module.exports = { createRefundRequest, transitionRefundRequest };
