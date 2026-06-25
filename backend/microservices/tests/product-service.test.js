const request = require('supertest');
const app = require('../product-service/index');

describe('商品微服务 API 测试', () => {
  describe('GET /', () => {
    it('应该返回商品列表', async () => {
      const response = await request(app)
        .get('/')
        .query({ keyword: '手机', page: 1, pageSize: 10 });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.list).toBeDefined();
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });
  });

  describe('GET /hot', () => {
    it('应该返回热门商品', async () => {
      const response = await request(app).get('/hot');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.list).toBeDefined();
    });
  });

  describe('GET /:id', () => {
    it('应该返回商品详情', async () => {
      const response = await request(app).get('/1');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBeDefined();
    });

    it('不存在的商品应返回404', async () => {
      const response = await request(app).get('/99999');
      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app).get('/health');
      expect(response.statusCode).toBe(200);
      expect(response.body.data.service).toBe('product-service');
    });
  });
});