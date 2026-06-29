import api from './client';

export const addressApi = {
  getList: () => api.get('/addresses'),
  add: (data) => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  remove: (id) => api.delete(`/addresses/${id}`),
  getDefault: () => api.get('/addresses/default'),
};

export const favoriteApi = {
  add: (data) => api.post('/favorites', data),
  remove: (data) => api.delete('/favorites', { data }),
  getList: (params) => api.get('/favorites', { params }),
  check: (productId) => api.get(`/favorites/${productId}/status`),
};

export const couponApi = {
  getList: () => api.get('/coupons'),
  receive: (data) => api.post('/coupons/receive', data),
  getMy: (params) => api.get('/coupons/my', { params }),
  use: (data) => api.post('/coupons/use', data),
};

export const pointsApi = {
  getPoints: () => api.get('/points'),
  add: (data) => api.post('/points/add', data),
  consume: (data) => api.post('/points/consume', data),
  getLogs: (params) => api.get('/points/logs', { params }),
};

export const notificationApi = {
  getList: (params) => api.get('/notifications', { params }),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`),
};

export const chatApi = {
  getSessions: () => api.get('/chat/sessions'),
  getMessages: (otherUserId) => api.get(`/chat/messages/${otherUserId}`),
  sendMessage: (data) => api.post('/chat/send', data),
  getUnread: () => api.get('/chat/unread'),
};

export const merchantApi = {
  apply: (data) => api.post('/merchants/apply', data),
  getInfo: () => api.get('/merchants/info'),
  getProducts: (params) => api.get('/merchants/products', { params }),
};

export const searchApi = {
  getHot: () => api.get('/search/hot'),
  getSuggestions: (keyword) => api.get('/search/suggestions', { params: { keyword } }),
  saveHistory: (data) => api.post('/search/history', data),
  getHistory: () => api.get('/search/history'),
  clearHistory: () => api.delete('/search/history'),
};

export const userApi = {
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getStats: async () => {
    const [couponsRes, pointsRes, favoritesRes, cartRes] = await Promise.all([
      api.get('/coupons/my').catch(() => ({ data: [] })),
      api.get('/points').catch(() => ({ data: { points: 0 } })),
      api.get('/favorites').catch(() => ({ data: [] })),
      api.get('/orders/cart').catch(() => ({ data: { items: [] } })),
    ]);

    return {
      coupons: couponsRes.data?.length || 0,
      points: pointsRes.data?.points || 0,
      favorites: favoritesRes.data?.list?.length || 0,
      cartCount: cartRes.data?.items?.length || 0,
    };
  },
};
