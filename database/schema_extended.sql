-- 创建数据库
CREATE DATABASE IF NOT EXISTS ecommerce DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE ecommerce;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  password VARCHAR(255) DEFAULT '',
  nickname VARCHAR(50) NOT NULL,
  avatar VARCHAR(255) DEFAULT '',
  status TINYINT DEFAULT 1 COMMENT '1正常 0禁用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  parent_id INT DEFAULT NULL,
  icon VARCHAR(255) DEFAULT '',
  sort_order INT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_parent (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品表
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) DEFAULT NULL,
  stock INT DEFAULT 0,
  category_id INT NOT NULL,
  brand VARCHAR(100) DEFAULT '',
  spec VARCHAR(255) DEFAULT '',
  image VARCHAR(255) DEFAULT '',
  sales INT DEFAULT 0,
  status TINYINT DEFAULT 1 COMMENT '1上架 0下架',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_category (category_id),
  INDEX idx_status (status),
  INDEX idx_sales (sales),
  FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品图片表
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(255) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 购物车表
CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_no VARCHAR(32) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending paid shipped completed cancelled',
  shipping_address JSON DEFAULT NULL,
  remark TEXT,
  payment_method VARCHAR(20) DEFAULT NULL,
  paid_at DATETIME DEFAULT NULL,
  shipped_at DATETIME DEFAULT NULL,
  completed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_status (status),
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 订单项表
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 收藏表
CREATE TABLE IF NOT EXISTS favorites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  UNIQUE KEY uk_user_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 评论表
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  order_id INT NOT NULL,
  rating TINYINT NOT NULL COMMENT '1-5星',
  content TEXT,
  images JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ==================== 扩展表结构 ====================

