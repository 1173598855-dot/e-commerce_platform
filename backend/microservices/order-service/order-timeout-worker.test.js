const test = require('node:test');
const assert = require('node:assert/strict');

const { buildOrderTimeoutWorkerConfig, createOrderTimeoutWorker } = require('./order-timeout-worker');

test('buildOrderTimeoutWorkerConfig reads safe defaults and env overrides', () => {
  const config = buildOrderTimeoutWorkerConfig({
    ORDER_TIMEOUT_WORKER_ENABLED: 'false',
    ORDER_PAYMENT_TIMEOUT_MINUTES: '45',
    ORDER_TIMEOUT_BATCH_SIZE: '25',
    ORDER_TIMEOUT_WORKER_INTERVAL_MS: '15000',
  });

  assert.deepEqual(config, {
    enabled: false,
    olderThanMinutes: 45,
    batchSize: 25,
    intervalMs: 15000,
  });
});

test('order timeout worker runOnce expires pending orders with configured limits', async () => {
  const calls = [];
  const service = {
    async expirePendingOrders(options) {
      calls.push(options);
      return { expired: 2, orderIds: [1, 2] };
    },
  };
  const logs = [];
  const worker = createOrderTimeoutWorker({
    service,
    logger: { info: (message, data) => logs.push({ message, data }), warn: () => {}, error: () => {} },
    config: { enabled: true, olderThanMinutes: 30, batchSize: 10, intervalMs: 60000 },
  });

  const result = await worker.runOnce();

  assert.deepEqual(result, { expired: 2, orderIds: [1, 2] });
  assert.deepEqual(calls, [{ olderThanMinutes: 30, limit: 10 }]);
  assert.equal(logs.some((entry) => entry.message === 'order_timeout_worker_completed'), true);
});

test('order timeout worker skips overlapping runs', async () => {
  let resolveFirst;
  const service = {
    expirePendingOrders: () => new Promise((resolve) => { resolveFirst = resolve; }),
  };
  const warnings = [];
  const worker = createOrderTimeoutWorker({
    service,
    logger: { info: () => {}, warn: (message) => warnings.push(message), error: () => {} },
    config: { enabled: true, olderThanMinutes: 30, batchSize: 10, intervalMs: 60000 },
  });

  const firstRun = worker.runOnce();
  const secondRun = await worker.runOnce();
  resolveFirst({ expired: 0, orderIds: [] });
  await firstRun;

  assert.deepEqual(secondRun, { skipped: true });
  assert.deepEqual(warnings, ['order_timeout_worker_skipped_overlap']);
});

test('order timeout worker start and stop manage interval lifecycle', () => {
  let scheduledDelay;
  let clearedHandle;
  const worker = createOrderTimeoutWorker({
    service: { expirePendingOrders: async () => ({ expired: 0, orderIds: [] }) },
    logger: { info: () => {}, warn: () => {}, error: () => {} },
    config: { enabled: true, olderThanMinutes: 30, batchSize: 10, intervalMs: 12345 },
    setIntervalFn: (fn, delay) => { scheduledDelay = delay; return { fn, delay }; },
    clearIntervalFn: (handle) => { clearedHandle = handle; },
  });

  const handle = worker.start();
  worker.stop();

  assert.equal(scheduledDelay, 12345);
  assert.equal(clearedHandle, handle);
});
