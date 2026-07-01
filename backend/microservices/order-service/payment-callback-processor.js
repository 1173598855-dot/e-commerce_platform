async function processVerifiedPaymentCallback(conn, callback) {
  await conn.beginTransaction();
  try {
    const [insertResult] = await conn.execute(
      `INSERT INTO payment_callback_records
       (idempotency_key, provider, order_no, transaction_id, paid_amount, status, raw_payload)
       VALUES (?, ?, ?, ?, ?, 'processing', ?)
       ON DUPLICATE KEY UPDATE duplicate_count = duplicate_count + 1, updated_at = CURRENT_TIMESTAMP`,
      [
        callback.idempotencyKey,
        callback.provider,
        callback.orderNo,
        callback.transactionId || null,
        callback.paidAmount || null,
        JSON.stringify(callback),
      ]
    );

    const duplicate = insertResult.affectedRows !== 1;
    const [orders] = await conn.execute(
      'SELECT id, status FROM orders WHERE order_no = ? FOR UPDATE',
      [callback.orderNo]
    );

    if (orders.length === 0) {
      throw Object.assign(new Error(`Order not found for payment callback: ${callback.orderNo}`), { httpStatus: 404 });
    }

    const order = orders[0];
    if (!duplicate && order.status === 'pending') {
      await conn.execute(
        "UPDATE orders SET status = 'paid', payment_method = ?, actual_amount = COALESCE(?, actual_amount, total_amount), paid_at = COALESCE(paid_at, NOW()) WHERE id = ?",
        [callback.provider, callback.paidAmount || null, order.id]
      );
    }

    await conn.execute(
      "UPDATE payment_callback_records SET order_id = ?, status = 'processed', processed_at = COALESCE(processed_at, NOW()) WHERE idempotency_key = ?",
      [order.id, callback.idempotencyKey]
    );

    await conn.commit();
    return { orderId: order.id, orderNo: callback.orderNo, duplicate, status: order.status === 'pending' ? 'paid' : order.status };
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

module.exports = { processVerifiedPaymentCallback };
