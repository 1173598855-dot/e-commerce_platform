-- User role migration for existing databases.
-- Adds a lightweight role field used by service-level permission checks.

USE ecommerce;

SET @exists = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role');
SET @sql = IF(@exists = 0, 'ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT ''customer'' COMMENT ''customer/merchant/admin'' AFTER status', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = 'ecommerce' AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_user_role');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_user_role ON users(role)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE users SET role = 'customer' WHERE role IS NULL OR role = '';

CREATE TABLE IF NOT EXISTS merchant_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  merchant_id INT NOT NULL,
  user_id INT NOT NULL,
  role VARCHAR(20) DEFAULT 'owner' COMMENT 'owner/operator/customer_service/finance',
  status TINYINT DEFAULT 1 COMMENT '1 active 0 disabled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_merchant_user (merchant_id, user_id),
  INDEX idx_merchant_users_user (user_id, status),
  INDEX idx_merchant_users_merchant (merchant_id, status),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO merchant_users (merchant_id, user_id, role, status)
SELECT m.id, u.id, 'owner', 1
FROM merchants m
INNER JOIN users u ON m.contact_phone = u.phone
WHERE m.status = 1
ON DUPLICATE KEY UPDATE role = VALUES(role), status = VALUES(status);

CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role VARCHAR(20) NOT NULL,
  permission VARCHAR(80) NOT NULL,
  status TINYINT DEFAULT 1 COMMENT '1 active 0 disabled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_role_permission (role, permission),
  INDEX idx_role_permissions_role (role, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  permission VARCHAR(80) NOT NULL,
  effect VARCHAR(10) DEFAULT 'allow' COMMENT 'allow/deny',
  status TINYINT DEFAULT 1 COMMENT '1 active 0 disabled',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_permission (user_id, permission),
  INDEX idx_user_permissions_user (user_id, status, effect),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO role_permissions (role, permission, status) VALUES
('admin', '*', 1),
('merchant', 'refund:list', 1),
('merchant', 'refund:detail', 1),
('merchant', 'refund:review', 1),
('merchant', 'refund:submit', 1),
('merchant', 'order:ship', 1),
('merchant', 'product:manage', 1),
('customer', 'refund:submit', 1)
ON DUPLICATE KEY UPDATE status = VALUES(status);

CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operator_id INT NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_key VARCHAR(80) NOT NULL,
  action VARCHAR(30) NOT NULL,
  before_permissions JSON DEFAULT NULL,
  after_permissions JSON DEFAULT NULL,
  note VARCHAR(255) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_permission_audit_target (target_type, target_key, created_at),
  INDEX idx_permission_audit_operator (operator_id, created_at),
  FOREIGN KEY (operator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
