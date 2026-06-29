const fs = require('fs');
const path = require('path');

const microservicesRoot = path.resolve(__dirname, '..');

describe('user-service boundary', () => {
  it('mounts the extracted router and service layers', () => {
    const indexSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'index.js'), 'utf8');
    const routesSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'routes', 'user.routes.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'controllers', 'user.controller.js'), 'utf8');
    const serviceSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'services', 'user.service.js'), 'utf8');

    expect(indexSource).toMatch(/require\(["']\.\/routes\/user\.routes["']\)/);
    expect(routesSource).toMatch(/require\(["']\.\.\/controllers\/user\.controller["']\)/);
    expect(controllerSource).toMatch(/require\(["']\.\.\/\.\.\/shared["']\)/);
    expect(serviceSource).toMatch(/require\(["']\.\.\/\.\.\/shared["']\)/);
  });

  it('keeps the user-service route groups in one place', () => {
    const routesSource = fs.readFileSync(path.join(microservicesRoot, 'user-service', 'routes', 'user.routes.js'), 'utf8');

    expect(routesSource).toMatch(/\/addresses/);
    expect(routesSource).toMatch(/\/favorites/);
    expect(routesSource).toMatch(/\/coupons/);
    expect(routesSource).toMatch(/\/points/);
    expect(routesSource).toMatch(/\/merchants/);
  });
});
