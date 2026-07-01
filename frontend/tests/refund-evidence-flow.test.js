const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('refund evidence frontend flow exposes api methods, navigation route, and order entry', () => {
  const orderApi = readSource('src/api/order.js');
  const navigator = readSource('src/navigation/AppNavigator.js');
  const orderList = readSource('src/screens/OrderListScreen.js');
  const refundEvidenceScreen = readSource('src/screens/RefundEvidenceScreen.js');

  assert.match(orderApi, /requestRefund:\s*\(data\)\s*=>\s*api\.post\('\/orders\/refunds'/);
  assert.match(orderApi, /createRefundEvidenceUploadIntent:\s*\(refundId, data\)\s*=>\s*api\.post\(`\/orders\/refunds\/\$\{refundId\}\/evidence\/upload-intent`/);
  assert.match(orderApi, /addRefundEvidence:\s*\(refundId, data\)\s*=>\s*api\.post\(`\/orders\/refunds\/\$\{refundId\}\/evidence`/);

  assert.match(navigator, /import RefundEvidenceScreen from "\.\.\/screens\/RefundEvidenceScreen"/);
  assert.match(navigator, /<Stack\.Screen name="RefundEvidence" component=\{RefundEvidenceScreen\}/);

  assert.match(orderList, /navigation\.navigate\('RefundEvidence'/);
  assert.doesNotMatch(refundEvidenceScreen, /鍟|绠|璇|鎻|閫|锟|歿|€||/);
  assert.match(refundEvidenceScreen, /商品破损照片/);
  assert.match(refundEvidenceScreen, /退款原因/);
  assert.match(refundEvidenceScreen, /申请售后并上传凭证/);
  assert.match(refundEvidenceScreen, /真实文件选择器接入前/);
  assert.match(orderList, /申请售后|上传凭证/);
});
