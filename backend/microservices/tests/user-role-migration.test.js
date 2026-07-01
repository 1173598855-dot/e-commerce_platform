const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'database', 'migrate_user_roles.sql'), 'utf8');

test('user role migration adds role column and index for existing databases', () => {
  assert.match(migration, /COLUMN_NAME = 'role'/);
  assert.match(migration, /ALTER TABLE users ADD COLUMN role VARCHAR\(20\) DEFAULT ''customer''/);
  assert.match(migration, /INDEX_NAME = 'idx_user_role'/);
  assert.match(migration, /CREATE INDEX idx_user_role ON users\(role\)/);
});

test('user role migration creates merchant user bindings for scoped permissions', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS merchant_users/);
  assert.match(migration, /UNIQUE KEY uk_merchant_user \(merchant_id, user_id\)/);
  assert.match(migration, /INSERT INTO merchant_users/);
  assert.match(migration, /m\.contact_phone = u\.phone/);
});

test('user role migration creates permission configuration tables and seeds defaults', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS role_permissions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS user_permissions/);
  assert.match(migration, /UNIQUE KEY uk_role_permission \(role, permission\)/);
  assert.match(migration, /UNIQUE KEY uk_user_permission \(user_id, permission\)/);
  assert.match(migration, /INSERT INTO role_permissions \(role, permission, status\) VALUES/);
  assert.match(migration, /'merchant', 'refund:list', 1/);
  assert.match(migration, /'merchant', 'order:ship', 1/);
});

test('user role migration creates permission audit log table', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS permission_audit_logs/);
  assert.match(migration, /before_permissions JSON DEFAULT NULL/);
  assert.match(migration, /after_permissions JSON DEFAULT NULL/);
  assert.match(migration, /INDEX idx_permission_audit_target \(target_type, target_key, created_at\)/);
});
