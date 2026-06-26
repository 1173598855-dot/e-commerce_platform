import api from './request';

// ========== 认证相关 ==========
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  smsLogin: (data) => api.post('/auth/sms-login', data),
  passwordLogin: (data) => api.post('/auth/password-login', data),
  sendCode: (phone) => api.post('/auth/send-code', { phone }),
  wxLogin: (data) => api.post('/auth/wx-login', data),
  qqLogin: (data) => api.post('/auth/qq-login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  refresh: (data) => api.post('/auth/refresh', data),
};

// ========== 商品相关 ==========
export const productApi = {
  getList: (params) => api.get('/products', { params }),
  getDetail: (id) => api.get(`/products/${id}`),
  getHot: () => api.get('/products/hot'),
  search: (keyword, params) => api.get('/products', { params: { ...params, keyword } }),
};

// ========== SKU相关 ==========
export const skuApi = {
  getOptions: (productId) => api.get(`/skus/${productId}/options`),
  getList: (productId) => api.get(`/skus/${productId}/list`),
  findBySpec: (productId, specs) => api.post(`/skus/${productId}/find`, { specs }),
};

// ========== 分类相关 ==========
export const categoryApi = {
  getList: () => api.get('/categories'),
  getDetail: (id) => api.get(`/categories/${id}`),
};

// ========== 购物车相关 ==========
export const cartApi = {
  getCart: () => api.get('/orders/cart'),
  addToCart: (data) => api.post('/orders/cart/add', data),
  updateQuantity: (id, quantity) => api.put(`/orders/cart/${id}`, { quantity }),
  removeItem: (id) => api.delete(`/orders/cart/${id}`),
  clearCart: () => api.delete('/orders/cart/clear'),
};

// ========== 订单相关 ==========
export const orderApi = {
  createOrder: (data) => api.post('/orders', data),
  getOrders: (params) => api.get('/orders', { params }),
  getOrderDetail: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
  confirmOrder: (id) => api.put(`/orders/${id}/confirm`),
};

// ========== 支付相关 ==========
export const paymentApi = {
  mockPay: (data) => api.post('/orders/payment/mock', data),
  getPaymentStatus: (orderId) => api.get(`/orders/payment/${orderId}/status`),
  getPaymentHistory: (params) => api.get('/orders/payment/history', { params }),
};

// ========== 评价相关 ==========
export const reviewApi = {
  getProductReviews: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
  createReview: (data) => api.post('/reviews', data),
  getMyReviews: (params) => api.get('/reviews/my', { params }),
};

// ========== 收藏相关 ==========
export const favoriteApi = {
  add: (data) => api.post('/favorites', data),
  remove: (data) => api.delete('/favorites', { data }),
  getList: (params) => api.get('/favorites', { params }),
  check: (productId) => api.get(`/favorites/${productId}/status`),
};

// ========== 地址相关 ==========
export const addressApi = {
  getList: () => api.get('/addresses'),
  add: (data) => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  remove: (id) => api.delete(`/addresses/${id}`),
  getDefault: () => api.get('/addresses/default'),
};

// ========== 优惠券相关 ==========
export const couponApi = {
  getList: () => api.get('/coupons'),
  receive: (data) => api.post('/coupons/receive', data),
  getMy: (params) => api.get('/coupons/my', { params }),
  use: (data) => api.post('/coupons/use', data),
};

// ========== 积分相关 ==========
export const pointsApi = {
  getPoints: () => api.get('/points'),
  add: (data) => api.post('/points/add', data),
  consume: (data) => api.post('/points/consume', data),
  getLogs: (params) => api.get('/points/logs', { params }),
};

// ========== 消息通知相关 ==========
export const notificationApi = {
  getList: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

// ========== 聊天相关 ==========
export const chatApi = {
  getSessions: () => api.get('/chat/sessions'),
  getMessages: (otherUserId) => api.get(`/chat/messages/${otherUserId}`),
  sendMessage: (data) => api.post('/chat/send', data),
  getUnread: () => api.get('/chat/unread'),
};

// ========== AI相关 ==========
export const aiApi = {
  getRecommendations: (params) => api.get('/ai/recommend', { params }),
  recordBehavior: (data) => api.post('/ai/behavior', data),
  chat: (data) => api.post('/ai/chat', data),
};

// ========== 搜索相关 ==========
export const searchApi = {
  getHot: () => api.get('/search/hot'),
  getSuggestions: (keyword) => api.get('/search/suggestions', { params: { keyword } }),
  saveHistory: (data) => api.post('/search/history', data),
  getHistory: () => api.get('/search/history'),
  clearHistory: () => api.delete('/search/history'),
};

// ========== 商家相关 ==========
export const merchantApi = {
  apply: (data) => api.post('/merchants/apply', data),
  getInfo: () => api.get('/merchants/info'),
  getProducts: (params) => api.get('/merchants/products', { params }),
};

// ========== 数据看板相关 ==========
export const dataApi = {
  getOverview: () => api.get('/data/overview'),
  getSalesTrend: (days) => api.get('/data/sales-trend', { params: { days } }),
  getProductRanking: (limit) => api.get('/data/product-ranking', { params: { limit } }),
  getUserActivity: (days) => api.get('/data/user-activity', { params: { days } }),
};

// ========== 默认导出 ==========
export { default as api } from './request';
