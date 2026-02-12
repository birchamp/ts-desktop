#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'src');
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const EXTENSIONS = new Set(['.ts', '.tsx']);
const SKIP_DIRS = new Set(['js', 'academy']);
const NODE_BUILTIN_ALLOWLIST = new Set([]);

const RULES = [
  {
    id: 'window.require',
    regex: /\bwindow\s*\.\s*require\b/,
    message: 'Do not use window.require in renderer TS/TSX. Use typed bridge helpers.',
  },
  {
    id: 'electron-require',
    regex: /\brequire\s*\(\s*['"]electron['"]\s*\)/,
    message: "Do not require('electron') in renderer TS/TSX. Use typed bridge helpers.",
  },
  {
    id: 'electron-import',
    regex: /\bfrom\s+['"]electron['"]/,
    message: "Do not import from 'electron' in renderer TS/TSX. Use typed bridge helpers.",
  },
  {
    id: 'node-builtin-import',
    regex: /\b(?:from|require\s*\()\s*['"](fs|path|crypto|child_process|os|net|tls|vm|worker_threads)['"]/,
    message: 'Do not import Node builtins in renderer TS/TSX. Move logic to main/preload and call via IPC.',
  },
];

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(abs, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name);
    if (EXTENSIONS.has(ext)) out.push(abs);
  }
}

function checkFile(filePath) {
  const relPath = path.relative(WORKSPACE_ROOT, filePath).split(path.sep).join('/');
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const issues = [];
  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      if (rule.regex.test(line)) {
        if (rule.id === 'node-builtin-import' && NODE_BUILTIN_ALLOWLIST.has(relPath)) {
          continue;
        }
        issues.push({
          filePath,
          relPath,
          line: idx + 1,
          rule: rule.id,
          message: rule.message,
          source: line.trim(),
        });
      }
    }
  });
  return issues;
}

const files = [];
walk(ROOT, files);

const allIssues = files.flatMap(checkFile);

if (allIssues.length > 0) {
  console.error('Renderer Node builtin guard failed:');
  for (const issue of allIssues) {
    console.error(`- ${issue.relPath}:${issue.line} [${issue.rule}] ${issue.message}`);
    console.error(`  ${issue.source}`);
  }
  process.exit(1);
}

console.log(
  `Renderer Node builtin guard passed (${files.length} files checked, ${NODE_BUILTIN_ALLOWLIST.size} baseline node-builtin exceptions).`
);
