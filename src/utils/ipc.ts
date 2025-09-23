export function getBridge(): ElectronBridge | undefined {
  try {
    return window.electronAPI;
  } catch {
    return undefined;
  }
}

export function send(channel: string, payload?: unknown): boolean {
  const bridge = getBridge();
  if (!bridge?.send) {
    return false;
  }
  try {
    bridge.send(channel, payload);
    return true;
  } catch {
    return false;
  }
}

export async function invoke<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  const bridge = getBridge();
  if (!bridge?.invoke) {
    return Promise.reject(new Error('electron bridge invoke is unavailable'));
  }
  return bridge.invoke<T>(channel, payload);
}

export function on(channel: string, listener: (...args: any[]) => void): boolean {
  const bridge = getBridge();
  if (!bridge?.on) {
    return false;
  }
  try {
    bridge.on(channel, listener);
    return true;
  } catch {
    return false;
  }
}
