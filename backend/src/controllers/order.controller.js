const { mysqlPool } = require('../config/database');
const { sendRes, sendError } = require('../utils/response.util');

// 添加购物车
async function addToCart(req, res) {
  try {
    const { product_id, quantity = 1 } = req.body;
    const userId = req.user.userId;

    if (!product_id) {
      return sendError(res, '商品ID不能为空', 400);
    }

    // 检查商品是否存在
    const [products] = await mysqlPool.execute(
      'SELECT id, stock, price FROM products WHERE id = ? AND status = 1',
      [product_id]
    );

    if (products.length === 0) {
      return sendError(res, '商品不存在', 404);
    }

    if (products[0].stock < quantity) {
      return sendError(res, '库存不足', 400);
    }

    // 检查是否已在购物车中
    const [existing] = await mysqlPool.execute(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
      [userId, product_id]
    );

    if (existing.length > 0) {
      await mysqlPool.execute(
        'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      await mysqlPool.execute(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, product_id, quantity]
      );
    }

    sendRes(res, null, '已加入购物车');
  } catch (err) {
    console.error('加入购物车错误:', err);
    sendError(res, '操作失败', 500);
  }
}

// 获取购物车
async function getCart(req, res) {
  try {
    const userId = req.user.userId;

    const [items] = await mysqlPool.execute(
      `SELECT ci.id, ci.product_id, ci.quantity,
              p.name, p.price, p.image as product_image, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ? AND p.status = 1`,
      [userId]
    );

    const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    sendRes(res, {
      items,
      total: cartTotal.toFixed(2),
    });
  } catch (err) {
    sendError(res, '获取购物车失败', 500);
  }
}

// 更新购物车数量
async function updateCartItem(req, res) {
  try {
    const { id } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    if (quantity < 1) {
      return sendError(res, '数量至少为1', 400);
    }

    const [rows] = await mysqlPool.execute(
      'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) {
      return sendError(res, '购物车项不存在', 404);
    }
    await mysqlPool.execute('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, id]);
    sendRes(res, null, '购物车已更新');
  } catch (err) {
    sendError(res, '更新失败', 500);
  }
}

// 删除购物车项
async function removeCartItem(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const [rows] = await mysqlPool.execute(
      'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    if (rows.length === 0) {
      return sendError(res, '购物车项不存在', 404);
    }
    await mysqlPool.execute('DELETE FROM cart_items WHERE id = ?', [id]);
    sendRes(res, null, '已从购物车移除');
  } catch (err) {
    sendError(res, '删除失败', 500);
  }
}

// 清空购物车
async function clearCart(req, res) {
  try {
    await mysqlPool.execute('DELETE FROM cart_items WHERE user_id = ?', [req.user.userId]);
    sendRes(res, null, '购物车已清空');
  } catch (err) {
    sendError(res, '清空失败', 500);
  }
}

// 创建订单
async function createOrder(req, res) {
  try {
    const userId = req.user.userId;
    const { items, address, remark, user_coupon_id } = req.body;

    if (!items || items.length === 0) {
      return sendError(res, '订单商品不能为空', 400);
    }

    // 开启事务
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const [products] = await connection.execute(
          'SELECT price, stock FROM products WHERE id = ? AND status = 1 FOR UPDATE',
          [item.product_id]
        );

        if (products.length === 0) {
          throw new Error(`商品 ${item.product_id} 不存在`);
        }

        if (products[0].stock < item.quantity) {
          throw new Error(`商品 ${item.product_id} 库存不足`);
        }

        const subtotal = products[0].price * item.quantity;
        totalAmount += subtotal;

        // 扣减库存
        await connection.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );

        orderItems.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: products[0].price,
          subtotal,
        });
      }

      // 创建订单
      const orderResult = await connection.execute(
        `INSERT INTO orders (user_id, total_amount, status, shipping_address, remark)
         VALUES (?, ?, 'pending', ?, ?)`,
        [userId, totalAmount, JSON.stringify(address || {}), remark || '']
      );

      const orderId = orderResult.insertId;

      // 创建订单项
      for (const item of orderItems) {
        await connection.execute(
          'INSERT INTO order_items (order_id, product_id, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.product_id, item.quantity, item.price, item.subtotal]
        );
      }

      // 使用优惠券抵扣
      let couponDiscount = 0;
      if (user_coupon_id) {
        const [userCoupons] = await connection.execute(
          'SELECT uc.*, c.type, c.condition_amount, c.discount_amount, c.min_order_amount FROM user_coupons uc JOIN coupons c ON uc.coupon_id = c.id WHERE uc.id = ? AND uc.user_id = ? AND uc.status = 1',
          [user_coupon_id, userId]
        );

        if (userCoupons.length > 0) {
          const coupon = userCoupons[0];
          if (totalAmount >= coupon.min_order_amount) {
            if (coupon.type === 1) {
              couponDiscount = coupon.discount_amount;
            } else if (coupon.type === 2) {
              couponDiscount = Math.round(totalAmount * (1 - coupon.discount_amount / 10) * 100) / 100;
            } else {
              couponDiscount = coupon.discount_amount;
            }
            couponDiscount = Math.min(couponDiscount, totalAmount);
            await connection.execute(
              'UPDATE user_coupons SET status = 2, order_id = ?, used_at = NOW() WHERE id = ?',
              [orderId, user_coupon_id]
            );
            await connection.execute(
              'UPDATE orders SET total_amount = total_amount - ? WHERE id = ?',
              [couponDiscount, orderId]
            );
            totalAmount = Math.max(0, totalAmount - couponDiscount);
          }
        }
      }

      // 清空购物车项
      if (items.every(i => !i.order_item_id)) {
        await connection.execute('DELETE FROM cart_items WHERE user_id = ?', [userId]);
      }

      await connection.commit();

      const resultData = { orderId, totalAmount: totalAmount.toFixed(2) };
      if (couponDiscount > 0) {
        resultData.couponDiscount = couponDiscount.toFixed(2);
      }
      sendRes(res, resultData, '订单创建成功');
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('创建订单错误:', err);
    sendError(res, err.message || '创建订单失败', 500);
  }
}

