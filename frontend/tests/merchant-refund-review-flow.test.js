const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('merchant refund review frontend exposes api methods, navigation route, and merchant entry', () => {
  const orderApi = readSource('src/api/order.js');
  const navigator = readSource('src/navigation/AppNavigator.js');
  const merchantScreen = readSource('src/screens/MerchantScreen.js');

  assert.match(orderApi, /listRefunds:\s*\(params\)\s*=>\s*api\.get\('\/orders\/refunds',\s*\{ params \}\)/);
  assert.match(orderApi, /getRefundDetail:\s*\(refundId\)\s*=>\s*api\.get\(`\/orders\/refunds\/\$\{refundId\}`\)/);
  assert.match(orderApi, /reviewRefund:\s*\(refundId, data\)\s*=>\s*api\.put\(`\/orders\/refunds\/\$\{refundId\}\/review`, data\)/);
  assert.match(orderApi, /updateRefundEvidenceScan:\s*\(evidenceId, data\)\s*=>\s*api\.put\(`\/orders\/refunds\/evidence\/\$\{evidenceId\}\/scan`, data\)/);

  assert.match(navigator, /import MerchantRefundReviewScreen from "\.\.\/screens\/MerchantRefundReviewScreen"/);
  assert.match(navigator, /<Stack\.Screen name="MerchantRefundReview" component=\{MerchantRefundReviewScreen\}/);

  assert.match(merchantScreen, /navigation\.navigate\("MerchantRefundReview"\)/);
  assert.match(merchantScreen, /售后审核/);
});
