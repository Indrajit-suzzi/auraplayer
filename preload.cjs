const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getPath: (file) => webUtils.getPathForFile(file),
  onOpenFile: (callback) => ipcRenderer.on('open-file', (_event, value) => callback(value)),
  removeOpenFileListener: () => ipcRenderer.removeAllListeners('open-file'),
  setAlwaysOnTop: (value) => ipcRenderer.send('set-always-on-top', value),
  toggleMiniPlayer: (enabled) => ipcRenderer.send('toggle-mini-player', enabled),
  findSidecarFile: (filePath, extensions) => ipcRenderer.invoke('find-sidecar', filePath, extensions),
  onMediaPlayPause: (callback) => ipcRenderer.on('media-play-pause', () => callback()),
  onMediaNext: (callback) => ipcRenderer.on('media-next', () => callback()),
  onMediaPrev: (callback) => ipcRenderer.on('media-prev', () => callback()),
  setProgress: (progress) => ipcRenderer.send('set-progress', progress),
  getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
  scanDirectory: (dirPath) => ipcRenderer.invoke('scan-directory', dirPath),
  updateAllowedRoots: (roots) => ipcRenderer.send('update-allowed-roots', roots),
  saveLibrary: (data) => ipcRenderer.invoke('save-library', data),
  loadLibrary: () => ipcRenderer.invoke('load-library'),
  selectFolder: () => ipcRenderer.invoke('select-folder')
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type]);
  }
});