-- SKU规格表
CREATE TABLE IF NOT EXISTS product_skus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  sku_code VARCHAR(50) NOT NULL COMMENT 'SKU编码',
  spec TEXT COMMENT '规格描述，如{"颜色":"红色","尺寸":"XL"}',
  price DECIMAL(10,2) NOT NULL COMMENT 'SKU价格',
  stock INT DEFAULT 0 COMMENT 'SKU库存',
  image VARCHAR(255) DEFAULT '' COMMENT 'SKU图片',
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uk_sku_code (sku_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- SKU规格选项表（用于前端展示规格选择）
CREATE TABLE IF NOT EXISTS product_spec_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  spec_name VARCHAR(50) NOT NULL COMMENT '规格名，如"颜色"、"尺寸"',
  spec_value VARCHAR(100) NOT NULL COMMENT '规格值，如"红色"、"XL"',
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_spec (product_id, spec_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 收货地址表
CREATE TABLE IF NOT EXISTS addresses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  receiver_name VARCHAR(50) NOT NULL,
  receiver_phone VARCHAR(20) NOT NULL,
  province VARCHAR(50) NOT NULL,
  city VARCHAR(50) NOT NULL,
  district VARCHAR(50) NOT NULL,
  detail_address VARCHAR(255) NOT NULL,
  is_default TINYINT DEFAULT 0 COMMENT '0否 1是',
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 优惠券表
CREATE TABLE IF NOT EXISTS coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '券名称',
  type TINYINT NOT NULL COMMENT '1满减 2折扣 3无门槛',
  condition_amount DECIMAL(10,2) DEFAULT 0 COMMENT '满X元',
  discount_amount DECIMAL(10,2) NOT NULL COMMENT '减免金额/折扣率',
  min_order_amount DECIMAL(10,2) DEFAULT 0 COMMENT '最低消费金额',
  total_count INT DEFAULT 0 COMMENT '发放总量 0表示不限',
  issued_count INT DEFAULT 0 COMMENT '已发放数量',
  per_user_limit INT DEFAULT 1 COMMENT '每人限领数量 0表示不限',
  valid_start DATETIME NOT NULL COMMENT '有效期开始',
  valid_end DATETIME NOT NULL COMMENT '有效期结束',
  product_scope TINYINT DEFAULT 1 COMMENT '1全场 2指定分类 3指定商品',
  scope_ids TEXT COMMENT '适用范围ID，逗号分隔',
  status TINYINT DEFAULT 1 COMMENT '1启用 0停用',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户优惠券表
CREATE TABLE IF NOT EXISTS user_coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  coupon_id INT NOT NULL,
  status TINYINT DEFAULT 1 COMMENT '1可用 2已使用 3已过期',
  order_id INT DEFAULT NULL COMMENT '关联订单ID',
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME DEFAULT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 积分日志表
CREATE TABLE IF NOT EXISTS points_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  points INT NOT NULL COMMENT '积分变化，正数获得 负数消耗',
  type VARCHAR(50) NOT NULL COMMENT '类型：signup/reorder/refund/seckill等',
  description VARCHAR(255) DEFAULT '',
  related_id INT DEFAULT NULL COMMENT '关联ID（订单/活动等）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户表增加积分字段
ALTER TABLE users ADD COLUMN points INT DEFAULT 0 COMMENT '用户积分' AFTER status;

-- 秒杀活动表
CREATE TABLE IF NOT EXISTS flash_sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  sku_id INT DEFAULT NULL COMMENT '指定SKU，NULL表示全SKU参与',
  flash_price DECIMAL(10,2) NOT NULL COMMENT '秒杀价',
  stock INT NOT NULL COMMENT '秒杀库存',
  total_sold INT DEFAULT 0 COMMENT '已售数量',
  start_time DATETIME NOT NULL COMMENT '开始时间',
  end_time DATETIME NOT NULL COMMENT '结束时间',
  status TINYINT DEFAULT 1 COMMENT '1进行中 2未开始 3已结束 4已下架',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_time (start_time, end_time),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 消息通知表
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type VARCHAR(50) NOT NULL COMMENT 'order/payment/shipping/promotion/system',
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_read TINYINT DEFAULT 0 COMMENT '0未读 1已读',
  related_id INT DEFAULT NULL COMMENT '关联业务ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 聊天消息表
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_user_id INT NOT NULL COMMENT '发送方',
  to_user_id INT NOT NULL COMMENT '接收方（商家/客服）',
  order_id INT DEFAULT NULL COMMENT '关联订单',
  message_type VARCHAR(20) DEFAULT 'text' COMMENT 'text/image/file',
  content TEXT NOT NULL,
  is_read TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_chat (from_user_id, to_user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商家表
CREATE TABLE IF NOT EXISTS merchants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL COMMENT '店铺名称',
  contact_name VARCHAR(50) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  business_license VARCHAR(50) COMMENT '营业执照号',
  logo VARCHAR(255) DEFAULT '',
  description TEXT,
  address VARCHAR(255) DEFAULT '',
  status TINYINT DEFAULT 0 COMMENT '0待审核 1营业中 1封店',
  rating DECIMAL(3,2) DEFAULT 5.00 COMMENT '店铺评分',
  total_sales INT DEFAULT 0 COMMENT '总销量',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 商品表增加商家ID
ALTER TABLE products ADD COLUMN merchant_id INT DEFAULT NULL AFTER category_id;

-- 用户行为日志表（用于数据分析）
CREATE TABLE IF NOT EXISTS user_behavior_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT DEFAULT NULL,
  action VARCHAR(50) NOT NULL COMMENT 'view/click/add_cart/favorite/share',
  target_type VARCHAR(50) NOT NULL COMMENT 'product/order/category',
  target_id INT NOT NULL,
  duration INT DEFAULT 0 COMMENT '停留时长(秒)',
  extra_data JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_action (user_id, action),
  INDEX idx_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 搜索历史表
CREATE TABLE IF NOT EXISTS search_histories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  keyword VARCHAR(100) NOT NULL,
  source VARCHAR(20) DEFAULT 'app' COMMENT 'app/web',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_keyword (user_id, keyword),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 热门搜索词表
CREATE TABLE IF NOT EXISTS hot_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  keyword VARCHAR(100) NOT NULL,
  search_count INT DEFAULT 0,
  is_hot TINYINT DEFAULT 0 COMMENT '0否 1是',
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_hot (is_hot, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

