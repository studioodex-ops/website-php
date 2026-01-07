// Firebase Sync Module for Electron
// Handles syncing local SQLite data with Firebase Firestore

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, updateDoc, query, orderBy } = require('firebase/firestore');

// Firebase configuration (same as website)
const firebaseConfig = {
    apiKey: "AIzaSyDS5eerNArhCejPJlOlxS8eGVWFwQKiuX0",
    authDomain: "buddikashopbizportal.firebaseapp.com",
    projectId: "buddikashopbizportal",
    storageBucket: "buddikashopbizportal.firebasestorage.app",
    messagingSenderId: "136909660498",
    appId: "1:136909660498:web:4e24f62c9825ae063b9a46",
    measurementId: "G-J0NWL8H6J9"
};

let app;
let db;
let isInitialized = false;

// Initialize Firebase
function initialize() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        isInitialized = true;
        console.log('Firebase initialized for sync');
        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

// Check if online
async function isOnline() {
    try {
        await fetch('https://www.google.com', { mode: 'no-cors', cache: 'no-store' });
        return true;
    } catch {
        return false;
    }
}

// Fetch all products from Firebase
async function fetchProducts() {
    if (!isInitialized) initialize();

    try {
        const q = query(collection(db, 'products'), orderBy('name', 'asc'));
        const snapshot = await getDocs(q);

        const products = [];
        snapshot.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        console.log(`Fetched ${products.length} products from Firebase`);
        return products;
    } catch (error) {
        console.error('Error fetching products:', error);
        throw error;
    }
}

// Fetch all categories from Firebase
async function fetchCategories() {
    if (!isInitialized) initialize();

    try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const categories = [];
        snapshot.forEach(doc => {
            categories.push({ id: doc.id, ...doc.data() });
        });
        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
}

// Sync a product to Firebase
async function syncProduct(product, action) {
    if (!isInitialized) initialize();

    try {
        const docRef = doc(db, 'products', product.id);

        if (action === 'create' || action === 'update') {
            await setDoc(docRef, {
                name: product.name_en,
                nameSi: product.name_si || '',
                price: product.price,
                category: product.category || '',
                unit: product.unit || 'pcs',
                barcode: product.barcode || '',
                image: product.image || '',
                updatedAt: new Date()
            }, { merge: true });
        } else if (action === 'delete') {
            await deleteDoc(docRef);
        }

        console.log(`Product ${product.id} synced (${action})`);
        return true;
    } catch (error) {
        console.error(`Error syncing product ${product.id}:`, error);
        throw error;
    }
}

// Sync a sale to Firebase
async function syncSale(sale) {
    if (!isInitialized) initialize();

    try {
        const docRef = doc(db, 'orders', sale.id);
        await setDoc(docRef, {
            items: sale.items,
            subtotal: sale.subtotal,
            discount: sale.discount || 0,
            total: sale.total,
            paymentMethod: sale.payment_method,
            customerName: sale.customer_name || '',
            customerPhone: sale.customer_phone || '',
            cashier: sale.cashier || '',
            status: 'Completed',
            createdAt: sale.created_at || new Date().toISOString(),
            source: 'offline-pos'
        });

        console.log(`Sale ${sale.id} synced to Firebase`);
        return true;
    } catch (error) {
        console.error(`Error syncing sale ${sale.id}:`, error);
        throw error;
    }
}

// Process sync queue
async function processSyncQueue(localDb) {
    const online = await isOnline();
    if (!online) {
        console.log('Offline - skipping sync');
        return { success: 0, failed: 0, pending: 0 };
    }

    const queue = localDb.getPendingSync();
    console.log(`Processing ${queue.length} pending sync items`);

    let success = 0;
    let failed = 0;

    for (const item of queue) {
        try {
            if (item.collection === 'products') {
                await syncProduct(item.data, item.action);
            } else if (item.collection === 'sales') {
                await syncSale(item.data);
            }

            localDb.markSynced(item.id);
            success++;
        } catch (error) {
            localDb.markSyncError(item.id, error.message);
            failed++;
        }
    }

    return { success, failed, pending: queue.length - success - failed };
}

// Full sync: Pull all data from Firebase
async function fullSync(localDb) {
    const online = await isOnline();
    if (!online) {
        return { success: false, message: 'Offline' };
    }

    try {
        // Fetch and import products
        const products = await fetchProducts();
        localDb.importProducts(products);

        // Fetch and import categories
        const categories = await fetchCategories();
        localDb.importCategories(categories);

        // Process outgoing queue
        const queueResult = await processSyncQueue(localDb);

        return {
            success: true,
            products: products.length,
            categories: categories.length,
            synced: queueResult.success,
            failed: queueResult.failed
        };
    } catch (error) {
        console.error('Full sync error:', error);
        return { success: false, message: error.message };
    }
}

module.exports = {
    initialize,
    isOnline,
    fetchProducts,
    fetchCategories,
    syncProduct,
    syncSale,
    processSyncQueue,
    fullSync
};
