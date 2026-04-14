const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron
  },
  // 全屏事件监听
  onEnterFullscreen: (callback) => {
    ipcRenderer.on('enter-fullscreen', callback);
  },
  onLeaveFullscreen: (callback) => {
    ipcRenderer.on('leave-fullscreen', callback);
  },
  // 菜单事件监听
  onMenuImport: (callback) => {
    ipcRenderer.on('menu-import', callback);
  },
  onMenuExport: (callback) => {
    ipcRenderer.on('menu-export', callback);
  },
  onMenuAbout: (callback) => {
    ipcRenderer.on('menu-about', callback);
  },
  // 退出全屏
  exitFullscreen: () => {
    // 通过IPC通知主进程退出全屏
    ipcRenderer.send('exit-fullscreen');
  },
  // 监听退出全屏请求
  onExitFullscreenRequest: (callback) => {
    ipcRenderer.on('exit-fullscreen-request', callback);
  },
  // 日志
  log: {
    info: (message) => ipcRenderer.invoke('log:info', message),
    warn: (message) => ipcRenderer.invoke('log:warn', message),
    error: (message, error) => ipcRenderer.invoke('log:error', message, error),
    getPath: () => ipcRenderer.invoke('log:getPath'),
  },
  // safeStorage（API Key 加密存储）
  safeStorage: {
    encrypt: (plainText) => ipcRenderer.invoke('safe-storage:encrypt', plainText),
    decrypt: (encryptedBase64) => ipcRenderer.invoke('safe-storage:decrypt', encryptedBase64),
    isAvailable: () => ipcRenderer.invoke('safe-storage:is-available'),
  },
});
