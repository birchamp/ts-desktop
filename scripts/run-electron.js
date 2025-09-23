#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

function resolveElectron() {
  try {
    return require('electron');
  } catch (e) {
    console.error('Electron is not installed. Run `npm install` first.');
    process.exit(1);
  }
}

const electronBin = resolveElectron();
const args = process.argv.slice(2);
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBin, args, {
  stdio: 'inherit',
  env,
  cwd: process.cwd(),
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code);
  }
});

