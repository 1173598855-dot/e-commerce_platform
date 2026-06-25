const { mysqlPool } = require("../config/database");
const { sendRes, sendError } = require("../utils/response.util");

async function getLogisticsTracking(req, res) {
  try {
    const orderId = parseInt(req.params.orderId);
    const userId = parseInt(req.user.userId);

    const [trackings] = await mysqlPool.execute(
      "SELECT lt.id as tracking_id, lt.order_id, lt.tracking_company, lt.tracking_number, lt.status " +
      "FROM logistics_tracking lt " +
      "INNER JOIN orders o ON lt.order_id = o.id " +
      "WHERE o.id = ? AND o.user_id = ?",
      [orderId, userId]
    );

    if (trackings.length === 0) {
      return sendError(res, "未找到物流信息", 404);
    }

    const tid = trackings[0].tracking_id;
    const [traces] = await mysqlPool.execute(
      "SELECT content, location, created_at FROM logistics_traces WHERE tracking_id = ? ORDER BY created_at ASC",
      [tid]
    );

    const statusMap = { shipped: "已发货", transit: "运输中", delivered: "已签收" };

    sendRes(res, {
      tracking_company: trackings[0].tracking_company,
      tracking_number: trackings[0].tracking_number,
      status: statusMap[trackings[0].status] || trackings[0].status,
      traces: traces,
    });
  } catch (err) {
    console.error("getLogisticsTracking error:", err);
    sendError(res, "获取物流信息失败", 500);
  }
}

module.exports = { getLogisticsTracking };
