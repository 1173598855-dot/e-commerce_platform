const { spawnSync } = require('node:child_process');
const path = require('node:path');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-64-characters-for-node-test-runner';

const tests = [
  'auth-service/auth-routes.test.js',
  'auth-service/controllers/auth.controller.test.js',
  'auth-service/auth-utils.test.js',
  'auth-service/sms-provider.test.js',
  'auth-service/services/auth-role-query.test.js',
  'auth-service/services/auth.service.test.js',
  'gateway/rate-limit.test.js',
  'gateway/route-utils.test.js',
  'order-service/order-utils.test.js',
  'order-service/controllers/order.controller.test.js',
  'order-service/order-routes.test.js',
  'order-service/order-timeout-processor.test.js',
  'order-service/order-timeout-worker.test.js',
  'order-service/retention-cleanup-worker.test.js',
  'order-service/refund-callback-processor.test.js',
  'order-service/refund-callback.test.js',
  'order-service/payment-callback-processor.test.js',
  'order-service/payment-callback.test.js',
  'order-service/payment-provider.test.js',
  'order-service/refund-processor.test.js',
  'order-service/refund-evidence-upload.test.js',
  'order-service/refund-evidence-scan-callback.test.js',
  'order-service/refund-provider.test.js',
  'order-service/refund-state-machine.test.js',
  'order-service/services/order.service.test.js',
  'product-service/services/product.service.test.js',
  'shared/index.test.js',
  'shared/asset-url.test.js',
  'shared/logger.test.js',
  'shared/redis-config.test.js',
  'tests/mq-search-boundary.test.js',
  'tests/nginx-config.test.js',
  'tests/minimum-launch-config.test.js',
  'tests/launch-preflight.test.js',
  'tests/launch-checklist.test.js',
  'tests/provider-readiness.test.js',
  'tests/order-timeout-migration.test.js',
  'tests/payment-migration.test.js',
  'tests/payment-schema.test.js',
  'tests/permission-seed.test.js',
  'tests/permission-version-migration.test.js',
  'tests/refund-migration.test.js',
  'tests/shared-boundary.test.js',
  'tests/user-role-migration.test.js',
  'user-service/services/user.service.test.js',
].map((file) => path.join(__dirname, '..', file));

const result = spawnSync(process.execPath, ['--test', ...tests], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
