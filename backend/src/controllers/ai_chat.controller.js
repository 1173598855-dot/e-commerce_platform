const { mysqlPool } = require("../config/database");
const { sendRes, sendError } = require("../utils/response.util");
const axios = require("axios");

async function getAiReply(req, res) {
  try {
    const userId = parseInt(req.user.userId);
    const { message } = req.body;
    if (!message) return sendError(res, "消息不能为空", 400);

    const [recentOrders] = await mysqlPool.execute(
      "SELECT id, order_no, status, total_amount, created_at FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 3",
      [userId]
    );

    const [products] = await mysqlPool.execute(
      "SELECT id, name, price, description FROM products WHERE status = 1 ORDER BY sales DESC LIMIT 10"
    );

    let aiReply = getRuleBasedReply(message, recentOrders, products);

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      try {
        const response = await axios.post(
          "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-3.5-turbo",
            messages: [
              { role: "system", content: "你是一个电商平台的智能客服助手。" },
              { role: "user", content: message },
            ],
            max_tokens: 500,
            temperature: 0.7,
          },
          { headers: { Authorization: "Bearer " + openaiApiKey, "Content-Type": "application/json" }, timeout: 15000 }
        );
        aiReply = response.data.choices[0].message.content;
      } catch (err) {
        console.warn("OpenAI调用失败:", err.message);
      }
    }

    await mysqlPool.execute(
      "INSERT INTO chat_messages (from_user_id, to_user_id, message_type, content) VALUES (?, ?, ?, ?)",
      [userId, 0, "ai_reply", aiReply]
    );

    sendRes(res, { reply: aiReply, is_ai: true });
  } catch (err) {
    console.error("AI客服错误:", err);
    sendError(res, "AI客服响应失败", 500);
  }
}

function getRuleBasedReply(message, orders, products) {
  const msg = message.toLowerCase();
  if (msg.includes("订单") || msg.includes("物流") || msg.includes("发货")) {
    if (orders.length > 0) {
      const latest = orders[0];
      const sm = { pending: "待付款", paid: "待发货", shipped: "已发货", completed: "已完成", cancelled: "已取消" };
      return "您最近的订单（" + latest.order_no + "）状态为：" + (sm[latest.status] || latest.status) + "，金额：¥" + latest.total_amount + "。";
    }
    return "您暂无订单记录。";
  }
  if (msg.includes("退换") || msg.includes("退货") || msg.includes("退款")) {
    return "退换货政策：1. 签收后7天内可无理由退货；2. 质量问题15天内可换货；3. 请在我的订单中选择对应订单申请售后。";
  }
  if (msg.includes("优惠") || msg.includes("券") || msg.includes("折扣")) {
    return "您可以在我的优惠券查看可用优惠券，或关注首页活动专区领取限时优惠！";
  }
  if (msg.includes("商品") || msg.includes("推荐") || msg.includes("什么好")) {
    if (products.length > 0) {
      const top3 = products.slice(0, 3).map(p => p.name + "（¥" + p.price + "）").join("、");
      return "为您推荐热销商品：" + top3 + "。更多商品请浏览首页！";
    }
    return "我们有很多优质商品，请浏览首页或分类页面挑选！";
  }
  return "您好！我是智能客服助手，可以帮您查询订单、退换货政策、推荐商品等。请问有什么可以帮您的？";
}

module.exports = { getAiReply };
