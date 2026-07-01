const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');

function readSource(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

test('operations center frontend exposes export jobs and operation logs foundations', () => {
  const orderApi = readSource('src/api/order.js');
  const navigator = readSource('src/navigation/AppNavigator.js');
  const merchantScreen = readSource('src/screens/MerchantScreen.js');
  const operationsScreen = readSource('src/screens/OperationsCenterScreen.js');

  assert.match(orderApi, /createExportJob:\s*\(data\)\s*=>\s*api\.post\('\/orders\/exports\/jobs', data\)/);
  assert.match(orderApi, /listExportJobs:\s*\(params\)\s*=>\s*api\.get\('\/orders\/exports\/jobs',\s*\{ params \}\)/);
  assert.match(orderApi, /listOperationLogs:\s*\(params\)\s*=>\s*api\.get\('\/orders\/operations\/logs',\s*\{ params \}\)/);

  assert.match(navigator, /import OperationsCenterScreen from "\.\.\/screens\/OperationsCenterScreen"/);
  assert.match(navigator, /<Stack\.Screen name="OperationsCenter" component=\{OperationsCenterScreen\}/);
  assert.match(merchantScreen, /navigation\.navigate\("OperationsCenter"\)/);

  assert.match(operationsScreen, /orderApi\.listExportJobs\(\{ exportType: activeExportType \}\)/);
  assert.match(operationsScreen, /orderApi\.createExportJob\(\{ exportType: activeExportType/);
  assert.match(operationsScreen, /orderApi\.listOperationLogs\(\{ pageSize: 20 \}\)/);
  assert.match(operationsScreen, /EXPORT_TYPES/);
});
