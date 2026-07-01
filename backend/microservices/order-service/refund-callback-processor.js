const { assertRefundTransition } = require('./refund-state-machine');

async function processVerifiedRefundCallback(conn, callback) {
  await conn.beginTransaction();
  try {
    const [insertResult] = await conn.execute(
      `INSERT INTO refund_callback_records
       (idempotency_key, provider, refund_id, provider_refund_id, status, failed_reason, raw_payload)
       VALUES (?, ?, ?, ?, 'processing', ?, ?)
       ON DUPLICATE KEY UPDATE duplicate_count = duplicate_count + 1, updated_at = CURRENT_TIMESTAMP`,
      [
        callback.idempotencyKey,
        callback.provider,
        callback.refundId || null,
        callback.providerRefundId || null,
        callback.failedReason || '',
        JSON.stringify(callback),
      ]
    );

    const duplicate = insertResult.affectedRows !== 1;
    const [refunds] = await conn.execute(
      callback.refundId
        ? 'SELECT id, order_id, status FROM refund_requests WHERE id = ? FOR UPDATE'
        : 'SELECT id, order_id, status FROM refund_requests WHERE provider_refund_id = ? FOR UPDATE',
      [callback.refundId || callback.providerRefundId]
    );

    if (refunds.length === 0) {
      throw Object.assign(new Error(`Refund request not found for refund callback: ${callback.refundId || callback.providerRefundId}`), { httpStatus: 404 });
    }

    const refund = refunds[0];
    let finalStatus = refund.status;
    if (!duplicate && refund.status === 'refunding') {
      assertRefundTransition(refund.status, callback.status);
      await conn.execute(
        'UPDATE refund_requests SET status = ?, failed_reason = ?, processed_at = CASE WHEN ? = \'refunded\' THEN NOW() ELSE processed_at END WHERE id = ?',
        [callback.status, callback.failedReason || '', callback.status, refund.id]
      );
      await conn.execute(
        'INSERT INTO refund_events (refund_id, from_status, to_status, operator_id, note) VALUES (?, ?, ?, ?, ?)',
        [refund.id, refund.status, callback.status, null, callback.failedReason || 'provider refund callback']
      );
      finalStatus = callback.status;
    }

    await conn.execute(
      "UPDATE refund_callback_records SET refund_id = ?, status = 'processed', processed_at = COALESCE(processed_at, NOW()) WHERE idempotency_key = ?",
      [refund.id, callback.idempotencyKey]
    );

    await conn.commit();
    return { refundId: refund.id, orderId: refund.order_id, duplicate, status: finalStatus };
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

module.exports = { processVerifiedRefundCallback };
