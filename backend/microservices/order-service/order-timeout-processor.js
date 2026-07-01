async function expirePendingOrders(conn, options = {}) {
  const olderThanMinutes = Number(options.olderThanMinutes || 30);
  const limit = Number(options.limit || 50);

  await conn.beginTransaction();
  try {
    const [orders] = await conn.execute(
      `SELECT id, order_no FROM orders WHERE status = 'pending'
       AND created_at <= DATE_SUB(NOW(), INTERVAL ? MINUTE)
       ORDER BY created_at ASC LIMIT ? FOR UPDATE`,
      [olderThanMinutes, limit]
    );

    const expiredOrderIds = [];
    for (const order of orders) {
      const [cancelResult] = await conn.execute(
        "UPDATE orders SET status = 'cancelled', remark = CASE WHEN remark = '' THEN 'auto cancelled: payment timeout' ELSE remark END WHERE id = ? AND status = 'pending'",
        [order.id]
      );

      if (cancelResult.affectedRows !== 1) {
        continue;
      }

      const [items] = await conn.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [order.id]);
      for (const item of items) {
        await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
      expiredOrderIds.push(order.id);
    }

    await conn.commit();
    return { expired: expiredOrderIds.length, orderIds: expiredOrderIds };
  } catch (error) {
    await conn.rollback();
    throw error;
  }
}

module.exports = { expirePendingOrders };
