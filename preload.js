const { contextBridge, ipcRenderer } = require('electron');
const canUseContextBridge = Boolean(
  process.contextIsolated &&
  contextBridge &&
  typeof contextBridge.exposeInMainWorld === 'function'
);

// Resolve Node builtins lazily for legacy consumers. This block can be removed
// once the renderer is fully migrated away from CommonJS access.
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

function exposeInRenderer(name, value) {
  if (canUseContextBridge) {
    contextBridge.exposeInMainWorld(name, value);
    return;
  }
  globalThis[name] = value;
}

exposeInRenderer('require', bridgeRequire);

function toUint8Array(value) {
  if (!value) return null;
  if (value instanceof Uint8Array) {
    return new Uint8Array(value);
  }
  if (typeof value === 'object' && Array.isArray(value.data)) {
    return new Uint8Array(value.data);
  }
  return new Uint8Array(value);
}

function safeSend(channel, payload) {
  try {
    ipcRenderer.send(channel, payload);
    return true;
  } catch (_) {
    return false;
  }
}

function safeOn(channel, listener) {
  try {
    ipcRenderer.on(channel, listener);
    return true;
  } catch (_) {
    return false;
  }
}

function invokeWindow(channel, legacyCommand) {
  return ipcRenderer.invoke(channel).catch(() => {
    safeSend('main-window', legacyCommand);
    return false;
  });
}

const windowControls = {
  minimize: () => {
    invokeWindow('window:minimize', 'minimize');
  },
  maximize: () => {
    invokeWindow('window:maximize', 'maximize');
  },
  close: () => {
    invokeWindow('window:close', 'close');
  },
};

const eventControls = {
  send: safeSend,
  on: safeOn,
};

const electronAPI = {
  dialog: {
    open: (options) => ipcRenderer.invoke('dialog:open', options || {}),
    save: (options) => ipcRenderer.invoke('dialog:save', options || {}),
  },
  fs: {
    ensureDir: (relPath) => ipcRenderer.invoke('fs:ensureDir', relPath),
    readJson: (relPath) => ipcRenderer.invoke('fs:readJson', relPath),
    writeJson: (relPath, data) => ipcRenderer.invoke('fs:writeJson', { relPath, data }),
    readFile: async (relPath) => {
      const result = await ipcRenderer.invoke('fs:readFile', relPath);
      return toUint8Array(result);
    },
    writeFile: (relPath, data) => {
      const payload = data instanceof Uint8Array ? Buffer.from(data) : data;
      return ipcRenderer.invoke('fs:writeFile', { relPath, data: payload });
    },
    readAbsoluteText: (absPath) => ipcRenderer.invoke('fs:readAbsoluteText', absPath),
    copyAbsoluteToUserData: (relPath, absPath) => ipcRenderer.invoke('fs:copyAbsoluteToUserData', { relPath, absPath }),
    writeAbsoluteFile: (absPath, data) => {
      const payload = data instanceof Uint8Array ? Buffer.from(data) : data;
      return ipcRenderer.invoke('fs:writeAbsoluteFile', { absPath, data: payload });
    },
  },
  app: {
    getUserDataPath: () => ipcRenderer.invoke('app:getUserDataPath'),
  },
  net: {
    request: (payload) => ipcRenderer.invoke('net:request', payload || {}),
  },
  window: windowControls,
  events: eventControls,
  // Legacy compatibility shims
  send: safeSend,
  on: safeOn,
  invoke: (channel, payload) => ipcRenderer.invoke(channel, payload),
  minimizeWindow: () => windowControls.minimize(),
  maximizeWindow: () => windowControls.maximize(),
  closeWindow: () => windowControls.close(),
};

exposeInRenderer('electronAPI', electronAPI);
