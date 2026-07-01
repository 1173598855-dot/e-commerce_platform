const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const schema = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'database', 'schema.sql'), 'utf8');

test('schema stores user role for permission checks', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS users \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /role VARCHAR\(20\) DEFAULT 'customer'/);
  assert.match(table, /INDEX idx_user_role \(role\)/);
});

test('schema contains merchant user binding table for scoped merchant permissions', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS merchant_users \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /merchant_id INT NOT NULL/);
  assert.match(table, /user_id INT NOT NULL/);
  assert.match(table, /role VARCHAR\(20\) DEFAULT 'owner'/);
  assert.match(table, /UNIQUE KEY uk_merchant_user \(merchant_id, user_id\)/);
  assert.match(table, /INDEX idx_merchant_users_user \(user_id, status\)/);
  assert.match(table, /FOREIGN KEY \(merchant_id\) REFERENCES merchants\(id\)/);
  assert.match(table, /FOREIGN KEY \(user_id\) REFERENCES users\(id\)/);
});

test('schema contains database-backed permission tables', () => {
  const roleTable = schema.match(/CREATE TABLE IF NOT EXISTS role_permissions \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';
  const userTable = schema.match(/CREATE TABLE IF NOT EXISTS user_permissions \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(roleTable, /role VARCHAR\(20\) NOT NULL/);
  assert.match(roleTable, /permission VARCHAR\(80\) NOT NULL/);
  assert.match(roleTable, /UNIQUE KEY uk_role_permission \(role, permission\)/);
  assert.match(roleTable, /INDEX idx_role_permissions_role \(role, status\)/);
  assert.match(userTable, /user_id INT NOT NULL/);
  assert.match(userTable, /permission VARCHAR\(80\) NOT NULL/);
  assert.match(userTable, /effect VARCHAR\(10\) DEFAULT 'allow'/);
  assert.match(userTable, /UNIQUE KEY uk_user_permission \(user_id, permission\)/);
  assert.match(userTable, /FOREIGN KEY \(user_id\) REFERENCES users\(id\)/);
});

test('schema contains permission audit table for admin changes', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS permission_audit_logs \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /operator_id INT NOT NULL/);
  assert.match(table, /target_type VARCHAR\(20\) NOT NULL/);
  assert.match(table, /target_key VARCHAR\(80\) NOT NULL/);
  assert.match(table, /action VARCHAR\(30\) NOT NULL/);
  assert.match(table, /before_permissions JSON DEFAULT NULL/);
  assert.match(table, /after_permissions JSON DEFAULT NULL/);
  assert.match(table, /INDEX idx_permission_audit_target \(target_type, target_key, created_at\)/);
  assert.match(table, /FOREIGN KEY \(operator_id\) REFERENCES users\(id\)/);
});

test('schema contains permission version table for local token invalidation scaffolding', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS permission_versions \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /scope_type VARCHAR\(20\) NOT NULL/);
  assert.match(table, /scope_key VARCHAR\(80\) NOT NULL/);
  assert.match(table, /version INT DEFAULT 1/);
  assert.match(table, /invalidated_at DATETIME DEFAULT NULL/);
  assert.match(table, /UNIQUE KEY uk_permission_versions_scope \(scope_type, scope_key\)/);
});

test('schema contains payment callback records table for idempotent provider callbacks', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS payment_callback_records \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /idempotency_key VARCHAR\(191\) NOT NULL/);
  assert.match(table, /UNIQUE KEY uk_payment_callback_idempotency \(idempotency_key\)/);
  assert.match(table, /duplicate_count INT DEFAULT 0/);
  assert.match(table, /FOREIGN KEY \(order_id\) REFERENCES orders\(id\)/);
});

test('schema indexes pending order timeout scans by status and creation time', () => {
  const ordersTable = schema.match(/CREATE TABLE IF NOT EXISTS orders \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(ordersTable, /INDEX idx_orders_status_created \(status, created_at\)/);
});

test('schema contains refund request table with idempotency and status indexes', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS refund_requests \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /idempotency_key VARCHAR\(191\) NOT NULL/);
  assert.match(table, /status VARCHAR\(20\) DEFAULT 'requested'/);
  assert.match(table, /UNIQUE KEY uk_refund_idempotency \(idempotency_key\)/);
  assert.match(table, /INDEX idx_refund_order \(order_id\)/);
  assert.match(table, /FOREIGN KEY \(order_id\) REFERENCES orders\(id\)/);
});

test('schema contains refund event table for audit trail', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS refund_events \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /refund_id INT NOT NULL/);
  assert.match(table, /from_status VARCHAR\(20\) NOT NULL/);
  assert.match(table, /to_status VARCHAR\(20\) NOT NULL/);
  assert.match(table, /operator_id INT DEFAULT NULL/);
  assert.match(table, /FOREIGN KEY \(refund_id\) REFERENCES refund_requests\(id\)/);
});

