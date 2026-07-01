const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '..', '..', '..', 'database', 'migrate_payment_callbacks.sql');

test('payment callback migration creates idempotency table for existing databases', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');

  assert.match(migration, /CREATE TABLE IF NOT EXISTS payment_callback_records/);
  assert.match(migration, /UNIQUE KEY uk_payment_callback_idempotency \(idempotency_key\)/);
  assert.match(migration, /FOREIGN KEY \(order_id\) REFERENCES orders\(id\)/);
});
