import api from './client';

export const productApi = {
  getList: (params) => api.get('/products', { params }),
  getDetail: (id) => api.get(`/products/${id}`),
  getHot: () => api.get('/products/hot'),
  getRecommend: (params) => api.get('/ai/recommend', { params }),
  getReviews: (id, params) => api.get(`/reviews/product/${id}`, { params }),
  search: (keyword, params) => api.get('/products', { params: { ...params, keyword } }),
};

export const skuApi = {
  getOptions: (productId) => api.get(`/skus/${productId}/options`),
  getList: (productId) => api.get(`/skus/${productId}/list`),
  findBySpec: (productId, specs) => api.post(`/skus/${productId}/find`, { specs }),
};

export const categoryApi = {
  getList: () => api.get('/categories'),
  getDetail: (id) => api.get(`/categories/${id}`),
};

export const reviewApi = {
  getProductReviews: (productId, params) => api.get(`/reviews/product/${productId}`, { params }),
  createReview: (data) => api.post('/reviews', data),
  getMyReviews: (params) => api.get('/reviews/my', { params }),
};

export const aiApi = {
  getRecommendations: (params) => api.get('/ai/recommend', { params }),
  recordBehavior: (data) => api.post('/ai/behavior', data),
  chat: (data) => api.post('/ai/chat', data),
};

export const dataApi = {
  getOverview: () => api.get('/data/overview'),
  getSalesTrend: (days) => api.get('/data/sales-trend', { params: { days } }),
  getProductRanking: (limit) => api.get('/data/product-ranking', { params: { limit } }),
  getUserActivity: (days) => api.get('/data/user-activity', { params: { days } }),
};
