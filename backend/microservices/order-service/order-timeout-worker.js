function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildOrderTimeoutWorkerConfig(env = process.env) {
  return {
    enabled: String(env.ORDER_TIMEOUT_WORKER_ENABLED || 'true').toLowerCase() !== 'false',
    olderThanMinutes: parsePositiveInt(env.ORDER_PAYMENT_TIMEOUT_MINUTES, 30),
    batchSize: parsePositiveInt(env.ORDER_TIMEOUT_BATCH_SIZE, 50),
    intervalMs: parsePositiveInt(env.ORDER_TIMEOUT_WORKER_INTERVAL_MS, 60000),
  };
}

function createOrderTimeoutWorker({
  service,
  logger,
  config = buildOrderTimeoutWorkerConfig(),
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
}) {
  let running = false;
  let intervalHandle = null;

  async function runOnce() {
    if (!config.enabled) {
      logger?.info?.('order_timeout_worker_disabled');
      return { skipped: true, disabled: true };
    }

    if (running) {
      logger?.warn?.('order_timeout_worker_skipped_overlap');
      return { skipped: true };
    }

    running = true;
    try {
      const result = await service.expirePendingOrders({
        olderThanMinutes: config.olderThanMinutes,
        limit: config.batchSize,
      });
      logger?.info?.('order_timeout_worker_completed', result);
      return result;
    } catch (error) {
      logger?.error?.('order_timeout_worker_failed', { error: error.message });
      throw error;
    } finally {
      running = false;
    }
  }

  function start() {
    if (!config.enabled || intervalHandle) return intervalHandle;
    intervalHandle = setIntervalFn(() => { runOnce().catch(() => {}); }, config.intervalMs);
    logger?.info?.('order_timeout_worker_started', config);
    return intervalHandle;
  }

  function stop() {
    if (!intervalHandle) return;
    clearIntervalFn(intervalHandle);
    intervalHandle = null;
    logger?.info?.('order_timeout_worker_stopped');
  }

  return { runOnce, start, stop };
}

module.exports = { buildOrderTimeoutWorkerConfig, createOrderTimeoutWorker };
