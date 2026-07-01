const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '..', '..', '..', 'database', 'migrate_operations.sql');

test('operations migration creates operation logs and export jobs tables', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS operation_logs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS export_jobs/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS retention_cleanup_runs/);
  assert.match(migration, /operator_id INT DEFAULT NULL/);
  assert.match(migration, /action VARCHAR\(60\) NOT NULL/);
  assert.match(migration, /metadata JSON DEFAULT NULL/);
  assert.match(migration, /export_type VARCHAR\(40\) NOT NULL/);
  assert.match(migration, /status VARCHAR\(20\) DEFAULT 'placeholder'/);
  assert.match(migration, /filters JSON DEFAULT NULL/);
  assert.match(migration, /file_url VARCHAR\(500\) DEFAULT ''/);
  assert.match(migration, /INDEX idx_operation_logs_action \(action, created_at\)/);
  assert.match(migration, /INDEX idx_export_jobs_type_status \(export_type, status, created_at\)/);
  assert.match(migration, /INDEX idx_retention_cleanup_runs_created \(created_at\)/);
});
