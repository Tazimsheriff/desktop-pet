const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const path = require('path');

let petWindow;
let tray;
const WINDOW_SIZE = { width: 220, height: 240 };

function createPetWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  petWindow = new BrowserWindow({
    ...WINDOW_SIZE,
    x: workArea.x + workArea.width - WINDOW_SIZE.width - 40,
    y: workArea.y + workArea.height - WINDOW_SIZE.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  petWindow.setAlwaysOnTop(true, 'floating');
  petWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  petWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  petWindow.once('ready-to-show', () => petWindow.showInactive());
  petWindow.on('closed', () => { petWindow = null; });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('Volt — desktop companion');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Call Volt', click: () => petWindow?.webContents.send('pet:command', 'call') },
    { label: 'Feed a blueberry', click: () => petWindow?.webContents.send('pet:command', 'feed') },
    { label: 'Take a nap', click: () => petWindow?.webContents.send('pet:command', 'sleep') },
    { type: 'separator' },
    { label: 'Pause wandering', type: 'checkbox', click: (item) => petWindow?.webContents.send('pet:pause', item.checked) },
    { label: 'Quit', click: () => app.quit() },
  ]));
  tray.on('double-click', () => petWindow?.webContents.send('pet:command', 'call'));
}

app.whenReady().then(() => {
  createPetWindow();
  createTray();
});

// Keep the tray process alive if the pet window is ever closed.
app.on('window-all-closed', () => {});

ipcMain.handle('pet:get-world', () => {
  const bounds = petWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  return { bounds, workArea: display.workArea };
});

ipcMain.on('pet:set-position', (_event, x, y) => {
  if (!petWindow) return;
  const display = screen.getDisplayNearestPoint({ x: Math.round(x), y: Math.round(y) });
  const { workArea } = display;
  const maxX = workArea.x + workArea.width - WINDOW_SIZE.width;
  const maxY = workArea.y + workArea.height - WINDOW_SIZE.height;
  petWindow.setPosition(
    Math.round(Math.max(workArea.x, Math.min(x, maxX))),
    Math.round(Math.max(workArea.y, Math.min(y, maxY))),
  );
});

ipcMain.on('pet:drag', (_event, offsetX, offsetY) => {
  if (!petWindow) return;
  const cursor = screen.getCursorScreenPoint();
  petWindow.setPosition(Math.round(cursor.x - offsetX), Math.round(cursor.y - offsetY));
});

ipcMain.on('pet:menu', () => tray?.popUpContextMenu());
