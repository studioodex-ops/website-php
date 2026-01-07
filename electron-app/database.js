// Database Module using sql.js (Pure JavaScript SQLite)
const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

let db = null;
let SQL = null;
let dbPath = '';

// Initialize database
async function initialize() {
    try {
        // Initialize sql.js
        SQL = await initSqlJs();

        // Database file path
        dbPath = path.join(app.getPath('userData'), 'buddika-pos.db');
        console.log('Database path:', dbPath);

        // Load existing database or create new
        if (fs.existsSync(dbPath)) {
            const fileBuffer = fs.readFileSync(dbPath);
            db = new SQL.Database(fileBuffer);
            console.log('Loaded existing database');
        } else {
            db = new SQL.Database();
            console.log('Created new database');
        }

        // Create tables
        db.run(`
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name_en TEXT NOT NULL,
                name_si TEXT,
                price REAL NOT NULL,
                category TEXT,
                unit TEXT DEFAULT 'pcs',
                barcode TEXT,
                image TEXT,
                active INTEGER DEFAULT 1,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'synced'
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS sales (
                id TEXT PRIMARY KEY,
                items TEXT NOT NULL,
                subtotal REAL,
                discount REAL DEFAULT 0,
                total REAL NOT NULL,
                payment_method TEXT DEFAULT 'cash',
                customer_name TEXT,
                customer_phone TEXT,
                cashier TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                sync_status TEXT DEFAULT 'pending'
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                collection TEXT NOT NULL,
                doc_id TEXT NOT NULL,
                action TEXT NOT NULL,
                data TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                attempts INTEGER DEFAULT 0,
                last_error TEXT
            )
        `);

        // Save database
        saveDatabase();

        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}

// Save database to file
function saveDatabase() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// Product operations
function getProducts() {
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM products WHERE active = 1 ORDER BY name_en');
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

function getProductById(id) {
    if (!db) return null;
    const stmt = db.prepare('SELECT * FROM products WHERE id = ?');
    stmt.bind([id]);
    let result = null;
    if (stmt.step()) {
        result = stmt.getAsObject();
    }
    stmt.free();
    return result;
}

function addProduct(product) {
    if (!db) return null;
    const id = product.id || `prod_${Date.now()}`;
    db.run(`
        INSERT INTO products (id, name_en, name_si, price, category, unit, barcode, image, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [id, product.name_en, product.name_si, product.price, product.category,
        product.unit || 'pcs', product.barcode, product.image]);

    addToSyncQueue('products', id, 'create', product);
    saveDatabase();
    return { id, ...product };
}

function updateProduct(id, product) {
    if (!db) return null;
    db.run(`
        UPDATE products 
        SET name_en = ?, name_si = ?, price = ?, category = ?, unit = ?, 
            barcode = ?, image = ?, updated_at = datetime('now'), sync_status = 'pending'
        WHERE id = ?
    `, [product.name_en, product.name_si, product.price, product.category,
    product.unit, product.barcode, product.image, id]);

    addToSyncQueue('products', id, 'update', product);
    saveDatabase();
    return { id, ...product };
}

function deleteProduct(id) {
    if (!db) return false;
    db.run('UPDATE products SET active = 0, sync_status = ? WHERE id = ?', ['pending', id]);
    addToSyncQueue('products', id, 'delete', null);
    saveDatabase();
    return true;
}

// Sales operations
function saveSale(sale) {
    if (!db) return null;
    const id = sale.id || `sale_${Date.now()}`;
    db.run(`
        INSERT INTO sales (id, items, subtotal, discount, total, payment_method, 
                          customer_name, customer_phone, cashier, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [id, JSON.stringify(sale.items), sale.subtotal, sale.discount || 0,
        sale.total, sale.payment_method || 'cash', sale.customer_name,
        sale.customer_phone, sale.cashier]);

    addToSyncQueue('sales', id, 'create', sale);
    saveDatabase();
    return { id, ...sale };
}

function getSales(dateRange) {
    if (!db) return [];
    let query = 'SELECT * FROM sales ORDER BY created_at DESC LIMIT 100';
    const stmt = db.prepare(query);
    const results = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        row.items = JSON.parse(row.items);
        results.push(row);
    }
    stmt.free();
    return results;
}

// Sync queue operations
function addToSyncQueue(collection, docId, action, data) {
    if (!db) return;
    db.run(`
        INSERT INTO sync_queue (collection, doc_id, action, data)
        VALUES (?, ?, ?, ?)
    `, [collection, docId, action, JSON.stringify(data)]);
    saveDatabase();
}

function getPendingSync() {
    if (!db) return [];
    const stmt = db.prepare('SELECT * FROM sync_queue WHERE attempts < 3 ORDER BY created_at ASC');
    const results = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        row.data = JSON.parse(row.data);
        results.push(row);
    }
    stmt.free();
    return results;
}

function markSynced(queueId) {
    if (!db) return false;
    db.run('DELETE FROM sync_queue WHERE id = ?', [queueId]);
    saveDatabase();
    return true;
}

// Bulk import products from Firebase
function importProducts(products) {
    if (!db) return false;
    for (const p of products) {
        db.run(`
            INSERT OR REPLACE INTO products 
            (id, name_en, name_si, price, category, unit, barcode, image, active, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'synced')
        `, [p.id, p.name_en || p.name, p.name_si || p.nameSi,
        parseFloat(p.price) || 0, p.category, p.unit || 'pcs',
        p.barcode, p.image]);
    }
    saveDatabase();
    console.log(`Imported ${products.length} products`);
    return true;
}

module.exports = {
    initialize,
    getProducts,
    getProductById,
    addProduct,
    updateProduct,
    deleteProduct,
    saveSale,
    getSales,
    addToSyncQueue,
    getPendingSync,
    markSynced,
    importProducts,
    saveDatabase
};
