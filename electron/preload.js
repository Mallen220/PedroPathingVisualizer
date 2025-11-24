const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Expose safe APIs to renderer here if needed in the future
});