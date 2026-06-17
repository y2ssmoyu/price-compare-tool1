const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  setClickThrough: (enabled) => ipcRenderer.invoke('window:setClickThrough', enabled),
  dragWindow: (dx, dy) => ipcRenderer.invoke('window:drag', { dx, dy }),
});
