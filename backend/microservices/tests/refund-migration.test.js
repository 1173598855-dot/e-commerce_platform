const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '..', '..', '..', 'database', 'migrate_refunds.sql');

test('refund migration creates refund request table for existing databases', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS refund_requests/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS refund_events/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS refund_evidence/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS refund_review_audit_logs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS refund_evidence_scan_callback_records/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS refund_callback_records/);
  assert.match(migration, /object_key VARCHAR\(500\) DEFAULT ''/);
  assert.match(migration, /content_type VARCHAR\(100\) DEFAULT ''/);
  assert.match(migration, /file_size INT DEFAULT 0/);
  assert.match(migration, /checksum VARCHAR\(128\) DEFAULT ''/);
  assert.match(migration, /scan_status VARCHAR\(20\) DEFAULT 'pending'/);
  assert.match(migration, /scan_result VARCHAR\(255\) DEFAULT ''/);
  assert.match(migration, /scanned_at DATETIME DEFAULT NULL/);
  assert.match(migration, /retention_policy VARCHAR\(40\) DEFAULT 'standard'/);
  assert.match(migration, /retention_days INT DEFAULT 180/);
  assert.match(migration, /retention_expires_at DATETIME DEFAULT NULL/);
  assert.match(migration, /cleanup_eligible TINYINT DEFAULT 0/);
  assert.match(migration, /action VARCHAR\(40\) NOT NULL/);
  assert.match(migration, /evidence_ids JSON DEFAULT NULL/);
  assert.match(migration, /UNIQUE KEY uk_refund_evidence_scan_callback \(idempotency_key\)/);
  assert.match(migration, /UNIQUE KEY uk_refund_idempotency \(idempotency_key\)/);
  assert.match(migration, /UNIQUE KEY uk_refund_callback_idempotency \(idempotency_key\)/);
  assert.match(migration, /FOREIGN KEY \(order_id\) REFERENCES orders\(id\)/);
  assert.match(migration, /FOREIGN KEY \(refund_id\) REFERENCES refund_requests\(id\)/);
});
