// Global type definitions for translationStudio

// Electron API types
declare global {
  interface ElectronDialogFilter {
    name: string;
    extensions: string[];
  }

  interface ElectronDialogOpenOptions {
    properties?: string[];
    filters?: ElectronDialogFilter[];
  }

  interface ElectronDialogSaveOptions {
    defaultPath?: string;
    filters?: ElectronDialogFilter[];
  }

  interface ElectronDialogAPI {
    open: (options?: ElectronDialogOpenOptions) => Promise<ElectronDialogOpenResult>;
    save: (options?: ElectronDialogSaveOptions) => Promise<ElectronDialogSaveResult>;
  }

  interface ElectronDialogOpenResult {
    canceled: boolean;
    filePaths: string[];
  }

  interface ElectronDialogSaveResult {
    canceled: boolean;
    filePath?: string;
  }

  interface ElectronFileSystemAPI {
    ensureDir: (relPath: string) => Promise<boolean>;
    readJson: <T = unknown>(relPath: string) => Promise<T | null>;
    writeJson: (relPath: string, data: unknown) => Promise<boolean>;
    readFile: (relPath: string) => Promise<Uint8Array | null>;
    writeFile: (relPath: string, data: Uint8Array) => Promise<boolean>;
    readAbsoluteText: (absPath: string) => Promise<string | null>;
    copyAbsoluteToUserData: (relPath: string, absPath: string) => Promise<boolean>;
  }

  interface ElectronAppAPI {
    getUserDataPath: () => Promise<string | null>;
  }

  type ElectronHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

  interface ElectronNetworkRequest {
    url: string;
    method?: ElectronHttpMethod;
    headers?: Record<string, string>;
    body?: string | Uint8Array;
    responseType?: 'text' | 'json' | 'arraybuffer';
    timeoutMs?: number;
  }

  interface ElectronNetworkResponse<T = unknown> {
    ok: boolean;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: T | null;
    error?: string;
  }

  interface ElectronNetworkAPI {
    request: <T = unknown>(payload: ElectronNetworkRequest) => Promise<ElectronNetworkResponse<T>>;
  }

  interface ElectronWindowAPI {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  }

  interface ElectronEventsAPI {
    send: (channel: string, payload?: unknown) => boolean;
    on: (channel: string, listener: (...args: any[]) => void) => boolean;
  }

  interface ElectronBridge {
    dialog: ElectronDialogAPI;
    fs: ElectronFileSystemAPI;
    app: ElectronAppAPI;
    net: ElectronNetworkAPI;
    window: ElectronWindowAPI;
    events: ElectronEventsAPI;
    // Legacy compatibility
    send?: (channel: string, payload?: unknown) => boolean | void;
    on?: (channel: string, listener: (...args: any[]) => void) => boolean | void;
    invoke?: <T = unknown>(channel: string, payload?: unknown) => Promise<T>;
    minimizeWindow?: () => void;
    maximizeWindow?: () => void;
    closeWindow?: () => void;
  }

  interface Window {
    electronAPI?: ElectronBridge;
    projectRepository?: import('../services/projectRepository').ProjectRepository;
  }

  // Vite HMR types
  interface ImportMeta {
    hot?: {
      accept: (path: string, callback?: (module: any) => void) => void;
    };
  }
}

// Common application types
export interface AppConfig {
  version: string;
  build: string;
  dataPath: string;
  userSettings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;
  autoSave: boolean;
  [key: string]: any;
}

export interface ProjectData {
  id: string;
  name: string;
  type: string;
  language: string;
  created: Date;
  modified: Date;
  path: string;
}

export interface TranslationData {
  id: string;
  projectId: string;
  chapter: number;
  verse: number;
  source: string;
  translation: string;
  status: 'draft' | 'review' | 'completed';
  notes?: string;
}

// React component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

// IPC communication types
export interface IPCMessage {
  type: string;
  payload?: any;
  id?: string;
}

export interface IPCResponse {
  success: boolean;
  data?: any;
  error?: string;
  id?: string;
}

// File system types
export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: Date;
  isDirectory: boolean;
}

export {};
