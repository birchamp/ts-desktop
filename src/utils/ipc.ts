export function getBridge(): ElectronBridge | undefined {
  try {
    return window.electronAPI;
  } catch {
    return undefined;
  }
}

function getIpcRenderer(): any {
  try {
    const w: any = window as any;
    if (w && typeof w.require === 'function') {
      return w.require('electron').ipcRenderer as Electron.IpcRenderer;
    }
  } catch {
    // no-op
  }
  return undefined;
}

export function send(channel: string, payload?: unknown): boolean {
  const bridge = getBridge();
  if (bridge?.events) {
    return bridge.events.send(channel, payload);
  }
  const ipc = getIpcRenderer();
  if (!ipc) {
    return false;
  }
  try {
    ipc.send(channel, payload);
    return true;
  } catch {
    return false;
  }
}

export function on(channel: string, listener: (...args: any[]) => void): boolean {
  const bridge = getBridge();
  if (bridge?.events) {
    return bridge.events.on(channel, listener);
  }
  const ipc = getIpcRenderer();
  if (!ipc) {
    return false;
  }
  try {
    ipc.on(channel, listener);
    return true;
  } catch {
    return false;
  }
}

export async function invoke<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  const bridge = getBridge();
  if (bridge?.invoke) {
    return bridge.invoke(channel, payload) as Promise<T>;
  }
  const ipc = getIpcRenderer();
  if (!ipc?.invoke) {
    return Promise.reject(new Error('ipcRenderer.invoke is unavailable'));
  }
  return ipc.invoke(channel, payload) as Promise<T>;
}
