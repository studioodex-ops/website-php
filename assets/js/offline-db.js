// Offline Database Module for Buddika Stores
// Uses IndexedDB for local storage of products, transactions, and sync queue

(function () {
    'use strict';

    const DB_NAME = 'BuddikaOfflineDB';
    const DB_VERSION = 1;
    let db = null;

    // Store names
    const STORES = {
        PRODUCTS: 'products',
        TRANSACTIONS: 'pendingTransactions',
        SYNC_QUEUE: 'syncQueue',
        SETTINGS: 'settings'
    };

    // ==================== INITIALIZE DATABASE ====================
    window.initOfflineDB = function () {
        return new Promise((resolve, reject) => {
            if (db) {
                resolve(db);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('[OfflineDB] Failed to open:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                db = request.result;
                console.log('[OfflineDB] Database opened successfully');
                resolve(db);
            };

            request.onupgradeneeded = (event) => {
                const database = event.target.result;
                console.log('[OfflineDB] Upgrading database...');

                // Products store
                if (!database.objectStoreNames.contains(STORES.PRODUCTS)) {
                    const productStore = database.createObjectStore(STORES.PRODUCTS, { keyPath: 'id' });
                    productStore.createIndex('category', 'category', { unique: false });
                    productStore.createIndex('name', 'name', { unique: false });
                    productStore.createIndex('stock', 'stock', { unique: false });
                }

                // Pending transactions store
                if (!database.objectStoreNames.contains(STORES.TRANSACTIONS)) {
                    const txStore = database.createObjectStore(STORES.TRANSACTIONS, {
                        keyPath: 'localId',
                        autoIncrement: true
                    });
                    txStore.createIndex('createdAt', 'createdAt', { unique: false });
                    txStore.createIndex('synced', 'synced', { unique: false });
                }

                // Sync queue store
                if (!database.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                    const syncStore = database.createObjectStore(STORES.SYNC_QUEUE, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    syncStore.createIndex('type', 'type', { unique: false });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Settings store
                if (!database.objectStoreNames.contains(STORES.SETTINGS)) {
                    database.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
                }

                console.log('[OfflineDB] Database upgrade complete');
            };
        });
    };

    // ==================== PRODUCTS ====================
    window.offlineDB = {
        // Save products locally
        saveProducts: async function (products) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.PRODUCTS, 'readwrite');
            const store = tx.objectStore(STORES.PRODUCTS);

            for (const product of products) {
                store.put(product);
            }

            return new Promise((resolve, reject) => {
                tx.oncomplete = () => {
                    console.log('[OfflineDB] Saved', products.length, 'products');
                    resolve();
                };
                tx.onerror = () => reject(tx.error);
            });
        },

        // Get all products from local storage
        getProducts: async function () {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.PRODUCTS, 'readonly');
            const store = tx.objectStore(STORES.PRODUCTS);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        // Get product by ID
        getProduct: async function (productId) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.PRODUCTS, 'readonly');
            const store = tx.objectStore(STORES.PRODUCTS);

            return new Promise((resolve, reject) => {
                const request = store.get(productId);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        // Update product stock locally
        updateStock: async function (productId, newStock) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.PRODUCTS, 'readwrite');
            const store = tx.objectStore(STORES.PRODUCTS);

            return new Promise((resolve, reject) => {
                const getRequest = store.get(productId);
                getRequest.onsuccess = () => {
                    const product = getRequest.result;
                    if (product) {
                        product.stock = newStock;
                        product.updatedAt = new Date().toISOString();
                        store.put(product);
                        resolve(product);
                    } else {
                        reject(new Error('Product not found'));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        },

        // ==================== TRANSACTIONS ====================
        // Save offline transaction (POS sale)
        saveSale: async function (saleData) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.TRANSACTIONS, 'readwrite');
            const store = tx.objectStore(STORES.TRANSACTIONS);

            const transaction = {
                ...saleData,
                createdAt: new Date().toISOString(),
                synced: false,
                localId: Date.now() + '-' + Math.random().toString(36).substr(2, 9)
            };

            return new Promise((resolve, reject) => {
                const request = store.add(transaction);
                request.onsuccess = () => {
                    console.log('[OfflineDB] Saved offline sale:', transaction.localId);
                    resolve(transaction);
                };
                request.onerror = () => reject(request.error);
            });
        },

        // Get pending (unsynced) transactions
        getPendingSales: async function () {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.TRANSACTIONS, 'readonly');
            const store = tx.objectStore(STORES.TRANSACTIONS);
            const index = store.index('synced');

            return new Promise((resolve, reject) => {
                const request = index.getAll(IDBKeyRange.only(false));
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        // Mark transaction as synced
        markSynced: async function (localId) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.TRANSACTIONS, 'readwrite');
            const store = tx.objectStore(STORES.TRANSACTIONS);

            return new Promise((resolve, reject) => {
                const getRequest = store.get(localId);
                getRequest.onsuccess = () => {
                    const transaction = getRequest.result;
                    if (transaction) {
                        transaction.synced = true;
                        transaction.syncedAt = new Date().toISOString();
                        store.put(transaction);
                        resolve(transaction);
                    } else {
                        reject(new Error('Transaction not found'));
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            });
        },

        // ==================== SYNC QUEUE ====================
        // Add item to sync queue
        addToSyncQueue: async function (action, data) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
            const store = tx.objectStore(STORES.SYNC_QUEUE);

            const item = {
                type: action, // 'sale', 'stock_update', 'order', etc.
                data: data,
                timestamp: new Date().toISOString(),
                attempts: 0
            };

            return new Promise((resolve, reject) => {
                const request = store.add(item);
                request.onsuccess = () => {
                    console.log('[OfflineDB] Added to sync queue:', action);
                    resolve(item);
                };
                request.onerror = () => reject(request.error);
            });
        },

        // Get all items in sync queue
        getSyncQueue: async function () {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.SYNC_QUEUE, 'readonly');
            const store = tx.objectStore(STORES.SYNC_QUEUE);

            return new Promise((resolve, reject) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        },

        // Remove item from sync queue
        removeFromSyncQueue: async function (id) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
            const store = tx.objectStore(STORES.SYNC_QUEUE);

            return new Promise((resolve, reject) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },

        // Clear entire sync queue
        clearSyncQueue: async function () {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.SYNC_QUEUE, 'readwrite');
            const store = tx.objectStore(STORES.SYNC_QUEUE);

            return new Promise((resolve, reject) => {
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },

        // ==================== SETTINGS ====================
        saveSetting: async function (key, value) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.SETTINGS, 'readwrite');
            const store = tx.objectStore(STORES.SETTINGS);

            return new Promise((resolve, reject) => {
                const request = store.put({ key, value, updatedAt: new Date().toISOString() });
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        },

        getSetting: async function (key) {
            const database = await initOfflineDB();
            const tx = database.transaction(STORES.SETTINGS, 'readonly');
            const store = tx.objectStore(STORES.SETTINGS);

            return new Promise((resolve, reject) => {
                const request = store.get(key);
                request.onsuccess = () => resolve(request.result?.value);
                request.onerror = () => reject(request.error);
            });
        }
    };

    // ==================== NETWORK STATUS ====================
    window.isOnline = function () {
        return navigator.onLine;
    };

    // ==================== SYNC MANAGER ====================
    window.syncManager = {
        // Sync all pending data when back online
        syncAll: async function () {
            if (!isOnline()) {
                console.log('[Sync] Still offline, skipping sync');
                return;
            }

            console.log('[Sync] Starting sync...');
            const queue = await offlineDB.getSyncQueue();
            console.log('[Sync] Items to sync:', queue.length);

            let synced = 0;
            let failed = 0;

            for (const item of queue) {
                try {
                    await this.syncItem(item);
                    await offlineDB.removeFromSyncQueue(item.id);
                    synced++;
                } catch (e) {
                    console.error('[Sync] Failed to sync item:', item.id, e);
                    failed++;
                }
            }

            console.log('[Sync] Complete. Synced:', synced, 'Failed:', failed);

            // Show notification
            if (typeof showToast === 'function') {
                if (synced > 0) {
                    showToast('✅ Synced ' + synced + ' offline items!', 'success');
                }
                if (failed > 0) {
                    showToast('⚠️ ' + failed + ' items failed to sync', 'error');
                }
            }

            return { synced, failed };
        },

        // Sync individual item to Firebase
        syncItem: async function (item) {
            console.log('[Sync] Syncing item:', item.type, item.data?.id);

            if (item.type === 'sale') {
                // Sync sale to Firebase
                const sale = item.data;

                // Check if Firebase is available (setDoc, doc, updateDoc, etc.)
                if (typeof window.setDoc !== 'function' || typeof window.doc !== 'function') {
                    console.warn('[Sync] Firebase not available, will retry later');
                    throw new Error('Firebase not available');
                }

                try {
                    // Save sale to Firestore
                    await window.setDoc(window.doc(window.db, 'sales', sale.id), {
                        ...sale,
                        syncedAt: new Date(),
                        offlineSale: true
                    });

                    // Update product stock
                    if (sale.items && Array.isArray(sale.items)) {
                        for (const cartItem of sale.items) {
                            try {
                                const productRef = window.doc(window.db, 'products', cartItem.productId);
                                await window.updateDoc(productRef, {
                                    stock: window.increment(-cartItem.qty)
                                });

                                // Log stock movement
                                if (typeof window.addDoc === 'function') {
                                    await window.addDoc(window.collection(window.db, 'stock_movements'), {
                                        type: 'sale',
                                        productId: cartItem.productId,
                                        productName: cartItem.name,
                                        quantity: -cartItem.qty,
                                        reason: `Offline POS Sale #${sale.id}`,
                                        performedBy: sale.cashierName || 'Offline User',
                                        timestamp: new Date()
                                    });
                                }
                            } catch (stockErr) {
                                console.warn('[Sync] Failed to update stock for:', cartItem.name, stockErr);
                            }
                        }
                    }

                    console.log('[Sync] Sale synced successfully:', sale.id);
                    return true;
                } catch (e) {
                    console.error('[Sync] Failed to sync sale:', e);
                    throw e;
                }
            }

            // Handle other sync types (stock_update, order, etc.)
            console.log('[Sync] Unknown sync type:', item.type);
            return true;
        }
    };

    // ==================== AUTO-SYNC ON NETWORK CHANGE ====================
    window.addEventListener('online', async () => {
        console.log('[Network] Back online!');

        // Show indicator
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }

        // Trigger sync
        try {
            await syncManager.syncAll();
        } catch (e) {
            console.error('[Sync] Auto-sync failed:', e);
        }
    });

    window.addEventListener('offline', () => {
        console.log('[Network] Gone offline!');

        // Show indicator
        const indicator = document.getElementById('offline-indicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }

        if (typeof showToast === 'function') {
            showToast('📵 You are now offline. Changes will sync when connected.', 'warning');
        }
    });

    // Initialize on load
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await initOfflineDB();
            console.log('[OfflineDB] Initialized');

            // Check initial network status
            if (!isOnline()) {
                const indicator = document.getElementById('offline-indicator');
                if (indicator) {
                    indicator.classList.remove('hidden');
                }
            }
        } catch (e) {
            console.error('[OfflineDB] Init failed:', e);
        }
    });

})();
