#!/usr/bin/env node
const { spawn } = require('child_process');

function getTimeoutMs() {
  const parsed = Number(process.env.TS_SMOKE_TIMEOUT_MS || '20000');
  if (Number.isFinite(parsed) && parsed >= 5000) return parsed;
  return 20000;
}

const timeoutMs = getTimeoutMs();
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const launchArgs = ['scripts/run-electron.js', '.', '-remote-debugging-port=9222'];

if (process.platform === 'linux' && process.env.TS_SMOKE_NO_SANDBOX === '1') {
  launchArgs.push('--no-sandbox');
}

console.log(`Smoke test (${process.platform}): launching app for ${timeoutMs}ms...`);

const child = spawn(process.execPath, launchArgs, {
  cwd: process.cwd(),
  env,
  stdio: 'inherit',
});

let timedOut = false;
let finished = false;

const timeout = setTimeout(() => {
  if (finished) return;
  timedOut = true;
  console.log('Smoke test: app stayed up through timeout window, shutting down...');
  child.kill('SIGTERM');
  setTimeout(() => {
    if (!finished) {
      child.kill('SIGKILL');
    }
  }, 3000);
}, timeoutMs);

child.on('exit', (code, signal) => {
  finished = true;
  clearTimeout(timeout);

  if (timedOut) {
    console.log('Smoke test passed.');
    process.exit(0);
  }

  console.error(
    `Smoke test failed: app exited before timeout (code=${String(code)}, signal=${String(signal)}).`
  );
  process.exit(code === 0 ? 1 : code || 1);
});

child.on('error', error => {
  finished = true;
  clearTimeout(timeout);
  console.error(`Smoke test failed: could not launch app (${error.message}).`);
  process.exit(1);
});
