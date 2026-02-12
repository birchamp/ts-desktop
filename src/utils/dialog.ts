import { getBridge, invoke } from './ipc';

export async function openDialog(
  options?: ElectronDialogOpenOptions
): Promise<ElectronDialogOpenResult> {
  try {
    const bridge = getBridge();
    if (bridge?.dialog?.open) {
      return await bridge.dialog.open(options);
    }
    const result = await invoke<ElectronDialogOpenResult>('dialog:open', options || {});
    return result || { canceled: true, filePaths: [] };
  } catch {
    return { canceled: true, filePaths: [] };
  }
}

export async function openFile(
  filters?: ElectronDialogFilter[]
): Promise<ElectronDialogOpenResult> {
  return openDialog({
    properties: ['openFile'],
    filters: filters || [],
  });
}

export async function saveDialog(
  options?: ElectronDialogSaveOptions
): Promise<ElectronDialogSaveResult> {
  try {
    const bridge = getBridge();
    if (bridge?.dialog?.save) {
      return await bridge.dialog.save(options);
    }
    const result = await invoke<ElectronDialogSaveResult>('dialog:save', options || {});
    return result || { canceled: true };
  } catch {
    return { canceled: true };
  }
}

export async function saveFile(
  defaultPath?: string,
  filters?: ElectronDialogFilter[]
): Promise<ElectronDialogSaveResult> {
  return saveDialog({
    defaultPath,
    filters: filters || [],
  });
}
