const request = require('supertest');
const app = require('../order-service/index');

describe('订单微服务 API 测试', () => {
  let token;
  let userId;

  beforeAll(async () => {
    // 先登录获取token
    const loginResponse = await request(app)
      .post('/user-service/sms-login') // 假设订单服务能访问用户服务
      .send({ phone: '13800138000', code: '1234' });
    token = loginResponse.body?.data?.token;
  });

  describe('GET /', () => {
    it('应该返回订单列表', async () => {
      const response = await request(app)
        .get('/')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, pageSize: 10 });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.list).toBeDefined();
    });
  });

  describe('POST /', () => {
    it('应该创建订单', async () => {
      const response = await request(app)
        .post('/')
        .set('Authorization', `Bearer ${token}`)
        .send({
          merchant_id: 1,
          items: [
            { product_id: 1, product_name: '测试商品', quantity: 1 }
          ],
          address_id: 1,
          remark: '测试订单'
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.orderNo).toBeDefined();
    });
  });

  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app).get('/health');
      expect(response.statusCode).toBe(200);
      expect(response.body.data.service).toBe('order-service');
    });
  });
});