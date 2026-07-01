const { spawn } = require('node:child_process');

const DEFAULT_ENV_PATH = '../../.env.production.local';

function buildLaunchChecklistSteps(envPath = DEFAULT_ENV_PATH) {
  return [
    { name: 'backend-node-tests', command: 'npm', args: ['run', 'test:node'] },
    { name: 'minimum-launch-preflight', command: 'node', args: ['scripts/launch-preflight.js', envPath] },
    { name: 'provider-readiness', command: 'node', args: ['scripts/provider-readiness.js', envPath] },
  ];
}

function runProcess(step) {
  return new Promise((resolve) => {
    const child = spawn(step.command, step.args, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('error', () => resolve(1));
    child.on('close', (code) => resolve(code || 0));
  });
}

async function runLaunchChecklist({ envPath = DEFAULT_ENV_PATH, runner = runProcess, log = console.log } = {}) {
  const steps = buildLaunchChecklistSteps(envPath);
  const results = [];

  for (const step of steps) {
    log(`[launch-checklist] running ${step.name}`);
    const exitCode = await runner(step);
    const status = exitCode === 0 ? 'passed' : 'failed';
    results.push({ name: step.name, status, exitCode });
    log(`[launch-checklist] ${step.name} ${status}`);
    if (exitCode !== 0) return { exitCode, results };
  }

  return { exitCode: 0, results };
}

async function runCli(argv = process.argv) {
  const envPath = argv[2] || DEFAULT_ENV_PATH;
  const result = await runLaunchChecklist({ envPath });
  return result.exitCode;
}

if (require.main === module) {
  runCli(process.argv).then((exitCode) => process.exit(exitCode));
}

module.exports = {
  buildLaunchChecklistSteps,
  runLaunchChecklist,
  runCli,
};
