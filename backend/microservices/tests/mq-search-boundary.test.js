const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const microservicesRoot = path.resolve(__dirname, '..');

function assertServiceBoundary(serviceName, routeFile, controllerFile, serviceFile) {
  const indexSource = fs.readFileSync(path.join(microservicesRoot, serviceName, 'index.js'), 'utf8');
  const routesSource = fs.readFileSync(path.join(microservicesRoot, serviceName, 'routes', routeFile), 'utf8');
  const controllerSource = fs.readFileSync(path.join(microservicesRoot, serviceName, 'controllers', controllerFile), 'utf8');
  const serviceSource = fs.readFileSync(path.join(microservicesRoot, serviceName, 'services', serviceFile), 'utf8');

  assert.ok(indexSource.includes(`require('./routes/${routeFile.replace(/\.js$/, '')}`), `${serviceName} index should mount routes`);
  assert.ok(routesSource.includes(`require('../controllers/${controllerFile.replace(/\.js$/, '')}`), `${serviceName} routes should depend on controller`);
  assert.match(controllerSource, /require\(["']\.\.\/\.\.\/shared["']\)/, `${serviceName} controller should use shared helpers`);
  assert.ok(serviceSource.length > 0, `${serviceName} service should exist`);
}

test('mq-service routes/controllers/services form the new boundary', () => {
  assertServiceBoundary('mq-service', 'mq.routes.js', 'mq.controller.js', 'mq.service.js');
});

test('search-service routes/controllers/services form the new boundary', () => {
  assertServiceBoundary('search-service', 'search.routes.js', 'search.controller.js', 'search.service.js');
});
