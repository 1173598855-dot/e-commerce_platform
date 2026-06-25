const request = require('supertest');
const app = require('../user-service/index');

describe('用户微服务 API 测试', () => {
  describe('POST /register', () => {
    it('应该成功注册用户', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          phone: '13800138000',
          password: 'Test123456',
          nickname: '测试用户'
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });

    it('手机号为空时应返回错误', async () => {
      const response = await request(app)
        .post('/register')
        .send({
          password: 'Test123456',
          nickname: '测试用户'
        });
      
      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /sms-login', () => {
    it('应该成功登录', async () => {
      const response = await request(app)
        .post('/sms-login')
        .send({
          phone: '13800138000',
          code: '1234'
        });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
    });
  });

  describe('GET /profile', () => {
    let token;
    
    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/sms-login')
        .send({ phone: '13800138000', code: '1234' });
      token = loginResponse.body.data.token;
    });

    it('应该获取用户信息', async () => {
      const response = await request(app)
        .get('/profile')
        .set('Authorization', `Bearer ${token}`);
      
      expect(response.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.phone).toBe('13800138000');
    });

    it('无token时应返回401', async () => {
      const response = await request(app).get('/profile');
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /health', () => {
    it('应该返回健康状态', async () => {
      const response = await request(app).get('/health');
      expect(response.statusCode).toBe(200);
      expect(response.body.data.service).toBe('user-service');
    });
  });
});