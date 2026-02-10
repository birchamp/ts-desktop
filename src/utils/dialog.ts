import { getBridge, invoke } from './ipc';

export interface OpenResult {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveResult {
  canceled: boolean;
  filePath?: string;
}

export async function openFile(
  filters?: { name: string; extensions: string[] }[],
  properties: string[] = ['openFile']
): Promise<OpenResult> {
  const fallback: OpenResult = { canceled: true, filePaths: [] };
  const bridge = getBridge();
  try {
    if (bridge?.dialog) {
      const res = await bridge.dialog.open({ properties, filters });
      return res;
    }
    const res = await invoke<OpenResult>('dialog:open', { properties, filters });
    return res;
  } catch {
    return fallback;
  }
}

export async function openDirectory(): Promise<OpenResult> {
  return openFile(undefined, ['openDirectory']);
}

export async function saveFile(defaultPath?: string): Promise<SaveResult> {
  const fallback: SaveResult = { canceled: true };
  const bridge = getBridge();
  try {
    if (bridge?.dialog) {
      const res = await bridge.dialog.save({ defaultPath });
      return res;
    }
    const res = await invoke<SaveResult>('dialog:save', { defaultPath });
    return res;
  } catch {
    return fallback;
  }
}
