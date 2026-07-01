const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('merchant operations console exposes search export and permission management foundations', () => {
  const orderApi = readSource('src/api/order.js');
  const authApi = readSource('src/api/auth.js');
  const navigator = readSource('src/navigation/AppNavigator.js');
  const merchantScreen = readSource('src/screens/MerchantScreen.js');
  const refundReviewScreen = readSource('src/screens/MerchantRefundReviewScreen.js');
  const permissionScreen = readSource('src/screens/PermissionManagementScreen.js');

  assert.match(orderApi, /exportRefunds:\s*\(params\)\s*=>\s*api\.get\('\/orders\/refunds\/export-placeholder',\s*\{ params \}\)/);
  assert.match(refundReviewScreen, /const \[searchKeyword, setSearchKeyword\] = useState\(''\)/);
  assert.match(refundReviewScreen, /params\.keyword = searchKeyword\.trim\(\)/);
  assert.match(refundReviewScreen, /orderApi\.exportRefunds\(listParams\)/);
  assert.match(refundReviewScreen, /download-outline/);

  assert.match(authApi, /listRolePermissions:\s*\(role\)\s*=>\s*api\.get\('\/auth\/permissions\/roles',\s*\{ params: \{ role \} \}\)/);
  assert.match(authApi, /updateRolePermissions:\s*\(role, permissions\)\s*=>\s*api\.put\(`\/auth\/permissions\/roles\/\$\{role\}`, \{ permissions \}\)/);
  assert.match(authApi, /listPermissionAuditLogs:\s*\(params\)\s*=>\s*api\.get\('\/auth\/permissions\/audits',\s*\{ params \}\)/);
  assert.match(navigator, /import PermissionManagementScreen from "\.\.\/screens\/PermissionManagementScreen"/);
  assert.match(navigator, /<Stack\.Screen name="PermissionManagement" component=\{PermissionManagementScreen\}/);
  assert.match(merchantScreen, /navigation\.navigate\("PermissionManagement"\)/);
  assert.match(permissionScreen, /authApi\.listRolePermissions\(activeRole\)/);
  assert.match(permissionScreen, /authApi\.updateRolePermissions\(activeRole, selectedPermissions\)/);
  assert.match(permissionScreen, /authApi\.listPermissionAuditLogs\(\{ role: activeRole/);
  assert.match(permissionScreen, /const permissionDiff = useMemo/);
  assert.match(permissionScreen, /setConfirming\(true\)/);
  assert.match(permissionScreen, /Confirm Changes/);
  assert.match(permissionScreen, /Recent Audit Logs/);
});
