import { getBridge, invoke } from './ipc';

export async function getUserDataPath(): Promise<string | null> {
  try {
    return await invoke<string | null>('app:getUserDataPath');
  } catch {
    return null;
  }
}

export async function ensureDir(relPath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('fs:ensureDir', relPath);
  } catch {
    return false;
  }
}

export async function readJson<T = any>(relPath: string, defaultValue?: T): Promise<T | null> {
  try {
    const data = await invoke<T | null>('fs:readJson', relPath);
    if (data == null) return defaultValue ?? null;
    return data;
  } catch {
    return defaultValue ?? null;
  }
}

export async function writeJson(relPath: string, data: any): Promise<boolean> {
  try {
    return await invoke<boolean>('fs:writeJson', { relPath, data });
  } catch {
    return false;
  }
}

export async function readFile(relPath: string): Promise<Uint8Array | null> {
  try {
    const buf: any = await invoke<any>('fs:readFile', relPath);
    if (!buf) return null;
    return new Uint8Array(buf.data ?? buf);
  } catch {
    return null;
  }
}

export async function writeFile(relPath: string, data: Uint8Array): Promise<boolean> {
  try {
    return await invoke<boolean>('fs:writeFile', { relPath, data });
  } catch {
    return false;
  }
}

export async function writeText(relPath: string, text: string): Promise<boolean> {
  const enc = new TextEncoder();
  return writeFile(relPath, enc.encode(text));
}

export async function readAbsoluteText(absPath: string): Promise<string | null> {
  try {
    return await invoke<string | null>('fs:readAbsoluteText', absPath);
  } catch {
    return null;
  }
}

export async function copyAbsoluteToUserData(relPath: string, absPath: string): Promise<boolean> {
  try {
    return await invoke<boolean>('fs:copyAbsoluteToUserData', { relPath, absPath });
  } catch {
    return false;
  }
}

export function minimizeWindow(): boolean {
  const bridge = getBridge();
  if (!bridge?.minimizeWindow) return false;
  bridge.minimizeWindow();
  return true;
}

export function maximizeWindow(): boolean {
  const bridge = getBridge();
  if (!bridge?.maximizeWindow) return false;
  bridge.maximizeWindow();
  return true;
}

export function closeWindow(): boolean {
  const bridge = getBridge();
  if (!bridge?.closeWindow) return false;
  bridge.closeWindow();
  return true;
}
