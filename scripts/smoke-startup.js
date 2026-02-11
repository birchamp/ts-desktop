#!/usr/bin/env node
const { spawn } = require('child_process');

function resolveElectron() {
  try {
    return require('electron');
  } catch (error) {
    console.error('Smoke test failed: Electron is not installed. Run `npm install` first.');
    process.exit(1);
  }
}

function getTimeoutMs() {
  const parsed = Number(process.env.TS_SMOKE_TIMEOUT_MS || '20000');
  if (Number.isFinite(parsed) && parsed >= 5000) return parsed;
  return 20000;
}

if (process.platform !== 'darwin') {
  console.log('Smoke test skipped: this script currently targets macOS startup validation.');
  process.exit(0);
}

const timeoutMs = getTimeoutMs();
const electronBin = resolveElectron();
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

console.log(`Smoke test: launching app for ${timeoutMs}ms...`);

const child = spawn(electronBin, ['.'], {
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
