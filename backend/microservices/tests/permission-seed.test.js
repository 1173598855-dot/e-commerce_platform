const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const seed = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'database', 'seed.sql'), 'utf8');

test('seed grants default role permissions for admin and merchant operations', () => {
  assert.match(seed, /INSERT INTO role_permissions \(role, permission, status\) VALUES/);
  assert.match(seed, /'admin', '\*', 1/);
  assert.match(seed, /'merchant', 'refund:list', 1/);
  assert.match(seed, /'merchant', 'refund:review', 1/);
  assert.match(seed, /'merchant', 'order:ship', 1/);
});
