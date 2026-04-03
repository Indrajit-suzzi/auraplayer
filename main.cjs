const { app, BrowserWindow, protocol, net, ipcMain, globalShortcut } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');

console.log(">>> AURA PLAYER MAIN PROCESS STARTING <<<");
console.log("OS: " + process.platform);

// Register custom protocol for local media - MUST be called before app ready
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'media', 
    privileges: { 
      secure: true, 
      standard: true, 
      bypassCSP: true, 
      stream: true, 
      corsEnabled: true,
      supportFetchAPI: true 
    } 
  }
]);

// Handle single instance lock
const gotTheLock = app.requestSingleInstanceLock();

let allowedRoots = [];

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
      powerPreference: 'high-performance'
    },
    icon: path.join(__dirname, 'public/icon.ico')
  });

  ipcMain.on('update-allowed-roots', (event, roots) => {
    allowedRoots = roots.map(r => path.normalize(r));
  });

  ipcMain.on('set-always-on-top', (event, value) => {
    win.setAlwaysOnTop(value);
  });

  ipcMain.on('set-progress', (event, progress) => {
    if (win) win.setProgressBar(progress || -1);
  });

  ipcMain.handle('find-sidecar', async (event, filePath, extensions) => {
    if (!filePath) return null;
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
    if (!filePath) return { size: 0, birthtime: Date.now() };
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
    if (!dirPath) return [];
    const results = [];
    const mediaExtensions = /\.(mp4|mkv|webm|mp3|wav|flac|m4a|mov|avi|flv|wmv|ogv|aac|ogg|m4v|3gp|3g2|ts|mpeg|opus)$/i;
    
    const getMimeType = (path) => {
      const ext = path.split('.').pop().toLowerCase();
      const map = {
        'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac', 
        'm4a': 'audio/mp4', 'aac': 'audio/aac', 'ogg': 'audio/ogg', 'opus': 'audio/opus',
        'mp4': 'video/mp4', 'webm': 'video/webm', 'mkv': 'video/x-matroska', 
        'mov': 'video/quicktime', 'avi': 'video/x-msvideo', 'm4v': 'video/x-m4v'
      };
      return map[ext] || (path.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus)$/i) ? 'audio/mpeg' : 'video/mp4');
    };

    const MAX_DEPTH = 10;
    async function scan(currentPath, depth = 0) {
      if (depth > MAX_DEPTH) return;
      try {
        const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          if (entry.isDirectory()) {
            await scan(fullPath, depth + 1);
          } else if (entry.isFile() && mediaExtensions.test(entry.name)) {
            const stats = await fs.promises.stat(fullPath);
            results.push({
              name: entry.name,
              path: fullPath,
              size: stats.size,
              birthtime: stats.birthtimeMs || stats.mtimeMs,
              type: getMimeType(entry.name)
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

  const libraryFile = path.join(app.getPath('userData'), 'library.json');

  ipcMain.handle('save-library', async (event, data) => {
    try {
      await fs.promises.writeFile(libraryFile, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Save library error", e);
      return false;
    }
  });

  ipcMain.handle('load-library', async () => {
    try {
      if (fs.existsSync(libraryFile)) {
        const data = await fs.promises.readFile(libraryFile, 'utf8');
        if (!data || data.trim() === '') return null;
        try {
          return JSON.parse(data);
        } catch (e) {
          console.error("Corrupted library.json detected. Resetting.");
          return null;
        }
      }
      return null;
    } catch (e) {
      console.error("Load library error", e);
      return null;
    }
  });

  ipcMain.on('toggle-mini-player', (event, enabled) => {
    if (enabled) {
      win.setMinimumSize(320, 380);
      win.setSize(320, 380);
      win.setAlwaysOnTop(true);
      win.setResizable(false);
    } else {
      win.setMinimumSize(1000, 700);
      win.setSize(1280, 800);
      win.setAlwaysOnTop(false);
      win.setResizable(true);
      win.center();
    }
  });

  ipcMain.handle('select-folder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    return result.canceled ? null : result.filePaths[0];
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }

  // Register Global Media Shortcuts once
  const registerShortcuts = () => {
    try {
      globalShortcut.register('MediaPlayPause', () => win.webContents.send('media-play-pause'));
      globalShortcut.register('MediaNextTrack', () => win.webContents.send('media-next'));
      globalShortcut.register('MediaPreviousTrack', () => win.webContents.send('media-prev'));
    } catch (e) {
      console.error("Shortcut registration failed", e);
    }
  };

  registerShortcuts();
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

// Handled at top.

if (!gotTheLock) {
  app.quit();
} else {
  app.whenReady().then(() => {
    protocol.handle('media', async (request) => {
      console.log(`[Protocol] Request: ${request.url}`);
      try {
        const urlObj = new URL(request.url);
        let filePath = decodeURIComponent(urlObj.pathname);
        
        // Remove the host part if URL is media://app/D:/path
        // In this case urlObj.host is 'app' and pathname is '/D:/path'
        if (urlObj.host === 'app') {
          if (filePath.startsWith('/')) filePath = filePath.slice(1);
        } else {
          // In case of media://D:/path (rare)
          // urlObj.host is 'D%3A' and pathname is '/path'
          // Standard URL parsing is tricky with custom schemes
          // Better approach: extract the path manually from the full URL
          filePath = decodeURIComponent(request.url.replace(/^media:\/\/([^\/]*)/, '$1'));
        }

        // Standardize slashes
        filePath = filePath.replace(/\\+/g, '/');
        filePath = path.normalize(filePath);
        console.log(`[Protocol] Final Path: ${filePath}`);
        
        // Basic extension check for security
        const mediaExtensions = /\.(mp4|mkv|webm|mp3|wav|flac|m4a|mov|avi|flv|wmv|ogv|aac|ogg|m4v|3gp|3g2|ts|mpeg|opus|srt|vtt|lrc)$/i;
        if (!mediaExtensions.test(filePath)) {
          console.warn(`[Protocol] Blocked file type: ${filePath}`);
          return new Response('Access denied: Invalid file type', { status: 403 });
        }

        if (!fs.existsSync(filePath)) {
          console.error(`[Protocol] File missing: ${filePath}`);
          return new Response('File not found', { status: 404 });
        }

        const stats = fs.statSync(filePath);
        const totalSize = stats.size;
        const range = request.headers.get('range');

        const getMimeType = (path) => {
          const ext = path.split('.').pop().toLowerCase();
          const map = {
            'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'flac': 'audio/flac', 
            'm4a': 'audio/mp4', 'aac': 'audio/aac', 'ogg': 'audio/ogg', 'opus': 'audio/opus',
            'mp4': 'video/mp4', 'webm': 'video/webm', 'mkv': 'video/x-matroska', 
            'mov': 'video/quicktime', 'avi': 'video/x-msvideo', 'm4v': 'video/x-m4v'
          };
          return map[ext] || (path.match(/\.(mp3|wav|flac|m4a|aac|ogg|opus)$/i) ? 'audio/mpeg' : 'video/mp4');
        };

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
          const chunksize = (end - start) + 1;

          const stream = fs.createReadStream(filePath, { start, end });
          return new Response(stream, {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${totalSize}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': chunksize,
              'Content-Type': getMimeType(filePath),
              'Access-Control-Allow-Origin': '*'
            }
          });
        }

        const stream = fs.createReadStream(filePath);
        return new Response(stream, {
          headers: {
            'Content-Type': getMimeType(filePath),
            'Accept-Ranges': 'bytes',
            'Content-Length': totalSize,
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (e) {
        console.error(`[Protocol] Fatal handler error:`, e);
        return new Response('Internal error', { status: 500 });
      }
    });

    console.log("[Protocol] Handler READY");
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
