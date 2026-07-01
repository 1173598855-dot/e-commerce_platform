-- Payment callback idempotency migration for existing databases.
-- Run after database/schema.sql has created the base orders table.

USE ecommerce;

CREATE TABLE IF NOT EXISTS payment_callback_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idempotency_key VARCHAR(191) NOT NULL,
  provider VARCHAR(20) NOT NULL COMMENT 'mock/wechat/alipay',
  order_id INT DEFAULT NULL,
  order_no VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(100) DEFAULT NULL,
  paid_amount DECIMAL(10,2) DEFAULT NULL,
  status VARCHAR(20) DEFAULT 'processing' COMMENT 'processing/processed/failed',
  duplicate_count INT DEFAULT 0,
  raw_payload JSON DEFAULT NULL,
  processed_at DATETIME DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_payment_callback_idempotency (idempotency_key),
  INDEX idx_payment_callback_order_no (order_no),
  INDEX idx_payment_callback_transaction (transaction_id),
  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
