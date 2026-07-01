const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '..', '..', '..', 'database', 'migrate_order_timeout.sql');

test('order timeout migration adds index for pending order scans', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  assert.match(migration, /idx_orders_status_created/);
  assert.match(migration, /CREATE INDEX idx_orders_status_created ON orders\(status, created_at\)/);
});
