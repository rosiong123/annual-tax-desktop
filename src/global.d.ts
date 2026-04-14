// Electron API 类型声明
interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    electron: string;
  };
  onEnterFullscreen?: (callback: () => void) => void;
  onLeaveFullscreen?: (callback: () => void) => void;
  onMenuImport?: (callback: () => void) => void;
  onMenuExport?: (callback: () => void) => void;
  onMenuAbout?: (callback: () => void) => void;
  exitFullscreen?: () => void;
  onExitFullscreenRequest?: (callback: () => void) => void;
  log?: {
    info: (message: string) => Promise<void>;
    warn: (message: string) => Promise<void>;
    error: (message: string, error?: unknown) => Promise<void>;
    getPath: () => Promise<string>;
  };
  safeStorage?: {
    encrypt: (plainText: string) => Promise<string>;
    decrypt: (encryptedBase64: string) => Promise<string>;
    isAvailable: () => Promise<boolean>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};