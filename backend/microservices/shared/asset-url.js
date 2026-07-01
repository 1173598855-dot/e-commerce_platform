function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(value);
}

function resolveAssetUrl(value) {
  if (!value || typeof value !== 'string') {
    return value;
  }

  if (isAbsoluteUrl(value)) {
    return value;
  }

  const baseUrl = process.env.ASSET_BASE_URL;
  if (!baseUrl) {
    return value;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedPath = value.replace(/^\/+/, '');
  return `${normalizedBase}/${normalizedPath}`;
}

function resolveAssetList(values) {
  if (!Array.isArray(values)) {
    return values;
  }
  return values.map((value) => resolveAssetUrl(value));
}

module.exports = { resolveAssetUrl, resolveAssetList };
