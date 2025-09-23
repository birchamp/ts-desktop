# Webpack Node-Builtin Audit — September 2025

Webpack currently leaves three Node builtins as runtime `require(...)` calls in the renderer bundle:

| Module | Evidence | Consumers |
|--------|----------|-----------|
| `fs`   | `dist/js/bundle.js` contains `module.exports = require("fs")`. | `sql.js` (WASM fallback) and legacy modules under `src/js/**`.
| `path` | `dist/js/bundle.js` contains `module.exports = require("path")`. | Used by USFM import/export helpers and various legacy scripts.
| `crypto` | `dist/js/bundle.js` contains `module.exports = require("crypto")`. | Pulled in by dependencies such as `sql.js`.

Because these modules resolve to real Node builtins at runtime, the renderer currently requires `nodeIntegration` to stay enabled. To safely disable it we need to:

1. **Provide Webpack fallbacks** — e.g., map `fs`, `path`, and `crypto` to renderer-safe shims that forward through our typed IPC helpers.
2. **Port legacy modules** — move `src/js/**` logic that depends on Node into preload/main or convert to IPC-backed services in `src/utils`.
3. **Add bundle checks** — integrate a sanity test (e.g., `rg "module.exports = require" dist/js/bundle.js`) into CI to detect reintroductions.

Once these steps are complete we can flip `nodeIntegration` off and re-enable `contextIsolation` per the security plan.
