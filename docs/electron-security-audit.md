# Electron Security Audit — September 2025

## Summary
The renderer currently runs with `nodeIntegration: true` and `contextIsolation: false`. This setting was re-enabled temporarily to get the new React dashboard working, but it reintroduces classic Electron security risks. We audited the code paths to map out everything that still depends on direct Node primitives so that we can safely restore the default hardened configuration (`nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`).

## Direct Renderer Dependencies on Node
| Area | Description | Source |
|------|-------------|--------|
| Webpack externals | Bundle still outputs `require("fs")`, `require("path")`, `require("crypto")` stubs because several dependencies (notably `sql.js` and legacy Polymer scripts) import Node modules. | `dist/js/bundle.js:80743-80765` |
| Legacy JS modules | Numerous files under `src/js/**` require Node builtins (`fs`, `path`, `child_process`, etc.). Even if they are not imported yet, they will break once referenced by React unless we isolate them behind IPC. | `rg "require('fs')" src/js` |
| Renderer logging | `src/index.tsx` still checks `window.require('electron')` for debugging (guarded, but indicates pending dependency). | `src/index.tsx:14-19` |

## IPC Surface (Current)
`main.js` exposes the following handlers through `ipcMain.handle`:
- `dialog:open`, `dialog:save`
- `app:getUserDataPath`
- `fs:ensureDir`, `fs:readJson`, `fs:writeJson`, `fs:readFile`, `fs:writeFile`
- `fs:readAbsoluteText`, `fs:copyAbsoluteToUserData`

`preload.js` currently relays:
- `electronAPI.send`, `electronAPI.invoke`, `electronAPI.on`
- Window controls (`minimizeWindow`, `maximizeWindow`, `closeWindow`)
- A permissive `require` shim that proxies to Node builtins (`fs`, `path`, `crypto`, `electron`) and passes through `react`/`react-dom`.

## Hardening Plan
1. **Reduce Webpack externals**
   - Add explicit fallbacks for Node builtins in `webpack.config.js` (`fs`, `path`, `crypto`) that point to thin wrappers calling into `window.electronAPI` instead of Node.
   - Track all imports of Node builtins in TypeScript source and replace them with typed helpers in `src/utils`.
2. **Move Legacy Logic Behind IPC**
   - Incrementally port `src/js/**` modules to TypeScript equivalents under `src/utils` / `src/services` that call IPC methods instead of `require`.
   - Any remaining Node-dependent code should live exclusively in the main process or preload.
3. **Lock Down Preload**
   - Replace the generic `require` bridge with explicit APIs (`files.read`, `files.write`, etc.).
   - Export strongly typed interfaces via `contextBridge.exposeInMainWorld` so renderer consumers can import from `@/ipc` instead of calling `window.electronAPI` manually.
4. **Restore Secure Defaults**
   - Once React bundle no longer references bare `require('fs')`, toggle `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` in `main.js` / `main.ts`.
   - Add regression test that fails if `bundle.js` contains `module.exports = require("fs")`.

## Next Actions (Phase 1 scope)
- [x] Create typed wrapper in `src/utils/ipc.ts` that documents available IPC channels and discourages direct access to `window.electronAPI`.
- [ ] Update React code to consume the wrapper instead of touching `window.electronAPI` (dialog/files now use it; other helpers pending).
- [ ] Start replacing legacy `src/js/**` imports with the new typed services to minimize Node usage before flipping security switches.

Document prepared by Codex assistant on 2025‑09‑17.
