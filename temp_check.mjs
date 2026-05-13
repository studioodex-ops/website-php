
        import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, getDocs, getDoc, doc, setDoc, updateDoc, increment, query, orderBy, addDoc, onSnapshot } from './assets/js/firebase-config.js';
        import { escapeHtml } from './assets/js/utils.js';

        // Global State
        let allProducts = [];
        let cart = [];
        let currentUser = null;
        let currentCategory = 'all';
        let currentSubcategory = null; // NEW: Track selected subcategory
        let discountMode = 'rs'; // rs or percent
        let lastSaleData = null; // Store last sale for WhatsApp
        let allCustomers = []; // NEW: For auto-suggest
        let categoriesData = {}; // NEW: Store dynamic category config

        // --- DYNAMIC CATEGORIES ENGINE ---
        function loadDynamicCategories() {
            const ref = doc(db, 'settings', 'categories_config');
            onSnapshot(ref, (docSnap) => {
                if (docSnap.exists()) {
                    console.log('[POS] Category config updated');
                    categoriesData = docSnap.data().data || {};
                    renderDynamicCategoryBar(categoriesData);
                }
            }, (error) => {
                console.warn('[POS] Failed to load categories:', error);
                renderDynamicCategoryBar({}); // Fallback to empty to allow UI to show
            });
        }

        function renderDynamicCategoryBar(categories) {
            const row = document.getElementById('dynamic-categories-row');
            if (!row) return;
            
            // Keep the 'All' button
            row.innerHTML = `
                <button onclick="filterByCategory('all')"
                    class="category-btn whitespace-nowrap bg-black text-white px-4 py-2 rounded-lg text-sm font-bold flex-shrink-0"
                    data-cat="all">All Category</button>
            `;

            try {
                Object.keys(categories).sort().forEach(catName => {
                    const catData = categories[catName];
                    if (!catData || typeof catData !== 'object') return;

                    const hasSubcategories = Object.values(catData).some(subs => Array.isArray(subs) && subs.length > 0);

                    const btn = document.createElement('button');
                    btn.className = "category-btn whitespace-nowrap bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex-shrink-0 flex items-center gap-1";
                    btn.dataset.cat = catName;
                    
                    if (hasSubcategories) {
                        btn.onclick = () => toggleCategoryDropdown(catName);
                        btn.innerHTML = `${catName} <svg class="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>`;
                    } else {
                        btn.onclick = () => filterByCategory(catName);
                        btn.innerText = catName;
                    }

                    row.appendChild(btn);
                });

                // --- ADDED: CATEGORY 6 (OFFERS) Manual Entry ---
                // In index.html, Category 6 is "Special Offers & Promotions"
                const offerCat = "Special Offers & Promotions";
                if (!categories[offerCat]) {
                    const offerBtn = document.createElement('button');
                    offerBtn.className = "category-btn whitespace-nowrap bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 flex-shrink-0 flex items-center gap-1";
                    offerBtn.dataset.cat = offerCat;
                    offerBtn.onclick = () => filterByCategory(offerCat);
                    offerBtn.innerText = "Offers"; // Short label for POS
                    row.appendChild(offerBtn);
                }
            } catch (err) {
                console.error('[POS] Error rendering categories:', err);
            }
            
            // Restore active state
            if (typeof updateCategoryUI === 'function') {
                updateCategoryUI(currentCategory);
            }
        }

        function updateCategoryUI(category) {
            document.querySelectorAll('.category-btn').forEach(btn => {
                if (btn.dataset.cat === category) {
                    btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                    btn.classList.add('bg-black', 'text-white');
                } else {
                    btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                    btn.classList.remove('bg-black', 'text-white');
                }
            });
        }

        // DOM Elements
        const loginContainer = document.getElementById('login-container');
        const posContainer = document.getElementById('pos-container');
        const productsGrid = document.getElementById('products-grid');
        const cartItemsContainer = document.getElementById('cart-items');
        const searchInput = document.getElementById('product-search');

        // Expose Firebase functions globally for offline sync manager
        window.db = db;
        window.doc = doc;
        window.setDoc = setDoc;
        window.updateDoc = updateDoc;
        window.addDoc = addDoc;
        window.collection = collection;
        window.increment = increment;

        // ==================== HELAPAY MODAL ====================
        window.openHelaPayModal = () => {
            if (cart.length === 0) {
                showToast('Cart is empty!', 'error');
                return;
            }
            document.getElementById('helapay-modal').classList.remove('hidden');
        };

        window.closeHelaPayModal = () => {
            document.getElementById('helapay-modal').classList.add('hidden');
        };

        // ==================== BARCODE SCANNER ====================
        let scannerActive = false;

        // Open Barcode Scanner Modal
        window.openBarcodeScanner = () => {
            document.getElementById('barcode-modal').classList.remove('hidden');
            document.getElementById('manual-barcode-input').value = '';
            document.getElementById('barcode-result').classList.add('hidden');
            startBarcodeScanner();
        };

        // Close Barcode Scanner
        window.closeBarcodeScanner = () => {
            stopBarcodeScanner();
            document.getElementById('barcode-modal').classList.add('hidden');
        };

        // Start Barcode Scanner with Quagga
        function startBarcodeScanner() {
            if (typeof Quagga === 'undefined') {
                console.error('Quagga not loaded');
                showToast('Scanner library not loaded', 'error');
                return;
            }

            if (scannerActive) return;

            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.getElementById('barcode-scanner-view'),
                    constraints: {
                        facingMode: "environment", // Use back camera
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    }
                },
                decoder: {
                    readers: [
                        "ean_reader",        // EAN-13, EAN-8
                        "ean_8_reader",
                        "code_128_reader",   // Code 128
                        "code_39_reader",    // Code 39
                        "upc_reader",        // UPC-A, UPC-E
                        "upc_e_reader"
                    ]
                },
                locate: true,
                locator: {
                    halfSample: true,
                    patchSize: "medium"
                }
            }, function (err) {
                if (err) {
                    console.error('Quagga init error:', err);
                    showToast('Camera access denied or not available', 'error');
                    return;
                }
                console.log('[Scanner] Initialized');
                Quagga.start();
                scannerActive = true;
            });

            // Barcode detected
            Quagga.onDetected(function (result) {
                const code = result.codeResult.code;
                console.log('[Scanner] Detected:', code);

                // Play beep sound
                playBeep();

                // Search product
                handleBarcodeResult(code);

                // Stop scanner
                stopBarcodeScanner();
            });
        }

        // Stop Barcode Scanner
        function stopBarcodeScanner() {
            if (!scannerActive) return;
            try {
                Quagga.stop();
            } catch (e) {
                console.warn('Quagga stop error:', e);
            }
            scannerActive = false;
        }

        // Handle barcode result - search product
        function handleBarcodeResult(barcode) {
            const resultDiv = document.getElementById('barcode-result');

            // Search product by SKU/barcode
            const product = allProducts.find(p =>
                p.sku === barcode ||
                p.barcode === barcode ||
                (p.sku && p.sku.toLowerCase() === barcode.toLowerCase())
            );

            if (product) {
                resultDiv.innerHTML = `
                    <div class="bg-green-50 text-green-700 p-3 rounded-lg">
                        <p class="font-bold">✅ Found: ${escapeHtml(product.name)}</p>
                        <p class="text-xs">Rs. ${product.price} | Stock: ${product.stock}</p>
                    </div>
                `;
                resultDiv.classList.remove('hidden');

                // Close modal and add to cart
                setTimeout(() => {
                    closeBarcodeScanner();
                    addToCart(product.id);
                }, 800);
            } else {
                resultDiv.innerHTML = `
                    <div class="bg-red-50 text-red-700 p-3 rounded-lg">
                        <p class="font-bold">❌ Product not found</p>
                        <p class="text-xs">Barcode: ${barcode}</p>
                    </div>
                `;
                resultDiv.classList.remove('hidden');
                showToast('Product not found for barcode: ' + barcode, 'error');
            }
        }

        // Manual barcode search
        window.searchByBarcode = () => {
            const barcode = document.getElementById('manual-barcode-input').value.trim();
            if (!barcode) {
                showToast('Please enter a barcode', 'error');
                return;
            }
            handleBarcodeResult(barcode);
        };

        // Custom Item Functions
        window.openCustomItemModal = () => {
            document.getElementById('custom-item-modal').classList.remove('hidden');
            document.getElementById('custom-item-name').value = '';
            document.getElementById('custom-item-price').value = '';
            document.getElementById('custom-item-cost').value = '';
            document.getElementById('custom-item-qty').value = '1';
        };

        window.closeCustomItemModal = () => {
            document.getElementById('custom-item-modal').classList.add('hidden');
        };

        window.addCustomItemToCart = () => {
            const name = document.getElementById('custom-item-name').value.trim();
            const price = parseFloat(document.getElementById('custom-item-price').value);
            const cost = parseFloat(document.getElementById('custom-item-cost').value) || 0;
            const qty = parseFloat(document.getElementById('custom-item-qty').value);

            if (!name) {
                showToast('Please enter an item name', 'error');
                return;
            }
            if (isNaN(price) || price < 0) {
                showToast('Please enter a valid price', 'error');
                return;
            }
            if (isNaN(qty) || qty <= 0) {
                showToast('Please enter a valid quantity', 'error');
                return;
            }

            const customProduct = {
                id: 'custom-' + Date.now(),
                name: name,
                price: price,
                cost: cost,
                stock: 99999, // Infinite stock for custom items
                unit: 'unit'
            };

            addItemToCart(customProduct, qty);
            closeCustomItemModal();
        };


        // Play beep sound on scan
        function playBeep() {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 1000;
                oscillator.type = 'sine';
                gainNode.gain.value = 0.3;

                oscillator.start();
                setTimeout(() => oscillator.stop(), 100);
            } catch (e) {
                console.log('Beep not available');
            }
        }

        // Toggle Discount Type
        window.toggleDiscountType = () => {
            const btn = document.getElementById('discount-type-btn');
            if (discountMode === 'rs') {
                discountMode = 'percent';
                btn.innerText = '%';
                btn.classList.add('bg-black', 'text-white');
                btn.classList.remove('bg-gray-200', 'text-gray-700');
            } else {
                discountMode = 'rs';
                btn.innerText = 'Rs';
                btn.classList.remove('bg-black', 'text-white');
                btn.classList.add('bg-gray-200', 'text-gray-700');
            }
            updateTotals();
        };

        // Filter by Category (Clear subcategory when category changes)
        window.filterByCategory = (category) => {
            currentCategory = category;
            currentSubcategory = null; // Reset subcategory

            // Hide subcategory row
            document.getElementById('subcategory-row').classList.add('hidden');

            updateCategoryUI(category);

            renderProducts();
        };

        // Toggle Category Dropdown (Show Subcategory Chips)
        window.toggleCategoryDropdown = (category) => {
            currentCategory = category;
            currentSubcategory = null;

            updateCategoryUI(category);

            // Get subcategories for this category from dynamic data
            const catData = categoriesData[category];
            if (!catData) {
                document.getElementById('subcategory-row').classList.add('hidden');
                renderProducts();
                return;
            }

            // Build subcategory chips
            const chipsContainer = document.getElementById('subcategory-chips');
            let chipsHtml = `<button onclick="clearSubcategory()" 
                class="subcategory-chip whitespace-nowrap bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0">
                All ${category}
            </button>`;

            // Add grouped subcategories
            for (const [group, items] of Object.entries(catData)) {
                if (Array.isArray(items)) {
                    items.forEach(subcat => {
                        chipsHtml += `<button onclick="filterBySubcategory('${subcat}')" 
                            class="subcategory-chip whitespace-nowrap bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-gray-200 flex-shrink-0"
                            data-subcat="${subcat}">
                            ${subcat}
                        </button>`;
                    });
                }
            }

            chipsContainer.innerHTML = chipsHtml;
            document.getElementById('subcategory-row').classList.remove('hidden');

            renderProducts();
        };

        // Filter by Subcategory
        window.filterBySubcategory = (subcategory) => {
            currentSubcategory = subcategory;

            // Update subcategory chip styling
            document.querySelectorAll('.subcategory-chip').forEach(chip => {
                if (chip.dataset.subcat === subcategory) {
                    chip.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                    chip.classList.add('bg-black', 'text-white');
                } else {
                    chip.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                    chip.classList.remove('bg-black', 'text-white');
                }
            });

            // First chip is "All [Category]"
            const firstChip = document.querySelector('.subcategory-chip');
            if (firstChip && !subcategory) {
                firstChip.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                firstChip.classList.add('bg-black', 'text-white');
            } else if (firstChip) {
                firstChip.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                firstChip.classList.remove('bg-black', 'text-white');
            }

            renderProducts();
        };

        // Clear Subcategory (Show all in category)
        window.clearSubcategory = () => {
            currentSubcategory = null;

            // Reset all chips
            document.querySelectorAll('.subcategory-chip').forEach(chip => {
                chip.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                chip.classList.remove('bg-black', 'text-white');
            });

            // Highlight first chip
            const firstChip = document.querySelector('.subcategory-chip');
            if (firstChip) {
                firstChip.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
                firstChip.classList.add('bg-black', 'text-white');
            }

            renderProducts();
        };

        // Auth State - Redirect to admin if not logged in
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log('[POS] User identified:', user.email);
                
                // Hide overlay and show POS regardless of data state (defensive)
                setTimeout(() => {
                    const overlay = document.getElementById('login-container');
                    if (overlay) overlay.classList.add('hidden');
                    
                    const posUI = document.getElementById('pos-container');
                    if (posUI) posUI.classList.remove('hidden');

                    // --- ATTACH KEYPAD LISTENERS HERE (Surer that elements exist) ---
                    const priceInputs = ['received-amount', 'custom-item-price', 'discount-input'];
                    priceInputs.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            el.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    const val = parseFloat(el.value) || 0;
                                    if (val > 0) {
                                        el.value = (val / 100).toFixed(2);
                                        if (id === 'received-amount') calculateChange();
                                        if (id === 'discount-input') updateTotals();
                                        e.preventDefault();
                                    }
                                }
                            });
                        }
                    });

                    // Add barcode manual listener
                    const barcodeInput = document.getElementById('manual-barcode-input');
                    if (barcodeInput) {
                        barcodeInput.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') searchByBarcode();
                        });
                    }
                }, 500);

                document.getElementById('cashier-name').innerText = user.displayName || user.email;
                
                // Start loading sequence safely
                try {
                    loadDynamicCategories();
                    loadProducts().catch(e => console.error('[POS] loadProducts failed:', e));
                    loadCustomers().catch(e => console.error('[POS] loadCustomers failed:', e));
                } catch (initErr) {
                    console.error('[POS] Initialization crash:', initErr);
                }
            } else {
                // Not logged in - redirect to admin panel for login
                window.location.href = 'admin.html';
            }
        });

        // Logout
        window.handleLogout = () => {
            if (confirm('Are you sure you want to logout?')) {
                signOut(auth);
            }
        };

        // Load Products - Offline Aware
        async function loadProducts() {
            try {
                // Check if online
                if (navigator.onLine) {
                    // Online: Load from Firebase and cache to IndexedDB
                    console.log('[POS] Fetching products from Firebase...');
                    
                    // Create a timeout for the fetch
                    const fetchWithTimeout = new Promise(async (resolve, reject) => {
                        const timeout = setTimeout(() => reject('timeout'), 8000);
                        try {
                            const q = query(collection(db, 'products'), orderBy('name'));
                            const snapshot = await getDocs(q);
                            clearTimeout(timeout);
                            resolve(snapshot);
                        } catch (e) {
                            clearTimeout(timeout);
                            reject(e);
                        }
                    });

                    const snapshot = await fetchWithTimeout;

                    allProducts = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })).filter(p => !p.automated); // Filter out automated items (News/Updates)

                    // Cache to IndexedDB for offline use
                    if (typeof offlineDB !== 'undefined' && offlineDB.saveProducts) {
                        try {
                            await offlineDB.saveProducts(allProducts);
                            console.log('[POS] Products cached to IndexedDB:', allProducts.length);
                        } catch (cacheErr) {
                            console.warn('[POS] Failed to cache products:', cacheErr);
                        }
                    }

                    updateOnlineStatus(true);
                    renderProducts();
                } else {
                    // Offline: Load from IndexedDB
                    console.log('[POS] Offline - Loading from IndexedDB');

                    if (typeof offlineDB !== 'undefined' && offlineDB.getProducts) {
                        allProducts = await offlineDB.getProducts();
                        console.log('[POS] Loaded from IndexedDB:', allProducts.length, 'products');

                        if (allProducts.length > 0) {
                            updateOnlineStatus(false);
                            renderProducts();
                            showToast('📵 Offline Mode - Using cached products', 'warning');
                        } else {
                            productsGrid.innerHTML = '<div class="col-span-full text-center py-20 text-orange-500"><p class="text-xl mb-2">📵 No Cached Data</p><p class="text-sm">Connect to internet to load products first time</p></div>';
                        }
                    } else {
                        throw new Error('Offline database not available');
                    }
                }
            } catch (error) {
                console.error('Error loading products:', error);

                // Try offline fallback on any error
                if (typeof offlineDB !== 'undefined' && offlineDB.getProducts) {
                    try {
                        allProducts = await offlineDB.getProducts();
                        // Also filter for offline fallback
                        allProducts = allProducts.filter(p => !p.automated);
                        if (allProducts.length > 0) {
                            updateOnlineStatus(false);
                            renderProducts();
                            showToast('📵 Using offline cached data', 'warning');
                            return;
                        }
                    } catch (offlineErr) {
                        console.error('Offline fallback failed:', offlineErr);
                    }
                }

                productsGrid.innerHTML = '<div class="col-span-full text-center py-20 text-red-500">Failed to load products</div>';
            }
        }

        // Load Customers for Auto-Suggest
        async function loadCustomers() {
            try {
                if (!navigator.onLine) {
                    console.log('[POS] Offline - Skipping customer load');
                    return;
                }

                const snapshot = await getDocs(collection(db, 'customers'));
                allCustomers = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                // Populate datalist with customer phone numbers
                const datalist = document.getElementById('customer-suggestions');
                if (datalist) {
                    datalist.innerHTML = allCustomers.map(c =>
                        `<option value="${c.phone}">${c.phone} (${c.totalPurchases || 0} purchases)</option>`
                    ).join('');
                }

                console.log('[POS] Loaded', allCustomers.length, 'customers for auto-suggest');
            } catch (error) {
                console.warn('Error loading customers:', error);
            }
        }

        // Update online/offline status indicator
        function updateOnlineStatus(isOnline) {
            const statusBadge = document.querySelector('header span.bg-green-100, header span.bg-red-100');
            if (statusBadge) {
                if (isOnline) {
                    statusBadge.className = 'text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold';
                    statusBadge.innerText = 'Online';
                } else {
                    statusBadge.className = 'text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-bold';
                    statusBadge.innerText = 'Offline';
                }
            }
        }

        // Render Products
        function renderProducts() {
            const searchTerm = searchInput.value.toLowerCase();
            let filtered = allProducts;

            // Filter by category
            if (currentCategory !== 'all') {
                const targetCat = currentCategory.trim().toLowerCase();
                filtered = filtered.filter(p => p.category && p.category.trim().toLowerCase() === targetCat);
            }

            // Filter by subcategory (NEW)
            if (currentSubcategory) {
                const targetSubcat = currentSubcategory.trim().toLowerCase();
                filtered = filtered.filter(p =>
                    p.subcategory && p.subcategory.trim().toLowerCase() === targetSubcat
                );
            }

            // Filter by search
            if (searchTerm) {
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(searchTerm) ||
                    (p.sku && p.sku.toLowerCase().includes(searchTerm)) ||
                    (p.subcategory && p.subcategory.toLowerCase().includes(searchTerm))
                );
            }

            if (filtered.length === 0) {
                productsGrid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-400"><p>No products found</p></div>';
                return;
            }

            productsGrid.innerHTML = filtered.map(p => {
                const stockClass = (p.stock <= 0) ? 'opacity-50 pointer-events-none' : '';
                const stockBadge = (p.stock <= 5 && p.stock > 0) ? '<span class="absolute top-2 right-2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">Low Stock</span>' : '';
                const outOfStock = (p.stock <= 0) ? '<span class="absolute top-2 right-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">Out</span>' : '';

                // Expiry Date Badge
                let expiryBadge = '';
                if (p.expiryDate) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const expDate = new Date(p.expiryDate);
                    const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

                    if (daysUntil <= 0) {
                        expiryBadge = '<span class="absolute bottom-2 left-2 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold animate-pulse">⚠️ EXPIRED</span>';
                    } else if (daysUntil <= 7) {
                        expiryBadge = `<span class="absolute bottom-2 left-2 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">⏰ ${daysUntil}d left</span>`;
                    } else if (daysUntil <= 30) {
                        expiryBadge = `<span class="absolute bottom-2 left-2 bg-yellow-500 text-white text-[9px] px-1.5 py-0.5 rounded">Exp: ${daysUntil}d</span>`;
                    }
                }

                // Fix: Remove 'Rs.' and non-numeric chars, but be careful with dots in 'Rs.'
                let priceStr = String(p.price).replace(/Rs\.?\s*/i, ''); // Remove Rs. or Rs
                let priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;

                const unit = (p.unit || 'unit').toLowerCase();
                let displayPrice = priceNum;
                let displayUnit = unit;

                // Smart Heuristic:
                // 1. If unit is 'g'/'ml', we want to show price per 'kg'/'l'.
                // 2. If price is < 1 (e.g. 0.20), it's likely per-gram or mis-entered. Convert to per-kg (x1000).
                // 3. If price is > 1 (e.g. 200), it's likely already per-kg. Keep it.

                if (unit === 'g') {
                    displayUnit = 'kg';
                    // displayPrice adjustment removed to match Admin
                } else if (unit === 'ml') {
                    displayUnit = 'l';
                    // displayPrice adjustment removed to match Admin
                } else {
                    // Start: Logic removed
                    // Old logic multiplied by 1000 if price < 1
                    // End: Logic removed
                }

                return `
                    <div class="product-grid-item bg-white rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all relative ${stockClass}" onclick="addToCart('${p.id}')">
                        ${stockBadge}${outOfStock}
                        ${expiryBadge}
                        <div class="h-20 bg-gray-50 rounded-lg mb-3 flex items-center justify-center">
                            ${p.image && p.image.startsWith('emoji:')
                        ? `<span class="text-3xl">${p.image.split(':')[1]}</span>`
                        : p.image
                            ? `<img src="${p.image}" class="w-full h-full object-cover rounded-lg">`
                            : '<div class="w-10 h-10 bg-gray-200 rounded"></div>'
                    }
                        </div>
                        <h3 class="font-bold text-gray-800 text-lg leading-tight mb-1 truncate">${p.name}</h3>
                        <div class="flex justify-between items-center text-sm">
                            <span class="font-bold text-sm">Rs. ${displayPrice.toFixed(2)}</span>
                            <span class="text-xs text-gray-400">${p.stock || 0} ${unit}</span>
                        </div>
                        <div class="text-xs text-gray-400 mt-1 text-right">
                             (per ${displayUnit})
                        </div>
                    </div>
                `;
            }).join('');
        }

        // Pending product for quantity modal
        let pendingProduct = null;

        // Add to Cart - Show quantity modal for kg/g/l/ml units
        window.addToCart = (productId) => {
            const product = allProducts.find(p => p.id === productId);
            if (!product) return;

            if (product.stock <= 0) {
                showToast('Product is out of stock!', 'error');
                return;
            }

            // Check for expired product
            if (product.expiryDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expDate = new Date(product.expiryDate);
                const daysUntil = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

                if (daysUntil <= 0) {
                    if (!confirm(`⚠️ WARNING: "${product.name}" is EXPIRED!\n\nDo you still want to add it to cart?`)) {
                        return;
                    }
                } else if (daysUntil <= 7) {
                    showToast(`⏰ Note: "${product.name}" expires in ${daysUntil} days`, 'warning');
                }
            }

            const unit = product.unit || 'unit';
            // Trigger modal for weights, volumes, and specific liquor units
            const showModalUnits = ['kg', 'g', 'l', 'ml', '1 bottle', 'half bottle', 'quarter'];
            const needsModal = showModalUnits.includes(unit.toLowerCase());

            // Temporary Debug
            // alert(`Product: ${product.name}\nUnit: ${unit}\nNeeds Modal: ${needsModal}`);

            if (needsModal) {
                // Show quantity modal
                pendingProduct = product;
                document.getElementById('qty-modal-title').innerText = product.name;
                document.getElementById('qty-modal-desc').innerText = `Enter quantity of ${unit} (Available: ${product.stock})`;

                const qtyInput = document.getElementById('qty-input');
                qtyInput.value = '1';

                // Set step: 0.1 for kg/l, 10 for g/ml, 1 for others (bottles/quarters)
                const u = unit.toLowerCase();
                if (u === 'kg' || u === 'l') {
                    qtyInput.step = '0.1';
                    qtyInput.value = '1'; // Default 1kg
                } else if (u === 'g' || u === 'ml') {
                    qtyInput.step = '10';
                    qtyInput.value = '100'; // Default 100g
                } else {
                    qtyInput.step = '1'; // Default 1 bottle/quarter
                    qtyInput.value = '1';
                }

                document.getElementById('qty-unit-label').innerText = unit;
                document.getElementById('qty-modal').classList.remove('hidden');
            } else {
                // For regular units (Pack, Unit), add directly
                addItemToCart(product, 1);
            }
        };

        // Adjust quantity in modal
        window.adjustQtyInput = (delta) => {
            const input = document.getElementById('qty-input');
            const step = parseFloat(input.step) || 0.1;
            let value = parseFloat(input.value) || 0;
            value = Math.max(step, value + (delta * step));
            input.value = value.toFixed(step >= 1 ? 0 : 1);
        };

        // Close quantity modal
        window.closeQtyModal = () => {
            document.getElementById('qty-modal').classList.add('hidden');
            pendingProduct = null;
        };

        // Confirm add to cart from quantity modal
        window.confirmAddToCart = () => {
            if (!pendingProduct) return;

            const qty = parseFloat(document.getElementById('qty-input').value) || 0;
            if (qty <= 0) {
                showToast('Please enter a valid quantity!', 'error');
                return;
            }
            if (qty > pendingProduct.stock) {
                showToast(`Only ${pendingProduct.stock} ${pendingProduct.unit} available!`, 'error');
                return;
            }

            addItemToCart(pendingProduct, qty);
            closeQtyModal();
        };

        // Internal function to add item to cart
        function addItemToCart(product, qty) {
            const existingItem = cart.find(item => item.id === product.id);

            if (existingItem) {
                const newQty = existingItem.qty + qty;
                if (newQty > product.stock) {
                    showToast(`Only ${product.stock} ${product.unit || 'unit'} available!`, 'error');
                    return;
                }
                existingItem.qty = newQty;
            } else {
                // Fix: Remove 'Rs.' and non-numeric chars logic
                let priceStr = String(product.price).replace(/Rs\.?\s*/i, '');
                const priceNum = parseFloat(priceStr.replace(/[^0-9.]/g, '')) || 0;
                cart.push({
                    id: product.id,
                    name: product.name,
                    nameSi: product.nameSi || '', // Store Sinhala Name
                    price: priceNum,
                    qty: qty,
                    unit: product.unit || 'unit',
                    maxStock: product.stock || 999,
                    itemDiscount: 0,
                    cost: product.cost || 0 // Store Cost
                });
            }

            renderCart();
            showToast(`Added ${qty} ${product.unit || 'unit'} of ${product.name}`);
        }

        // Prompt for Item Discount
        window.promptForItemDiscount = (index) => {
            const item = cart[index];
            if (!item) return;

            const input = prompt(`Enter discount amount for ${item.name} (Rs.):`, item.itemDiscount || 0);
            if (input === null) return; // Cancelled

            const discount = parseFloat(input);
            if (isNaN(discount) || discount < 0) {
                alert("Invalid discount amount");
                return;
            }

            const itemTotal = item.price * item.qty;
            if (discount > itemTotal) {
                alert("Discount cannot exceed item total!");
                return;
            }

            item.itemDiscount = discount;
            renderCart();
        };

        // Render Cart
        function renderCart() {
            if (cart.length === 0) {
                cartItemsContainer.innerHTML = `
                    <div class="text-center py-12 text-gray-400">
                        <svg class="w-10 h-10 mx-auto mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                        </svg>
                        <p class="text-sm">No items in cart</p>
                    </div>
                `;
                updateTotals();
                return;
            }

            cartItemsContainer.innerHTML = cart.map((item, index) => {
                const itemTotal = (item.price * item.qty);
                const afterDiscount = itemTotal - (item.itemDiscount || 0);

                return `
                <div class="cart-item bg-gray-50 rounded-lg p-3 flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                        <div class="flex-1">
                            <h4 class="font-bold text-sm">${escapeHtml(item.name)}</h4>
                            <p class="text-xs text-gray-500">Rs. ${item.price.toFixed(2)} x ${item.qty} ${item.unit}</p>
                            ${item.itemDiscount > 0
                        ? `<p class="text-xs text-green-600 font-bold">Disc: -Rs. ${item.itemDiscount.toFixed(2)}</p>`
                        : ''}
                        </div>
                        <div class="text-right">
                             <div class="font-bold text-sm">Rs. ${afterDiscount.toFixed(2)}</div>
                             ${item.itemDiscount > 0
                        ? `<div class="text-xs text-gray-400 line-through">Rs. ${itemTotal.toFixed(2)}</div>`
                        : ''}
                        </div>
                    </div>
                    <div class="flex items-center justify-between border-t border-gray-100 pt-2">
                         <button onclick="promptForItemDiscount(${index})" class="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
                            Discount
                         </button>
                         <div class="flex items-center gap-2">
                            <button onclick="updateCartQty(${index}, -1)" class="w-7 h-7 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100">-</button>
                            <span class="w-8 text-center font-bold text-sm">${item.qty}</span>
                            <button onclick="updateCartQty(${index}, 1)" class="w-7 h-7 bg-white border border-gray-200 rounded flex items-center justify-center text-gray-500 hover:bg-gray-100">+</button>
                            <button onclick="removeFromCart(${index})" class="w-7 h-7 bg-red-50 text-red-500 rounded flex items-center justify-center hover:bg-red-100 ml-2">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            }).join('');

            updateTotals();
        }

        // Update Cart Quantity
        // Update Cart Quantity - Handle decimal steps
        window.updateCartQty = (index, delta) => {
            const item = cart[index];
            if (!item) return;

            const unit = (item.unit || 'unit').toLowerCase();
            let step = 1;

            // Determine step based on unit
            if (unit === 'kg' || unit === 'l') {
                step = 0.1;
            } else if (unit === 'g' || unit === 'ml') {
                step = 10;
            }

            // Calculate new quantity
            let newQty = parseFloat(item.qty) + (delta * step);

            // Fix floating point precision
            if (unit === 'kg' || unit === 'l') {
                newQty = parseFloat(newQty.toFixed(2));
            } else {
                newQty = Math.round(newQty);
            }

            if (newQty <= 0) {
                if (confirm('Remove item from cart?')) {
                    cart.splice(index, 1);
                }
            } else if (newQty > item.maxStock) {
                showToast(`Maximum stock reached! Only ${item.maxStock} available.`, 'error');
                return;
            } else {
                item.qty = newQty;
            }

            renderCart();
        };

        // Remove from Cart
        window.removeFromCart = (index) => {
            cart.splice(index, 1);
            renderCart();
        };

        // Clear Cart
        window.clearCart = () => {
            if (cart.length === 0) return;
            if (confirm('Clear all items from cart?')) {
                cart = [];
                renderCart();
            }
        };

        // Update Totals
        window.updateTotals = () => {
            const subtotal = cart.reduce((sum, item) => {
                const itemTotal = (item.price * item.qty);
                const discount = item.itemDiscount || 0;
                return sum + Math.max(0, itemTotal - discount);
            }, 0);
            const inputVal = parseFloat(document.getElementById('discount-input').value) || 0;

            let discount = 0;
            if (discountMode === 'percent') {
                discount = subtotal * (inputVal / 100);
            } else {
                discount = inputVal;
            }

            const total = Math.max(0, subtotal - discount);

            document.getElementById('cart-subtotal').innerText = `Rs. ${subtotal.toFixed(2)}`;
            document.getElementById('cart-total').innerText = `Rs. ${total.toFixed(2)}`;

            calculateChange();
        };

        // Calculate Change
        window.calculateChange = () => {
            const subtotal = cart.reduce((sum, item) => {
                const itemTotal = (item.price * item.qty);
                const discount = item.itemDiscount || 0;
                return sum + Math.max(0, itemTotal - discount);
            }, 0);
            const inputVal = parseFloat(document.getElementById('discount-input').value) || 0;

            let discount = 0;
            if (discountMode === 'percent') {
                discount = subtotal * (inputVal / 100);
            } else {
                discount = inputVal;
            }

            const total = Math.max(0, subtotal - discount);
            const received = parseFloat(document.getElementById('received-amount').value) || 0;
            const change = Math.max(0, received - total);

            document.getElementById('change-amount').innerText = `Rs. ${change.toFixed(2)}`;
        };

        // Search Products
        searchInput.addEventListener('input', renderProducts);

        // Complete Sale
        window.completeSale = async (paymentMethod) => {
            if (cart.length === 0) {
                showToast('Cart is empty!', 'error');
                return;
            }

            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const discount = parseFloat(document.getElementById('discount-input').value) || 0;
            const total = Math.max(0, subtotal - discount);
            const received = parseFloat(document.getElementById('received-amount').value) || 0;

            if (paymentMethod === 'cash' && received < total) {
                showToast('Received amount is less than total!', 'error');
                return;
            }

            try {
                // Generate sale ID
                const saleId = 'SALE-' + Date.now();

                // Prepare sale data
                const saleData = {
                    id: saleId,
                    items: cart.map(item => ({
                        productId: item.id,
                        name: item.name,
                        nameSi: item.nameSi || '', // Pass Sinhala Name to Sale
                        qty: item.qty,
                        price: item.price,
                        itemDiscount: item.itemDiscount || 0,
                        cost: item.cost || 0, // Save Cost to Sale
                        total: (item.price * item.qty) - (item.itemDiscount || 0)
                    })),
                    subtotal: subtotal,
                    discount: discount,
                    total: total,
                    // Calculate profit (total - sum of item costs)
                    totalCost: cart.reduce((sum, item) => sum + ((item.cost || 0) * item.qty), 0),
                    profit: total - cart.reduce((sum, item) => sum + ((item.cost || 0) * item.qty), 0),
                    received: paymentMethod === 'cash' ? received : total,
                    change: paymentMethod === 'cash' ? Math.max(0, received - total) : 0,
                    paymentMethod: paymentMethod,
                    // Customer phone (will be set when WhatsApp button is clicked)
                    customerPhone: null,
                    cashierId: currentUser.uid,
                    cashierName: currentUser.displayName || currentUser.email,
                    createdAt: new Date()
                };

                // Check if online or offline
                if (navigator.onLine) {
                    // ONLINE: Save to Firebase
                    await setDoc(doc(db, 'sales', saleId), saleData);

                    // Update product stock & Log Movement
                    for (const item of cart) {
                        // Skip stock modification for custom items
                        if (!item.id.startsWith('custom-')) {
                            const productRef = doc(db, 'products', item.id);
                            await updateDoc(productRef, {
                                stock: increment(-item.qty)
                            });
                        }

                        // Log Movement
                        try {
                            await addDoc(collection(db, 'stock_movements'), {
                                type: 'sale',
                                productId: item.id,
                                productName: item.name,
                                quantity: -item.qty,
                                reason: `POS Sale #${saleId}`,
                                performedBy: currentUser.displayName || currentUser.email,
                                timestamp: new Date()
                            });
                        } catch (err) {
                            console.error("Error logging movement:", err);
                        }
                    }

                    showToast('✅ Sale completed successfully!', 'success');

                } else {
                    // OFFLINE: Save to IndexedDB for later sync
                    console.log('[POS] Offline - Saving sale locally');

                    if (typeof offlineDB !== 'undefined' && offlineDB.saveSale) {
                        await offlineDB.saveSale(saleData);

                        // Add to sync queue
                        await offlineDB.addToSyncQueue('sale', saleData);

                        showToast('📵 Sale saved offline - Will sync when online', 'warning');
                    } else {
                        throw new Error('Offline database not available');
                    }
                }

                // Update local products (both online and offline)
                cart.forEach(item => {
                    if (!item.id.startsWith('custom-')) {
                        const product = allProducts.find(p => p.id === item.id);
                        if (product) {
                            product.stock = Math.max(0, (product.stock || 0) - item.qty);
                        }
                    }
                });

                // Update cached products in IndexedDB
                if (typeof offlineDB !== 'undefined' && offlineDB.saveProducts) {
                    try {
                        await offlineDB.saveProducts(allProducts);
                    } catch (e) {
                        console.warn('Failed to update cached products:', e);
                    }
                }

                // Generate and show receipt
                generateReceipt(saleData);

                // Clear cart
                cart = [];
                renderCart();
                document.getElementById('discount-input').value = 0;
                document.getElementById('received-amount').value = '';
                renderProducts();

            } catch (error) {
                console.error('Error completing sale:', error);

                // Try offline save as fallback
                if (typeof offlineDB !== 'undefined' && offlineDB.saveSale) {
                    try {
                        const saleId = 'SALE-' + Date.now();
                        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
                        const discount = parseFloat(document.getElementById('discount-input').value) || 0;
                        const total = Math.max(0, subtotal - discount);
                        const received = parseFloat(document.getElementById('received-amount').value) || 0;

                        const fallbackSale = {
                            id: saleId,
                            items: cart.map(item => ({
                                productId: item.id,
                                name: item.name,
                                nameSi: item.nameSi || '',
                                qty: item.qty,
                                price: item.price,
                                itemDiscount: item.itemDiscount || 0,
                                cost: item.cost || 0,
                                total: (item.price * item.qty) - (item.itemDiscount || 0)
                            })),
                            subtotal, discount, total, received,
                            change: Math.max(0, received - total),
                            paymentMethod: paymentMethod,
                            cashierId: currentUser?.uid || 'offline',
                            cashierName: currentUser?.displayName || currentUser?.email || 'Offline User',
                            createdAt: new Date()
                        };

                        await offlineDB.saveSale(fallbackSale);
                        await offlineDB.addToSyncQueue('sale', fallbackSale);

                        // Update local products
                        cart.forEach(item => {
                            if (!item.id.startsWith('custom-')) {
                                const product = allProducts.find(p => p.id === item.id);
                                if (product) {
                                    product.stock = Math.max(0, (product.stock || 0) - item.qty);
                                }
                            }
                        });

                        generateReceipt(fallbackSale);
                        cart = [];
                        renderCart();
                        document.getElementById('discount-input').value = 0;
                        document.getElementById('received-amount').value = '';
                        renderProducts();

                        showToast('📵 Sale saved offline (connection failed)', 'warning');
                        return;
                    } catch (offlineErr) {
                        console.error('Offline fallback failed:', offlineErr);
                    }
                }

                showToast('Failed to complete sale: ' + error.message, 'error');
            }
        };

        // Generate Receipt
        function generateReceipt(sale) {
            // Store for WhatsApp sending
            lastSaleData = sale;

            const receiptDate = new Date(sale.createdAt).toLocaleString('en-LK', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });

            const itemsHtml = sale.items.map(item => `
                <tr>
                    <td>
                        <span class="font-bold">${item.nameSi ? item.nameSi : ''}</span>
                        ${item.nameSi ? '<br>' : ''}
                        ${escapeHtml(item.name)}<br>
                        <small>${item.qty} x Rs. ${item.price.toFixed(2)}</small>
                        ${item.itemDiscount > 0 ? `<br><small style="color:red;">Discount: -Rs. ${item.itemDiscount.toFixed(2)}</small>` : ''}
                    </td>
                    <td>Rs. ${item.total.toFixed(2)}</td>
                </tr>
            `).join('');

            document.getElementById('receipt-content').innerHTML = `
                <div class="receipt-header">
                    <h2 class="font-sinhala">බුද්ධික ස්ටෝර්ස්</h2>
                    <p class="font-bold">BUDDIKA STORES</p>
                    <p class="font-sinhala">අංක 48, මහනුවර පාර, වලපනේ</p>
                    <p>No 48, Kandy Road, Walapane</p>
                    <p>Tel: 052-2279101 / 077-5192756</p>
                    <p>Voice: 0784668883</p>
                </div>
                
                <div class="receipt-info">
                    <p><strong>Receipt:</strong> ${escapeHtml(sale.id)}</p>
                    <p><strong>Date:</strong> ${receiptDate}</p>
                    <p><strong>Cashier:</strong> ${escapeHtml(sale.cashierName)}</p>
                </div>
                
                <div class="receipt-items">
                    <table>
                        <thead>
                            <tr>
                                <th>Item / අයිතමය</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>
                </div>
                
                <div class="receipt-totals">
                    <div class="total-row">
                        <span>Subtotal / උප එකතුව</span>
                        <span>Rs. ${sale.subtotal.toFixed(2)}</span>
                    </div>
                    ${sale.discount > 0 ? `
                    <div class="total-row">
                        <span>Discount / වට්ටම</span>
                        <span>- Rs. ${sale.discount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    <div class="total-row grand-total">
                        <span>Total / එකතුව</span>
                        <span>Rs. ${sale.total.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Received / ලැබුණු</span>
                        <span>Rs. ${sale.received.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Change / ඉතිරි</span>
                        <span>Rs. ${sale.change.toFixed(2)}</span>
                    </div>
                    <div class="total-row">
                        <span>Payment / ගෙවීම</span>
                        <span>${sale.paymentMethod === 'cash' ? 'Cash / මුදල්' : (sale.paymentMethod === 'helapay' ? 'HelaPay / QR' : 'Card / කාඩ්')}</span>
                    </div>
                </div>
                
                <div class="receipt-footer">
                    <p class="font-sinhala">ස්තූතියි! නැවත එන්න.</p>
                    <p class="thank-you">Thank You! Please Come Again.</p>
                    <p style="margin-top: 10px;">www.buddikastores.com</p>
                    <p style="margin-top: 5px; font-size: 10px; color: #555;">Software by Odex Studio (0784-66-88-3)</p>
                </div>
            `;

            document.getElementById('receipt-modal').classList.remove('hidden');
        }

        // Print Receipt
        window.printReceipt = () => {
            window.print();
        };

        // Send Receipt via WhatsApp - Beautiful Image Version
        window.sendReceiptWhatsApp = async () => {
            const phoneInput = document.getElementById('receipt-phone').value.trim();

            if (!phoneInput) {
                showToast('Please enter customer phone number', 'error');
                return;
            }

            // Clean phone number - remove spaces, dashes, etc.
            let phone = phoneInput.replace(/[^0-9]/g, '');

            // Convert Sri Lankan formats to international
            if (phone.startsWith('0')) {
                phone = '94' + phone.substring(1);
            } else if (!phone.startsWith('94')) {
                phone = '94' + phone;
            }

            if (phone.length < 11) {
                showToast('Invalid phone number format', 'error');
                return;
            }

            if (!lastSaleData) {
                showToast('No receipt data available', 'error');
                return;
            }

            // Save customer data and update sale record
            await saveCustomerPurchaseData(phoneInput, lastSaleData);

            showToast('🎨 Generating beautiful receipt...', 'info');

            try {
                // Generate a beautiful receipt HTML for WhatsApp
                const sale = lastSaleData;
                const receiptDate = new Date(sale.createdAt).toLocaleString('en-LK', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit'
                });

                // Calculate total savings
                let totalSavings = sale.discount || 0;
                sale.items.forEach(item => {
                    if (item.itemDiscount > 0) {
                        totalSavings += item.itemDiscount;
                    }
                });

                // Create beautiful receipt HTML
                const receiptHtml = `
                    <div id="whatsapp-receipt" style="
                        font-family: 'Noto Sans Sinhala', 'Inter', sans-serif;
                        width: 350px;
                        background: white;
                        padding: 25px;
                        border-radius: 16px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    ">
                        <!-- Header -->
                        <div style="text-align: center; padding-bottom: 15px; border-bottom: 2px dashed #e5e5e5; margin-bottom: 15px;">
                            <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 5px 0; color: #1a1a1a;">බුද්ධික ස්ටෝර්ස්</h2>
                            <p style="font-size: 14px; font-weight: 700; margin: 0 0 8px 0; color: #333;">BUDDIKA STORES</p>
                            <p style="font-size: 11px; color: #666; margin: 3px 0;">අංක 48, මහනුවර පාර, වලපනේ</p>
                            <p style="font-size: 11px; color: #666; margin: 3px 0;">No 48, Kandy Road, Walapane</p>
                            <p style="font-size: 11px; color: #666; margin: 3px 0;">Tel: 052-2279101 / 077-5192756</p>
                            <p style="font-size: 11px; color: #666; margin: 3px 0;">Voice: 0784668883</p>
                        </div>

                        <!-- Receipt Info -->
                        <div style="padding-bottom: 12px; border-bottom: 2px dashed #e5e5e5; margin-bottom: 12px;">
                            <p style="font-size: 12px; margin: 4px 0;"><strong>Receipt:</strong> ${escapeHtml(sale.id)}</p>
                            <p style="font-size: 12px; margin: 4px 0;"><strong>Date:</strong> ${receiptDate}</p>
                            <p style="font-size: 12px; margin: 4px 0;"><strong>Cashier:</strong> ${escapeHtml(sale.cashierName)}</p>
                        </div>

                        <!-- Items -->
                        <div style="padding-bottom: 12px; border-bottom: 2px dashed #e5e5e5; margin-bottom: 12px;">
                            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #333;">
                                        <th style="text-align: left; padding: 6px 0; font-weight: 700;">Item / අයිතමය</th>
                                        <th style="text-align: right; padding: 6px 0; font-weight: 700;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sale.items.map(item => `
                                        <tr>
                                            <td style="padding: 8px 0; vertical-align: top;">
                                                ${item.nameSi ? `<span style="font-weight: 600;">${item.nameSi}</span><br>` : ''}
                                                ${escapeHtml(item.name)}<br>
                                                <span style="font-size: 11px; color: #666;">${item.qty} x Rs. ${item.price.toFixed(2)}</span>
                                                ${item.itemDiscount > 0 ? `<br><span style="font-size: 11px; color: #e53935;">Discount: -Rs. ${item.itemDiscount.toFixed(2)}</span>` : ''}
                                            </td>
                                            <td style="text-align: right; padding: 8px 0; vertical-align: top;">Rs. ${item.total.toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <!-- Totals -->
                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;">
                                <span>Subtotal / උප එකතුව</span>
                                <span>Rs. ${sale.subtotal.toFixed(2)}</span>
                            </div>
                            ${sale.discount > 0 ? `
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #e53935;">
                                <span>Discount / වට්ටම</span>
                                <span>- Rs. ${sale.discount.toFixed(2)}</span>
                            </div>
                            ` : ''}
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; margin-top: 8px; border-top: 2px dashed #333; font-size: 16px; font-weight: 700;">
                                <span>Total / එකතුව</span>
                                <span>Rs. ${sale.total.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;">
                                <span>Received / ලැබුණු</span>
                                <span>Rs. ${sale.received.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;">
                                <span>Change / ඉතිරි</span>
                                <span>Rs. ${sale.change.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px;">
                                <span>${sale.paymentMethod === 'cash' ? 'Cash / මුදල්' : (sale.paymentMethod === 'helapay' ? 'HelaPay / QR' : 'Card / කාඩ්')}</span>
                            </div>
                        </div>

                        <!-- Savings Box -->
                        ${totalSavings > 0 ? `
                        <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 12px 15px; border-radius: 10px; margin-bottom: 15px; text-align: center;">
                            <span style="font-size: 12px; color: #2e7d32;">🎉 ඔබට ඉතිරි වූ මුදල / You Saved</span>
                            <div style="font-size: 20px; font-weight: 700; color: #1b5e20; margin-top: 5px;">Rs. ${totalSavings.toFixed(2)}</div>
                        </div>
                        ` : ''}

                        <!-- Footer -->
                        <div style="text-align: center; padding-top: 12px; border-top: 2px dashed #e5e5e5;">
                            <p style="font-size: 11px; color: #666; margin: 3px 0;">ස්තූතියි! නැවත එන්න.</p>
                            <p style="font-size: 13px; font-weight: 700; color: #333; margin: 8px 0;">Thank You! Please Come Again.</p>
                            <p style="font-size: 11px; color: #888; margin-top: 10px;">www.buddikastores.com</p>
                            <p style="font-size: 9px; color: #aaa; margin-top: 5px;">Software by Odex Studio (0784-66-88-3)</p>
                        </div>
                    </div>
                `;

                // Create temp container for canvas capture
                const tempContainer = document.createElement('div');
                tempContainer.innerHTML = receiptHtml;
                tempContainer.style.position = 'fixed';
                tempContainer.style.left = '-9999px';
                tempContainer.style.top = '0';
                document.body.appendChild(tempContainer);

                // Wait for fonts to load
                await document.fonts.ready;

                // Capture as canvas
                const canvas = await html2canvas(tempContainer.querySelector('#whatsapp-receipt'), {
                    backgroundColor: '#ffffff',
                    scale: 2, // High resolution
                    useCORS: true,
                    logging: false
                });

                // Remove temp container
                document.body.removeChild(tempContainer);

                // Convert to blob
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        showToast('Failed to generate receipt image', 'error');
                        return;
                    }

                    // Try native sharing with image (works on mobile)
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], 'receipt.png', { type: 'image/png' })] })) {
                        try {
                            const file = new File([blob], `Buddika_Receipt_${sale.id}.png`, { type: 'image/png' });
                            await navigator.share({
                                title: 'Receipt - Buddika Stores',
                                text: `🧾 Receipt: ${sale.id}\n💵 Total: Rs. ${sale.total.toFixed(2)}\n\nThank you for shopping at Buddika Stores!`,
                                files: [file],
                            });
                            showToast('✅ Receipt shared successfully!', 'success');
                            return;
                        } catch (shareErr) {
                            console.log('Native share failed:', shareErr);
                        }
                    }

                    // Fallback: Download image and open WhatsApp with text
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Buddika_Receipt_${sale.id}.png`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    // Open WhatsApp with complete formatted text bill
                    const fullText = generateFormattedReceiptText(sale, receiptDate);
                    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(fullText)}`;
                    window.open(waUrl, '_blank');

                    showToast('📱 Receipt image downloaded! Full bill sent to WhatsApp', 'success');

                    showToast('📱 Receipt image downloaded! Attach it to WhatsApp', 'success');
                }, 'image/png', 1.0);

            } catch (error) {
                console.error('Error generating WhatsApp receipt:', error);
                showToast('Failed to generate receipt: ' + error.message, 'error');
            }
        };

        // Shared helper for saving/updating customer data
        async function saveCustomerPurchaseData(phoneInput, sale) {
            if (!navigator.onLine || !sale || !sale.id) return;

            try {
                // 1. Update the sale document with customer phone
                await updateDoc(doc(db, 'sales', sale.id), {
                    customerPhone: phoneInput
                });

                // 2. Update or create customer record
                const customerRef = doc(db, 'customers', phoneInput);
                const customersColl = collection(db, 'customers');
                const customerDoc = await getDocs(query(customersColl));
                const existingCustomer = customerDoc.docs.find(d => d.id === phoneInput);

                if (existingCustomer) {
                    // Update existing customer stats
                    await updateDoc(customerRef, {
                        totalPurchases: increment(1),
                        totalSpent: increment(sale.total),
                        lastVisit: new Date()
                    });
                } else {
                    // Create new customer profile
                    await setDoc(customerRef, {
                        phone: phoneInput,
                        totalPurchases: 1,
                        totalSpent: sale.total,
                        lastVisit: new Date(),
                        createdAt: new Date()
                    });
                }

                // Refresh local customer suggestions
                if (typeof loadCustomers === 'function') loadCustomers();
                console.log('[POS] Client details saved for:', phoneInput);
            } catch (err) {
                console.warn('Failed to save client details:', err);
            }
        }
        function generateFormattedReceiptText(sale, receiptDate) {
            let receiptText = `*🧾 BUDDIKA STORES - RECEIPT*\n`;
            receiptText += `━━━━━━━━━━━━━━━━\n`;
            receiptText += `📍 No 48, Kandy Road, Walapane\n`;
            receiptText += `📞 052-2279101 / 077-5192756\n\n`;
            receiptText += `*Receipt:* ${sale.id}\n`;
            receiptText += `*Date:* ${receiptDate}\n`;
            receiptText += `*Cashier:* ${sale.cashierName}\n`;
            receiptText += `━━━━━━━━━━━━━━━━\n\n`;
            receiptText += `*ITEMS:*\n`;

            sale.items.forEach((item, i) => {
                receiptText += `${i + 1}. ${item.nameSi ? item.nameSi + ' (' + item.name + ')' : item.name}\n`;
                receiptText += `   ${item.qty} x Rs.${item.price.toFixed(2)} = *Rs.${item.total.toFixed(2)}*\n`;
                if (item.itemDiscount > 0) {
                    receiptText += `   _Discount: -Rs.${item.itemDiscount.toFixed(2)}_\n`;
                }
            });

            receiptText += `\n━━━━━━━━━━━━━━━━\n`;
            receiptText += `*Subtotal:* Rs.${sale.subtotal.toFixed(2)}\n`;

            if (sale.discount > 0) {
                receiptText += `*Discount:* -Rs.${sale.discount.toFixed(2)}\n`;
            }

            receiptText += `*TOTAL:* Rs.${sale.total.toFixed(2)}\n`;
            receiptText += `*Payment:* ${sale.paymentMethod.toUpperCase()}\n`;
            receiptText += `*Received:* Rs.${sale.received.toFixed(2)}\n`;
            receiptText += `*Change:* Rs.${sale.change.toFixed(2)}\n`;
            receiptText += `━━━━━━━━━━━━━━━━\n\n`;
            
            // Savings box emoji
            let totalSavings = sale.discount || 0;
            sale.items.forEach(item => { if (item.itemDiscount > 0) totalSavings += item.itemDiscount; });
            if (totalSavings > 0) {
                receiptText += `🎉 *YOU SAVED: Rs. ${totalSavings.toFixed(2)}*\n\n`;
            }

            receiptText += `_Thank you for shopping with us! 🙏_\n`;
            receiptText += `_www.buddikastores.com_`;
            return receiptText;
        }

        // New function for direct text receipt (Instant)
        window.sendReceiptWhatsAppText = async () => {
            const phoneInput = document.getElementById('receipt-phone').value.trim();
            if (!phoneInput) {
                showToast('Please enter customer phone number', 'error');
                return;
            }

            let phone = phoneInput.replace(/[^0-9]/g, '');
            if (phone.startsWith('0')) {
                phone = '94' + phone.substring(1);
            } else if (!phone.startsWith('94')) {
                phone = '94' + phone;
            }

            if (phone.length < 11) {
                showToast('Invalid phone number format', 'error');
                return;
            }

            if (!lastSaleData) {
                showToast('No receipt data available', 'error');
                return;
            }

            // Save customer data and update sale record
            await saveCustomerPurchaseData(phoneInput, lastSaleData);

            const sale = lastSaleData;
            const receiptDate = new Date(sale.createdAt).toLocaleString('en-LK', {
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            });

            const fullText = generateFormattedReceiptText(sale, receiptDate);
            const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(fullText)}`;
            
            showToast('Opening WhatsApp... 📱', 'success');
            window.open(waUrl, '_blank');
        };

        // Close Receipt Modal
        window.closeReceiptModal = () => {
            document.getElementById('receipt-modal').classList.add('hidden');
        };

        // Toast Notification
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            const bgColor = type === 'error' ? 'bg-red-600' : type === 'success' ? 'bg-green-600' : 'bg-black';
            toast.className = `fixed bottom-5 right-5 ${bgColor} text-white px-6 py-3 rounded-lg shadow-xl z-[400] transform transition-all duration-300 translate-y-10 opacity-0`;
            toast.innerText = message;
            document.body.appendChild(toast);

            requestAnimationFrame(() => {
                toast.classList.remove('translate-y-10', 'opacity-0');
            });

            setTimeout(() => {
                toast.classList.add('translate-y-10', 'opacity-0');
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }
    