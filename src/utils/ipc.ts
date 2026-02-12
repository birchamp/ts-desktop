export function getBridge(): ElectronBridge | undefined {
  try {
    return window.electronAPI;
  } catch {
    return undefined;
  }
}

export function send(channel: string, payload?: unknown): boolean {
  const bridge = getBridge();
  if (bridge?.events) {
    return bridge.events.send(channel, payload);
  }
  return false;
}

export function on(channel: string, listener: (...args: any[]) => void): boolean {
  const bridge = getBridge();
  if (bridge?.events) {
    return bridge.events.on(channel, listener);
  }
  return false;
}

export async function invoke<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  const bridge = getBridge();
  if (bridge?.invoke) {
    return bridge.invoke(channel, payload) as Promise<T>;
  }
  return Promise.reject(new Error('electronAPI.invoke is unavailable'));
}
