const test = require('node:test');
const assert = require('node:assert/strict');

const { buildLaunchChecklistSteps, runLaunchChecklist } = require('../scripts/launch-checklist');

test('buildLaunchChecklistSteps returns local launch checks in deterministic order', () => {
  const steps = buildLaunchChecklistSteps('../../.env.production.local');

  assert.deepEqual(steps, [
    { name: 'backend-node-tests', command: 'npm', args: ['run', 'test:node'] },
    { name: 'minimum-launch-preflight', command: 'node', args: ['scripts/launch-preflight.js', '../../.env.production.local'] },
    { name: 'provider-readiness', command: 'node', args: ['scripts/provider-readiness.js', '../../.env.production.local'] },
  ]);
});

test('runLaunchChecklist stops at the first failing step', async () => {
  const calls = [];
  const result = await runLaunchChecklist({
    envPath: 'prod.env',
    runner: async (step) => {
      calls.push(step.name);
      return step.name === 'minimum-launch-preflight' ? 1 : 0;
    },
    log: () => {},
  });

  assert.equal(result.exitCode, 1);
  assert.deepEqual(calls, ['backend-node-tests', 'minimum-launch-preflight']);
  assert.deepEqual(result.results.map((item) => item.status), ['passed', 'failed']);
});

test('runLaunchChecklist reports all steps when they pass', async () => {
  const calls = [];
  const result = await runLaunchChecklist({
    envPath: 'prod.env',
    runner: async (step) => {
      calls.push(`${step.command} ${step.args.join(' ')}`);
      return 0;
    },
    log: () => {},
  });

  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.results.map((item) => item.status), ['passed', 'passed', 'passed']);
  assert.equal(calls.length, 3);
});