// 获取我的订单
async function getMyOrders(req, res) {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status || null;

    const offset = (page - 1) * pageSize;
    let whereClause = 'o.user_id = ?';
    let params = [userId];

    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }

    const [orders] = await mysqlPool.execute(
      `SELECT o.*, oi.product_id, oi.quantity, oi.price as item_price, oi.subtotal,
              p.name as product_name, p.image as product_image
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      `SELECT COUNT(DISTINCT o.id) as count FROM orders o WHERE ${whereClause}`,
      params
    );

    // 按订单分组
    const orderMap = {};
    for (const row of orders) {
      if (!orderMap[row.id]) {
        orderMap[row.id] = {
          id: row.id,
          order_no: row.order_no,
          total_amount: row.total_amount,
          status: row.status,
          shipping_address: row.shipping_address,
          remark: row.remark,
          created_at: row.created_at,
          items: [],
        };
      }
      if (row.product_name) {
        orderMap[row.id].items.push({
          product_id: row.product_id,
          product_name: row.product_name,
          product_image: row.product_image,
          quantity: row.quantity,
          price: row.item_price,
          subtotal: row.subtotal,
        });
      }
    }

    sendRes(res, {
      list: Object.values(orderMap),
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    });
  } catch (err) {
    console.error('获取订单错误:', err);
    sendError(res, '获取订单失败', 500);
  }
}

// 取消订单
async function cancelOrder(req, res) {
  try {
    const { id } = req.params;
    const [orders] = await mysqlPool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (orders.length === 0) {
      return sendError(res, '订单不存在', 404);
    }

    if (orders[0].status !== 'pending' && orders[0].status !== 'paid') {
      return sendError(res, '该订单状态不允许取消', 400);
    }

    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.execute(
        'UPDATE orders SET status = ? WHERE id = ?',
        ['cancelled', id]
      );

      const [items] = await connection.execute(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?',
        [id]
      );

      for (const item of items) {
        await connection.execute(
          'UPDATE products SET stock = stock + ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }

      await connection.commit();
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    sendRes(res, null, '订单已取消');
  } catch (err) {
    console.error('取消订单错误:', err);
    sendError(res, '取消订单失败', 500);
  }
}

// 确认收货
async function confirmOrder(req, res) {
  try {
    const { id } = req.params;
    const [orders] = await mysqlPool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (orders.length === 0) {
      return sendError(res, '订单不存在', 404);
    }

    if (orders[0].status !== 'shipped') {
      return sendError(res, '只有已发货的订单才能确认收货', 400);
    }

    await mysqlPool.execute('UPDATE orders SET status = ? WHERE id = ?', ['completed', id]);
    sendRes(res, null, '确认收货成功');
  } catch (err) {
    sendError(res, '操作失败', 500);
  }
}

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  createOrder,
  getMyOrders,
  cancelOrder,
  confirmOrder,
};



