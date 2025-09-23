// Global type definitions for translationStudio

// Electron API types
declare global {
  interface ElectronBridge {
    send?: (channel: string, payload?: unknown) => void;
    invoke?: <T = unknown>(channel: string, payload?: unknown) => Promise<T>;
    on?: (channel: string, listener: (...args: any[]) => void) => void;
    minimizeWindow?: () => void;
    maximizeWindow?: () => void;
    closeWindow?: () => void;
  }

  interface Window {
    electronAPI?: ElectronBridge;
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
