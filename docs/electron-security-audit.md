# Electron Security Audit — February 2026

## Summary
Main and academy renderer windows now run with secure defaults: `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. The modern TypeScript renderer paths use typed IPC only, with Node filesystem/path work moved behind preload/main IPC channels.

## Direct Renderer Dependencies on Node
| Area | Description | Source |
|------|-------------|--------|
| Webpack externals | Bundle still outputs `require("fs")`, `require("path")`, `require("crypto")` stubs because several dependencies (notably `sql.js` and legacy Polymer scripts) import Node modules. | `dist/js/bundle.js:80743-80765` |
| Legacy JS modules | Numerous files under `src/js/**` require Node builtins (`fs`, `path`, `child_process`, etc.). Even if they are not imported yet, they will break once referenced by React unless we isolate them behind IPC. | `rg "require('fs')" src/js` |
| Remaining legacy surface | Legacy code still exists under `src/js/**` and is the primary remaining Node-heavy area to migrate/retire before stricter bundle-level enforcement. | `src/js/**` |

## IPC Surface (Current)
`main.js` exposes the following handlers through `ipcMain.handle`:
- `dialog:open`, `dialog:save`
- `app:getUserDataPath`
- `fs:ensureDir`, `fs:readJson`, `fs:writeJson`, `fs:readFile`, `fs:writeFile`
- `fs:readAbsoluteText`, `fs:listAbsoluteEntries`, `fs:copyAbsoluteToUserData`, `fs:writeAbsoluteFile`

`preload.js` currently relays:
- `electronAPI.send`, `electronAPI.invoke`, `electronAPI.on`
- Window controls (`minimizeWindow`, `maximizeWindow`, `closeWindow`)
- Typed `electronAPI` bridge only (legacy `window.require` exposure removed).

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
4. **Maintain Secure Defaults**
   - Keep `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` enabled in app windows.
   - Keep regression checks for renderer Node builtin imports and expand toward bundle-level strictness as legacy code is removed.

## Next Actions (Phase 1 scope)
- [x] Create typed wrapper in `src/utils/ipc.ts` that documents available IPC channels and discourages direct access to `window.electronAPI`.
- [x] Update React code to consume typed wrappers instead of touching `window.electronAPI` directly for dialog/files/workflow actions in modern TS screens/components.
- [x] Add a renderer guard (`npm run guard:renderer-node`) to prevent reintroduction of `window.require`, direct Electron imports, and new Node-builtin imports in TS/TSX.
- [x] Remove renderer TS Node-builtin imports in `src/services/dcs/downloader.ts` and `src/utils/import/usfm.ts` by moving file/path operations behind IPC.
- [ ] Start replacing remaining legacy `src/js/**` imports with new typed services to reduce bundle-level Node externals.

Document prepared by Codex assistant on 2026-02-12.
