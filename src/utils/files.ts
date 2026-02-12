import { getBridge, invoke } from './ipc';

export interface AbsoluteDirEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
}

export async function listAbsoluteEntries(absPath: string): Promise<AbsoluteDirEntry[]> {
  try {
    const bridge = getBridge();
    if (bridge?.fs?.listAbsoluteEntries) {
      return await bridge.fs.listAbsoluteEntries(absPath);
    }
    return await invoke<AbsoluteDirEntry[]>('fs:listAbsoluteEntries', absPath);
  } catch {
    return [];
  }
}

export async function getUserDataPath(): Promise<string | null> {
  try {
    const bridge = getBridge();
    if (bridge?.app) {
      return await bridge.app.getUserDataPath();
    }
    return await invoke<string | null>('app:getUserDataPath');
  } catch {
    return null;
  }
}

export async function ensureDir(relPath: string): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (bridge?.fs) {
      return await bridge.fs.ensureDir(relPath);
    }
    return await invoke<boolean>('fs:ensureDir', relPath);
  } catch {
    return false;
  }
}

export async function readJson<T = any>(relPath: string, defaultValue?: T): Promise<T | null> {
  try {
    const bridge = getBridge();
    let data: T | null = null;
    if (bridge?.fs) {
      data = await bridge.fs.readJson<T>(relPath);
    } else {
      data = await invoke<T | null>('fs:readJson', relPath);
    }
    if (data == null) return defaultValue ?? null;
    return data;
  } catch {
    return defaultValue ?? null;
  }
}

export async function writeJson(relPath: string, data: any): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (bridge?.fs) {
      return await bridge.fs.writeJson(relPath, data);
    }
    return await invoke<boolean>('fs:writeJson', { relPath, data });
  } catch {
    return false;
  }
}

export async function readFile(relPath: string): Promise<Uint8Array | null> {
  try {
    const bridge = getBridge();
    let buf: any;
    if (bridge?.fs) {
      buf = await bridge.fs.readFile(relPath);
    } else {
      buf = await invoke<any>('fs:readFile', relPath);
    }
    if (!buf) return null;
    if (buf instanceof Uint8Array) return buf;
    if (buf.data && Array.isArray(buf.data)) return new Uint8Array(buf.data);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

export async function readText(relPath: string): Promise<string | null> {
  const data = await readFile(relPath);
  if (!data) return null;
  try {
    const decoder = new TextDecoder();
    return decoder.decode(data);
  } catch {
    return null;
  }
}

export async function writeFile(relPath: string, data: Uint8Array): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (bridge?.fs) {
      return await bridge.fs.writeFile(relPath, data);
    }
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
    const bridge = getBridge();
    if (bridge?.fs) {
      return await bridge.fs.readAbsoluteText(absPath);
    }
    return await invoke<string | null>('fs:readAbsoluteText', absPath);
  } catch {
    return null;
  }
}

export async function copyAbsoluteToUserData(relPath: string, absPath: string): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (bridge?.fs) {
      return await bridge.fs.copyAbsoluteToUserData(relPath, absPath);
    }
    return await invoke<boolean>('fs:copyAbsoluteToUserData', { relPath, absPath });
  } catch {
    return false;
  }
}

export async function writeAbsoluteFile(absPath: string, data: Uint8Array): Promise<boolean> {
  try {
    const bridge = getBridge();
    if (bridge?.fs?.writeAbsoluteFile) {
      return await bridge.fs.writeAbsoluteFile(absPath, data);
    }
    return await invoke<boolean>('fs:writeAbsoluteFile', { absPath, data });
  } catch {
    return false;
  }
}

export function minimizeWindow(): boolean {
  const bridge = getBridge();
  if (bridge?.window) {
    bridge.window.minimize();
    return true;
  }
  return false;
}

export function maximizeWindow(): boolean {
  const bridge = getBridge();
  if (bridge?.window) {
    bridge.window.maximize();
    return true;
  }
  return false;
}

export function closeWindow(): boolean {
  const bridge = getBridge();
  if (bridge?.window) {
    bridge.window.close();
    return true;
  }
  return false;
}
