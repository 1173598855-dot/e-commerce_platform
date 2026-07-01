const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'database', 'migrate_permission_versions.sql'), 'utf8');

test('permission version migration creates local token invalidation table', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS permission_versions/);
  assert.match(migration, /scope_type VARCHAR\(20\) NOT NULL/);
  assert.match(migration, /scope_key VARCHAR\(80\) NOT NULL/);
  assert.match(migration, /version INT DEFAULT 1/);
  assert.match(migration, /UNIQUE KEY uk_permission_versions_scope \(scope_type, scope_key\)/);
  assert.match(migration, /INSERT INTO permission_versions \(scope_type, scope_key, version\) VALUES/);
});
