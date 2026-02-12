const { contextBridge, ipcRenderer } = require('electron');
const canUseContextBridge = Boolean(
  process.contextIsolated &&
  contextBridge &&
  typeof contextBridge.exposeInMainWorld === 'function'
);

function exposeInRenderer(name, value) {
  if (canUseContextBridge) {
    contextBridge.exposeInMainWorld(name, value);
    return;
  }
  globalThis[name] = value;
}

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
    writeFile: (relPath, data) => ipcRenderer.invoke('fs:writeFile', { relPath, data }),
    readAbsoluteText: (absPath) => ipcRenderer.invoke('fs:readAbsoluteText', absPath),
    listAbsoluteEntries: (absPath) => ipcRenderer.invoke('fs:listAbsoluteEntries', absPath),
    copyAbsoluteToUserData: (relPath, absPath) => ipcRenderer.invoke('fs:copyAbsoluteToUserData', { relPath, absPath }),
    writeAbsoluteFile: (absPath, data) => ipcRenderer.invoke('fs:writeAbsoluteFile', { absPath, data }),
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
