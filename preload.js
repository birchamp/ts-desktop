const { contextBridge, ipcRenderer } = require('electron');

// Resolve Node builtins lazily. Electron's preload scripts should always expose
// CommonJS `require`, but guard just in case. If `require` is unavailable we
// abandon the bridge rather than crashing the renderer.
const nativeRequire = typeof require === 'function' ? require : null;
const builtinSpecifiers = {
  fs: ['node:fs', 'fs'],
  path: ['node:path', 'path'],
  crypto: ['node:crypto', 'crypto'],
  electron: ['electron'],
};

const passthroughSpecifiers = new Set(['react', 'react-dom']);

const moduleCache = {};
function loadBuiltin(name) {
  if (!nativeRequire) {
    throw new Error('Native require is not available in preload context');
  }

  if (moduleCache[name]) {
    return moduleCache[name];
  }
  const specifiers = builtinSpecifiers[name] || [];
  for (const spec of specifiers) {
    try {
      moduleCache[name] = nativeRequire(spec);
      return moduleCache[name];
    } catch (_) {}
  }
  throw new Error(`Module "${name}" has not been exposed to the renderer`);
}

function bridgeRequire(moduleName) {
  if (moduleName in builtinSpecifiers) {
    return loadBuiltin(moduleName);
  }
  if (passthroughSpecifiers.has(moduleName)) {
    if (!nativeRequire) {
      throw new Error('Native require is not available in preload context');
    }
    return nativeRequire(moduleName);
  }
  throw new Error(`Module "${moduleName}" has not been exposed to the renderer`);
}

contextBridge.exposeInMainWorld('require', bridgeRequire);

contextBridge.exposeInMainWorld('electronAPI', {
  // generic
  send: (channel, payload) => {
    try { ipcRenderer.send(channel, payload); } catch (_) {}
  },
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  on: (channel, listener) => {
    try { ipcRenderer.on(channel, listener); } catch (_) {}
  },
  // window controls
  minimizeWindow: () => ipcRenderer.send('main-window', 'minimize'),
  maximizeWindow: () => ipcRenderer.send('main-window', 'maximize'),
  closeWindow: () => ipcRenderer.send('main-window', 'close'),
});
