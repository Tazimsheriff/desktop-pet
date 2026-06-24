const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  getWorld: () => ipcRenderer.invoke('pet:get-world'),
  setPosition: (x, y) => ipcRenderer.send('pet:set-position', x, y),
  drag: (x, y) => ipcRenderer.send('pet:drag', x, y),
  openMenu: () => ipcRenderer.send('pet:menu'),
  onCommand: (callback) => ipcRenderer.on('pet:command', (_event, command) => callback(command)),
  onPause: (callback) => ipcRenderer.on('pet:pause', (_event, paused) => callback(paused)),
});
