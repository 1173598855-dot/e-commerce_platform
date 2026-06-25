const { mysqlPool } = require("../config/database");
const { sendRes, sendError } = require("../utils/response.util");

// 获取短视频列表
async function getVideoList(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    const [videos] = await mysqlPool.execute(
      "SELECT sv.*, u.nickname as author_name, u.avatar as author_avatar, p.name as product_name, p.price, p.image as product_image " +
      "FROM short_videos sv " +
      "LEFT JOIN users u ON sv.user_id = u.id " +
      "LEFT JOIN products p ON sv.product_id = p.id " +
      "WHERE sv.status = 1 " +
      "ORDER BY sv.created_at DESC " +
      "LIMIT ? OFFSET ?",
      [pageSize, offset]
    );

    const [[{ count }]] = await mysqlPool.execute(
      "SELECT COUNT(*) as count FROM short_videos WHERE status = 1"
    );

    sendRes(res, {
      list: videos,
      pagination: { page, pageSize, total: count },
    });
  } catch (err) {
    console.error("getVideoList error:", err);
    sendError(res, "获取短视频失败", 500);
  }
}

// 点赞视频
async function likeVideo(req, res) {
  try {
    const userId = req.user.userId;
    const { videoId } = req.body;

    if (!videoId) return sendError(res, "视频ID不能为空", 400);

    await mysqlPool.execute(
      "UPDATE short_videos SET likes_count = likes_count + 1 WHERE id = ?",
      [videoId]
    );

    sendRes(res, null, "点赞成功");
  } catch (err) {
    console.error("likeVideo error:", err);
    sendError(res, "点赞失败", 500);
  }
}

module.exports = { getVideoList, likeVideo };
