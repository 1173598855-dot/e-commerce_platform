const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, 'auth.service.js'), 'utf8');

test('auth login and refresh queries include user role and merchant binding scope for token permissions', () => {
  assert.match(source, /function buildUserSelectQuery/);
  assert.match(source, /u\.role/);
  assert.match(source, /merchant_id/);
  assert.match(source, /LEFT JOIN merchant_users mu/);
  assert.match(source, /permissions/);
  assert.match(source, /role_permissions/);
  assert.match(source, /user_permissions/);
  assert.match(source, /permission_versions/);
  assert.match(source, /permission_version/);
  assert.match(source, /GROUP_CONCAT\(DISTINCT CASE WHEN rp\.status = 1 THEN rp\.permission END\)/);
  assert.match(source, /GROUP_CONCAT\(DISTINCT CASE WHEN up\.status = 1 AND up\.effect = 'allow' THEN up\.permission END\)/);
  assert.doesNotMatch(source, /m\.contact_phone = u\.phone/);
});
