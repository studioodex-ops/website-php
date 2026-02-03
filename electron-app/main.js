const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

// Keep a global reference of the window object
let mainWindow;

// Database module
let db;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        icon: path.join(__dirname, 'assets/icon.ico'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        autoHideMenuBar: true,
        show: false
    });

    // Load the POS page
    mainWindow.loadFile('src/pos.html');

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.maximize();
    });

    // Handle external links
    // Handle external links and POPUPS
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Allow Google Auth Popups
        if (url.startsWith('https://accounts.google.com') ||
            url.startsWith('https://www.googleapis.com') ||
            url.includes('auth/handler')) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    autoHideMenuBar: true,
                    // Keep popup constrained if possible, or let it float
                    width: 500,
                    height: 600
                }
            };
        }

        // Open other links in default browser
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Emitted when the window is closed
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Open DevTools for debugging
    mainWindow.webContents.openDevTools();
}

// Initialize database
async function initDatabase() {
    try {
        db = require('./database');
        await db.initialize();
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Failed to initialize database:', error);
    }
}

// App ready
app.whenReady().then(async () => {
    await initDatabase();
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers for database operations
ipcMain.handle('db:getProducts', async () => {
    return db.getProducts();
});

ipcMain.handle('db:addProduct', async (event, product) => {
    return db.addProduct(product);
});

ipcMain.handle('db:updateProduct', async (event, id, product) => {
    return db.updateProduct(id, product);
});

ipcMain.handle('db:deleteProduct', async (event, id) => {
    return db.deleteProduct(id);
});

ipcMain.handle('db:saveSale', async (event, sale) => {
    return db.saveSale(sale);
});

ipcMain.handle('db:getSales', async (event, dateRange) => {
    return db.getSales(dateRange);
});

ipcMain.handle('db:getPendingSync', async () => {
    return db.getPendingSync();
});

ipcMain.handle('db:markSynced', async (event, id) => {
    return db.markSynced(id);
});

// Network status
ipcMain.handle('network:isOnline', () => {
    return require('dns').promises.lookup('google.com')
        .then(() => true)
        .catch(() => false);
});

console.log('Buddika Stores POS - Starting...');
