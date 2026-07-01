-- Permission token version migration for existing databases.
-- Adds local scaffolding for detecting stale permission-bearing tokens after role permission changes.

USE ecommerce;

CREATE TABLE IF NOT EXISTS permission_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scope_type VARCHAR(20) NOT NULL,
  scope_key VARCHAR(80) NOT NULL,
  version INT DEFAULT 1,
  invalidated_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_permission_versions_scope (scope_type, scope_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permission_versions (scope_type, scope_key, version) VALUES
('role', 'admin', 1),
('role', 'merchant', 1),
('role', 'customer', 1)
ON DUPLICATE KEY UPDATE version = version;
