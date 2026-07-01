const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const nginxConf = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'nginx', 'nginx.conf'), 'utf8');

test('nginx production config hides version and pins modern TLS', () => {
  assert.match(nginxConf, /server_tokens\s+off;/);
  assert.match(nginxConf, /ssl_protocols\s+TLSv1\.2\s+TLSv1\.3;/);
  assert.match(nginxConf, /ssl_prefer_server_ciphers\s+off;/);
});

test('nginx forwards request context headers on health and api routes', () => {
  const healthBlock = nginxConf.match(/location \/health \{[\s\S]*?\n\s*\}/)?.[0] || '';
  const apiBlock = nginxConf.match(/location \/api\/ \{[\s\S]*?\n\s*\}/)?.[0] || '';

  for (const block of [healthBlock, apiBlock]) {
    assert.match(block, /proxy_set_header\s+Host\s+\$host;/);
    assert.match(block, /proxy_set_header\s+X-Real-IP\s+\$remote_addr;/);
    assert.match(block, /proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for;/);
    assert.match(block, /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme;/);
    assert.match(block, /proxy_set_header\s+X-Request-Id\s+\$request_id;/);
  }
});

test('nginx documents upload migration and cache behavior', () => {
  const uploadsBlock = nginxConf.match(/location \/uploads\/ \{[\s\S]*?\n\s*\}/)?.[0] || '';

  assert.match(uploadsBlock, /Cache-Control/);
  assert.match(uploadsBlock, /CDN_MIGRATED/);
});
