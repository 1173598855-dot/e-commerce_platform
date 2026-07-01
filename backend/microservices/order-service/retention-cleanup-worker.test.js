const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildRetentionCleanupWorkerConfig,
  createRetentionCleanupWorker,
} = require('./retention-cleanup-worker');

test('retention cleanup worker config defaults to disabled dry-run mode', () => {
  const config = buildRetentionCleanupWorkerConfig({});

  assert.deepEqual(config, {
    enabled: false,
    dryRun: true,
    batchSize: 50,
    intervalMs: 3600000,
  });
});

test('retention cleanup worker runOnce skips when disabled', async () => {
  const calls = [];
  const worker = createRetentionCleanupWorker({
    service: { runRefundEvidenceRetentionCleanupDryRun: async () => { calls.push('run'); } },
    logger: { info: (...args) => calls.push(['info', ...args]) },
    config: { enabled: false, dryRun: true, batchSize: 10, intervalMs: 1000 },
  });

  const result = await worker.runOnce();

  assert.deepEqual(result, { skipped: true, disabled: true });
  assert.equal(calls.some((call) => call === 'run'), false);
});

test('retention cleanup worker runOnce records dry-run cleanup when enabled', async () => {
  const calls = [];
  const worker = createRetentionCleanupWorker({
    service: {
      async runRefundEvidenceRetentionCleanupDryRun(options) {
        calls.push(['run', options]);
        return { runId: 9, dryRun: true, candidateCount: 2 };
      },
    },
    logger: { info: (...args) => calls.push(['info', ...args]) },
    config: { enabled: true, dryRun: true, batchSize: 25, intervalMs: 1000 },
  });

  const result = await worker.runOnce();

  assert.deepEqual(result, { runId: 9, dryRun: true, candidateCount: 2 });
  assert.deepEqual(calls[0], ['run', { dryRun: true, limit: 25 }]);
});

test('retention cleanup worker skips overlapping runs', async () => {
  let release;
  const worker = createRetentionCleanupWorker({
    service: {
      runRefundEvidenceRetentionCleanupDryRun: () => new Promise((resolve) => { release = resolve; }),
    },
    logger: { warn() {} },
    config: { enabled: true, dryRun: true, batchSize: 25, intervalMs: 1000 },
  });

  const first = worker.runOnce();
  const second = await worker.runOnce();
  release({ runId: 10, dryRun: true, candidateCount: 0 });

  assert.deepEqual(second, { skipped: true });
  assert.deepEqual(await first, { runId: 10, dryRun: true, candidateCount: 0 });
});
