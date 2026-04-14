/**
 * 自动更新服务 - Auto Update Service
 * 使用 Electron updater 实现自动更新
 */

const { ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

// 配置自动更新
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// 更新状态
let updateStatus = {
  checking: false,
  available: false,
  downloaded: false,
  error: null,
  version: null,
  releaseNotes: null,
};

/**
 * 初始化自动更新
 */
function initUpdater(mainWindow) {
  // 检查更新
  ipcMain.handle('updater:check', async () => {
    if (updateStatus.checking) {
      return { status: updateStatus };
    }

    updateStatus.checking = true;
    updateStatus.error = null;

    try {
      const result = await autoUpdater.checkForUpdates();
      if (result && result.updateInfo) {
        updateStatus.available = true;
        updateStatus.version = result.updateInfo.version;
        updateStatus.releaseNotes = result.updateInfo.releaseNotes;
      }
    } catch (error) {
      updateStatus.error = error.message;
      console.error('[Updater] Check failed:', error);
    } finally {
      updateStatus.checking = false;
    }

    return { status: updateStatus };
  });

  // 下载更新
  ipcMain.handle('updater:download', async () => {
    if (!updateStatus.available || updateStatus.downloaded) {
      return { success: false, error: 'No update available or already downloaded' };
    }

    try {
      await autoUpdater.downloadUpdate();
      updateStatus.downloaded = true;
      return { success: true };
    } catch (error) {
      console.error('[Updater] Download failed:', error);
      return { success: false, error: error.message };
    }
  });

  // 安装更新
  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall();
  });

  // 获取更新状态
  ipcMain.handle('updater:status', () => {
    return { status: updateStatus };
  });

  // 事件监听
  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...');
    mainWindow?.webContents.send('updater:event', { type: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    updateStatus.available = true;
    updateStatus.version = info.version;
    mainWindow?.webContents.send('updater:event', {
      type: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes,
    });

    // 弹出更新提示
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 v${info.version}，是否立即下载？`,
      buttons: ['下载', '稍后'],
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('[Updater] Update not available');
    mainWindow?.webContents.send('updater:event', { type: 'not-available', version: info.version });
  });

  autoUpdater.on('download-progress', (progress) => {
    console.log(`[Updater] Download progress: ${progress.percent.toFixed(1)}%`);
    mainWindow?.webContents.send('updater:event', {
      type: 'progress',
      percent: progress.percent,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    updateStatus.downloaded = true;
    mainWindow?.webContents.send('updater:event', { type: 'downloaded', version: info.version });

    // 提示用户安装
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新就绪',
      message: '新版本已下载完成，是否立即重启安装？',
      buttons: ['立即重启', '稍后'],
    }).then(({ response }) => {
      if (response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('[Updater] Error:', error);
    updateStatus.error = error.message;
    mainWindow?.webContents.send('updater:event', { type: 'error', error: error.message });
  });
}

module.exports = { initUpdater };
