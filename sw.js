// Service Worker for Buddika Stores - Offline Mode
// Handles caching of static assets and provides offline functionality

const CACHE_NAME = 'buddika-stores-v3';
const DYNAMIC_CACHE = 'buddika-dynamic-v3';
const IMAGE_CACHE = 'buddika-images-v1';

// Static assets to cache on install
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/products.html',
    '/pos.html',
    '/admin.html',
    '/offline.html',
    '/assets/css/style.css',
    '/assets/js/firebase-config.js',
    '/assets/js/utils.js',
    '/assets/js/stock-management.js',
    '/assets/js/supplier-management.js',
    '/manifest.json'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => {
                console.error('[SW] Cache install failed:', err);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE && name !== IMAGE_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Check if this is a Firebase Storage image request
    const isFirebaseStorageImage = url.hostname.includes('firebasestorage.googleapis.com') ||
        url.hostname.includes('storage.googleapis.com');

    // Skip Firebase API calls (but NOT storage images)
    if ((url.hostname.includes('firestore.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('securetoken.googleapis.com')) &&
        !isFirebaseStorageImage) {
        return;
    }

    // Handle Firebase Storage images - Cache them for offline!
    if (isFirebaseStorageImage) {
        event.respondWith(
            caches.match(request)
                .then((cached) => {
                    if (cached) {
                        console.log('[SW] Serving cached image:', url.pathname.split('/').pop());
                        return cached;
                    }
                    // Not in cache, fetch and cache
                    return fetch(request)
                        .then((response) => {
                            if (response.ok) {
                                const clone = response.clone();
                                caches.open('buddika-images-v1').then((cache) => {
                                    cache.put(request, clone);
                                    console.log('[SW] Cached image:', url.pathname.split('/').pop());
                                });
                            }
                            return response;
                        })
                        .catch(() => {
                            // Return placeholder for offline images
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f3f4f6" width="100" height="100"/><text fill="#9ca3af" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10">📷</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        });
                })
        );
        return;
    }

    // Network-first strategy for HTML pages
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone and cache successful responses
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(DYNAMIC_CACHE).then((cache) => {
                            cache.put(request, clone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Try cache, then offline page
                    return caches.match(request)
                        .then((cached) => {
                            return cached || caches.match('/offline.html');
                        });
                })
        );
        return;
    }

    // Cache-first strategy for static assets
    event.respondWith(
        caches.match(request)
            .then((cached) => {
                if (cached) {
                    return cached;
                }
                // Not in cache, fetch from network
                return fetch(request)
                    .then((response) => {
                        // Cache successful responses
                        if (response.ok) {
                            const clone = response.clone();
                            caches.open(DYNAMIC_CACHE).then((cache) => {
                                cache.put(request, clone);
                            });
                        }
                        return response;
                    })
                    .catch(() => {
                        // Return placeholder for images
                        if (request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
                            return new Response(
                                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#f3f4f6" width="100" height="100"/><text fill="#9ca3af" x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="10">📷</text></svg>',
                                { headers: { 'Content-Type': 'image/svg+xml' } }
                            );
                        }
                    });
            })
    );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync triggered:', event.tag);

    if (event.tag === 'sync-transactions') {
        event.waitUntil(syncOfflineTransactions());
    }
});

// Sync offline transactions when back online
async function syncOfflineTransactions() {
    try {
        // Get pending transactions from IndexedDB
        const db = await openOfflineDB();
        const tx = db.transaction('pendingTransactions', 'readonly');
        const store = tx.objectStore('pendingTransactions');
        const pending = await store.getAll();

        console.log('[SW] Syncing', pending.length, 'pending transactions');

        // Notify clients about sync
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
            client.postMessage({
                type: 'SYNC_STARTED',
                count: pending.length
            });
        });

    } catch (e) {
        console.error('[SW] Sync failed:', e);
    }
}

// Helper: Open IndexedDB
function openOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BuddikaOfflineDB', 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('[SW] Service Worker loaded');
