function buildLogisticsProviderConfig(env = process.env) {
  return {
    provider: (env.LOGISTICS_PROVIDER || 'mock').toLowerCase(),
    callbackBaseUrl: env.LOGISTICS_CALLBACK_BASE_URL || '',
    kuaidi100: {
      key: env.KUAIDI100_KEY || '',
      customer: env.KUAIDI100_CUSTOMER || '',
    },
  };
}

function validateLogisticsProviderConfig(config) {
  if (!config || config.provider === 'mock') return [];

  const missing = [];
  if (!config.callbackBaseUrl) missing.push('LOGISTICS_CALLBACK_BASE_URL');

  if (config.provider === 'kuaidi100') {
    if (!config.kuaidi100?.key) missing.push('KUAIDI100_KEY');
    if (!config.kuaidi100?.customer) missing.push('KUAIDI100_CUSTOMER');
  }

  return missing;
}

function normalizeTrackingEvent(event = {}) {
  return {
    status: String(event.status || '').trim().toLowerCase() || 'transit',
    content: String(event.content || event.description || '').trim(),
    location: String(event.location || '').trim(),
    happenedAt: event.happenedAt || event.happened_at || event.createdAt || null,
  };
}

async function syncTracking(tracking, config = buildLogisticsProviderConfig()) {
  const provider = (config.provider || 'mock').toLowerCase();
  const trackingCompany = tracking?.trackingCompany || tracking?.tracking_company || '';
  const trackingNumber = tracking?.trackingNumber || tracking?.tracking_number || '';

  if (!trackingNumber) {
    throw Object.assign(new Error('trackingNumber required'), { httpStatus: 400 });
  }

  if (provider === 'mock') {
    return {
      provider: 'mock',
      orderId: Number(tracking.orderId || tracking.order_id),
      trackingCompany,
      trackingNumber,
      status: 'shipped',
      events: [],
    };
  }

  if (!['kuaidi100'].includes(provider)) {
    throw Object.assign(new Error(`Unsupported logistics provider: ${provider}`), { httpStatus: 400 });
  }

  const missing = validateLogisticsProviderConfig({ ...config, provider });
  if (missing.length > 0) {
    throw Object.assign(new Error(`Logistics provider ${provider} missing configuration: ${missing.join(', ')}`), { httpStatus: 500 });
  }

  throw Object.assign(new Error(`Logistics provider ${provider} SDK integration is not implemented yet`), { httpStatus: 501 });
}

module.exports = {
  buildLogisticsProviderConfig,
  validateLogisticsProviderConfig,
  normalizeTrackingEvent,
  syncTracking,
};
