import { invoke } from './ipc';

export interface OpenResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveResult {
  canceled: boolean;
  filePath?: string;
}

export async function openFile(filters?: { name: string; extensions: string[] }[], properties: string[] = ['openFile']): Promise<OpenResult> {
  try {
    const res = await invoke<OpenResult>('dialog:open', { properties, filters });
    return res;
  } catch {
    return { canceled: true, filePaths: [] };
  }
}

export async function openDirectory(): Promise<OpenResult> {
  return openFile(undefined, ['openDirectory']);
}

export async function saveFile(defaultPath?: string): Promise<SaveResult> {
  try {
    const res = await invoke<SaveResult>('dialog:save', { defaultPath });
    return res;
  } catch {
    return { canceled: true };
  }
}
