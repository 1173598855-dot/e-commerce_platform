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
  requestRefund: (data) => api.post('/orders/refunds', data),
  createRefundEvidenceUploadIntent: (refundId, data) => api.post(`/orders/refunds/${refundId}/evidence/upload-intent`, data),
  addRefundEvidence: (refundId, data) => api.post(`/orders/refunds/${refundId}/evidence`, data),
  listRefunds: (params) => api.get('/orders/refunds', { params }),
  getRefundDetail: (refundId) => api.get(`/orders/refunds/${refundId}`),
  reviewRefund: (refundId, data) => api.put(`/orders/refunds/${refundId}/review`, data),
  updateRefundEvidenceScan: (evidenceId, data) => api.put(`/orders/refunds/evidence/${evidenceId}/scan`, data),
  exportRefunds: (params) => api.get('/orders/refunds/export-placeholder', { params }),
  listFulfillmentOrders: (params) => api.get('/orders/fulfillment/orders', { params }),
  shipOrder: (orderId, data) => api.put(`/orders/${orderId}/ship`, data),
  getLogistics: (orderId) => api.get(`/orders/logistics/${orderId}`),
  createExportJob: (data) => api.post('/orders/exports/jobs', data),
  listExportJobs: (params) => api.get('/orders/exports/jobs', { params }),
  listOperationLogs: (params) => api.get('/orders/operations/logs', { params }),
};

export const paymentApi = {
  mockPay: (data) => api.post('/orders/payment/mock', data),
  mockPayment: (data) => api.post('/orders/payment/mock', data),
  getPaymentStatus: (orderId) => api.get(`/orders/payment/${orderId}/status`),
  getPaymentHistory: (params) => api.get('/orders/payment/history', { params }),
};
