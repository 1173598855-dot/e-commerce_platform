USE ecommerce;

CREATE TABLE IF NOT EXISTS operation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operator_id INT DEFAULT NULL,
  operator_role VARCHAR(20) DEFAULT '',
  merchant_id INT DEFAULT NULL,
  action VARCHAR(60) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id VARCHAR(80) DEFAULT '',
  metadata JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_operation_logs_action (action, created_at),
  INDEX idx_operation_logs_operator (operator_id, created_at),
  INDEX idx_operation_logs_target (target_type, target_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS export_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  export_type VARCHAR(40) NOT NULL,
  status VARCHAR(20) DEFAULT 'placeholder',
  requested_by INT DEFAULT NULL,
  requester_role VARCHAR(20) DEFAULT '',
  merchant_id INT DEFAULT NULL,
  filters JSON DEFAULT NULL,
  file_url VARCHAR(500) DEFAULT '',
  message VARCHAR(255) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_export_jobs_requester (requested_by, created_at),
  INDEX idx_export_jobs_type_status (export_type, status, created_at),
  FOREIGN KEY (requested_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS retention_cleanup_runs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mode VARCHAR(20) DEFAULT 'dry_run',
  status VARCHAR(20) DEFAULT 'completed',
  candidate_count INT DEFAULT 0,
  deleted_count INT DEFAULT 0,
  metadata JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_retention_cleanup_runs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO role_permissions (role, permission, status) VALUES
('merchant', 'export:manage', 1),
('merchant', 'operation:log:list', 1)
ON DUPLICATE KEY UPDATE status = VALUES(status);
