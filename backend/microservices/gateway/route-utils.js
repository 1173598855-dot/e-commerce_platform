function splitPathAndQuery(originalUrl) {
  const queryIndex = originalUrl.indexOf('?');
  if (queryIndex === -1) {
    return { pathname: originalUrl, query: '' };
  }
  return {
    pathname: originalUrl.slice(0, queryIndex),
    query: originalUrl.slice(queryIndex),
  };
}

function normalizePath(path) {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : '/' + path;
}

function getV1Prefix(publicPrefix) {
  return '/api/v1' + publicPrefix.replace(/^\/api/, '');
}

function getForwardPath(originalUrl, publicPrefix, targetBase) {
  const { pathname, query } = splitPathAndQuery(originalUrl);
  const legacyPrefix = normalizePath(publicPrefix);
  const v1Prefix = getV1Prefix(legacyPrefix);
  const base = normalizePath(targetBase);
  let rest = pathname;

  if (pathname === legacyPrefix || pathname.startsWith(legacyPrefix + '/')) {
    rest = pathname.slice(legacyPrefix.length);
  } else if (pathname === v1Prefix || pathname.startsWith(v1Prefix + '/')) {
    rest = pathname.slice(v1Prefix.length);
  }

  if (!rest) rest = '/';
  if (!rest.startsWith('/')) rest = '/' + rest;

  const combined = base + (rest === '/' ? '' : rest);
  return (combined || '/') + query;
}

module.exports = { getForwardPath };
