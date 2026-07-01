-- Refund request migration for existing databases.
-- Adds the refund application table used before real provider refund SDK integration.

USE ecommerce;

CREATE TABLE IF NOT EXISTS refund_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(191) NOT NULL,
  order_id INT NOT NULL,
  order_no VARCHAR(50) NOT NULL,
  user_id INT NOT NULL,
  refund_type VARCHAR(20) DEFAULT 'full' COMMENT 'full/partial',
  amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(255) DEFAULT '',
  status VARCHAR(20) DEFAULT 'requested' COMMENT 'requested/approved/rejected/refunding/refunded/failed',
  provider VARCHAR(20) DEFAULT NULL,
  provider_refund_id VARCHAR(100) DEFAULT NULL,
  failed_reason VARCHAR(255) DEFAULT '',
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  processed_at DATETIME DEFAULT NULL,
  UNIQUE KEY uk_refund_idempotency (idempotency_key),
  INDEX idx_refund_order (order_id),
  INDEX idx_refund_user_status (user_id, status),
  INDEX idx_refund_provider_refund_id (provider_refund_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refund_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  refund_id INT NOT NULL,
  from_status VARCHAR(20) NOT NULL,
  to_status VARCHAR(20) NOT NULL,
  operator_id INT DEFAULT NULL,
  note VARCHAR(255) DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refund_events_refund (refund_id, created_at),
  INDEX idx_refund_events_operator (operator_id, created_at),
  FOREIGN KEY (refund_id) REFERENCES refund_requests(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE refund_events MODIFY COLUMN operator_id INT DEFAULT NULL;

CREATE TABLE IF NOT EXISTS refund_evidence (
  id INT AUTO_INCREMENT PRIMARY KEY,
  refund_id INT NOT NULL,
  user_id INT NOT NULL,
  evidence_type VARCHAR(20) DEFAULT 'image' COMMENT 'image/video/document',
  url VARCHAR(500) NOT NULL,
  description VARCHAR(255) DEFAULT '',
  object_key VARCHAR(500) DEFAULT '',
  content_type VARCHAR(100) DEFAULT '',
  file_size INT DEFAULT 0,
  checksum VARCHAR(128) DEFAULT '',
  scan_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/passed/failed/quarantined',
  scan_result VARCHAR(255) DEFAULT '',
  scanned_at DATETIME DEFAULT NULL,
  retention_policy VARCHAR(40) DEFAULT 'standard',
  retention_days INT DEFAULT 180,
  retention_expires_at DATETIME DEFAULT NULL,
  cleanup_eligible TINYINT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refund_evidence_refund (refund_id, created_at),
  INDEX idx_refund_evidence_user (user_id, created_at),
  INDEX idx_refund_evidence_retention (cleanup_eligible, retention_expires_at),
  FOREIGN KEY (refund_id) REFERENCES refund_requests(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS object_key VARCHAR(500) DEFAULT '';
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS content_type VARCHAR(100) DEFAULT '';
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS file_size INT DEFAULT 0;
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS checksum VARCHAR(128) DEFAULT '';
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS scan_status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/passed/failed/quarantined';
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS scan_result VARCHAR(255) DEFAULT '';
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS scanned_at DATETIME DEFAULT NULL;
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS retention_policy VARCHAR(40) DEFAULT 'standard';
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS retention_days INT DEFAULT 180;
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS retention_expires_at DATETIME DEFAULT NULL;
ALTER TABLE refund_evidence ADD COLUMN IF NOT EXISTS cleanup_eligible TINYINT DEFAULT 0;

CREATE TABLE IF NOT EXISTS refund_review_audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  refund_id INT NOT NULL,
  operator_id INT NOT NULL,
  operator_role VARCHAR(20) NOT NULL,
  merchant_id INT DEFAULT NULL,
  action VARCHAR(40) NOT NULL,
  decision VARCHAR(20) NOT NULL,
  note VARCHAR(255) DEFAULT '',
  evidence_ids JSON DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refund_review_audit_refund (refund_id, created_at),
  INDEX idx_refund_review_audit_operator (operator_id, created_at),
  FOREIGN KEY (refund_id) REFERENCES refund_requests(id),
  FOREIGN KEY (operator_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refund_evidence_scan_callback_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(191) NOT NULL,
  evidence_id INT NOT NULL,
  scan_status VARCHAR(20) NOT NULL,
  scan_result VARCHAR(255) DEFAULT '',
  duplicate_count INT DEFAULT 0,
  raw_payload JSON DEFAULT NULL,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_refund_evidence_scan_callback (idempotency_key),
  INDEX idx_refund_evidence_scan_callback_evidence (evidence_id, created_at),
  FOREIGN KEY (evidence_id) REFERENCES refund_evidence(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS refund_callback_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(191) NOT NULL,
  provider VARCHAR(20) NOT NULL COMMENT 'mock/wechat/alipay',
  refund_id INT DEFAULT NULL,
  provider_refund_id VARCHAR(100) DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'processing' COMMENT 'processing/processed/failed',
  failed_reason VARCHAR(255) DEFAULT '',
  duplicate_count INT DEFAULT 0,
  raw_payload JSON DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_refund_callback_idempotency (idempotency_key),
  INDEX idx_refund_callback_refund (refund_id),
  INDEX idx_refund_callback_provider_refund (provider_refund_id),
  FOREIGN KEY (refund_id) REFERENCES refund_requests(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