test('schema contains refund evidence table for after-sales attachments', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS refund_evidence \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /refund_id INT NOT NULL/);
  assert.match(table, /user_id INT NOT NULL/);
  assert.match(table, /evidence_type VARCHAR\(20\) DEFAULT 'image'/);
  assert.match(table, /url VARCHAR\(500\) NOT NULL/);
  assert.match(table, /object_key VARCHAR\(500\) DEFAULT ''/);
  assert.match(table, /content_type VARCHAR\(100\) DEFAULT ''/);
  assert.match(table, /file_size INT DEFAULT 0/);
  assert.match(table, /checksum VARCHAR\(128\) DEFAULT ''/);
  assert.match(table, /scan_status VARCHAR\(20\) DEFAULT 'pending'/);
  assert.match(table, /scan_result VARCHAR\(255\) DEFAULT ''/);
  assert.match(table, /scanned_at DATETIME DEFAULT NULL/);
  assert.match(table, /retention_policy VARCHAR\(40\) DEFAULT 'standard'/);
  assert.match(table, /retention_days INT DEFAULT 180/);
  assert.match(table, /retention_expires_at DATETIME DEFAULT NULL/);
  assert.match(table, /cleanup_eligible TINYINT DEFAULT 0/);
  assert.match(table, /INDEX idx_refund_evidence_refund \(refund_id, created_at\)/);
  assert.match(table, /FOREIGN KEY \(refund_id\) REFERENCES refund_requests\(id\)/);
  assert.match(table, /FOREIGN KEY \(user_id\) REFERENCES users\(id\)/);
});

test('schema contains refund callback records table for idempotent provider callbacks', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS refund_callback_records \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /idempotency_key VARCHAR\(191\) NOT NULL/);
  assert.match(table, /provider_refund_id VARCHAR\(100\) DEFAULT NULL/);
  assert.match(table, /duplicate_count INT DEFAULT 0/);
  assert.match(table, /UNIQUE KEY uk_refund_callback_idempotency \(idempotency_key\)/);
  assert.match(table, /FOREIGN KEY \(refund_id\) REFERENCES refund_requests\(id\)/);
});

test('schema contains refund review audit table for manual risk decisions', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS refund_review_audit_logs \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /refund_id INT NOT NULL/);
  assert.match(table, /operator_id INT NOT NULL/);
  assert.match(table, /operator_role VARCHAR\(20\) NOT NULL/);
  assert.match(table, /merchant_id INT DEFAULT NULL/);
  assert.match(table, /action VARCHAR\(40\) NOT NULL/);
  assert.match(table, /decision VARCHAR\(20\) NOT NULL/);
  assert.match(table, /evidence_ids JSON DEFAULT NULL/);
  assert.match(table, /INDEX idx_refund_review_audit_refund \(refund_id, created_at\)/);
  assert.match(table, /FOREIGN KEY \(refund_id\) REFERENCES refund_requests\(id\)/);
  assert.match(table, /FOREIGN KEY \(operator_id\) REFERENCES users\(id\)/);
});

test('schema contains refund evidence scan callback table for idempotency', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS refund_evidence_scan_callback_records \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /idempotency_key VARCHAR\(191\) NOT NULL/);
  assert.match(table, /evidence_id INT NOT NULL/);
  assert.match(table, /scan_status VARCHAR\(20\) NOT NULL/);
  assert.match(table, /duplicate_count INT DEFAULT 0/);
  assert.match(table, /raw_payload JSON DEFAULT NULL/);
  assert.match(table, /UNIQUE KEY uk_refund_evidence_scan_callback \(idempotency_key\)/);
  assert.match(table, /FOREIGN KEY \(evidence_id\) REFERENCES refund_evidence\(id\)/);
});

test('schema contains operation logs table for enterprise audit trail', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS operation_logs \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /operator_id INT DEFAULT NULL/);
  assert.match(table, /operator_role VARCHAR\(20\) DEFAULT ''/);
  assert.match(table, /merchant_id INT DEFAULT NULL/);
  assert.match(table, /action VARCHAR\(60\) NOT NULL/);
  assert.match(table, /target_type VARCHAR\(40\) NOT NULL/);
  assert.match(table, /target_id VARCHAR\(80\) DEFAULT ''/);
  assert.match(table, /metadata JSON DEFAULT NULL/);
  assert.match(table, /INDEX idx_operation_logs_action \(action, created_at\)/);
  assert.match(table, /INDEX idx_operation_logs_operator \(operator_id, created_at\)/);
});

test('schema contains export jobs table for local export placeholders', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS export_jobs \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /export_type VARCHAR\(40\) NOT NULL/);
  assert.match(table, /status VARCHAR\(20\) DEFAULT 'placeholder'/);
  assert.match(table, /requested_by INT DEFAULT NULL/);
  assert.match(table, /merchant_id INT DEFAULT NULL/);
  assert.match(table, /filters JSON DEFAULT NULL/);
  assert.match(table, /file_url VARCHAR\(500\) DEFAULT ''/);
  assert.match(table, /message VARCHAR\(255\) DEFAULT ''/);
  assert.match(table, /INDEX idx_export_jobs_requester \(requested_by, created_at\)/);
  assert.match(table, /INDEX idx_export_jobs_type_status \(export_type, status, created_at\)/);
});

test('schema contains retention cleanup run table for disabled dry-run worker records', () => {
  const table = schema.match(/CREATE TABLE IF NOT EXISTS retention_cleanup_runs \([\s\S]*?\) ENGINE=InnoDB/)?.[0] || '';

  assert.match(table, /mode VARCHAR\(20\) DEFAULT 'dry_run'/);
  assert.match(table, /status VARCHAR\(20\) DEFAULT 'completed'/);
  assert.match(table, /candidate_count INT DEFAULT 0/);
  assert.match(table, /deleted_count INT DEFAULT 0/);
  assert.match(table, /metadata JSON DEFAULT NULL/);
  assert.match(table, /INDEX idx_retention_cleanup_runs_created \(created_at\)/);
});
