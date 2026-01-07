const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
    // Database operations
    db: {
        getProducts: () => ipcRenderer.invoke('db:getProducts'),
        addProduct: (product) => ipcRenderer.invoke('db:addProduct', product),
        updateProduct: (id, product) => ipcRenderer.invoke('db:updateProduct', id, product),
        deleteProduct: (id) => ipcRenderer.invoke('db:deleteProduct', id),
        saveSale: (sale) => ipcRenderer.invoke('db:saveSale', sale),
        getSales: (dateRange) => ipcRenderer.invoke('db:getSales', dateRange),
        getPendingSync: () => ipcRenderer.invoke('db:getPendingSync'),
        markSynced: (id) => ipcRenderer.invoke('db:markSynced', id)
    },

    // Network status
    isOnline: () => ipcRenderer.invoke('network:isOnline'),

    // Platform info
    platform: process.platform,

    // Event listeners
    onNetworkChange: (callback) => {
        window.addEventListener('online', () => callback(true));
        window.addEventListener('offline', () => callback(false));
    }
});

// Notify renderer that preload is ready
window.addEventListener('DOMContentLoaded', () => {
    console.log('Preload script loaded - Electron API ready');
});
