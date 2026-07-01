function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildRetentionCleanupWorkerConfig(env = process.env) {
  return {
    enabled: String(env.RETENTION_CLEANUP_WORKER_ENABLED || 'false').toLowerCase() === 'true',
    dryRun: String(env.RETENTION_CLEANUP_DRY_RUN || 'true').toLowerCase() !== 'false',
    batchSize: parsePositiveInt(env.RETENTION_CLEANUP_BATCH_SIZE, 50),
    intervalMs: parsePositiveInt(env.RETENTION_CLEANUP_WORKER_INTERVAL_MS, 3600000),
  };
}

function createRetentionCleanupWorker({
  service,
  logger,
  config = buildRetentionCleanupWorkerConfig(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  let running = false;
  let intervalHandle = null;

  async function runOnce() {
    if (!config.enabled) {
      logger?.info?.('retention_cleanup_worker_disabled');
      return { skipped: true, disabled: true };
    }

    if (running) {
      logger?.warn?.('retention_cleanup_worker_skipped_overlap');
      return { skipped: true };
    }

    running = true;
    try {
      const result = await service.runRefundEvidenceRetentionCleanupDryRun({
        dryRun: config.dryRun,
        limit: config.batchSize,
      });
      logger?.info?.('retention_cleanup_worker_completed', result);
      return result;
    } catch (error) {
      logger?.error?.('retention_cleanup_worker_failed', { error: error.message });
      throw error;
    } finally {
      running = false;
    }
  }

  function start() {
    if (!config.enabled || intervalHandle) return intervalHandle;
    intervalHandle = setIntervalFn(() => { runOnce().catch(() => {}); }, config.intervalMs);
    logger?.info?.('retention_cleanup_worker_started', config);
    return intervalHandle;
  }

  function stop() {
    if (!intervalHandle) return;
    clearIntervalFn(intervalHandle);
    intervalHandle = null;
    logger?.info?.('retention_cleanup_worker_stopped');
  }

  return { runOnce, start, stop };
}

module.exports = { buildRetentionCleanupWorkerConfig, createRetentionCleanupWorker };
