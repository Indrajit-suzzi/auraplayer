const { app, BrowserWindow, protocol, net, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

// Handle single instance lock
const gotTheLock = app.requestSingleInstanceLock();

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, 'public/icon.ico')
  });

  ipcMain.on('set-always-on-top', (event, value) => {
    win.setAlwaysOnTop(value);
  });

  ipcMain.on('toggle-mini-player', (event, enabled) => {
    if (enabled) {
      win.setMinimumSize(320, 380);
      win.setSize(320, 380);
      win.setAlwaysOnTop(true);
      win.setResizable(false);
    } else {
      win.setMinimumSize(800, 600);
      win.setSize(1280, 800);
      win.setAlwaysOnTop(false);
      win.setResizable(true);
      win.center();
    }
  });

  ipcMain.on('set-progress', (event, progress) => {
    if (win) win.setProgressBar(progress || -1);
  });

  ipcMain.handle('find-sidecar', async (event, filePath, extensions) => {
    try {
      const dir = path.dirname(filePath);
      const ext = path.extname(filePath);
      const baseName = path.basename(filePath, ext);
      const files = await fs.promises.readdir(dir);
      
      const sidecar = files.find(f => {
        const fExt = path.extname(f).toLowerCase().replace('.', '');
        return extensions.includes(fExt) && f.startsWith(baseName);
      });

      return sidecar ? path.join(dir, sidecar) : null;
    } catch (e) {
      return null;
    }
  });

  ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        birthtime: stats.birthtimeMs || stats.mtimeMs
      };
    } catch (e) {
      return { size: 0, birthtime: Date.now() };
    }
  });

  ipcMain.handle('scan-directory', async (event, dirPath) => {
    const results = [];
    const mediaExtensions = /\.(mp4|mkv|webm|mp3|wav|flac|m4a|mov|avi|flv|wmv|ogv|aac|ogg|m4v|3gp|3g2|ts|mpeg|opus)$/i;

    async function scan(currentPath) {
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.isFile() && mediaExtensions.test(entry.name)) {
            const stats = await fs.promises.stat(fullPath);
            results.push({
              name: entry.name,
              path: fullPath,
              size: stats.size,
              birthtime: stats.birthtimeMs || stats.mtimeMs,
              type: entry.name.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus)$/i) ? 'audio/mpeg' : 'video/mp4'
            });
          }
        }
      } catch (e) {
        console.error("Scan error", e);
      }
    }

    await scan(dirPath);
    return results;
  });

  win.loadFile(path.join(__dirname, 'dist/index.html'));

  // Register Global Media Shortcuts
  const registerShortcuts = () => {
    globalShortcut.register('MediaPlayPause', () => win.webContents.send('media-play-pause'));
    globalShortcut.register('MediaNextTrack', () => win.webContents.send('media-next'));
    globalShortcut.register('MediaPreviousTrack', () => win.webContents.send('media-prev'));
  };

  win.on('focus', registerShortcuts);
  win.on('blur', registerShortcuts); // Keep them active even when blurred
  app.on('will-quit', () => globalShortcut.unregisterAll());

  // Handle file path from arguments
  const handleFileFromArgs = (argv) => {
    const mediaExtensions = /\.(mp4|mkv|webm|mp3|wav|flac|m4a|mov|avi|flv|wmv|ogv|aac|ogg|m4v|3gp|3g2|ts|mpeg|opus)$/i;
    const filePath = argv.find(arg => mediaExtensions.test(arg));
    if (filePath) {
      win.webContents.send('open-file', filePath);
    }
  };

  win.webContents.on('did-finish-load', () => {
    handleFileFromArgs(process.argv);
  });

  app.on('second-instance', (event, commandLine) => {
    if (win.isMinimized()) win.restore();
    win.focus();
    handleFileFromArgs(commandLine);
  });
}

// Register custom protocol for local media
protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { bypassCSP: true, stream: true } }
]);

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    protocol.handle('media', (request) => {
      const filePath = decodeURIComponent(request.url.slice('media://'.length));
      return net.fetch(url.pathToFileURL(filePath).toString());
    });

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
