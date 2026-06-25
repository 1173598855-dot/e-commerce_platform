const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { mysqlPool } = require('./config/database');
const { initRedis } = require('./config/redis');
const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const uploadRoutes = require('./routes/upload.routes');
const skuRoutes = require('./routes/sku.routes');
const reviewRoutes = require('./routes/review.routes');
const favoriteRoutes = require('./routes/favorite.routes');
const addressRoutes = require('./routes/address.routes');
const couponRoutes = require('./routes/coupon.routes');
const pointsRoutes = require('./routes/points.routes');
const notificationRoutes = require('./routes/notification.routes');
const chatRoutes = require('./routes/chat.routes');
const searchRoutes = require('./routes/search.routes');
const merchantRoutes = require('./routes/merchant.routes');
const aiRoutes = require('./routes/ai.routes');
const dataRoutes = require('./routes/data.routes');
const logisticsRoutes = require('./routes/logistics.routes');
const videoRoutes = require('./routes/video.routes');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/skus', skuRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/points', pointsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/logistics', logisticsRoutes);
app.use('/api/videos', videoRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mysql: 'connected' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
  });
});

// Start server
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, async () => {
  console.log(`服务器运行在端口 ${PORT}`);

  try {
    await mysqlPool.getConnection();
    console.log('MySQL 连接成功');
  } catch (err) {
    console.warn('MySQL 连接失败:', err.message);
  }

  try {
    await initRedis();
    if (require('./config/redis').getRedisClient()) {
      console.log('Redis 连接成功');
    } else {
      console.log('Redis 未连接，使用内存缓存');
    }
  } catch (err) {
    console.warn('Redis 连接失败:', err.message);
  }
});

module.exports = app;

