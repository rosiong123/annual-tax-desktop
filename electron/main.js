const { app, BrowserWindow, Menu, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log/main');

// Initialize logging
log.initialize();
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB

// 全局异常处理
process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});

// Enable hardware acceleration
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

const isDev = process.env.NODE_ENV === 'development';

log.info('应用启动:', { version: app.getVersion(), isDev });

// 创建中文菜单栏
function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '导入数据',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            // 发送事件到渲染进程
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('menu-import');
            }
          }
        },
        {
          label: '导出报表',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('menu-export');
            }
          }
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { label: '刷新', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: '强制刷新', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: '放大', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: '缩小', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: '重置缩放', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: '全屏', accelerator: 'F11', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: '退出全屏', accelerator: 'Esc', click: () => {
          const win = BrowserWindow.getFocusedWindow();
          if (win && win.isFullScreen()) {
            win.setFullScreen(false);
          }
        } }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { label: '最小化', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: '关闭', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('menu-about');
            }
          }
        },
        {
          label: '使用教程',
          click: async () => {
            const { shell } = require('electron');
            await shell.openExternal('https://example.com/help');
          }
        }
      ]
    }
  ];

  // 开发模式下添加开发者工具菜单
  if (isDev) {
    template.push({
      label: '开发者工具',
      submenu: [
        { label: '开发者工具', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: '重新加载', accelerator: 'CmdOrCtrl+R', role: 'reload' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: '2025年度汇算清缴',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.once('ready-to-show', () => {
    win.show();
    if (isDev) {
      win.webContents.openDevTools();
    }
  });

  // 监听全屏状态变化
  win.on('enter-full-screen', () => {
    win.webContents.send('enter-fullscreen');
  });

  win.on('leave-full-screen', () => {
    win.webContents.send('leave-fullscreen');
  });

  // Log the paths we're using
  console.log('__dirname:', __dirname);
  console.log('process.resourcesPath:', process.resourcesPath);
  console.log('isDev:', isDev);

  if (isDev) {
    win.loadURL('http://localhost:1420');
  } else {
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, 'dist', 'index.html'),
      path.join(__dirname, '..', 'app', 'dist', 'index.html'),
      path.join(process.resourcesPath || '', 'app', 'dist', 'index.html'),
    ];

    for (const p of possiblePaths) {
      console.log('Trying path:', p, 'exists:', fs.existsSync(p));
    }

    // Use the first one that exists, or just try the first
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log('Loading:', indexPath);
    win.loadFile(indexPath).then(() => {
      console.log('Page loaded successfully');
    }).catch(err => {
      console.error('Error loading file:', err);
    });

    // Web content error handler
    win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });

    win.webContents.on('crashed', (event, killed) => {
      console.error('Renderer process crashed, killed:', killed);
    });
  }
}

// 处理退出全屏请求
let mainWindow = null;

// IPC事件处理需要在app就绪后设置
app.whenReady().then(() => {
  // 处理退出全屏的IPC消息
  ipcMain.on('exit-fullscreen', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win && win.isFullScreen()) {
      win.setFullScreen(false);
    }
  });

  // 日志IPC处理
  ipcMain.handle('log:info', (event, message) => {
    log.info('[Renderer]', message);
  });

  ipcMain.handle('log:warn', (event, message) => {
    log.warn('[Renderer]', message);
  });

  ipcMain.handle('log:error', (event, message, error) => {
    log.error('[Renderer]', message, error);
  });

  // 获取日志文件路径
  ipcMain.handle('log:getPath', () => {
    return log.transports.file.getFile().path;
  });

  // safeStorage IPC（API Key 加密存储）
  ipcMain.handle('safe-storage:encrypt', (_event, plainText: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage 加密不可用，当前环境不支持');
    }
    const encrypted = safeStorage.encryptString(plainText);
    return encrypted.toString('base64');
  });

  ipcMain.handle('safe-storage:decrypt', (_event, encryptedBase64: string) => {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('safeStorage 加密不可用，当前环境不支持');
    }
    const buffer = Buffer.from(encryptedBase64, 'base64');
    return safeStorage.decryptString(buffer);
  });

  ipcMain.handle('safe-storage:is-available', () => {
    return safeStorage.isEncryptionAvailable();
  });

  createMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
