const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  const { workAreaSize } = screen.getPrimaryDisplay();
  const winW = 360;
  const winH = 420;

  mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: workAreaSize.width - winW - 40,
    y: workAreaSize.height - winH - 40,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.handle('window:setClickThrough', (_evt, enabled) => {
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
});

ipcMain.handle('window:drag', (_evt, { dx, dy }) => {
  if (!mainWindow) return;
  const [x, y] = mainWindow.getPosition();
  mainWindow.setPosition(x + dx, y + dy);
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
