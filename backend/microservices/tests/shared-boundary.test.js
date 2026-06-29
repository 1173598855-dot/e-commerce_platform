const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const microservicesRoot = path.resolve(__dirname, '..');
const services = [
  'auth-service',
  'user-service',
  'product-service',
  'order-service',
  'mq-service',
  'search-service',
];

test('auth-service routes/controllers/services form the new boundary', () => {
  const indexSource = fs.readFileSync(path.join(microservicesRoot, 'auth-service', 'index.js'), 'utf8');
  const routesSource = fs.readFileSync(path.join(microservicesRoot, 'auth-service', 'routes', 'auth.routes.js'), 'utf8');
  const controllerSource = fs.readFileSync(path.join(microservicesRoot, 'auth-service', 'controllers', 'auth.controller.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(microservicesRoot, 'auth-service', 'services', 'auth.service.js'), 'utf8');

  assert.match(indexSource, /require\(["']\.\/routes\/auth\.routes["']\)/, 'auth-service index should mount routes');
  assert.match(routesSource, /require\(["']\.\.\/controllers\/auth\.controller["']\)/, 'auth routes should depend on controller');
  assert.match(controllerSource, /require\(["']\.\.\/\.\.\/shared["']\)/, 'auth controller should use shared response helpers');
  assert.match(serviceSource, /require\(["']\.\.\/\.\.\/shared["']\)/, 'auth service should use shared auth helpers');
});

test('user-service routes/controllers/services form the new boundary', () => {
  const indexSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'index.js'), 'utf8');
  const routesSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'routes', 'user.routes.js'), 'utf8');
  const controllerSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'controllers', 'user.controller.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'services', 'user.service.js'), 'utf8');

  assert.match(indexSource, /require\(["']\.\/routes\/user\.routes["']\)/, 'user-service index should mount routes');
  assert.match(routesSource, /require\(["']\.\.\/controllers\/user\.controller["']\)/, 'user routes should depend on controller');
  assert.match(controllerSource, /require\(["']\.\.\/\.\.\/shared["']\)/, 'user controller should use shared response helpers');
  assert.match(serviceSource, /require\(["']\.\.\/\.\.\/shared["']\)/, 'user service should use shared helpers');
});

test('service-local shared implementations are removed outside auth-service bootstrap only', () => {
  for (const service of services) {
    const localShared = path.join(microservicesRoot, service, 'shared', 'index.js');
    assert.equal(fs.existsSync(localShared), false, `${service} still has local shared/index.js`);
  }
});
