const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('shipping management frontend exposes api methods navigation route and merchant entry', () => {
  const orderApi = readSource('src/api/order.js');
  const navigator = readSource('src/navigation/AppNavigator.js');
  const merchantScreen = readSource('src/screens/MerchantScreen.js');
  const shippingScreen = readSource('src/screens/ShippingManagementScreen.js');

  assert.match(orderApi, /listFulfillmentOrders:\s*\(params\)\s*=>\s*api\.get\('\/orders\/fulfillment\/orders',\s*\{ params \}\)/);
  assert.match(orderApi, /shipOrder:\s*\(orderId, data\)\s*=>\s*api\.put\(`\/orders\/\$\{orderId\}\/ship`, data\)/);
  assert.match(orderApi, /getLogistics:\s*\(orderId\)\s*=>\s*api\.get\(`\/orders\/logistics\/\$\{orderId\}`\)/);

  assert.match(navigator, /import ShippingManagementScreen from "\.\.\/screens\/ShippingManagementScreen"/);
  assert.match(navigator, /<Stack\.Screen name="ShippingManagement" component=\{ShippingManagementScreen\}/);
  assert.match(merchantScreen, /navigation\.navigate\("ShippingManagement"\)/);

  assert.match(shippingScreen, /orderApi\.listFulfillmentOrders\(listParams\)/);
  assert.match(shippingScreen, /orderApi\.shipOrder\(selectedOrder\.id/);
  assert.match(shippingScreen, /orderApi\.getLogistics\(order\.id\)/);
  assert.match(shippingScreen, /trackingCompany/);
  assert.match(shippingScreen, /trackingNumber/);
});
