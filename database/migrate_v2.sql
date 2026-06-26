-- ================================================
-- 迁移脚本：users 表字段补齐 + 短信限频 + 微信unionid
-- 兼容 MySQL 8.0（无 IF NOT EXISTS on ADD COLUMN / INDEX）
-- ================================================

USE ecommerce;

-- 1. users 表补齐字段
SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'wechat_unionid');
SET @sql = IF(@exists = 0, 'ALTER TABLE users ADD COLUMN wechat_unionid VARCHAR(100) DEFAULT NULL AFTER wechat_openid', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'register_source');
SET @sql = IF(@exists = 0, 'ALTER TABLE users ADD COLUMN register_source VARCHAR(20) DEFAULT ''app'' COMMENT ''注册来源: app/wechat/qq/h5'' AFTER login_type', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'device_id');
SET @sql = IF(@exists = 0, 'ALTER TABLE users ADD COLUMN device_id VARCHAR(200) DEFAULT NULL COMMENT ''设备标识'' AFTER register_source', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_login_ip');
SET @sql = IF(@exists = 0, 'ALTER TABLE users ADD COLUMN last_login_ip VARCHAR(50) DEFAULT NULL COMMENT ''上次登录IP'' AFTER last_login_time', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'status_desc');
SET @sql = IF(@exists = 0, 'ALTER TABLE users ADD COLUMN status_desc VARCHAR(20) DEFAULT ''active'' COMMENT ''状态分层: active/frozen/deactivating'' AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. 添加索引（逐个判断）
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_wechat_unionid');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_wechat_unionid ON users(wechat_unionid)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_status_desc');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_status_desc ON users(status_desc)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_register_source');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_register_source ON users(register_source)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. 短信发送记录表
CREATE TABLE IF NOT EXISTS sms_send_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  ip VARCHAR(50) DEFAULT NULL COMMENT '发送者IP',
  provider VARCHAR(20) DEFAULT 'aliyun' COMMENT '短信通道: aliyun/tencent',
  status VARCHAR(20) DEFAULT 'sent' COMMENT 'sent/failed',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone_created (phone, created_at),
  INDEX idx_ip_created (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT '迁移完成！新增字段：wechat_unionid, register_source, device_id, last_login_ip, status_desc' AS result;
