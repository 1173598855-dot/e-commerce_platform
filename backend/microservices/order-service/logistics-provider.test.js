const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildLogisticsProviderConfig,
  validateLogisticsProviderConfig,
  syncTracking,
  normalizeTrackingEvent,
} = require('./logistics-provider');

test('mock logistics provider returns a local sync result without credentials', async () => {
  const result = await syncTracking({ orderId: 88, trackingCompany: 'SF', trackingNumber: 'SF123456' });

  assert.deepEqual(result, {
    provider: 'mock',
    orderId: 88,
    trackingCompany: 'SF',
    trackingNumber: 'SF123456',
    status: 'shipped',
    events: [],
  });
});

test('real logistics provider mode validates required configuration', () => {
  const config = buildLogisticsProviderConfig({
    LOGISTICS_PROVIDER: 'kuaidi100',
    LOGISTICS_CALLBACK_BASE_URL: '',
    KUAIDI100_KEY: '',
    KUAIDI100_CUSTOMER: '',
  });

  assert.deepEqual(validateLogisticsProviderConfig(config), [
    'LOGISTICS_CALLBACK_BASE_URL',
    'KUAIDI100_KEY',
    'KUAIDI100_CUSTOMER',
  ]);
});

test('configured logistics provider fails clearly until SDK integration exists', async () => {
  await assert.rejects(
    () => syncTracking(
      { orderId: 99, trackingCompany: 'SF', trackingNumber: 'SF999' },
      {
        provider: 'kuaidi100',
        callbackBaseUrl: 'https://ops.example.com/logistics/callback',
        kuaidi100: { key: 'key', customer: 'customer' },
      }
    ),
    /Logistics provider kuaidi100 SDK integration is not implemented yet/
  );
});

test('normalizeTrackingEvent maps provider payloads into local trace fields', () => {
  assert.deepEqual(normalizeTrackingEvent({
    status: 'delivered',
    content: 'Signed by customer',
    location: 'Shanghai',
    happenedAt: '2026-07-01T10:00:00Z',
  }), {
    status: 'delivered',
    content: 'Signed by customer',
    location: 'Shanghai',
    happenedAt: '2026-07-01T10:00:00Z',
  });
});
