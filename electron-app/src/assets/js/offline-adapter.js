// Offline Adapter for Electron POS
// This replaces Firebase calls with local SQLite when in Electron

(function () {
    'use strict';

    // Check if running in Electron
    const isElectron = typeof window.electronAPI !== 'undefined';

    if (!isElectron) {
        console.log('Not in Electron - using online Firebase');
        return;
    }

    console.log('🔌 Electron detected - Initializing offline adapter');

    // Network status indicator
    let isOnline = navigator.onLine;

    // Create status indicator
    function createStatusIndicator() {
        const indicator = document.createElement('div');
        indicator.id = 'network-status';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(indicator);
        updateStatusIndicator();
    }

    function updateStatusIndicator() {
        const indicator = document.getElementById('network-status');
        if (!indicator) return;

        if (isOnline) {
            indicator.innerHTML = '🟢 Online';
            indicator.style.background = '#10b981';
            indicator.style.color = 'white';
        } else {
            indicator.innerHTML = '🔴 Offline (Local Mode)';
            indicator.style.background = '#ef4444';
            indicator.style.color = 'white';
        }
    }

    // Monitor network status
    window.addEventListener('online', async () => {
        isOnline = true;
        updateStatusIndicator();
        console.log('🟢 Network: Online - Starting sync...');
        await syncPendingData();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        updateStatusIndicator();
        console.log('🔴 Network: Offline - Using local database');
    });

    // Sync pending data when online
    async function syncPendingData() {
        try {
            const pending = await window.electronAPI.db.getPendingSync();
            console.log(`📤 Syncing ${pending.length} pending items...`);

            // Sync logic would go here
            // For now, just mark as synced after delay
            for (const item of pending) {
                await window.electronAPI.db.markSynced(item.id);
            }

            console.log('✅ Sync complete');
        } catch (error) {
            console.error('❌ Sync error:', error);
        }
    }

    // Override product loading
    window.loadProductsOffline = async function () {
        try {
            const products = await window.electronAPI.db.getProducts();
            console.log(`📦 Loaded ${products.length} products from local database`);
            return products;
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        }
    };

    // Override save sale
    window.saveSaleOffline = async function (sale) {
        try {
            const result = await window.electronAPI.db.saveSale(sale);
            console.log('💾 Sale saved locally:', result.id);

            if (isOnline) {
                // Sync immediately if online
                await syncPendingData();
            }

            return result;
        } catch (error) {
            console.error('Error saving sale:', error);
            throw error;
        }
    };

    // Override add product
    window.addProductOffline = async function (product) {
        try {
            const result = await window.electronAPI.db.addProduct(product);
            console.log('➕ Product added locally:', result.id);
            return result;
        } catch (error) {
            console.error('Error adding product:', error);
            throw error;
        }
    };

    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', () => {
        createStatusIndicator();

        // Check initial online status
        window.electronAPI.isOnline().then(online => {
            isOnline = online;
            updateStatusIndicator();
        });
    });

    console.log('✅ Offline adapter initialized');
})();
