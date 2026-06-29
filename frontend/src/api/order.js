import api from './client';

export const cartApi = {
  getCart: () => api.get('/orders/cart'),
  addToCart: (data) => api.post('/orders/cart/add', data),
  updateQuantity: (id, quantity) => api.put(`/orders/cart/${id}`, { quantity }),
  removeItem: (id) => api.delete(`/orders/cart/${id}`),
  clearCart: () => api.delete('/orders/cart/clear'),
};

export const orderApi = {
  createOrder: (data) => api.post('/orders', data),
  getOrders: (params) => api.get('/orders', { params }),
  getOrderDetail: (id) => api.get(`/orders/${id}`),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
  confirmOrder: (id) => api.put(`/orders/${id}/confirm`),
};

export const paymentApi = {
  mockPay: (data) => api.post('/orders/payment/mock', data),
  mockPayment: (data) => api.post('/orders/payment/mock', data),
  getPaymentStatus: (orderId) => api.get(`/orders/payment/${orderId}/status`),
  getPaymentHistory: (params) => api.get('/orders/payment/history', { params }),
};
