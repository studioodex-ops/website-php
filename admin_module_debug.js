                        <input type="file" id="nm-image-file" accept="image/*"
                            class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-black hover:file:bg-gray-200">
                    </div>
                </div>
                <div class="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                    <button type="button" onclick="closeNewsModal()"
                        class="px-4 py-2 font-bold text-gray-500 hover:bg-gray-50 rounded-lg">Cancel</button>
                    <button type="submit"
                        class="bg-black text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-800">Save</button>
                </div>
            </form>
        </div>
    </div>

    // MAIN LOGIC
    <!-- MAIN LOGIC -->
    <script type="module">
        import { auth, db, storage, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, collectionGroup, getDocs, getDoc, doc, setDoc, deleteDoc, updateDoc, query, orderBy, limit, startAfter, startAt, endAt, limitToLast, endBefore, ref, uploadBytes, getDownloadURL, where, increment, addDoc, writeBatch, onSnapshot } from './assets/js/firebase-config.js';
        import { escapeHtml, escapeJs } from './assets/js/utils.js';

        console.log("[Admin] Module Script Start...");
        console.log("[Admin] Imports Loaded.");
        window.escapeHtml = escapeHtml;
        window.escapeJs = escapeJs;
        window.db = db;
        window.collection = collection;
        window.query = query;
        window.orderBy = orderBy;
        window.getDocs = getDocs;
        window.onSnapshot = onSnapshot;
        window.writeBatch = writeBatch;
        window.getDoc = getDoc;
        window.doc = doc;
        window.addDoc = addDoc;
        window.setDoc = setDoc;
        window.updateDoc = updateDoc;
        window.deleteDoc = deleteDoc;
        window.where = where;

        // EMERGENCY FAIL-SAFE: If dashboard hasn't shown in 10 seconds, force it.
        setTimeout(() => {
            const lc = document.getElementById('login-container');
            if (lc && !lc.classList.contains('hidden')) {
                console.warn("[Admin] Emergency Fail-Safe Hiding Spinner!");
                lc.style.setProperty('display', 'none', 'important');
                lc.classList.add('hidden');
            }
        }, 10000);

        // window.loadCategoriesConfig etc will be assigned below
        window.promoData = {};
        window.newsData = {};

        // Expose Firebase functions globally for external scripts
        window.db = db;
        window.collection = collection;
        window.query = query;
        window.orderBy = orderBy;
        window.getDocs = getDocs;
        window.onSnapshot = onSnapshot;
        window.writeBatch = writeBatch;

        // --- GLOBAL LISTENERS & REAL-TIME TRACKING ---
        window.startGlobalListeners = () => {
            console.log("[Listeners] Starting Real-time Tracking...");
            
            // 1. Listen for New Online Orders
            const ordersQuery = query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'), limit(1));
            let initialLoad = true;
            onSnapshot(ordersQuery, (snapshot) => {
                if (initialLoad) { initialLoad = false; return; }
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const order = change.doc.data();
                        if (typeof showOrderNotification === 'function') showOrderNotification("New Online Order! ðŸ›’", order);
                        if (typeof playOrderSound === 'function') playOrderSound();
                        
                        // Auto-refresh orders if on the orders tab
                        const ordersView = document.getElementById('view-orders');
                        if (ordersView && !ordersView.classList.contains('hidden')) {
                            if (typeof fetchOrders === 'function') fetchOrders();
                        }
                    }
                });
            });

            // 2. Listen for POS Sales (HelaPay Notifications)
            const salesQuery = query(collection(db, 'sales'), orderBy('createdAt', 'desc'), limit(1));
            let initialSalesLoad = true;
            onSnapshot(salesQuery, (snapshot) => {
                if (initialSalesLoad) { initialSalesLoad = false; return; }
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const sale = change.doc.data();
                        if (sale.paymentMethod === 'helapay') {
                            if (typeof showOrderNotification === 'function') showOrderNotification("New HelaPay Sale! ðŸ’°", sale);
                            if (typeof playOrderSound === 'function') playOrderSound();
                        }
                    }
                });
            });
        };

        window.updateWholesaleBadge = () => {
            console.log("[UI] Updating wholesale badges...");
        };

        window.showOrderNotification = (title, data) => {
            const toast = document.getElementById('toast');
            const message = document.getElementById('toast-message');
            if (!toast || !message) {
                if (typeof showToast === 'function') showToast(title, 'info');
                return;
            }
            
            const total = data.total || 0;
            const method = (data.paymentMethod || 'COD').toUpperCase();
            
            message.innerHTML = `
                <div class="flex flex-col">
                    <span class="font-bold">${title}</span>
                    <span class="text-xs text-gray-400">Total: Rs. ${total.toFixed(2)} â€¢ ${method}</span>
                </div>
            `;
            
            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 8000);
        };

        window.playOrderSound = () => {
            try {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play();
            } catch (e) {
                console.warn("Sound blocked by browser policy.");
            }
        };
        window.getDoc = getDoc;
        window.doc = doc;
        window.addDoc = addDoc;
        window.setDoc = setDoc;
        window.updateDoc = updateDoc;
        window.deleteDoc = deleteDoc;
        window.where = where;
        window.escapeHtml = escapeHtml;

        // Helper: Upload Image
        async function uploadImage(file, pathPrefix) {
            const storageRef = ref(storage, `images/${pathPrefix}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            return await getDownloadURL(snapshot.ref);
        }

        // Globals
        let lastVisible = null;
        let pageStack = [];
        let currentPage = 1;
        const PER_PAGE = 20; // Restored to 20
        window.productsData = {};
        window.promosData = {};
        window.newsData = {};

        // AUTH & INIT
        const loginContainer = document.getElementById('login-container');
        const adminEmail = document.getElementById('admin-email');

        // Allowed Admin Emails - Only these can access
        const ALLOWED_ADMINS = [
            'tmayuranga1928@gmail.com',
            'studioodex@gmail.com',
            'dailydosegenz@gmail.com',
            'pissudaadey@gmail.com',
            'walapaneonline@gmail.com'
        ];

        onAuthStateChanged(auth, (user) => {
            // LOCAL BYPASS
            const isLocal = window.location.protocol === 'file:' || window.location.hostname === '';

            if (user || isLocal) {
                // Mock User for Local Mode
                if (!user && isLocal) {
                    console.log("âš ï¸ Simulating Local Admin");
                    user = { email: 'local_admin@buddikastores.com', displayName: 'Local Admin' };
                }

                // Check whitelist (Skip for local admin)
                if (user.email !== 'local_admin@buddikastores.com' && !ALLOWED_ADMINS.includes(user.email.toLowerCase())) {
                    // Unauthorized - deny access
                    loginContainer.classList.remove('hidden');
                    loginContainer.innerHTML = `
                    <div class="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                        <div class="text-6xl mb-4">ðŸš«</div>
                        <h2 class="text-2xl font-bold font-heading mb-2 text-red-600">Access Denied</h2>
                        <p class="text-gray-500 mb-4 text-sm">Sorry, <strong>${user.email}</strong> is not authorized.</p>
                        <button onclick="handleLogout()" class="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                            Sign Out
                        </button>
                        <a href="index.html" class="block mt-6 text-xs text-gray-400 hover:text-black font-bold uppercase tracking-widest">Back to Shop</a>
                    </div>
                    `;
                    return;
                }

                // Authorized - grant access
                console.log("[Auth] Authorized as:", user.email);
                
                // 1. Hide Spinner IMMEDIATELY
                if (loginContainer) {
                    loginContainer.style.setProperty('display', 'none', 'important');
                    loginContainer.classList.add('hidden');
                }

                setTimeout(() => {
                    try {
                        const emailEl = document.getElementById('admin-email');
                        if (emailEl) emailEl.innerText = user.email;

                        // 2. Initialize Modules
                        console.log("[Admin] Initializing Modules...");
                        if (typeof window.loadCategoriesConfig === 'function') window.loadCategoriesConfig();
                        if (typeof window.fetchAndRenderProducts === 'function') window.fetchAndRenderProducts();
                        if (typeof window.startGlobalListeners === 'function') window.startGlobalListeners();
                        if (typeof window.updateWholesaleBadge === 'function') window.updateWholesaleBadge();
                        if (typeof window.loadMorningUpdate === 'function') window.loadMorningUpdate();
                        console.log("[Admin] All Modules Triggered.");
                    } catch (err) {
                        console.error("Dashboard Init Error Details:", err);
                        if (typeof window.showToast === 'function') window.showToast("Error during initialization: " + err.message, "error");
                    }
                }, 100);
            } else {
                // Show Login
                loginContainer.classList.remove('hidden');
                loginContainer.innerHTML = `
            <div class="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
                <h2 class="text-2xl font-bold font-heading mb-2">Admin Access</h2>
                <p class="text-gray-500 mb-6 text-sm">Please log in to manage store.</p>
                <button onclick="handleLogin()" class="w-full bg-black text-white py-3 rounded-xl font-bold hover:scale-[1.02] transition-transform">
                    Log In with Google
                </button>
                <a href="index.html" class="block mt-6 text-xs text-gray-400 hover:text-black font-bold uppercase tracking-widest">Back to Shop</a>
            </div>
            `;
            }
        });

        window.handleLogin = () => {
            signInWithPopup(auth, googleProvider).catch(e => alert(e.message));
        };

        // --- MORNING UPDATE LOGIC ---
        const STATUS_BADGES = {
            'available': { text: 'AVAILABLE', bgClass: 'bg-green-100', textClass: 'text-green-800' },
            'sold_out': { text: 'SOLD OUT', bgClass: 'bg-red-100', textClass: 'text-red-800' },
            'coming_soon': { text: 'COMING SOON', bgClass: 'bg-blue-100', textClass: 'text-blue-800' },
            'new_arrival': { text: 'NEW ARRIVAL', bgClass: 'bg-purple-100', textClass: 'text-purple-800' },
            'sale': { text: 'SALE', bgClass: 'bg-orange-100', textClass: 'text-orange-800' },
            'fresh': { text: 'FRESH TODAY', bgClass: 'bg-emerald-100', textClass: 'text-emerald-800' },
            'delayed': { text: 'DELAYED', bgClass: 'bg-yellow-100', textClass: 'text-yellow-800' },
            'closed': { text: 'CLOSED', bgClass: 'bg-gray-200', textClass: 'text-gray-800' }
        };

        window.loadMorningUpdate = async () => {
            try {
                const docRef = doc(db, 'settings', 'morning_update');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const titleEl = document.getElementById('mu-title');
                    const msgEl = document.getElementById('mu-message');
                    const statusEl = document.getElementById('mu-status');
                    
                    if (titleEl) titleEl.value = data.title || 'Morning Update';
                    if (msgEl) msgEl.value = data.message || '';
                    if (statusEl) statusEl.value = data.status || 'available';
                    
                    window.updateMorningPreview();
                }
            } catch (error) {
                console.error('Error loading morning update:', error);
            }
        };

        window.saveMorningUpdate = async () => {
            const title = document.getElementById('mu-title').value.trim();
            const message = document.getElementById('mu-message').value.trim();
            const status = document.getElementById('mu-status').value;
            
            if (!title || !message) {
                showToast('Please fill in both title and message', 'error');
                return;
            }

            try {
                const docRef = doc(db, 'settings', 'morning_update');
                await setDoc(docRef, {
                    title, message, status, updatedAt: new Date().toISOString()
                });
                showToast('âœ… Morning Update saved!', 'success');
            } catch (error) {
                console.error('Error saving morning update:', error);
                showToast('Failed to save update', 'error');
            }
        };

        window.updateMorningPreview = () => {
            const title = document.getElementById('mu-title').value || 'Morning Update';
            const message = document.getElementById('mu-message').value || 'Daily papers are in stock.';
            const status = document.getElementById('mu-status').value;
            
            const titlePreview = document.getElementById('mu-preview-title');
            const msgPreview = document.getElementById('mu-preview-message');
            const badgeEl = document.getElementById('mu-preview-badge');
            
            if (titlePreview) titlePreview.innerText = title;
            if (msgPreview) msgPreview.innerText = message;
            
            if (badgeEl) {
                const badge = STATUS_BADGES[status] || STATUS_BADGES['available'];
                badgeEl.innerText = badge.text;
                badgeEl.className = `px-3 py-1 rounded-full text-xs font-bold ${badge.bgClass} ${badge.textClass}`;
            }
        };

        window.setQuickMessage = (msg) => {
            const msgEl = document.getElementById('mu-message');
            if (msgEl) {
                msgEl.value = msg;
                window.updateMorningPreview();
            }
        };

        window.handleLogout = () => {
            signOut(auth);
        }

        // Subcategory data structure (mirrors POS)
        window.adminSubcategories = {}; // Now it is dynamically loaded from Firebase

        window.loadCategoriesConfig = () => {
            const configRef = doc(db, 'settings', 'categories_config');
            onSnapshot(configRef, (docSnap) => {
                if (docSnap.exists()) {
                    window.adminSubcategories = docSnap.data().data || {};
                    if (typeof window.updateSubcategoryOptions === 'function') {
                        window.updateSubcategoryOptions(document.getElementById('p-subcategory')?.value);
                    }
                    // Also update category manager if modal is open
                    const catModal = document.getElementById('category-modal');
                    if(catModal && !catModal.classList.contains('hidden')) {
                        tempCategories = JSON.parse(JSON.stringify(window.adminSubcategories));
                        window.renderCategoryManager();
                    }
                }
            }, (err) => {
                console.error("Error loading categories config:", err);
            });
        };

        // Update subcategory dropdown based on selected category
        window.updateSubcategoryOptions = (selectedValue = null) => {
            const categorySelect = document.getElementById('p-category');
            const subcategorySelect = document.getElementById('p-subcategory');
            if (!categorySelect || !subcategorySelect) return;

            // Sync the Categories dropdown with DB keys
            if (Object.keys(window.adminSubcategories).length > 0) {
                const currentCatVal = categorySelect.value;
                const dbCats = Object.keys(window.adminSubcategories).sort();
                
                // Only rebuild if the content has changed
                const currentOptions = Array.from(categorySelect.options).map(o => o.value).sort();
                if (JSON.stringify(currentOptions) !== JSON.stringify(dbCats)) {
                    categorySelect.innerHTML = '';
                    dbCats.forEach(cat => {
                        const opt = document.createElement('option');
                        opt.value = cat;
                        opt.textContent = cat;
                        categorySelect.appendChild(opt);
                    });
                    if (window.adminSubcategories[currentCatVal]) {
                        categorySelect.value = currentCatVal;
                    }
                }
            }

            const category = categorySelect.value;
            const catData = window.adminSubcategories[category];

            // Reset options
            subcategorySelect.innerHTML = '<option value="">-- Select Subcategory --</option>';

            if (catData) {
                // Add grouped options
                for (const [group, items] of Object.entries(catData)) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = group;
                    items.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item;
                        option.textContent = item;
                        if (selectedValue && item === selectedValue) {
                            option.selected = true;
                        }
                        optgroup.appendChild(option);
                    });
                    subcategorySelect.appendChild(optgroup);
                }
            }
        };

        // --- CATEGORY MANAGER LOGIC ---
        let tempCategories = {}; // Used for editing inside the modal before saving

        window.openCategoryModal = () => {
            tempCategories = JSON.parse(JSON.stringify(window.adminSubcategories));
            window.renderCategoryManager();
            document.getElementById('category-modal').classList.remove('hidden');
            setTimeout(() => {
                document.getElementById('category-modal-content').classList.remove('scale-95', 'opacity-0');
            }, 10);
        };

        window.closeCategoryModal = () => {
            document.getElementById('category-modal-content').classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                document.getElementById('category-modal').classList.add('hidden');
            }, 300);
        };

        window.renderCategoryManager = () => {
            const container = document.getElementById('category-manager-body');
            container.innerHTML = '';
            
            if (Object.keys(tempCategories).length === 0) {
                container.innerHTML = '<div class="text-center py-10 text-gray-500">No categories found. Add one below.</div>';
                return;
            }

            for (const [mainCat, groups] of Object.entries(tempCategories)) {
                const catHtml = document.createElement('div');
                catHtml.className = 'bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden';
                
                let groupsHtml = '';
                for (const [groupName, subs] of Object.entries(groups)) {
                    const subsHtml = Array.isArray(subs) ? subs.map((sub, sIdx) => `
                        <div class="flex items-center justify-between py-1 border-b border-gray-50 last:border-0 pl-4 group/sub">
                            <span class="text-sm text-gray-600">${window.escapeHtml(sub)}</span>
                            <button onclick="window.deleteCategoryItem('${window.escapeJs(mainCat)}', '${window.escapeJs(groupName)}', ${sIdx})" class="text-red-400 hover:text-red-600 opacity-0 group-hover/sub:opacity-100 transition-opacity" title="Remove Subcategory"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                        </div>
                    `).join('') : '';

                    groupsHtml += `
                        <div class="bg-gray-50/50 p-4 border-b border-gray-100 last:border-0">
                            <div class="flex justify-between flex-wrap gap-2 items-center mb-3">
                                <h5 class="font-bold text-xs uppercase tracking-widest text-gray-700 flex items-center gap-2">
                                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path></svg>
                                    ${window.escapeHtml(groupName)}
                                </h5>
                                <div class="flex gap-2">
                                    <button onclick="window.addNewSubcategory('${window.escapeJs(mainCat)}', '${window.escapeJs(groupName)}')" class="text-[10px] bg-white border border-gray-200 text-black px-2 py-1 rounded hover:bg-black hover:text-white transition-colors font-bold">+ SUB</button>
                                    <button onclick="window.deleteCategoryGroup('${window.escapeJs(mainCat)}', '${window.escapeJs(groupName)}')" class="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition-colors font-bold">DEL GRP</button>
                                </div>
                            </div>
                            <div class="space-y-1 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">${subsHtml || '<p class="text-[10px] text-gray-400">Empty group</p>'}</div>
                        </div>
                    `;
                }

                catHtml.innerHTML = `
                    <div class="p-4 bg-black text-white flex justify-between items-center">
                        <h4 class="font-bold text-lg font-heading">${window.escapeHtml(mainCat)}</h4>
                        <div class="flex gap-2">
                            <button onclick="window.addNewGroup('${window.escapeJs(mainCat)}')" class="text-[10px] bg-white text-black px-3 py-1.5 rounded uppercase font-bold hover:bg-gray-200">Add Group (Folder)</button>
                            <button onclick="window.deleteMainCategory('${window.escapeJs(mainCat)}')" class="text-[10px] bg-red-600 text-white px-3 py-1.5 rounded uppercase font-bold hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                    <div>${groupsHtml}</div>
                `;
                container.appendChild(catHtml);
            }
        };

        window.addNewMainCategory = () => {
            const name = prompt("Enter new Main Category name (e.g. 'Hardware'):");
            if (name && name.trim()) {
                if(!tempCategories[name]) tempCategories[name] = { "Default Group": [] };
                window.renderCategoryManager();
            }
        };

        window.addNewGroup = (mainCat) => {
            const name = prompt(`Enter new group name for ${mainCat} (e.g. 'Tools'):`);
            if (name && name.trim()) {
                if(!tempCategories[mainCat][name]) tempCategories[mainCat][name] = [];
                window.renderCategoryManager();
            }
        };

        window.addNewSubcategory = (mainCat, group) => {
            const name = prompt(`Enter new subcategory for ${mainCat} -> ${group}:`);
            if (name && name.trim()) {
                tempCategories[mainCat][group].push(name.trim());
                window.renderCategoryManager();
            }
        };

        window.deleteCategoryItem = (mainCat, group, sIdx) => {
            if(confirm("Remove this subcategory?")) {
                tempCategories[mainCat][group].splice(sIdx, 1);
                window.renderCategoryManager();
            }
        };
        
        window.deleteCategoryGroup = (mainCat, group) => {
            if(confirm(`Delete entire group '${group}'?`)) {
                delete tempCategories[mainCat][group];
                window.renderCategoryManager();
            }
        };

        window.deleteMainCategory = (mainCat) => {
            if(confirm(`Delete entire Category '${mainCat}'? This might break existing products.`)) {
                delete tempCategories[mainCat];
                window.renderCategoryManager();
            }
        };

        window.saveCategoriesToDB = async () => {
            const btn = document.getElementById('btn-save-categories');
            btn.innerText = 'Saving...';
            btn.disabled = true;
            try {
                const ref = doc(db, 'settings', 'categories_config');
                await setDoc(ref, { data: tempCategories }, { merge: true });
                showToast("Categories Updated!", "success");
                window.closeCategoryModal();
            } catch(e) {
                console.error(e);
                showToast("Failed to save categories", "error");
            } finally {
                btn.innerText = 'Save Changes';
                btn.disabled = false;
            }
        };

        // TAB LOGIC
        // TAB LOGIC (Consolidated)
        window.switchTab = (tab) => {
            const views = {
                'products': 'view-products',
                'orders': 'view-orders',
                'promotions': 'view-promotions',
                'news': 'view-news',
                'reports': 'view-reports',
                'inventory': 'view-inventory',
                'labels': 'view-labels',
                'abandoned': 'view-abandoned',
                'bundles': 'view-bundles',
                'bookorders': 'view-bookorders',
                'luckydraw': 'view-luckydraw',
                'suppliers': 'view-suppliers',
                'expiry': 'view-expiry',
                'finance': 'view-finance',
                'whatsapppromo': 'view-whatsapppromo',
                'morningupdate': 'view-morningupdate'
            };

            const tabIds = {
                'products': 'tab-products',
                'orders': 'tab-orders',
                'promotions': 'tab-promotions',
                'news': 'tab-news',
                'reports': 'tab-reports',
                'inventory': 'tab-inventory',
                'labels': 'tab-labels',
                'abandoned': 'tab-abandoned',
                'bundles': 'tab-bundles',
                'bookorders': 'tab-bookorders',
                'luckydraw': 'tab-luckydraw',
                'suppliers': 'tab-suppliers',
                'expiry': 'tab-expiry',
                'finance': 'tab-finance',
                'whatsapppromo': 'tab-whatsapppromo',
                'morningupdate': 'tab-morningupdate'
            };

            // Hide all views
            Object.values(views).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hidden');
            });

            // Reset all tabs
            Object.values(tabIds).forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.classList.add('border-transparent', 'text-gray-400');
                    el.classList.remove('bg-gray-900', 'border-white', 'text-white',
                        'text-yellow-400', 'text-red-400', 'text-purple-400', 'text-cyan-400',
                        'text-emerald-400', 'text-blue-400', 'text-green-400', 'text-orange-400');
                }
            });

            // Show selected view & Highlight tab
            const viewId = views[tab];
            const tabId = tabIds[tab];

            if (viewId) document.getElementById(viewId)?.classList.remove('hidden');
            if (tabId) {
                const el = document.getElementById(tabId);
                if (el) {
                    el.classList.remove('border-transparent', 'text-gray-400');
                    el.classList.add('bg-gray-900', 'border-white', 'text-white');
                }
            }

            // Init Logic
            if (tab === 'orders') fetchOrders();
            else if (tab === 'promotions') fetchPromotions();
            else if (tab === 'news') fetchNews();
            else if (tab === 'reports') {
                setReportDate('today');
                fetchLowStock();
                fetchExpiryAlerts();
                fetchStockMovements();
            }
            else if (tab === 'inventory') fetchInventory();
            else if (tab === 'labels') fetchLabelsProducts();
            else if (tab === 'abandoned') fetchAbandonedCarts();
            else if (tab === 'bundles') fetchBundles();
            else if (tab === 'bookorders') fetchBookOrders();
            else if (tab === 'luckydraw') fetchLuckyDrawEntries();
            else if (tab === 'suppliers') fetchSuppliers();
            else if (tab === 'expiry') fetchFullExpiryItems();
            else if (tab === 'finance') initFinanceModule();
            // WhatsApp Promo - Check existence to avoid Web crashes if missing
            else if (tab === 'whatsapppromo') {
                if (typeof loadPromoCustomers === 'function') loadPromoCustomers();
            }
            else if (tab === 'morningupdate') loadMorningUpdate();
        }

        // --- MORNING UPDATE LOGIC ---
        window.loadMorningUpdate = async () => {
            // Ensure db is available
            if (!window.db) return;

            const docRef = doc(db, 'settings', 'morning_update');
            try {
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    const titleEl = document.getElementById('mu-title');
                    const msgEl = document.getElementById('mu-message');
                    const statusEl = document.getElementById('mu-status');

                    if (titleEl) titleEl.value = data.title || '';
                    if (msgEl) msgEl.value = data.message || '';
                    if (statusEl) statusEl.value = data.status || 'available';

                    updateMorningPreview();
                } else {
                    updateMorningPreview();
                }
            } catch (e) {
                console.error("Error loading morning update:", e);
            }
        }

        window.updateMorningPreview = () => {
            const titleEl = document.getElementById('mu-title');
            const msgEl = document.getElementById('mu-message');
            const statusEl = document.getElementById('mu-status');

            if (!titleEl || !msgEl || !statusEl) return;

            const title = titleEl.value;
            const msg = msgEl.value;
            const status = statusEl.value;

            const pTitle = document.getElementById('mu-preview-title');
            const pMsg = document.getElementById('mu-preview-message');
            const badge = document.getElementById('mu-preview-badge');

            if (pTitle) pTitle.innerText = title || 'Morning Update';
            if (pMsg) pMsg.innerText = msg || 'Message content...';

            if (badge) {
                badge.className = "px-3 py-1 rounded-full text-xs font-bold";

                if (status === 'available') { badge.classList.add('bg-green-100', 'text-green-800'); badge.innerText = "AVAILABLE"; }
                else if (status === 'sold_out') { badge.classList.add('bg-red-100', 'text-red-800'); badge.innerText = "SOLD OUT"; }
                else if (status === 'coming_soon') { badge.classList.add('bg-blue-100', 'text-blue-800'); badge.innerText = "COMING SOON"; }
                else if (status === 'new_arrival') { badge.classList.add('bg-purple-100', 'text-purple-800'); badge.innerText = "NEW ARRIVAL"; }
                else if (status === 'sale') { badge.classList.add('bg-pink-100', 'text-pink-800'); badge.innerText = "SALE"; }
                else if (status === 'fresh') { badge.classList.add('bg-emerald-100', 'text-emerald-800'); badge.innerText = "FRESH TODAY"; }
                else if (status === 'delayed') { badge.classList.add('bg-yellow-100', 'text-yellow-800'); badge.innerText = "DELAYED"; }
                else if (status === 'closed') { badge.classList.add('bg-gray-200', 'text-gray-800'); badge.innerText = "CLOSED"; }
            }
        }

        window.saveMorningUpdate = async () => {
            const title = document.getElementById('mu-title').value;
            const message = document.getElementById('mu-message').value;
            const status = document.getElementById('mu-status').value;

            try {
                await setDoc(doc(db, 'settings', 'morning_update'), {
                    title, message, status, updatedAt: new Date()
                });
                alert("âœ… Morning Update Saved & Published!");
            } catch (e) {
                alert("âŒ Error saving: " + e.message);
            }
        }

        window.setQuickMessage = (msg) => {
            const msgEl = document.getElementById('mu-message');
            if (msgEl) {
                msgEl.value = msg;
                updateMorningPreview();
            }
        }

        // --- FINANCE MODULE ---
        let currentFinanceTab = 'deposits';

        window.initFinanceModule = async () => {
            // Set default dates to today
            const today = new Date().toISOString().split('T')[0];
            const depositDate = document.getElementById('deposit-date');
            const expenseDate = document.getElementById('expense-date');
            const suppayDate = document.getElementById('suppay-date');
            const creditDate = document.getElementById('credit-date');

            if (depositDate) depositDate.value = today;
            if (expenseDate) expenseDate.value = today;
            if (suppayDate) suppayDate.value = today;
            if (creditDate) creditDate.value = today;

            // Set month filters to current month
            const currentMonth = today.substring(0, 7);
            const depositFilterMonth = document.getElementById('deposit-filter-month');
            const expenseFilterMonth = document.getElementById('expense-filter-month');
            if (depositFilterMonth) depositFilterMonth.value = currentMonth;
            if (expenseFilterMonth) expenseFilterMonth.value = currentMonth;

            // Load supplier dropdown for supplier payments
            await loadSuppliersForFinance();

            // Fetch all data
            await fetchFinanceData();
        };

        window.showFinanceTab = (tab) => {
            currentFinanceTab = tab;
            const tabs = ['deposits', 'expenses', 'supplier-payments', 'credit-sales'];

            tabs.forEach(t => {
                const content = document.getElementById(`fin-content-${t}`);
                const tabBtn = document.getElementById(`fin-tab-${t}`);

                if (content) {
                    if (t === tab) {
                        content.classList.remove('hidden');
                    } else {
                        content.classList.add('hidden');
                    }
                }

                if (tabBtn) {
                    if (t === tab) {
                        tabBtn.classList.remove('bg-gray-100', 'text-gray-600');
                        tabBtn.classList.add('bg-emerald-600', 'text-white');
                    } else {
                        tabBtn.classList.remove('bg-emerald-600', 'text-white');
                        tabBtn.classList.add('bg-gray-100', 'text-gray-600');
                    }
                }
            });
        };

        window.fetchFinanceData = async () => {
            await Promise.all([
                fetchDeposits(),
                fetchExpenses(),
                fetchSupplierPayments(),
                fetchCreditSales()
            ]);
        };

        async function loadSuppliersForFinance() {
            try {
                const q = query(collection(db, 'suppliers'), orderBy('name'));
                const snap = await getDocs(q);
                const select = document.getElementById('suppay-supplier');
                if (!select) return;

                select.innerHTML = '<option value="">-- Select Supplier --</option>';
                snap.forEach(d => {
                    const s = d.data();
                    select.innerHTML += `<option value="${d.id}" data-name="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`;
                });
            } catch (e) {
                console.error('Error loading suppliers:', e);
            }
        }

        // --- DEPOSITS ---
        window.addDeposit = async (e) => {
            e.preventDefault();
            const date = document.getElementById('deposit-date').value;
            const bank = document.getElementById('deposit-bank').value;
            const amount = parseFloat(document.getElementById('deposit-amount').value);
            const reference = document.getElementById('deposit-reference').value.trim();

            if (!date || !bank || isNaN(amount) || amount <= 0) {
                alert('Please fill all required fields');
                return;
            }

            try {
                await addDoc(collection(db, 'finance_deposits'), {
                    date,
                    bank,
                    amount,
                    reference,
                    createdAt: new Date()
                });

                showToast('Deposit added successfully! ðŸ’°', 'success');
                document.getElementById('deposit-amount').value = '';
                document.getElementById('deposit-reference').value = '';
                await fetchDeposits();
            } catch (e) {
                console.error('Error adding deposit:', e);
                alert('Error: ' + e.message);
            }
        };

        window.fetchDeposits = async () => {
            const tbody = document.getElementById('deposits-list');
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Loading...</td></tr>';

            try {
                const filterMonth = document.getElementById('deposit-filter-month')?.value;
                let q = query(collection(db, 'finance_deposits'), orderBy('date', 'desc'));
                const snap = await getDocs(q);

                let totalDeposits = 0;
                const rows = [];

                snap.forEach(d => {
                    const data = d.data();

                    // Filter by month if selected
                    if (filterMonth && !data.date.startsWith(filterMonth)) return;

                    totalDeposits += data.amount;
                    rows.push(`
                        <tr class="border-b hover:bg-gray-50">
                            <td class="p-4">${data.date}</td>
                            <td class="p-4">${escapeHtml(data.bank)}</td>
                            <td class="p-4 font-bold text-emerald-600">Rs. ${data.amount.toFixed(2)}</td>
                            <td class="p-4 text-gray-500">${escapeHtml(data.reference || '-')}</td>
                            <td class="p-4">
                                <button onclick="deleteDeposit('${d.id}')" class="text-red-500 hover:underline text-sm">Delete</button>
                            </td>
                        </tr>
                    `);
                });

                tbody.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="5" class="p-8 text-center text-gray-400">No deposits found</td></tr>';
                document.getElementById('fin-total-deposits').innerText = `Rs. ${totalDeposits.toFixed(2)}`;
            } catch (e) {
                console.error('Error fetching deposits:', e);
                tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500">Error loading deposits</td></tr>';
            }
        };

        window.deleteDeposit = async (id) => {
            if (!confirm('Delete this deposit?')) return;
            try {
                await deleteDoc(doc(db, 'finance_deposits', id));
                showToast('Deposit deleted', 'success');
                await fetchDeposits();
            } catch (e) {
                console.error('Error deleting deposit:', e);
            }
        };

        // --- EXPENSES ---
        window.addExpense = async (e) => {
            e.preventDefault();
            const date = document.getElementById('expense-date').value;
            const category = document.getElementById('expense-category').value;
            const amount = parseFloat(document.getElementById('expense-amount').value);
            const description = document.getElementById('expense-description').value.trim();

            if (!date || !category || isNaN(amount) || amount <= 0) {
                alert('Please fill all required fields');
                return;
            }

            try {
                await addDoc(collection(db, 'finance_expenses'), {
                    date,
                    category,
                    amount,
                    description,
                    createdAt: new Date()
                });

                showToast('Expense added! ðŸ’³', 'success');
                document.getElementById('expense-amount').value = '';
                document.getElementById('expense-description').value = '';
                await fetchExpenses();
            } catch (e) {
                console.error('Error adding expense:', e);
                alert('Error: ' + e.message);
            }
        };

        window.fetchExpenses = async () => {
            const tbody = document.getElementById('expenses-list');
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Loading...</td></tr>';

            try {
                const filterMonth = document.getElementById('expense-filter-month')?.value;
                const filterCategory = document.getElementById('expense-filter-category')?.value;

                let q = query(collection(db, 'finance_expenses'), orderBy('date', 'desc'));
                const snap = await getDocs(q);

                let totalExpenses = 0;
                const rows = [];

                snap.forEach(d => {
                    const data = d.data();

                    // Apply filters
                    if (filterMonth && !data.date.startsWith(filterMonth)) return;
                    if (filterCategory && data.category !== filterCategory) return;

                    totalExpenses += data.amount;
                    rows.push(`
                        <tr class="border-b hover:bg-gray-50">
                            <td class="p-4">${data.date}</td>
                            <td class="p-4"><span class="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">${escapeHtml(data.category)}</span></td>
                            <td class="p-4 font-bold text-red-600">Rs. ${data.amount.toFixed(2)}</td>
                            <td class="p-4 text-gray-500">${escapeHtml(data.description || '-')}</td>
                            <td class="p-4">
                                <button onclick="deleteExpense('${d.id}')" class="text-red-500 hover:underline text-sm">Delete</button>
                            </td>
                        </tr>
                    `);
                });

                tbody.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="5" class="p-8 text-center text-gray-400">No expenses found</td></tr>';
                document.getElementById('fin-total-expenses').innerText = `Rs. ${totalExpenses.toFixed(2)}`;
            } catch (e) {
                console.error('Error fetching expenses:', e);
                tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500">Error loading expenses</td></tr>';
            }
        };

        window.deleteExpense = async (id) => {
            if (!confirm('Delete this expense?')) return;
            try {
                await deleteDoc(doc(db, 'finance_expenses', id));
                showToast('Expense deleted', 'success');
                await fetchExpenses();
            } catch (e) {
                console.error('Error deleting expense:', e);
            }
        };

        window.openExpenseCategoryModal = () => {
            alert('Category management coming soon! Currently using default categories: Electricity, Water, Internet, Phone, Supplies, Transport, Salary, Maintenance, Other');
        };

        // --- SUPPLIER PAYMENTS ---
        window.addSupplierPayment = async (e) => {
            e.preventDefault();
            const date = document.getElementById('suppay-date').value;
            const supplierSelect = document.getElementById('suppay-supplier');
            const supplierId = supplierSelect.value;
            const supplierName = supplierSelect.options[supplierSelect.selectedIndex]?.getAttribute('data-name') || '';
            const amount = parseFloat(document.getElementById('suppay-amount').value);
            const method = document.getElementById('suppay-method').value;

            if (!date || !supplierId || isNaN(amount) || amount <= 0) {
                alert('Please fill all required fields');
                return;
            }

            try {
                await addDoc(collection(db, 'finance_supplier_payments'), {
                    date,
                    supplierId,
                    supplierName,
                    amount,
                    method,
                    createdAt: new Date()
                });

                showToast('Payment recorded! ðŸ§¾', 'success');
                document.getElementById('suppay-amount').value = '';
                document.getElementById('suppay-supplier').value = '';
                await fetchSupplierPayments();
            } catch (e) {
                console.error('Error adding supplier payment:', e);
                alert('Error: ' + e.message);
            }
        };

        window.fetchSupplierPayments = async () => {
            const tbody = document.getElementById('supplier-payments-list');
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">Loading...</td></tr>';

            try {
                let q = query(collection(db, 'finance_supplier_payments'), orderBy('date', 'desc'));
                const snap = await getDocs(q);

                let totalPayments = 0;
                const rows = [];

                snap.forEach(d => {
                    const data = d.data();
                    totalPayments += data.amount;
                    rows.push(`
                        <tr class="border-b hover:bg-gray-50">
                            <td class="p-4">${data.date}</td>
                            <td class="p-4 font-medium">${escapeHtml(data.supplierName)}</td>
                            <td class="p-4 font-bold text-blue-600">Rs. ${data.amount.toFixed(2)}</td>
                            <td class="p-4 text-gray-500">${escapeHtml(data.method)}</td>
                            <td class="p-4">
                                <button onclick="deleteSupplierPayment('${d.id}')" class="text-red-500 hover:underline text-sm">Delete</button>
                            </td>
                        </tr>
                    `);
                });

                tbody.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="5" class="p-8 text-center text-gray-400">No payments recorded</td></tr>';
                document.getElementById('fin-total-supplier').innerText = `Rs. ${totalPayments.toFixed(2)}`;
            } catch (e) {
                console.error('Error fetching supplier payments:', e);
                tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500">Error loading payments</td></tr>';
            }
        };

        window.deleteSupplierPayment = async (id) => {
            if (!confirm('Delete this payment record?')) return;
            try {
                await deleteDoc(doc(db, 'finance_supplier_payments', id));
                showToast('Payment deleted', 'success');
                await fetchSupplierPayments();
            } catch (e) {
                console.error('Error deleting payment:', e);
            }
        };

        // --- CREDIT SALES ---
        window.addCreditSale = async (e) => {
            e.preventDefault();
            const date = document.getElementById('credit-date').value;
            const customer = document.getElementById('credit-customer').value.trim();
            const phone = document.getElementById('credit-phone').value.trim();
            const amount = parseFloat(document.getElementById('credit-amount').value);
            const dueDate = document.getElementById('credit-due').value || null;

            if (!date || !customer || isNaN(amount) || amount <= 0) {
                alert('Please fill all required fields');
                return;
            }

            try {
                await addDoc(collection(db, 'finance_credit_sales'), {
                    date,
                    customer,
                    phone,
                    totalAmount: amount,
                    paidAmount: 0,
                    dueDate,
                    status: 'pending',
                    createdAt: new Date()
                });

                showToast('Credit sale recorded! ðŸ“‹', 'success');
                document.getElementById('credit-customer').value = '';
                document.getElementById('credit-phone').value = '';
                document.getElementById('credit-amount').value = '';
                document.getElementById('credit-due').value = '';
                await fetchCreditSales();
            } catch (e) {
                console.error('Error adding credit sale:', e);
                alert('Error: ' + e.message);
            }
        };

        window.fetchCreditSales = async () => {
            const tbody = document.getElementById('credit-sales-list');
            tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-gray-400">Loading...</td></tr>';

            try {
                const filterStatus = document.getElementById('credit-filter-status')?.value;
                let q = query(collection(db, 'finance_credit_sales'), orderBy('date', 'desc'));
                const snap = await getDocs(q);

                let totalOutstanding = 0;
                const rows = [];

                snap.forEach(d => {
                    const data = d.data();
                    const balance = data.totalAmount - (data.paidAmount || 0);

                    // Determine status
                    let status = data.status || 'pending';
                    if (balance <= 0) status = 'paid';
                    else if (data.paidAmount > 0) status = 'partial';

                    // Apply filter
                    if (filterStatus && status !== filterStatus) return;

                    if (status !== 'paid') totalOutstanding += balance;

                    const statusColors = {
                        'pending': 'bg-orange-100 text-orange-700',
                        'partial': 'bg-blue-100 text-blue-700',
                        'paid': 'bg-green-100 text-green-700'
                    };

                    const isOverdue = data.dueDate && new Date(data.dueDate) < new Date() && status !== 'paid';

                    rows.push(`
                        <tr class="border-b hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}">
                            <td class="p-4">${data.date}</td>
                            <td class="p-4 font-medium">${escapeHtml(data.customer)}</td>
                            <td class="p-4 text-gray-500">${escapeHtml(data.phone || '-')}</td>
                            <td class="p-4">Rs. ${data.totalAmount.toFixed(2)}</td>
                            <td class="p-4 text-green-600">Rs. ${(data.paidAmount || 0).toFixed(2)}</td>
                            <td class="p-4 font-bold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}">Rs. ${balance.toFixed(2)}</td>
                            <td class="p-4 ${isOverdue ? 'text-red-600 font-bold' : ''}">${data.dueDate || '-'}</td>
                            <td class="p-4"><span class="px-2 py-1 rounded text-xs font-bold ${statusColors[status]}">${status.toUpperCase()}</span></td>
                            <td class="p-4">
                                ${status !== 'paid' ? `<button onclick="collectCreditPayment('${d.id}', ${balance})" class="text-green-600 hover:underline text-sm mr-2">Collect</button>` : ''}
                                <button onclick="deleteCreditSale('${d.id}')" class="text-red-500 hover:underline text-sm">Delete</button>
                            </td>
                        </tr>
                    `);
                });

                tbody.innerHTML = rows.length > 0 ? rows.join('') : '<tr><td colspan="9" class="p-8 text-center text-gray-400">No credit sales found</td></tr>';
                document.getElementById('fin-total-credit').innerText = `Rs. ${totalOutstanding.toFixed(2)}`;
            } catch (e) {
                console.error('Error fetching credit sales:', e);
                tbody.innerHTML = '<tr><td colspan="9" class="p-8 text-center text-red-500">Error loading credit sales</td></tr>';
            }
        };

        window.collectCreditPayment = async (id, balance) => {
            const amount = prompt(`Enter payment amount (Balance: Rs. ${balance.toFixed(2)}):`);
            if (!amount) return;

            const paymentAmount = parseFloat(amount);
            if (isNaN(paymentAmount) || paymentAmount <= 0) {
                alert('Please enter a valid amount');
                return;
            }

            try {
                const docRef = doc(db, 'finance_credit_sales', id);
                const docSnap = await getDoc(docRef);
                const data = docSnap.data();

                const newPaidAmount = (data.paidAmount || 0) + paymentAmount;
                const newStatus = newPaidAmount >= data.totalAmount ? 'paid' : 'partial';

                await updateDoc(docRef, {
                    paidAmount: newPaidAmount,
                    status: newStatus
                });

                showToast('Payment collected! ðŸ’µ', 'success');
                await fetchCreditSales();
            } catch (e) {
                console.error('Error collecting payment:', e);
                alert('Error: ' + e.message);
            }
        };

        window.deleteCreditSale = async (id) => {
            if (!confirm('Delete this credit sale record?')) return;
            try {
                await deleteDoc(doc(db, 'finance_credit_sales', id));
                showToast('Credit sale deleted', 'success');
                await fetchCreditSales();
            } catch (e) {
                console.error('Error deleting credit sale:', e);
            }
        };

        // --- BUNDLES LOGIC ---
        let allProductsForBundles = [];

        window.fetchBundles = async () => {
            const grid = document.getElementById('bundles-grid');
            grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-400">Loading bundles...</div>';

            try {
                const q = query(collection(db, "bundles"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);

                if (snap.empty) {
                    grid.innerHTML = `
                        <div class="col-span-full text-center py-12">
                            <p class="text-gray-400 mb-4">No bundles created yet.</p>
                            <button onclick="openBundleModal()" class="bg-black text-white px-6 py-2 rounded-lg font-bold">Create First Bundle</button>
                        </div>
                    `;
                    return;
                }

                let html = '';
                snap.forEach(doc => {
                    const b = doc.data();
                    const productCount = b.products?.length || 0;

                    html += `
                        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                            <div class="p-5">
                                <div class="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 class="font-bold text-lg">${escapeHtml(b.name)}</h3>
                                        ${b.nameSi ? `<p class="text-sm text-gray-500 font-sinhala">${escapeHtml(b.nameSi)}</p>` : ''}
                                    </div>
                                    <span class="${b.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'} px-2 py-1 rounded-full text-xs font-bold">
                                        ${b.active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <div class="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                    <span>ðŸ“¦ ${productCount} products</span>
                                    <span>â€¢</span>
                                    <span class="text-green-600 font-bold">${b.discount}% OFF</span>
                                </div>
                                <div class="flex gap-2">
                                    <button onclick="editBundle('${doc.id}')" class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 rounded-lg text-sm transition-colors">Edit</button>
                                    <button onclick="deleteBundle('${doc.id}')" class="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });

                grid.innerHTML = html;
            } catch (e) {
                console.error("Error fetching bundles:", e);
                grid.innerHTML = '<div class="col-span-full text-center py-12 text-red-500">Error loading bundles.</div>';
            }
        };

        window.openBundleModal = async (bundleId = null) => {
            // Load products first
            if (allProductsForBundles.length === 0) {
                try {
                    const q = query(collection(db, "products"), orderBy("name"));
                    const snap = await getDocs(q);
                    allProductsForBundles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                } catch (e) {
                    console.error("Error loading products:", e);
                }
            }

            const list = document.getElementById('bundle-products-list');
            list.innerHTML = allProductsForBundles.map(p => `
                <label class="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input type="checkbox" class="bundle-product-checkbox" value="${p.id}" data-price="${p.price}" data-name="${escapeHtml(p.name)}">
                    <span class="text-sm flex-1 truncate">${escapeHtml(p.name)} - ${escapeHtml(p.price)}</span>
                    <input type="number" min="1" max="99" value="1" 
                        class="bundle-product-qty w-14 border border-gray-200 rounded px-2 py-1 text-center text-xs"
                        data-product-id="${p.id}">
                </label>
            `).join('');


            // Reset form
            document.getElementById('bundle-id').value = '';
            document.getElementById('bundle-name').value = '';
            document.getElementById('bundle-name-si').value = '';
            document.getElementById('bundle-discount').value = '10';
            document.getElementById('bundle-active').checked = true;
            document.getElementById('bundle-modal-title').innerText = 'Create Bundle';

            // Show modal
            const modal = document.getElementById('bundle-modal');
            const content = document.getElementById('bundle-modal-content');
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        };

        window.filterBundleProducts = (searchTerm) => {
            const items = document.querySelectorAll('#bundle-products-list label');
            const term = searchTerm.toLowerCase().trim();

            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (term === '' || text.includes(term)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        };

        window.closeBundleModal = () => {
            const modal = document.getElementById('bundle-modal');
            const content = document.getElementById('bundle-modal-content');
            content.classList.add('scale-95', 'opacity-0');
            content.classList.remove('scale-100', 'opacity-100');
            setTimeout(() => modal.classList.add('hidden'), 200);
        };

        window.saveBundle = async (e) => {
            e.preventDefault();

            // Collect selected products WITH quantities
            const selectedProducts = Array.from(document.querySelectorAll('.bundle-product-checkbox:checked')).map(cb => {
                const productId = cb.value;
                const qtyInput = document.querySelector(`.bundle-product-qty[data-product-id="${productId}"]`);
                const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
                return {
                    id: productId,
                    name: cb.dataset.name || '',
                    qty: qty
                };
            });

            if (selectedProducts.length < 2) {
                alert('Please select at least 2 products for a bundle.');
                return;
            }

            const bundleData = {
                name: document.getElementById('bundle-name').value.trim(),
                nameSi: document.getElementById('bundle-name-si').value.trim(),
                products: selectedProducts,
                discount: parseInt(document.getElementById('bundle-discount').value) || 10,
                active: document.getElementById('bundle-active').checked,
                updatedAt: new Date()
            };

            const bundleId = document.getElementById('bundle-id').value;

            try {
                if (bundleId) {
                    await setDoc(doc(db, "bundles", bundleId), bundleData, { merge: true });
                    showToast('Bundle updated!');
                } else {
                    bundleData.createdAt = new Date();
                    await setDoc(doc(collection(db, "bundles")), bundleData);
                    showToast('Bundle created!');
                }
                closeBundleModal();
                fetchBundles();
            } catch (e) {
                console.error("Error saving bundle:", e);
                alert('Error saving bundle: ' + e.message);
            }
        };

        window.editBundle = async (bundleId) => {
            try {
                const bundleSnap = await getDoc(doc(db, "bundles", bundleId));
                if (!bundleSnap.exists()) {
                    alert('Bundle not found');
                    return;
                }

                const b = bundleSnap.data();
                await openBundleModal();

                document.getElementById('bundle-id').value = bundleId;
                document.getElementById('bundle-name').value = b.name || '';
                document.getElementById('bundle-name-si').value = b.nameSi || '';
                document.getElementById('bundle-discount').value = b.discount || 10;
                document.getElementById('bundle-active').checked = b.active !== false;
                document.getElementById('bundle-modal-title').innerText = 'Edit Bundle';

                // Check product checkboxes and set quantities
                (b.products || []).forEach(p => {
                    // Handle both old format (string) and new format (object)
                    const productId = typeof p === 'object' ? p.id : p;
                    const productQty = typeof p === 'object' ? p.qty : 1;

                    const cb = document.querySelector(`.bundle-product-checkbox[value="${productId}"]`);
                    if (cb) cb.checked = true;

                    const qtyInput = document.querySelector(`.bundle-product-qty[data-product-id="${productId}"]`);
                    if (qtyInput) qtyInput.value = productQty;
                });
            } catch (e) {
                console.error("Error loading bundle:", e);
                alert('Error loading bundle');
            }
        };

        window.deleteBundle = async (bundleId) => {
            if (!confirm('Delete this bundle?')) return;

            try {
                await deleteDoc(doc(db, "bundles", bundleId));
                showToast('Bundle deleted!');
                fetchBundles();
            } catch (e) {
                console.error("Error deleting bundle:", e);
                alert('Error deleting bundle');
            }
        };

        // --- BOOK ORDERS LOGIC ---
        window.fetchBookOrders = async () => {
            const tbody = document.getElementById('bookorders-table-body');
            tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">Loading orders...</td></tr>';

            try {
                const q = query(collection(db, "book_orders"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);

                // Count stats
                let pending = 0, progress = 0, ready = 0, picked = 0;

                if (snap.empty) {
                    tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">No book orders yet.</td></tr>';
                } else {
                    let html = '';
                    snap.forEach(d => {
                        const o = d.data();
                        const id = d.id;

                        // Count by status
                        if (o.status === 'pending') pending++;
                        else if (o.status === 'in_progress') progress++;
                        else if (o.status === 'ready') ready++;
                        else if (o.status === 'picked_up') picked++;

                        const statusColors = {
                            'pending': 'bg-amber-100 text-amber-700',
                            'in_progress': 'bg-blue-100 text-blue-700',
                            'ready': 'bg-green-100 text-green-700',
                            'picked_up': 'bg-gray-100 text-gray-500'
                        };
                        const statusLabels = {
                            'pending': 'Pending',
                            'in_progress': 'In Progress',
                            'ready': 'Ready',
                            'picked_up': 'Picked Up'
                        };

                        html += `
                            <tr class="border-b hover:bg-gray-50">
                                <td class="p-4 font-mono text-xs">${id}</td>
                                <td class="p-4">
                                    <div class="font-medium">${escapeHtml(o.studentNameEn)}</div>
                                    <div class="text-xs text-gray-400">${escapeHtml(o.phone)}</div>
                                </td>
                                <td class="p-4 text-sm">
                                    <div>${escapeHtml(o.school)}</div>
                                    <div class="text-gray-400">${escapeHtml(o.grade)}</div>
                                </td>
                                <td class="p-4 text-center font-bold">${o.bookCount}</td>
                                <td class="p-4">Rs. ${o.estimatedPrice}</td>
                                <td class="p-4">
                                    <span class="px-2 py-1 rounded-full text-xs font-bold ${statusColors[o.status] || 'bg-gray-100'}">
                                        ${statusLabels[o.status] || o.status}
                                    </span>
                                </td>
                                <td class="p-4">
                                    <div class="flex gap-2">
                                        ${o.status === 'pending' ? `<button onclick="updateBookOrderStatus('${id}', 'in_progress')" class="text-blue-600 hover:underline text-xs">Start</button>` : ''}
                                        ${o.status === 'in_progress' ? `<button onclick="updateBookOrderStatus('${id}', 'ready')" class="text-green-600 hover:underline text-xs">Mark Ready</button>` : ''}
                                        ${o.status === 'ready' ? `
                                            <button onclick="sendBookOrderNotification('${id}', '${o.phone}')" class="text-purple-600 hover:underline text-xs">WhatsApp</button>
                                            <button onclick="updateBookOrderStatus('${id}', 'picked_up')" class="text-gray-600 hover:underline text-xs">Picked Up</button>
                                        ` : ''}
                                        <button onclick="viewBookOrderDetails('${id}')" class="text-gray-400 hover:underline text-xs">View</button>
                                    </div>
                                </td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                }

                // Update stats
                document.getElementById('bo-pending-count').textContent = pending;
                document.getElementById('bo-progress-count').textContent = progress;
                document.getElementById('bo-ready-count').textContent = ready;
                document.getElementById('bo-picked-count').textContent = picked;

            } catch (e) {
                console.error('Error fetching book orders:', e);
                tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-red-500">Error loading orders.</td></tr>';
            }
        };

        window.updateBookOrderStatus = async (orderId, newStatus) => {
            try {
                await updateDoc(doc(db, "book_orders", orderId), { status: newStatus });
                showToast('Order status updated!');
                fetchBookOrders();
            } catch (e) {
                console.error('Error updating order:', e);
                alert('Error updating order status');
            }
        };

        window.sendBookOrderNotification = (orderId, phone) => {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const message = `ðŸ“š Buddika Stores: Your book cover order (${orderId}) is READY for pickup!\n\nPlease collect your books at your convenience.\n\nAddress: No 48, Kandy Road, Walapane\nHotline: 052-2279101`;
            const waUrl = `https://wa.me/94${cleanPhone.slice(-9)}?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
        };

        window.viewBookOrderDetails = async (orderId) => {
            try {
                const snap = await getDoc(doc(db, "book_orders", orderId));
                if (snap.exists()) {
                    const o = snap.data();
                    alert(`ðŸ“š Order Details\n\nStudent: ${o.studentNameEn}\nSchool: ${o.school}\nGrade: ${o.grade}\nPhone: ${o.phone}\n\nBooks (${o.bookCount}):\n${o.bookList}\n\nCover: ${o.coverType}\nLabels: ${o.labelType}\nExpress: ${o.isExpress ? 'Yes' : 'No'}\n\nEstimated: Rs. ${o.estimatedPrice}\nPickup: ${o.pickupDate}`);
                }
            } catch (e) {
                console.error('Error:', e);
            }
        };

        // --- LUCKY DRAW LOGIC ---
        window.fetchLuckyDrawEntries = async () => {
            const tbody = document.getElementById('luckydraw-table-body');
            tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">Loading entries...</td></tr>';

            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            document.getElementById('ld-current-month').textContent = currentMonth;

            try {
                const q = query(collection(db, "lucky_draw_entries"), orderBy("createdAt", "desc"));
                const snap = await getDocs(q);

                let activeCount = 0, winnerCount = 0;

                if (snap.empty) {
                    tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">No entries yet. Customers spending Rs.5000+ get auto-entered!</td></tr>';
                } else {
                    let html = '';
                    snap.forEach(d => {
                        const e = d.data();

                        if (e.status === 'active') activeCount++;
                        if (e.status === 'winner') winnerCount++;

                        const statusColors = {
                            'active': 'bg-yellow-100 text-yellow-700',
                            'winner': 'bg-green-100 text-green-700',
                            'expired': 'bg-gray-100 text-gray-500'
                        };

                        const date = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString() : '-';

                        html += `
                            <tr class="border-b hover:bg-gray-50 ${e.status === 'winner' ? 'bg-green-50' : ''}">
                                <td class="p-4 font-mono text-xs">${e.entryId}</td>
                                <td class="p-4 font-medium">${escapeHtml(e.customerName)}</td>
                                <td class="p-4 text-sm">${escapeHtml(e.phone)}</td>
                                <td class="p-4 font-bold">Rs. ${e.orderTotal?.toLocaleString() || '0'}</td>
                                <td class="p-4 text-sm text-gray-500">${date}</td>
                                <td class="p-4">
                                    <span class="px-2 py-1 rounded-full text-xs font-bold ${statusColors[e.status] || 'bg-gray-100'}">
                                        ${e.status === 'winner' ? 'ðŸ† WINNER' : e.status?.toUpperCase() || 'ACTIVE'}
                                    </span>
                                </td>
                            </tr>
                        `;
                    });
                    tbody.innerHTML = html;
                }

                document.getElementById('ld-active-count').textContent = activeCount;
                document.getElementById('ld-winner-count').textContent = winnerCount;

            } catch (e) {
                console.error('Error fetching lucky draw entries:', e);
                tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-red-500">Error loading entries.</td></tr>';
            }
        };

        window.drawWinner = async () => {
            if (!confirm('ðŸŽ² Are you sure you want to draw a winner?\n\nThis will randomly select ONE winner from all active entries!')) return;

            try {
                // Get all active entries
                const q = query(collection(db, "lucky_draw_entries"), where("status", "==", "active"));
                const snap = await getDocs(q);

                if (snap.empty) {
                    alert('âŒ No active entries to draw from!');
                    return;
                }

                // Random selection
                const entries = snap.docs;
                const randomIndex = Math.floor(Math.random() * entries.length);
                const winnerDoc = entries[randomIndex];
                const winner = winnerDoc.data();

                // Update winner status
                await updateDoc(doc(db, "lucky_draw_entries", winnerDoc.id), { status: 'winner' });

                // Show winner
                alert(`ðŸŽ‰ WINNER SELECTED!\n\nðŸ† ${winner.customerName}\nðŸ“ž ${winner.phone}\nðŸ’° Order: Rs. ${winner.orderTotal}\nðŸŽ« Entry: ${winner.entryId}\n\nSend congratulations via WhatsApp!`);

                // Option to notify via WhatsApp
                const notify = confirm('Send WhatsApp notification to the winner?');
                if (notify && winner.phone) {
                    const cleanPhone = winner.phone.replace(/[^0-9]/g, '');
                    const message = `ðŸŽ‰ CONGRATULATIONS! ðŸŽ‰\n\nYou have WON the Buddika Stores Lucky Draw!\n\nEntry ID: ${winner.entryId}\n\nPlease visit our store to claim your prize!\n\nðŸ“ No 48, Kandy Road, Walapane\nðŸ“ž 052-2279101`;
                    const waUrl = `https://wa.me/94${cleanPhone.slice(-9)}?text=${encodeURIComponent(message)}`;
                    window.open(waUrl, '_blank');
                }

                fetchLuckyDrawEntries();
                showToast('ðŸ† Winner drawn successfully!');

            } catch (e) {
                console.error('Error drawing winner:', e);
                alert('Error drawing winner. Please try again.');
            }
        };

        // --- ABANDONED CARTS LOGIC ---
        window.fetchAbandonedCarts = async () => {
            const list = document.getElementById('abandoned-carts-list');
            list.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-gray-400">Loading...</td></tr>';

            try {
                const q = query(collection(db, "abandoned_carts"), orderBy("lastUpdated", "desc"));
                const snap = await getDocs(q);

                if (snap.empty) {
                    list.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-gray-400">No abandoned carts found.</td></tr>';
                    document.getElementById('abandoned-pending').innerText = '0';
                    document.getElementById('abandoned-recovered').innerText = '0';
                    document.getElementById('abandoned-value').innerText = 'Rs. 0';
                    return;
                }

                let pending = 0, recovered = 0, totalValue = 0;
                const rows = [];

                snap.forEach(doc => {
                    const data = doc.data();
                    const isPending = data.status === 'pending';

                    if (isPending) {
                        pending++;
                        totalValue += data.cartTotal || 0;
                    } else if (data.status === 'recovered') {
                        recovered++;
                    }

                    const lastUpdated = data.lastUpdated?.toDate ?
                        data.lastUpdated.toDate().toLocaleString('en-LK') : 'Unknown';

                    const itemsList = (data.items || []).slice(0, 3).map(i => escapeHtml(i.name)).join(', ');
                    const moreItems = (data.items?.length || 0) > 3 ? ` +${data.items.length - 3} more` : '';

                    const statusBadge = isPending ?
                        '<span class="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold">Pending</span>' :
                        '<span class="bg-green-100 text-green-600 px-2 py-1 rounded-full text-xs font-bold">Recovered</span>';

                    const phoneNumber = data.userPhone ? data.userPhone.replace(/^0/, '94') : '94775192756';

                    rows.push(`
                        <tr class="hover:bg-gray-50 ${!isPending ? 'opacity-50' : ''}">
                            <td class="p-4">
                                <div class="font-medium">${escapeHtml(data.userName || 'Unknown')}</div>
                                <div class="text-xs text-gray-500">${escapeHtml(data.userEmail || '')}</div>
                                ${data.userPhone ? `<div class="text-xs text-gray-500">${escapeHtml(data.userPhone)}</div>` : ''}
                            </td>
                            <td class="p-4">
                                <div class="text-sm">${itemsList}${moreItems}</div>
                                <div class="text-xs text-gray-400">${data.items?.length || 0} items</div>
                            </td>
                            <td class="p-4 font-bold">Rs. ${(data.cartTotal || 0).toLocaleString()}</td>
                            <td class="p-4 text-gray-500 text-xs">${lastUpdated}</td>
                            <td class="p-4">${statusBadge}</td>
                            <td class="p-4">
                                ${isPending ? `
                                    <button onclick="sendCartReminder('${doc.id}', '${phoneNumber}', ${JSON.stringify(data.items || []).replace(/"/g, '&quot;')}, ${data.cartTotal || 0}, '${escapeHtml(data.userName || 'Customer')}')" 
                                        class="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center gap-1">
                                        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                                        WhatsApp
                                    </button>
                                ` : '<span class="text-gray-400 text-xs">Recovered âœ“</span>'}
                            </td>
                        </tr>
                    `);
                });

                list.innerHTML = rows.join('');
                document.getElementById('abandoned-pending').innerText = pending;
                document.getElementById('abandoned-recovered').innerText = recovered;
                document.getElementById('abandoned-value').innerText = `Rs. ${totalValue.toLocaleString()}`;

            } catch (e) {
                console.error("Error fetching abandoned carts:", e);
                list.innerHTML = '<tr><td colspan="6" class="p-12 text-center text-red-500">Error loading abandoned carts.</td></tr>';
            }
        };

        window.sendCartReminder = (cartId, phone, items, total, customerName) => {
            const itemsList = items.map(i => `â€¢ ${i.name} (${i.qty} ${i.unit || 'x'}) - ${i.price}`).join('\n');

            const message = `Ayubowan ${customerName}! ðŸ™
            
à¶”à¶¶à·š cart à¶‘à¶šà·š Rs. ${total.toLocaleString()} worth items thiyenawa!

${itemsList}

Complete your order now:
ðŸ›’ https://buddikastores.com

Buddika Stores
ðŸ“ž 077-5192756`;

            const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            window.open(url, '_blank');
        };

        // --- LABELS LOGIC ---
        let labelsProductData = [];

        window.fetchLabelsProducts = async () => {
            const list = document.getElementById('labels-product-list');
            list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">Loading...</td></tr>';

            try {
                const q = query(collection(db, "products"), orderBy("name"));
                const snap = await getDocs(q);
                labelsProductData = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                if (labelsProductData.length === 0) {
                    list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">No products found.</td></tr>';
                    return;
                }

                list.innerHTML = labelsProductData.map((p, idx) => `
                    <tr class="hover:bg-gray-50">
                        <td class="p-4">
                            <input type="checkbox" class="label-checkbox w-4 h-4 rounded" data-idx="${idx}" onchange="updateLabelPreview()">
                        </td>
                        <td class="p-4 font-medium">${escapeHtml(p.name)}</td>
                        <td class="p-4 font-sinhala text-gray-600">${p.nameSi ? escapeHtml(p.nameSi) : '-'}</td>
                        <td class="p-4">${escapeHtml(p.price)} / ${p.unit || 'unit'}</td>
                        <td class="p-4">
                            <input type="number" min="1" max="50" value="1" class="label-qty w-16 border border-gray-200 rounded px-2 py-1 text-center text-sm" data-idx="${idx}" onchange="updateLabelPreview()">
                        </td>
                    </tr>
                `).join('');
            } catch (e) {
                console.error("Error fetching products for labels:", e);
                list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-red-500">Error loading products.</td></tr>';
            }
        };

        window.toggleAllLabelCheckboxes = (masterCheckbox) => {
            const checkboxes = document.querySelectorAll('.label-checkbox');
            checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
            updateLabelPreview();
        };

        window.selectAllLabelProducts = () => {
            document.getElementById('select-all-labels').checked = true;
            toggleAllLabelCheckboxes({ checked: true });
        };

        window.updateLabelPreview = () => {
            const previewArea = document.getElementById('label-preview-area');
            const labelSize = document.getElementById('label-size-select').value;
            const checkboxes = document.querySelectorAll('.label-checkbox:checked');

            if (checkboxes.length === 0) {
                previewArea.innerHTML = '<p class="text-gray-400 text-center w-full py-8">Select products to preview labels</p>';
                return;
            }

            let labelsHtml = '';
            checkboxes.forEach(cb => {
                const idx = parseInt(cb.dataset.idx);
                const product = labelsProductData[idx];
                const qtyInput = document.querySelector(`.label-qty[data-idx="${idx}"]`);
                const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

                for (let i = 0; i < qty; i++) {
                    labelsHtml += generateLabelHtml(product, labelSize, `barcode-preview-${idx}-${i}`);
                }
            });

            previewArea.innerHTML = labelsHtml;

            // Generate barcodes
            checkboxes.forEach(cb => {
                const idx = parseInt(cb.dataset.idx);
                const product = labelsProductData[idx];
                const qtyInput = document.querySelector(`.label-qty[data-idx="${idx}"]`);
                const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

                for (let i = 0; i < qty; i++) {
                    try {
                        JsBarcode(`#barcode-preview-${idx}-${i}`, product.id.substring(0, 12).toUpperCase(), {
                            format: "CODE128",
                            width: 1.5,
                            height: 30,
                            displayValue: false,
                            margin: 0
                        });
                    } catch (e) {
                        console.warn("Barcode generation error:", e);
                    }
                }
            });
        };

        function generateLabelHtml(product, size, barcodeId) {
            return `
                <div class="label-card size-${size}">
                    <div class="label-store-name">à¶¶à·”à¶¯à·Šà¶°à·’à¶š à·ƒà·Šà¶§à·à¶»à·Šà·ƒà·Š</div>
                    <div class="label-barcode">
                        <svg id="${barcodeId}"></svg>
                    </div>
                    <div class="label-product-id">${product.id.substring(0, 12).toUpperCase()}</div>
                    ${product.nameSi ? `<div class="label-product-name-si">${escapeHtml(product.nameSi)}</div>` : ''}
                    <div class="label-product-name">${escapeHtml(product.name)}</div>
                    <div class="label-price">${escapeHtml(product.price)} <span class="label-unit">/ ${product.unit || 'unit'}</span></div>
                </div>
            `;
        }

        window.printSelectedLabels = () => {
            const previewArea = document.getElementById('label-preview-area');
            const printArea = document.getElementById('label-print-content');
            const labelSize = document.getElementById('label-size-select').value;
            const checkboxes = document.querySelectorAll('.label-checkbox:checked');

            if (checkboxes.length === 0) {
                alert('Please select at least one product to print.');
                return;
            }

            let labelsHtml = '';
            let barcodeTargets = [];

            checkboxes.forEach(cb => {
                const idx = parseInt(cb.dataset.idx);
                const product = labelsProductData[idx];
                const qtyInput = document.querySelector(`.label-qty[data-idx="${idx}"]`);
                const qty = qtyInput ? parseInt(qtyInput.value) || 1 : 1;

                for (let i = 0; i < qty; i++) {
                    const barcodeId = `barcode-print-${idx}-${i}`;
                    labelsHtml += generateLabelHtml(product, labelSize, barcodeId);
                    barcodeTargets.push({ id: barcodeId, code: product.id.substring(0, 12).toUpperCase() });
                }
            });

            printArea.innerHTML = labelsHtml;
            document.getElementById('label-print-area').classList.remove('hidden');

            // Generate barcodes for print
            setTimeout(() => {
                barcodeTargets.forEach(target => {
                    try {
                        JsBarcode(`#${target.id}`, target.code, {
                            format: "CODE128",
                            width: 1.5,
                            height: 30,
                            displayValue: false,
                            margin: 0
                        });
                    } catch (e) {
                        console.warn("Barcode print error:", e);
                    }
                });

                // Trigger print
                setTimeout(() => {
                    window.print();
                    document.getElementById('label-print-area').classList.add('hidden');
                }, 200);
            }, 100);
        };

        // --- REPORTS LOGIC ---
        window.currentReportMode = 'today';

        window.setReportDate = (mode) => {
            window.currentReportMode = mode;
            document.getElementById('btn-today').classList.remove('bg-black', 'text-white');
            document.getElementById('btn-month').classList.remove('bg-black', 'text-white');

            if (mode === 'today') document.getElementById('btn-today').classList.add('bg-black', 'text-white');
            if (mode === 'month') document.getElementById('btn-month').classList.add('bg-black', 'text-white');

            fetchReports();
        };

        window.fetchReports = async () => {
            const tbody = document.getElementById('report-table-body');
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div></td></tr>';

            try {
                const salesRef = collection(db, 'sales');
                let q;
                const now = new Date();
                let start, end;

                if (window.currentReportMode === 'today') {
                    start = new Date(now.setHours(0, 0, 0, 0));
                    end = new Date(now.setHours(23, 59, 59, 999));
                } else if (window.currentReportMode === 'month') {
                    start = new Date(now.getFullYear(), now.getMonth(), 1);
                    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                } else if (window.currentReportMode === 'custom') {
                    const val = document.getElementById('report-date-custom').value;
                    if (!val) return;
                    start = new Date(val); start.setHours(0, 0, 0, 0);
                    end = new Date(val); end.setHours(23, 59, 59, 999);
                }

                q = query(salesRef, where('createdAt', '>=', start), where('createdAt', '<=', end), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);

                let totalIncome = 0;
                let totalProfit = 0;
                const count = snapshot.size;
                const itemCounts = {}; // For Top Selling

                if (snapshot.empty) {
                    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">No sales found for this period.</td></tr>';
                    document.getElementById('report-total-income').innerText = 'Rs. 0.00';
                    document.getElementById('report-total-profit').innerText = 'Rs. 0.00';
                    document.getElementById('report-count').innerText = '0';
                    document.getElementById('report-avg').innerText = 'Rs. 0.00';
                    document.getElementById('top-selling-list').innerHTML = '<div class="text-center text-xs text-gray-400 py-4">No data</div>';
                    return;
                }

                const rows = snapshot.docs.map(doc => {
                    const sale = doc.data();
                    totalIncome += sale.total;

                    // Iterate Items for Profit & Top Selling
                    if (sale.items) {
                        let saleCost = 0;
                        sale.items.forEach(i => {
                            // Top Selling
                            if (!itemCounts[i.name]) itemCounts[i.name] = 0;
                            itemCounts[i.name] += i.qty;

                            // Profit
                            const iCost = (i.cost || 0) * i.qty;
                            saleCost += iCost;
                        });

                        // Profit = (Total - Discount) - Cost
                        // Note: sale.total is already (Subtotal - Discount)
                        // But need to be careful about item discounts which are deducted from itemTotal.
                        // Since sale.total is final amount received, Profit = FinalAmount - TotalCost
                        const saleProfit = sale.total - saleCost;
                        totalProfit += saleProfit;
                    }

                    const date = sale.createdAt ? new Date(sale.createdAt.seconds * 1000).toLocaleTimeString() : 'N/A';
                    return `
                        <tr class="hover:bg-gray-50 border-b border-gray-50">
                            <td class="p-4 text-sm font-mono text-gray-500">${date}</td>
                            <td class="p-4 text-sm">${sale.items ? sale.items.length : 0} items</td>
                            <td class="p-4 text-sm text-red-500">${sale.discount > 0 ? '-Rs. ' + sale.discount.toFixed(2) : '-'}</td>
                            <td class="p-4 font-bold text-gray-900">Rs. ${sale.total.toFixed(2)}</td>
                            <td class="p-4 text-xs text-gray-500">${escapeHtml(sale.cashierName || 'Unknown')}</td>
                        </tr>
                    `;
                }).join('');

                const avg = count > 0 ? (totalIncome / count) : 0;

                tbody.innerHTML = rows;
                document.getElementById('report-total-income').innerText = `Rs. ${totalIncome.toFixed(2)}`;
                document.getElementById('report-total-profit').innerText = `Rs. ${totalProfit.toFixed(2)}`;
                document.getElementById('report-count').innerText = count;
                document.getElementById('report-avg').innerText = `Rs. ${avg.toFixed(2)}`;

                // Render Top Selling
                const sortedItems = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
                document.getElementById('top-selling-list').innerHTML = sortedItems.map(([name, qty]) => `
                    <div class="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0">
                        <span class="text-gray-600 truncate mr-2">${escapeHtml(name)}</span>
                        <span class="font-bold text-gray-900">${qty} sold</span>
                    </div>
                `).join('');

            } catch (e) {
                console.error(e);
                tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500">Error: ${e.message}</td></tr>`;
            }
        };

        window.fetchLowStock = async () => {
            const list = document.getElementById('low-stock-list');
            try {
                const q = query(collection(db, 'products'), where('stock', '<=', 10), orderBy('stock'), limit(10));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    list.innerHTML = '<div class="text-center text-xs text-gray-400 py-4">Stock levels are healthy!</div>';
                    return;
                }

                list.innerHTML = snapshot.docs.map(doc => {
                    const p = doc.data();
                    const isCrit = p.stock <= 5;
                    return `
                        <div class="flex justify-between items-center p-2 rounded ${isCrit ? 'bg-red-100' : 'bg-red-50'}">
                            <div class="truncate mr-2">
                                <div class="font-bold text-xs text-gray-800 truncate">${escapeHtml(p.name)}</div>
                                <div class="text-[10px] text-gray-500">${escapeHtml(p.category)}</div>
                            </div>
                            <div class="${isCrit ? 'text-red-700' : 'text-red-500'} font-bold text-sm">${p.stock} left</div>
                        </div>
                     `;
                }).join('');
            } catch (e) { console.error(e); }
        };
        window.fetchInventory = async () => {
            const list = document.getElementById('inventory-list');
            list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">Loading...</td></tr>';

            try {
                const q = query(collection(db, 'products'), orderBy('name'));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">No products found</td></tr>';
                    return;
                }

                let lowStockCount = 0;
                let outStockCount = 0;

                const rows = snapshot.docs.map(doc => {
                    const p = doc.data();
                    const stock = p.stock || 0;
                    let stockClass = 'text-green-600';
                    let stockBadge = '';

                    if (stock <= 0) {
                        stockClass = 'text-red-600 font-bold';
                        stockBadge = '<span class="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">OUT OF STOCK</span>';
                        outStockCount++;
                    } else if (stock <= 10) {
                        stockClass = 'text-orange-500 font-bold';
                        stockBadge = '<span class="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full">LOW</span>';
                        lowStockCount++;
                    }

                    return `
                        <tr class="hover:bg-gray-50 border-b border-gray-50">
                            <td class="p-4">
                                <div class="font-bold text-gray-900">${escapeHtml(p.name)}</div>
                                <div class="text-xs text-gray-400">${escapeHtml(p.category)}</div>
                            </td>
                            <td class="p-4">
                                <span class="${stockClass}">${stock}</span>
                                <span class="text-xs text-gray-400 ml-1">${p.unit || 'unit'}</span>
                                ${stockBadge}
                            </td>
                            <td class="p-4">
                                <div class="flex items-center gap-2">
                                    <button onclick="adjustStock('${doc.id}', -1)" class="w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold">-</button>
                                    <input type="number" id="stock-adj-${doc.id}" value="1" min="1" class="w-16 text-center bg-gray-50 border rounded-lg py-1 text-sm">
                                    <button onclick="adjustStock('${doc.id}', 1)" class="w-8 h-8 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-bold">+</button>
                                </div>
                            </td>
                            <td class="p-4">
                                <button onclick="quickRestock('${doc.id}')" class="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-100">
                                    Quick Restock
                                </button>
                            </td>
                        </tr>
                    `;
                }).join('');

                list.innerHTML = rows;

                // Update Stats
                document.getElementById('inv-total-products').innerText = snapshot.size;
                document.getElementById('inv-low-stock').innerText = lowStockCount;
                document.getElementById('inv-out-stock').innerText = outStockCount;

            } catch (e) {
                console.error(e);
                list.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-red-500">Error: ${e.message}</td></tr>`;
            }
        };

        window.adjustStock = async (productId, direction) => {
            const input = document.getElementById(`stock-adj-${productId}`);
            const amount = parseInt(input.value) || 1;
            const adjustment = direction * amount;

            // Get reason for stock change
            const reason = prompt(`Reason for stock ${direction > 0 ? 'addition' : 'reduction'}:`,
                direction > 0 ? 'Restock from supplier' : 'Damage/Adjustment');
            if (!reason) return;

            try {
                const productRef = doc(db, 'products', productId);
                const productSnap = await getDoc(productRef);
                const productData = productSnap.data();
                const previousStock = productData.stock || 0;
                const newStock = previousStock + adjustment;

                // Update product stock
                await updateDoc(productRef, {
                    stock: increment(adjustment)
                });

                // Log stock movement
                await logStockMovement({
                    productId: productId,
                    productName: productData.name,
                    type: direction > 0 ? 'add' : 'reduce',
                    quantity: Math.abs(adjustment),
                    previousStock: previousStock,
                    newStock: newStock,
                    reason: reason
                });

                showToast(`Stock ${direction > 0 ? 'added' : 'reduced'} by ${amount} âœ…`, 'success');
                fetchInventory();
            } catch (e) {
                alert('Error adjusting stock: ' + e.message);
            }
        };

        // Stock Movement Logger
        window.logStockMovement = async (data) => {
            try {
                await setDoc(doc(collection(db, 'stock_movements')), {
                    ...data,
                    user: auth.currentUser?.email || 'unknown',
                    createdAt: new Date()
                });
            } catch (e) {
                console.error('Error logging stock movement:', e);
            }
        };

        window.mergeDuplicateProducts = async () => {
            if (!confirm("This will merge all products with the same name into one, summing up their stock levels. This cannot be undone. Proceed?")) return;

            showToast("ðŸ” Scanning for duplicates...", "info");
            try {
                const snapshot = await getDocs(collection(db, 'products'));
                const groups = {};
                
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const name = (data.name || '').trim().toLowerCase();
                    if (!name) return;
                    if (!groups[name]) groups[name] = [];
                    groups[name].push({ id: doc.id, ...data });
                });

                const batch = writeBatch(db);
                let mergedCount = 0;
                let totalDeleted = 0;

                for (const name in groups) {
                    const products = groups[name];
                    if (products.length > 1) {
                        // Keep the one with the most data or newest update
                        products.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
                        const master = products[0];
                        const others = products.slice(1);

                        let totalStock = (master.stock || 0);
                        others.forEach(p => {
                            totalStock += (p.stock || 0);
                            batch.delete(doc(db, 'products', p.id));
                            totalDeleted++;
                        });

                        // Update master stock
                        batch.update(doc(db, 'products', master.id), { stock: totalStock, updatedAt: new Date().toISOString() });
                        mergedCount++;
                    }
                }

                if (totalDeleted > 0) {
                    await batch.commit();
                    showToast(`âœ… Successfully merged ${mergedCount} groups. Removed ${totalDeleted} duplicates.`, "success");
                    fetchInventory();
                    if (typeof fetchAndRenderProducts === 'function') fetchAndRenderProducts();
                } else {
                    showToast("No duplicates found. Your database is clean! âœ¨", "info");
                }
            } catch (e) {
                console.error("Merge error:", e);
                showToast("Error merging duplicates: " + e.message, "error");
            }
        };

        // Fetch Expiry Alerts
        window.fetchExpiryAlerts = async () => {
            const list = document.getElementById('expiry-alerts-list');
            if (!list) return;

            list.innerHTML = '<div class="text-center text-xs text-gray-400 py-4">Loading...</div>';

            try {
                const snapshot = await getDocs(query(collection(db, 'products'), orderBy('expiryDate')));
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const alerts = [];

                snapshot.docs.forEach(doc => {
                    const p = doc.data();
                    if (!p.expiryDate) return;

                    const expiryDate = new Date(p.expiryDate);
                    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                    if (daysUntilExpiry <= 30) {
                        let color, badge;
                        if (daysUntilExpiry <= 0) {
                            color = 'bg-red-100 border-red-200 text-red-700';
                            badge = 'ðŸ”´ EXPIRED';
                        } else if (daysUntilExpiry <= 7) {
                            color = 'bg-orange-100 border-orange-200 text-orange-700';
                            badge = `ðŸŸ  ${daysUntilExpiry} days`;
                        } else {
                            color = 'bg-yellow-100 border-yellow-200 text-yellow-700';
                            badge = `ðŸŸ¡ ${daysUntilExpiry} days`;
                        }

                        alerts.push({
                            name: p.name,
                            expiryDate: p.expiryDate,
                            daysUntilExpiry,
                            color,
                            badge,
                            stock: p.stock
                        });
                    }
                });

                if (alerts.length === 0) {
                    list.innerHTML = '<div class="text-center text-xs text-green-600 py-4">âœ… No expiring items in next 30 days!</div>';
                    return;
                }

                // Sort by urgency (expired first)
                alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

                list.innerHTML = alerts.map(a => `
                    <div class="flex justify-between items-center p-2 rounded-lg border ${a.color}">
                        <div>
                            <span class="font-bold text-xs">${escapeHtml(a.name)}</span>
                            <span class="text-[10px] ml-2">(${a.stock} in stock)</span>
                        </div>
                        <span class="text-[10px] font-bold">${a.badge}</span>
                    </div>
                `).join('');

            } catch (e) {
                console.error('Error fetching expiry alerts:', e);
                list.innerHTML = '<div class="text-center text-xs text-red-500 py-4">Error loading data</div>';
            }
        };

        // Fetch Full Expiry Items Table
        window.fetchFullExpiryItems = async () => {
            const list = document.getElementById('full-expiry-table-body');
            if (!list) return;

            list.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-400">Loading...</td></tr>';

            try {
                const snapshot = await getDocs(query(collection(db, 'products'), orderBy('expiryDate')));
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const alerts = [];

                snapshot.docs.forEach(doc => {
                    const p = doc.data();
                    if (!p.expiryDate) return;

                    const expiryDate = new Date(p.expiryDate);
                    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

                    let color, badge;
                    if (daysUntilExpiry <= 0) {
                        color = 'bg-red-50 text-red-700';
                        badge = 'ðŸ”´ EXPIRED (' + daysUntilExpiry + ' days)';
                    } else if (daysUntilExpiry <= 7) {
                        color = 'bg-orange-50 text-orange-700';
                        badge = `ðŸŸ  Expires in ${daysUntilExpiry} days`;
                    } else if (daysUntilExpiry <= 30) {
                        color = 'bg-yellow-50 text-yellow-700';
                        badge = `ðŸŸ¡ Expires in ${daysUntilExpiry} days`;
                    } else {
                        color = 'text-gray-500';
                        badge = `ðŸŸ¢ Healthy (${daysUntilExpiry} days)`;
                    }

                    alerts.push({
                        name: p.name,
                        expiryDate: p.expiryDate,
                        daysUntilExpiry,
                        color,
                        badge,
                        stock: p.stock
                    });
                });

                if (alerts.length === 0) {
                    list.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500">No items with expiry dates found.</td></tr>';
                    return;
                }

                // Sort by urgency (expired first)
                alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

                list.innerHTML = alerts.map(a => `
                    <tr class="${a.color}">
                        <td class="p-4 font-bold text-gray-900">${escapeHtml(a.name)}</td>
                        <td class="p-4">${a.stock}</td>
                        <td class="p-4">${a.expiryDate}</td>
                        <td class="p-4 font-bold">${a.badge}</td>
                    </tr>
                `).join('');

            } catch (e) {
                console.error('Error fetching expiry alerts:', e);
                list.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-red-500">Error loading data</td></tr>';
            }
        };

        // Fetch Stock Movements
        window.fetchStockMovements = async () => {
            const list = document.getElementById('stock-movements-list');
            if (!list) return;

            list.innerHTML = '<div class="text-center text-xs text-gray-400 py-4">Loading...</div>';

            try {
                const snapshot = await getDocs(query(collection(db, 'stock_movements'), orderBy('createdAt', 'desc'), limit(20)));

                if (snapshot.empty) {
                    list.innerHTML = '<div class="text-center text-xs text-gray-400 py-4">No stock movements yet</div>';
                    return;
                }

                list.innerHTML = snapshot.docs.map(doc => {
                    const m = doc.data();
                    const date = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString('en-GB', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    }) : 'Unknown';

                    const isAdd = m.type === 'add';
                    const icon = isAdd ? 'âž•' : 'âž–';
                    const colorClass = isAdd ? 'text-green-600' : 'text-red-600';

                    return `
                        <div class="flex justify-between items-center p-2 rounded-lg bg-white border border-gray-100">
                            <div class="flex items-center gap-2">
                                <span class="${colorClass}">${icon}</span>
                                <div>
                                    <div class="font-bold text-xs text-gray-800">${escapeHtml(m.productName || 'Unknown')}</div>
                                    <div class="text-[10px] text-gray-500">${escapeHtml(m.reason || '')}</div>
                                </div>
                            </div>
                            <div class="text-right">
                                <div class="font-bold text-xs ${colorClass}">${isAdd ? '+' : '-'}${m.quantity}</div>
                                <div class="text-[10px] text-gray-400">${date}</div>
                            </div>
                        </div>
                    `;
                }).join('');

            } catch (e) {
                console.error('Error fetching stock movements:', e);
                list.innerHTML = '<div class="text-center text-xs text-red-500 py-4">Error loading data</div>';
            }
        };

        window.quickRestock = async (productId) => {
            const amount = prompt('Enter restock quantity:', '50');
            if (!amount) return;

            const qty = parseInt(amount);
            if (isNaN(qty) || qty <= 0) {
                alert('Please enter a valid quantity');
                return;
            }

            try {
                const productRef = doc(db, 'products', productId);
                await updateDoc(productRef, {
                    stock: increment(qty)
                });

                alert(`Restocked ${qty} units successfully!`);
                fetchInventory();
            } catch (e) {
                alert('Error restocking: ' + e.message);
            }
        };

        // --- EXCEL IMPORT/EXPORT FUNCTIONS ---
        window.exportProductsToExcel = async () => {
            showToast('Preparing Excel export...', 'info');

            try {
                const snapshot = await getDocs(query(collection(db, 'products'), orderBy('name')));

                if (snapshot.empty) {
                    showToast('No products to export!', 'error');
                    return;
                }

                // Prepare data for Excel
                const data = snapshot.docs.map(doc => {
                    const p = doc.data();
                    return {
                        'Product Name': p.name || '',
                        'Product Name (Sinhala)': p.nameSi || '',
                        'Category': p.category || '',
                        'Sub Category': p.subcategory || '',
                        'Supplier': p.supplierId || '',
                        'SKU / Barcode': p.sku || '',
                        'Selling Price (Rs.)': p.price || 0,
                        'Buying Price / Cost (Rs.)': p.cost || 0,
                        'Stock Qty': p.stock || 0,
                        'Unit': p.unit || 'unit',
                        'Expiry Date': p.expiryDate || '',
                        '_id': doc.id // Hidden ID for updates
                    };
                });

                // Create workbook and worksheet
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Products');

                // Auto-size columns
                const colWidths = [
                    { wch: 30 }, // Product Name
                    { wch: 25 }, // Sinhala Name
                    { wch: 15 }, // Category
                    { wch: 15 }, // Sub Category
                    { wch: 15 }, // Supplier
                    { wch: 15 }, // SKU
                    { wch: 15 }, // Selling Price
                    { wch: 18 }, // Cost
                    { wch: 10 }, // Stock
                    { wch: 10 }, // Unit
                    { wch: 25 }  // ID
                ];
                ws['!cols'] = colWidths;

                // Generate filename with date
                const date = new Date().toISOString().split('T')[0];
                const filename = `BuddikaStores_Products_${date}.xlsx`;

                // Download file using FileSaver pattern for reliable filename
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/octet-stream' });

                // Create download link
                const link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);

                // Use setTimeout to ensure the link is in DOM before clicking
                setTimeout(() => {
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(link.href);
                }, 100);

                showToast(`Exported ${data.length} products! âœ…`, 'success');

            } catch (e) {
                console.error('Export error:', e);
                showToast('Export failed: ' + e.message, 'error');
            }
        };

        window.importProductsFromExcel = async (input) => {
            const file = input.files[0];
            if (!file) return;
            input.value = '';

            try {
                showToast('ðŸ“‚ Reading Excel file...', 'info');
                const data = await file.arrayBuffer();
                const workbook = XLSX.read(data);
                const sheetName = workbook.SheetNames[0];
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

                if (jsonData.length === 0) {
                    showToast('Excel file is empty!', 'error');
                    return;
                }

                const choice = prompt(
                    `Found ${jsonData.length} products.\n\n` +
                    `1 = Update Existing (Match by SKU or Name)\n` +
                    `2 = Add All as New\n` +
                    `3 = Cancel`
                );

                if (choice !== '1' && choice !== '2') {
                    showToast('Import cancelled', 'info');
                    return;
                }

                const isUpdateMode = choice === '1';
                showToast('âš¡ Preparing database...', 'info');

                // 1. Pre-fetch all products for fast matching
                const existingProducts = [];
                const snapshot = await getDocs(collection(db, 'products'));
                snapshot.forEach(doc => existingProducts.push({ id: doc.id, ...doc.data() }));

                // Create lookup maps
                const skuMap = new Map();
                const nameMap = new Map();
                existingProducts.forEach(p => {
                    if (p.sku) skuMap.set(String(p.sku).trim().toLowerCase(), p.id);
                    if (p.name) nameMap.set(String(p.name).trim().toLowerCase(), p.id);
                });

                let processed = 0;
                let successCount = 0;
                let errorCount = 0;

                // 2. Process in batches of 400 (Firestore limit is 500)
                const chunks = [];
                for (let i = 0; i < jsonData.length; i += 400) {
                    chunks.push(jsonData.slice(i, i + 400));
                }

                for (const chunk of chunks) {
                    const batch = writeBatch(db);
                    
                    for (const row of chunk) {
                        try {
                            const name = String(row['Product Name'] || '').trim();
                            const sku = String(row['SKU / Barcode'] || '').trim();
                            
                            if (!name) continue;

                            const productData = {
                                name: name,
                                nameSi: row['Product Name (Sinhala)'] || '',
                                category: row['Category'] || 'Grocery',
                                subcategory: row['Sub Category'] || '',
                                supplierId: row['Supplier'] || '',
                                sku: sku,
                                price: parseFloat(row['Selling Price (Rs.)']) || 0,
                                cost: parseFloat(row['Buying Price / Cost (Rs.)']) || 0,
                                stock: parseFloat(row['Stock Qty']) || 0,
                                unit: row['Unit'] || 'unit',
                                expiryDate: row['Expiry Date'] || '',
                                updatedAt: new Date().toISOString()
                            };

                            let targetId = null;
                            const lowerName = name.toLowerCase();
                            const lowerSku = sku.toLowerCase();

                            if (isUpdateMode) {
                                // Priority 1: Direct ID in Excel
                                if (row['_id']) targetId = row['_id'];
                                // Priority 2: SKU Match
                                if (!targetId && sku) targetId = skuMap.get(lowerSku);
                                // Priority 3: Name Match
                                if (!targetId) targetId = nameMap.get(lowerName);
                            }

                            if (targetId) {
                                batch.set(doc(db, 'products', targetId), productData, { merge: true });
                            } else {
                                // Manual ID generation to update local map immediately
                                const newDocRef = doc(collection(db, 'products'));
                                targetId = newDocRef.id;
                                productData.createdAt = new Date().toISOString();
                                batch.set(newDocRef, productData);

                                // IMPORTANT: Update the local map so subsequent rows in this same Excel 
                                // for the same product find this new document ID instead of creating another duplicate.
                                if (sku) skuMap.set(lowerSku, targetId);
                                nameMap.set(lowerName, targetId);
                            }
                            successCount++;
                        } catch (e) {
                            errorCount++;
                            console.error('Row error:', e);
                        }
                    }

                    await batch.commit();
                    processed += chunk.length;
                    showToast(`â³ Processed ${processed}/${jsonData.length}...`, 'info');
                }

                showToast(`âœ… Successfully imported ${successCount} products!`, 'success');
                if (errorCount > 0) showToast(`âš ï¸ ${errorCount} errors occurred.`, 'warning');

                // Refresh both views
                if (typeof fetchInventory === 'function') fetchInventory();
                if (typeof fetchAndRenderProducts === 'function') fetchAndRenderProducts();

            } catch (e) {
                console.error('Import failed:', e);
                showToast('âŒ Import failed: ' + e.message, 'error');
            }
        };

        // --- PRODUCTS LOGIC ---
        window.fetchAndRenderProducts = async (isNext = false, isPrev = false) => {
            const list = document.getElementById('products-list');
            const term = document.getElementById('admin-search').value.trim();

            list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">Loading...</td></tr>';

            try {
                const ref = collection(db, "products");
                let q;

                console.log('Fetching products. Term:', term, 'Next:', isNext, 'Prev:', isPrev, 'Page:', currentPage, 'StackSize:', pageStack.length);

                if (term) {
                    // Fetch all products and filter client-side for case-insensitive partial matching
                    const termLower = term.toLowerCase();
                    const allSnapshot = await getDocs(query(ref, orderBy('name')));
                    const matchingDocs = allSnapshot.docs.filter(doc => {
                        const p = doc.data();
                        const nameMatch = p.name && p.name.toLowerCase().includes(termLower);
                        const nameSiMatch = p.nameSi && p.nameSi.toLowerCase().includes(termLower);
                        const skuMatch = p.sku && p.sku.toLowerCase().includes(termLower);
                        return nameMatch || nameSiMatch || skuMatch;
                    });

                    // Clear pagination for search
                    pageStack = [];
                    currentPage = 1;

                    const btnPrev = document.getElementById('prev-btn');
                    const btnNext = document.getElementById('next-btn');

                    if (matchingDocs.length === 0) {
                        list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">No products found.</td></tr>';
                        if (btnPrev) btnPrev.disabled = true;
                        if (btnNext) btnNext.disabled = true;
                        return;
                    }

                    // Render matching products
                    list.innerHTML = matchingDocs.map(doc => {
                        const p = doc.data();
                        window.productsData[doc.id] = p;

                        let imageHTML = '';
                        if (p.image && p.image.startsWith('emoji:')) {
                            imageHTML = `<span class="text-2xl">${p.image.split(':')[1]}</span>`;
                        } else if (p.image) {
                            imageHTML = `<img src="${p.image}" class="w-8 h-8 rounded object-cover border border-gray-200">`;
                        } else {
                            imageHTML = `<div class="w-8 h-8 bg-gray-100 rounded border border-gray-200"></div>`;
                        }

                        return `
                <tr class="hover:bg-gray-50 group border-b border-gray-50 last:border-0">
                    <td class="p-4 flex items-center gap-3">
                        ${imageHTML}
                        <div>
                            <div class="font-bold text-gray-900">${escapeHtml(p.name)}</div>
                        </div>
                    </td>
                    <td class="p-4 text-gray-600">
                        <span class="px-2 py-1 bg-gray-100 rounded text-xs font-bold uppercase tracking-wide">${escapeHtml(p.category)}</span>
                        ${p.subcategory ? `<span class="text-xs text-gray-400 ml-1">(${escapeHtml(p.subcategory)})</span>` : ''}
                    </td>
                    <td class="p-4 font-bold text-gray-900">${escapeHtml(p.price)}</td>
                    <td class="p-4">
                        <span class="${(p.stock > 10) ? 'text-green-600' : 'text-red-500 font-bold'}">${escapeHtml(p.stock || 0)}</span>
                        <span class="text-xs text-gray-400">${escapeHtml(p.unit || 'unit')}</span>
                    </td>
                    <td class="p-4 text-right">
                        <button onclick="editProduct('${doc.id}')" class="text-sm font-bold text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                        <button onclick="deleteProduct('${doc.id}')" class="text-sm font-bold text-red-500 hover:text-red-700">Delete</button>
                    </td>
                </tr>
                `;
                    }).join('');

                    if (btnPrev) btnPrev.disabled = true;
                    if (btnNext) btnNext.disabled = true;
                    return;
                } else if (isNext && lastVisible) {
                    q = query(ref, orderBy("name"), startAfter(lastVisible), limit(PER_PAGE));
                    pageStack.push(lastVisible);
                    currentPage++;
                } else if (isPrev && pageStack.length > 0) {
                    const prevLastVisible = pageStack.pop();
                    if (pageStack.length === 0) {
                        q = query(ref, orderBy("name"), limit(PER_PAGE));
                    } else {
                        const targetDoc = pageStack[pageStack.length - 1];
                        q = query(ref, orderBy("name"), startAfter(targetDoc), limit(PER_PAGE));
                    }
                    currentPage--;
                } else {
                    // Default / Fallback
                    q = query(ref, orderBy("name"), limit(PER_PAGE));
                    pageStack = [];
                    currentPage = 1;
                }

                const snapshot = await getDocs(q);

                const btnPrev = document.getElementById('prev-btn');
                const btnNext = document.getElementById('next-btn');

                if (snapshot.empty) {
                    list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">No products found.</td></tr>';
                    if (btnPrev) btnPrev.disabled = (currentPage <= 1);
                    if (btnNext) btnNext.disabled = true;
                    return;
                }

                lastVisible = snapshot.docs[snapshot.docs.length - 1];

                if (btnPrev) btnPrev.disabled = (currentPage <= 1);
                if (btnNext) btnNext.disabled = (snapshot.docs.length < PER_PAGE);

                list.innerHTML = snapshot.docs.map(doc => {
                    const p = doc.data();
                    window.productsData[doc.id] = p;

                    let imageHTML = '';
                    if (p.image && p.image.startsWith('emoji:')) {
                        imageHTML = `<span class="text-2xl">${p.image.split(':')[1]}</span>`;
                    } else if (p.image) {
                        imageHTML = `<img src="${p.image}" class="w-8 h-8 rounded object-cover border border-gray-200">`;
                    } else {
                        imageHTML = `<div class="w-8 h-8 bg-gray-100 rounded border border-gray-200"></div>`;
                    }

                    return `
            <tr class="hover:bg-gray-50 group border-b border-gray-50 last:border-0">
                <td class="p-4 flex items-center gap-3">
                    ${imageHTML}
                    <div>
                        <div class="font-bold text-gray-900">${escapeHtml(p.name)}</div>
                    </div>
                </td>
                <td class="p-4 text-gray-600">
                    <span class="px-2 py-1 bg-gray-100 rounded text-xs font-bold uppercase tracking-wide">${escapeHtml(p.category)}</span>
                    ${p.subcategory ? `<span class="text-xs text-gray-400 ml-1">(${escapeHtml(p.subcategory)})</span>` : ''}
                </td>
                <td class="p-4 font-bold text-gray-900">${escapeHtml(p.price)}</td>
                <td class="p-4">
                    <span class="${(p.stock > 10) ? 'text-green-600' : 'text-red-500 font-bold'}">${escapeHtml(p.stock || 0)}</span>
                    <span class="text-xs text-gray-400">${escapeHtml(p.unit || 'unit')}</span>
                </td>
                <td class="p-4 text-right">
                    <button onclick="editProduct('${doc.id}')" class="text-sm font-bold text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                    <button onclick="deleteProduct('${doc.id}')" class="text-sm font-bold text-red-500 hover:text-red-700">Delete</button>
                </td>
            </tr>
            `;
                }).join('');

            } catch (e) {
                console.error(e);
                list.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-red-500">Error: ${e.message}</td></tr>`;
            }
        }

        // --- ORDERS LOGIC ---
        window.fetchOrders = async () => {
            const container = document.getElementById('orders-list');
            container.innerHTML = '<div class="text-center py-20"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto"></div></div>';

            try {
                const q = query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'), limit(50));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    container.innerHTML = '<div class="text-center py-20 text-gray-400">No orders found.</div>';
                    return;
                }

                container.innerHTML = snapshot.docs.map(doc => {
                    const order = doc.data();
                    const date = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'N/A';

                    let statusColor = 'bg-yellow-100 text-yellow-800';
                    if (order.status === 'Shipped') statusColor = 'bg-blue-100 text-blue-800';
                    if (order.status === 'Completed') statusColor = 'bg-green-100 text-green-800';
                    if (order.status === 'Cancelled') statusColor = 'bg-red-100 text-red-800';

                    const itemsHtml = order.items ? order.items.map(i => `
            <div class="flex justify-between py-1 border-b border-gray-50 last:border-0 text-gray-700">
                <span>${escapeHtml(i.qty)} x ${escapeHtml(i.name)}</span>
                <span class="font-mono text-gray-500">Rs. ${escapeHtml(i.itemTotal)}</span>
            </div>
            `).join('') : '';

                    return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div class="bg-gray-50 px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100">
                    <div>
                        <div class="flex items-center gap-3">
                            <h3 class="font-bold text-lg text-gray-900">#${doc.id.slice(0, 8)}...</h3>
                            <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${statusColor}">${escapeHtml(order.status || 'Pending')}</span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">${date} â€¢ ${escapeHtml(order.paymentMethod ? order.paymentMethod.toUpperCase() : 'COD')}</p>
                    </div>
                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <select onchange="updateOrderStatus('${doc.ref.path}', this.value)" class="bg-white border border-gray-200 text-sm rounded-lg p-2 outline-none focus:ring-2 focus:ring-black cursor-pointer shadow-sm">
                            <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button onclick="window.open('https://wa.me/${escapeHtml(order.contact)}?text=Hello, regarding Order #${doc.id}...', '_blank')" class="bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-100">
                            WhatsApp
                        </button>
                    </div>
                </div>
                <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Order Items</h4>
                        <div class="space-y-2 text-sm">
                            ${itemsHtml}
                        </div>
                        <div class="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center font-bold text-lg">
                            <span>Total</span>
                            <span>Rs. ${escapeHtml(order.total)}</span>
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-5">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Delivery Details</h4>
                        <div>
                            <p class="font-bold text-gray-900">${order.shippingMethod === 'delivery' ? 'Home Delivery' : 'Store Pickup'}</p>
                            <p class="text-gray-600 text-sm mt-1 leading-relaxed">${escapeHtml(order.address || 'N/A')}</p>
                            <p class="text-gray-500 text-sm mt-3 flex items-center gap-2">
                                ${escapeHtml(order.contact || 'No Contact')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            `;
                }).join('');

            } catch (e) {
                console.error(e);
                container.innerHTML = `<div class="text-center py-20 text-red-500">Error loading orders: ${e.message}</div>`;
            }
        }

        window.updateOrderStatus = async (docPath, status) => {
            if (!confirm('Update status?')) return;
            try {
                const docRef = doc(db, docPath);
                await updateDoc(docRef, { status });
                alert("Updated!");
                fetchOrders();
            } catch (e) {
                alert("Error: " + e.message);
            }
        }

        // --- PRODUCT MODAL LOGIC ---
        const modal = document.getElementById('product-modal');
        const modalContent = document.getElementById('modal-content');

        window.openModal = () => {
            document.getElementById('product-form').reset();
            document.getElementById('p-image-file').value = ''; // Reset file input
            document.getElementById('edit-id').value = '';
            document.getElementById('modal-title').innerText = "Add New Product";

            // Update subcategory dropdown based on default category (grocery shows none)
            updateSubcategoryOptions();

            modal.classList.remove('hidden');
            setTimeout(() => {
                modalContent.classList.remove('scale-95', 'opacity-0')
                modalContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        window.closeModal = () => {
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300);
        }

        window.editProduct = (id) => {
            const p = window.productsData[id];
            if (!p) return;

            openModal();
            document.getElementById('edit-id').value = id;
            document.getElementById('p-name').value = p.name;
            document.getElementById('p-name-si').value = p.nameSi || '';
            document.getElementById('p-price').value = p.price ? p.price.toString().replace(/Rs\.?\s*/ig, '') : '';
            document.getElementById('p-cost').value = p.cost ? p.cost.toString().replace(/Rs\.?\s*/ig, '') : ''; // Populate Cost
            document.getElementById('p-category').value = p.category;

            // Populate subcategory dropdown based on category, then select the value
            updateSubcategoryOptions(p.subcategory || '');

            document.getElementById('p-image').value = p.image || '';
            document.getElementById('p-stock').value = p.stock !== undefined ? p.stock : 0;
            document.getElementById('p-unit').value = p.unit || 'unit';
            document.getElementById('p-sku').value = p.sku || '';
            document.getElementById('p-expiry').value = p.expiryDate || '';
            document.getElementById('modal-title').innerText = "Edit Product";
            // Set supplier dropdown if exists
            setTimeout(() => {
                const supplierSelect = document.getElementById('p-supplier');
                if (supplierSelect && p.supplierId) {
                    supplierSelect.value = p.supplierId;
                }
            }, 100);
        }

        document.getElementById('product-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-id').value;
            const data = {
                name: document.getElementById('p-name').value,
                nameSi: document.getElementById('p-name-si').value,
                price: `Rs. ${document.getElementById('p-price').value.trim().replace(/Rs\.?\s*/ig, '')}`,
                cost: document.getElementById('p-cost').value.trim() ? `Rs. ${document.getElementById('p-cost').value.trim().replace(/Rs\.?\s*/ig, '')}` : '', // Save Cost
                category: document.getElementById('p-category').value,
                subcategory: document.getElementById('p-subcategory').value,
                sku: document.getElementById('p-sku').value,
                image: document.getElementById('p-image').value,
                stock: parseFloat(document.getElementById('p-stock').value),
                unit: document.getElementById('p-unit').value,
                supplierId: document.getElementById('p-supplier')?.value || '',
                expiryDate: document.getElementById('p-expiry').value || '',
                createdAt: new Date().toISOString()
            };

            const btn = e.target.querySelector('button[type="submit"]');
            const fileInput = document.getElementById('p-image-file');

            btn.disabled = true;

            try {
                // Upload Image if selected
                if (fileInput.files.length > 0) {
                    btn.innerText = "Uploading Image...";
                    const url = await uploadImage(fileInput.files[0], 'products');
                    data.image = url;
                }

                btn.innerText = "Saving Product...";

                if (id) {
                    await setDoc(doc(db, "products", id), data, { merge: true });
                } else {
                    await setDoc(doc(collection(db, "products")), data);
                }
                closeModal();
                fetchAndRenderProducts();
            } catch (e) {
                alert(e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Save Product";
            }
        });

        window.deleteProduct = async (id) => {
            if (!confirm("Delete this product?")) return;
            await deleteDoc(doc(db, "products", id));
            fetchAndRenderProducts();
        }

        window.runMigration = async () => {
            if (!confirm("Upload local products_db?")) return;
            const module = await import('./assets/js/products_db_module.js');
            const list = module.products;
            let c = 0;
            for (const p of list) {
                await setDoc(doc(db, "products", p.id), p);
                c++;
            }
            alert(`Uploaded ${c} items.`);
            window.location.reload();
        }

        // --- PROMOTIONS LOGIC ---
        window.fetchPromotions = async () => {
            const list = document.getElementById('promotions-list');
            list.innerHTML = '<div class="text-center py-20 text-gray-400 col-span-full">Loading...</div>';
            try {
                const q = query(collection(db, 'promotions'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    list.innerHTML = '<div class="text-center py-20 text-gray-400 col-span-full">No promotions added yet.</div>';
                    return;
                }

                list.innerHTML = snapshot.docs.map(doc => {
                    const p = doc.data();
                    window.promoData[doc.id] = p;
                    return `
            <div class="bg-white border border-gray-200 rounded-xl p-4 relative group hover:shadow-lg transition-all">
                <div class="absolute top-4 right-4 z-10 flex gap-2">
                    <button onclick="generateSocialPost('promotion', '${doc.id}')" class="bg-blue-600 text-white p-1 rounded shadow hover:bg-blue-700" title="Social Post"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg></button>
                    <button onclick="editPromo('${doc.id}')" class="bg-white text-blue-600 p-1 rounded shadow hover:bg-gray-100"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button onclick="deletePromo('${doc.id}')" class="bg-white text-red-500 p-1 rounded shadow hover:bg-gray-100"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
                <div class="h-32 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                    ${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-gray-400">No Image</div>'}
                </div>
                <h4 class="font-bold text-lg mb-1">${p.title}</h4>
                <p class="text-xs text-gray-500 mb-3 line-clamp-2">${p.description}</p>
                <div class="flex justify-between items-center">
                    <div>
                        ${p.oldPrice ? `<span class="text-xs text-gray-400 line-through mr-1">Rs. ${p.oldPrice}</span>` : ''}
                        <span class="font-bold text-black">Rs. ${p.price}</span>
                    </div>
                    ${p.badge ? `<span class="bg-black text-white text-xs px-2 py-1 rounded-full">${p.badge}</span>` : ''}
                </div>
            </div>
            `;
                }).join('');

            } catch (e) {
                console.error(e);
                list.innerHTML = `<div class="text-center text-red-500 col-span-full">Error: ${e.message}</div>`;
            }
        }

        const promoModal = document.getElementById('promo-modal');
        const promoContent = document.getElementById('promo-modal-content');

        window.openPromoModal = () => {
            document.getElementById('promo-form').reset();
            document.getElementById('pm-image-file').value = '';
            document.getElementById('promo-edit-id').value = '';
            document.getElementById('promo-modal-title').innerText = "Add Promotion";
            promoModal.classList.remove('hidden');
            setTimeout(() => {
                promoContent.classList.remove('scale-95', 'opacity-0');
                promoContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        window.closePromoModal = () => {
            promoContent.classList.remove('scale-100', 'opacity-100');
            promoContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => promoModal.classList.add('hidden'), 300);
        }

        window.editPromo = (id) => {
            const p = window.promoData[id];
            if (!p) return;
            openPromoModal();
            document.getElementById('promo-modal-title').innerText = "Edit Promotion";
            document.getElementById('promo-edit-id').value = id;
            document.getElementById('pm-title').value = p.title;
            document.getElementById('pm-desc').value = p.description || '';
            document.getElementById('pm-price').value = p.price ? p.price.toString().replace(/Rs\.?\s*/ig, '') : '';
            document.getElementById('pm-old-price').value = p.oldPrice ? p.oldPrice.toString().replace(/Rs\.?\s*/ig, '') : '';
            document.getElementById('pm-badge').value = p.badge || '';
            document.getElementById('pm-status').value = p.status || 'active';
            document.getElementById('pm-image').value = p.image || '';
        }

        window.savePromotion = async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const orgText = btn.innerText;

            try {
                const id = document.getElementById('promo-edit-id').value;
                const fileInput = document.getElementById('pm-image-file');

                const data = {
                    title: document.getElementById('pm-title').value,
                    description: document.getElementById('pm-desc').value,
                    price: `Rs. ${document.getElementById('pm-price').value.trim().replace(/Rs\.?\s*/ig, '')}`,
                    oldPrice: document.getElementById('pm-old-price').value.trim() ? `Rs. ${document.getElementById('pm-old-price').value.trim().replace(/Rs\.?\s*/ig, '')}` : '',
                    badge: document.getElementById('pm-badge').value,
                    status: 'active', // Default
                    image: document.getElementById('pm-image').value,
                    createdAt: new Date().toISOString()
                };

                btn.disabled = true;
                btn.innerText = "Processing...";

                if (fileInput.files.length > 0) {
                    btn.innerText = "Uploading...";
                    const url = await uploadImage(fileInput.files[0], 'promotions');
                    data.image = url;
                }

                btn.innerText = "Saving...";

                if (id) {
                    await setDoc(doc(db, "promotions", id), data, { merge: true });
                } else {
                    await setDoc(doc(collection(db, "promotions")), data);
                }

                showToast("Promotion Saved! âœ…", "success");
                closePromoModal();
                fetchPromotions();
            } catch (err) {
                console.error(err);
                alert("Error saving promotion: " + err.message);
            } finally {
                btn.disabled = false;
                btn.innerText = orgText || "Save";
            }
        };

        window.deletePromo = async (id) => {
            if (!confirm("Delete this promotion?")) return;
            try {
                await deleteDoc(doc(db, 'promotions', id));
                fetchPromotions();
            } catch (e) {
                alert(e.message);
            }
        }

        // --- NEWS LOGIC ---
        window.fetchNews = async () => {
            const list = document.getElementById('news-list');
            list.innerHTML = '<div class="text-center py-20 text-gray-400 col-span-full">Loading...</div>';
            try {
                const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    list.innerHTML = '<div class="text-center py-20 text-gray-400 col-span-full">No news articles added yet.</div>';
                    return;
                }

                list.innerHTML = snapshot.docs.map(doc => {
                    const p = doc.data();
                    window.newsData[doc.id] = p;
                    return `
            <div class="bg-white border border-gray-200 rounded-xl p-4 relative group hover:shadow-lg transition-all">
                <div class="absolute top-4 right-4 z-10 flex gap-2">
                    <button onclick="generateSocialPost('news', '${doc.id}')" class="bg-blue-600 text-white p-1 rounded shadow hover:bg-blue-700" title="Social Post"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg></button>
                    <button onclick="editNews('${doc.id}')" class="bg-white text-blue-600 p-1 rounded shadow hover:bg-gray-100"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button onclick="deleteNews('${doc.id}')" class="bg-white text-red-500 p-1 rounded shadow hover:bg-gray-100"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
                <div class="h-32 bg-gray-100 rounded-lg mb-4 overflow-hidden">
                    ${p.image ? `<img src="${p.image}" class="w-full h-full object-cover">` : '<div class="w-full h-full flex items-center justify-center text-gray-400">No Image</div>'}
                </div>
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">${p.date}</span>
                <h4 class="font-bold text-lg mb-1">${p.title}</h4>
                <p class="text-xs text-gray-500 line-clamp-2">${p.content}</p>
            </div>
            `;
                }).join('');

            } catch (e) {
                console.error(e);
                list.innerHTML = `<div class="text-center text-red-500 col-span-full">Error: ${e.message}</div>`;
            }
        }

        const newsModal = document.getElementById('news-modal');
        const newsContent = document.getElementById('news-modal-content');

        window.openNewsModal = () => {
            document.getElementById('news-form').reset();
            document.getElementById('nm-image-file').value = '';
            document.getElementById('news-edit-id').value = '';
            document.getElementById('news-modal-title').innerText = "Add News Article";
            newsModal.classList.remove('hidden');
            setTimeout(() => {
                newsContent.classList.remove('scale-95', 'opacity-0');
                newsContent.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        window.closeNewsModal = () => {
            newsContent.classList.remove('scale-100', 'opacity-100');
            newsContent.classList.add('scale-95', 'opacity-0');
            setTimeout(() => newsModal.classList.add('hidden'), 300);
        }

        window.editNews = (id) => {
            const p = window.newsData[id];
            if (!p) return;
            openNewsModal();
            document.getElementById('news-modal-title').innerText = "Edit News Article";
            document.getElementById('news-edit-id').value = id;
            document.getElementById('nm-title').value = p.title;
            document.getElementById('nm-date').value = p.date;
            document.getElementById('nm-desc').value = p.content;
            document.getElementById('nm-image').value = p.image || '';
        }

        document.getElementById('news-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('news-edit-id').value;
            const data = {
                title: document.getElementById('nm-title').value,
                date: document.getElementById('nm-date').value,
                content: document.getElementById('nm-desc').value,
                image: document.getElementById('nm-image').value,
                createdAt: new Date().toISOString()
            };

            const btn = e.target.querySelector('button[type="submit"]');
            const fileInput = document.getElementById('nm-image-file');
            const orgText = btn.innerText;

            btn.disabled = true;

            try {
                if (fileInput.files.length > 0) {
                    btn.innerText = "Uploading...";
                    const url = await uploadImage(fileInput.files[0], 'news');
                    data.image = url;
                }

                btn.innerText = "Saving...";

                if (id) {
                    await setDoc(doc(db, "news", id), data, { merge: true });
                } else {
                    await setDoc(doc(collection(db, "news")), data);
                }
                closeNewsModal();
                fetchNews();
            } catch (e) {
                alert(e.message);
            } finally {
                btn.disabled = false;
                btn.innerText = "Save";
            }
        };

        window.deleteNews = async (id) => {
            if (!confirm("Delete this article?")) return;
            try {
                await deleteDoc(doc(db, 'news', id));
                fetchNews();
            } catch (e) {
                alert(e.message);
            }
        }

        // --- SOCIAL POST GENERATOR ---
        window.closeSocialModal = () => {
            const m = document.getElementById('social-modal');
            const c = document.getElementById('social-modal-content');
            c.classList.remove('scale-100', 'opacity-100');
            c.classList.add('scale-95', 'opacity-0');
            setTimeout(() => m.classList.add('hidden'), 300);
        };

        window.manualImageSrc = null;

        window.handleManualImage = (input) => {
            if (input.files && input.files[0]) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    window.manualImageSrc = e.target.result;
                    redrawCanvas();
                }
                reader.readAsDataURL(input.files[0]);
            }
        };

        window.redrawCanvas = async () => {
            const canvas = document.getElementById('social-canvas');
            const ctx = canvas.getContext('2d');

            // Get current data
            const type = window.currentSocialType;
            const id = window.currentSocialId;
            let data = (type === 'promotion') ? window.promoData[id] : window.newsData[id];

            const title = data.title;
            const desc = data.description || data.content;
            const imgUrl = window.manualImageSrc || data.image;

            // Draw Image
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 1080, 1080);

            if (imgUrl) {
                const img = new Image();
                img.crossOrigin = "Anonymous";
                img.src = imgUrl;

                try {
                    await new Promise((resolve, reject) => {
                        img.onload = resolve;
                        img.onerror = () => reject(new Error("Load Failed"));
                        if (!imgUrl.startsWith('data:')) setTimeout(() => reject(new Error('Timeout')), 10000);
                    });

                    const scale = Math.max(1080 / img.width, 1080 / img.height);
                    const x = (1080 - img.width * scale) / 2;
                    const y = (1080 - img.height * scale) / 2;
                    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

                    const grad = ctx.createLinearGradient(0, 500, 0, 1080);
                    grad.addColorStop(0, 'transparent');
                    grad.addColorStop(1, 'rgba(0,0,0,0.9)');
                    ctx.fillStyle = grad;
                    ctx.fillRect(0, 0, 1080, 1080);
                } catch (e) {
                    console.error(e);
                    ctx.fillStyle = '#111';
                    ctx.fillRect(0, 0, 1080, 1080);
                }
            } else {
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, 1080, 1080);
            }

            // Branding & Text
            ctx.fillStyle = '#FFA500';
            ctx.font = 'bold 40px sans-serif';
            ctx.fillText('BUDDIKA STORES', 60, 100);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 80px "Padauk", sans-serif';
            wrapText(ctx, title, 60, 750, 960, 90);

            ctx.fillStyle = '#ddd';
            ctx.font = '40px "Padauk", sans-serif';
            wrapText(ctx, desc.substring(0, 150) + (desc.length > 150 ? '...' : ''), 60, 900, 960, 50);

            ctx.fillStyle = '#FFA500';
            ctx.fillRect(60, 960, 300, 60);
            ctx.fillStyle = '#000';
            ctx.font = 'bold 30px sans-serif';
            ctx.fillText('AVAILABLE NOW', 85, 1000);
        };

        window.generateSocialPost = async (type, id) => {
            // Save state for redraw
            window.currentSocialType = type;
            window.currentSocialId = id;
            window.manualImageSrc = null; // Reset manual image

            const m = document.getElementById('social-modal');
            const c = document.getElementById('social-modal-content');
            const captionEl = document.getElementById('social-caption');

            m.classList.remove('hidden');
            setTimeout(() => {
                c.classList.remove('scale-95', 'opacity-0');
                c.classList.add('scale-100', 'opacity-100');
            }, 10);

            // Fetch Data
            let data;
            if (type === 'promotion') data = window.promoData[id];
            else data = window.newsData[id];

            captionEl.value = `ðŸ”¥ ${data.title}\n\n${data.description || data.content}\n\nðŸ“ Visit Buddika Stores today!\nðŸ“ž Contact: 0784-66-88-3\n\n#BuddikaStores #Offers #LKA #Promo #Deals #SriLanka`;

            // Draw initial
            redrawCanvas();
        };

        // --- SETTINGS LOGIC ---
        window.openSettingsModal = async () => {
            const m = document.getElementById('settings-modal');
            const c = document.getElementById('settings-modal-content');
            
            // Map IDs accurately to match the new consolidated HTML
            const apiKeyInput = document.getElementById('setting-gemini-api-key');
            const courierLocal = document.getElementById('setting-courier-local');
            const courierOutstation = document.getElementById('setting-courier-outstation');
            const timerBooklist = document.getElementById('setting-timer-booklist');

            // Load saved key from localStorage (for Gemini API Key)
            const savedKey = localStorage.getItem('gemini_api_key');
            if (savedKey && apiKeyInput) apiKeyInput.value = savedKey;

            // Load Configuration from Firestore
            try {
                const snap = await getDoc(doc(db, "settings", "store_config"));
                if (snap.exists()) {
                    const data = snap.data();
                    if (courierLocal) courierLocal.value = data.courierFeeLocal || data.courierFeeColombo || "";
                    if (courierOutstation) courierOutstation.value = data.courierFeeOutstation || "";
                    if (timerBooklist) timerBooklist.value = data.countdownTimers?.bookListOffer || "";
                }
            } catch (e) {
                console.error("Error loading settings:", e);
            }

            // Load Dynamic Categories into Settings Modal
            window.renderSettingsCategoryList();

            // Load Drivers
            fetchDrivers();

            m.classList.remove('hidden');
            setTimeout(() => {
                c.classList.remove('scale-95', 'opacity-0');
                c.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        window.closeSettingsModal = () => {
            const m = document.getElementById('settings-modal');
            const c = document.getElementById('settings-modal-content');
            c.classList.remove('scale-100', 'opacity-100');
            c.classList.add('scale-95', 'opacity-0');
            setTimeout(() => m.classList.add('hidden'), 300);
        }

        window.saveSettings = async () => {
            const apiKey = document.getElementById('setting-gemini-api-key').value.trim();
            const localFee = document.getElementById('setting-courier-local').value;
            const outstationFee = document.getElementById('setting-courier-outstation').value;
            const timerBooklist = document.getElementById('setting-timer-booklist').value;

            // Save Key Locally
            if(apiKey) localStorage.setItem('gemini_api_key', apiKey);

            // Save All Settings to Firestore
            try {
                const btn = document.getElementById('btn-save-settings');
                btn.innerText = "Saving...";
                btn.disabled = true;

                await setDoc(doc(db, "settings", "store_config"), {
                    geminiApiKey: apiKey || "",
                    courierFeeLocal: Number(localFee) || 0,
                    courierFeeOutstation: Number(outstationFee) || 0,
                    countdownTimers: {
                        bookListOffer: timerBooklist || null
                    }
                }, { merge: true });

                // Also save the dynamic categories structure if it was modified (handled by window.adminSubcategories)
                const catRef = doc(db, 'settings', 'categories_config');
                await setDoc(catRef, { data: window.adminSubcategories }, { merge: true });

                showToast("All Settings Saved! âœ…", "success");
                closeSettingsModal();
            } catch (e) {
                console.error("Error saving settings:", e);
                alert("Failed to save settings: " + e.message);
            } finally {
                const btn = document.getElementById('btn-save-settings');
                if(btn) {
                    btn.innerText = "Save All";
                    btn.disabled = false;
                }
            }
        }

        // --- NEW SETTINGS CATEGORY UI LOGIC ---
        window.renderSettingsCategoryList = () => {
            const listContainer = document.getElementById('settings-category-list');
            if(!listContainer) return;
            
            listContainer.innerHTML = '';
            const cats = window.adminSubcategories || {};

            if (Object.keys(cats).length === 0) {
                listContainer.innerHTML = `<div class="text-center py-4 text-gray-400 text-xs italic">No categories defined.</div>`;
                return;
            }

            // Sort alphabetically for consistency
            Object.keys(cats).sort().forEach(catName => {
                const row = document.createElement('div');
                row.className = "group border border-gray-100 rounded-xl p-3 bg-white hover:border-black transition-all mb-2";
                
                // Get subcategories count
                let subCount = 0;
                Object.values(cats[catName]).forEach(group => subCount += group.length);

                row.innerHTML = `
                    <div class="flex justify-between items-center cursor-pointer" onclick="this.nextElementSibling.classList.toggle('hidden')">
                        <div class="flex items-center gap-3">
                            <span class="text-xs">ðŸ“‚</span>
                            <span class="font-bold text-sm text-gray-800">${escapeHtml(catName)}</span>
                            <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">${subCount} Items</span>
                        </div>
                        <div class="flex items-center gap-2">
                             <button onclick="event.stopPropagation(); window.addNewSubcategoryFromSettings('${escapeJs(catName)}')" class="text-[10px] font-bold text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100">+ SUB</button>
                             <button onclick="event.stopPropagation(); window.deleteMainCategoryFromSettings('${escapeJs(catName)}')" class="text-red-400 hover:text-red-600 p-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                             </button>
                        </div>
                    </div>
                    <div class="hidden mt-3 pl-6 space-y-1 border-l-2 border-gray-100 ml-1.5">
                        ${window.renderSubcategoryListForSettings(catName, cats[catName])}
                    </div>
                `;
                listContainer.appendChild(row);
            });
        }

        window.renderSubcategoryListForSettings = (catName, catData) => {
            let html = '';
            for (const [groupName, subs] of Object.entries(catData)) {
                subs.forEach((sub, index) => {
                    html += `
                        <div class="flex justify-between items-center text-xs py-1.5 hover:bg-gray-50 px-2 rounded-md group/sub">
                            <span class="text-gray-600">${escapeHtml(sub)} <span class="text-[9px] text-gray-300 ml-1">(${escapeHtml(groupName)})</span></span>
                            <button onclick="window.deleteSubcategoryFromSettings('${escapeJs(catName)}', '${escapeJs(groupName)}', ${index})" class="text-gray-300 hover:text-red-500 opacity-0 group-hover/sub:opacity-100">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                    `;
                });
            }
            return html || `<p class="text-[10px] text-gray-400 italic">No subcategories yet.</p>`;
        }

        window.addNewMainCategoryFromSettings = () => {
            const input = document.getElementById('new-category-name');
            const name = input.value.trim();
            if (!name) return;

            if (!window.adminSubcategories) window.adminSubcategories = {};
            if (window.adminSubcategories[name]) {
                alert("Category already exists!");
                return;
            }

            window.adminSubcategories[name] = { "Default": [] };
            input.value = '';
            window.renderSettingsCategoryList();
            showToast("Added " + name, "success");
        }

        window.deleteMainCategoryFromSettings = (name) => {
            if(!confirm(`Are you sure you want to delete "${name}"? This will remove all its subcategories.`)) return;
            delete window.adminSubcategories[name];
            window.renderSettingsCategoryList();
        }

        window.addNewSubcategoryFromSettings = (catName) => {
            const subName = prompt(`Enter new subcategory name for "${catName}":`);
            if (!subName || !subName.trim()) return;

            // Default to first group or 'Default'
            const groups = Object.keys(window.adminSubcategories[catName]);
            const targetGroup = groups[0] || "Default";
            
            if(!window.adminSubcategories[catName][targetGroup]) window.adminSubcategories[catName][targetGroup] = [];
            window.adminSubcategories[catName][targetGroup].push(subName.trim());
            
            window.renderSettingsCategoryList();
            showToast("Added subcategory!", "success");
        }

        window.deleteSubcategoryFromSettings = (catName, groupName, index) => {
            window.adminSubcategories[catName][groupName].splice(index, 1);
            window.renderSettingsCategoryList();
        }

        window.resetCategoryStructure = () => {
            if(!confirm("âš ï¸ This will reset all categories to default (Grocery, Stationery, Newspapers). Are you sure?")) return;
            window.adminSubcategories = {
                "Grocery": { "General": [] },
                "Stationery": { "General": [] },
                "Newspapers": { "Daily": [] }
            };
            window.renderSettingsCategoryList();
        }

        // --- DRIVER MANAGEMENT LOGIC ---
        window.fetchDrivers = async () => {
            const list = document.getElementById('drivers-list');
            list.innerHTML = `<div class="text-xs text-gray-400 text-center">Loading...</div>`;

            try {
                const q = query(collection(db, "delivery_drivers"), orderBy("name"));
                const snap = await getDocs(q);

                if (snap.empty) {
                    list.innerHTML = `<div class="text-xs text-gray-400 text-center">No drivers added yet.</div>`;
                    return;
                }

                list.innerHTML = snap.docs.map(doc => {
                    const d = doc.data();
                    return `
                        <div class="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                            <div>
                                <span class="font-bold block">${escapeHtml(d.name)}</span>
                                <span class="text-xs text-gray-500">${escapeHtml(d.phone)}</span>
                            </div>
                            <button onclick="deleteDriver('${doc.id}')" class="text-red-500 hover:text-red-700 p-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>
                        </div>
                    `;
                }).join('');
            } catch (e) {
                console.error("Error fetching drivers:", e);
                list.innerHTML = `<div class="text-xs text-red-500 text-center">Error loading drivers.</div>`;
            }
        }

        window.addDriver = async () => {
            const nameEl = document.getElementById('driver-name');
            const phoneEl = document.getElementById('driver-phone');
            const name = nameEl.value.trim();
            const phone = phoneEl.value.trim();

            if (!name || !phone) {
                alert("Please enter both Name and Phone.");
                return;
            }

            try {
                const newRef = doc(collection(db, "delivery_drivers"));
                await setDoc(newRef, {
                    name,
                    phone,
                    createdAt: new Date()
                });
                nameEl.value = '';
                phoneEl.value = '';
                fetchDrivers();
                showToast("Driver Added!", "success");
            } catch (e) {
                console.error("Error adding driver:", e);
                alert("Failed to add driver.");
            }
        }

        window.deleteDriver = async (id) => {
            if (!confirm("Remove this driver?")) return;
            try {
                await deleteDoc(doc(db, "delivery_drivers", id));
                fetchDrivers();
                showToast("Driver Removed.", "success");
            } catch (e) {
                console.error("Error removing driver:", e);
                alert("Failed to remove driver.");
            }
        }

        // --- AI GENERATION LOGIC ---
        window.generateAIContent = async () => {
            const key = localStorage.getItem('gemini_api_key');
            if (!key) {
                if (confirm("Gemini API Key is missing. Open settings to add it?")) {
                    openSettingsModal();
                }
                return;
            }

            const btn = document.querySelector('button[onclick="generateAIContent()"]');
            const orgText = btn.innerHTML;
            btn.innerHTML = `â³ Thinking...`;
            btn.disabled = true;

            try {
                // Get Item Details
                const type = window.currentSocialType;
                const id = window.currentSocialId;
                let data = (type === 'promotion') ? window.promoData[id] : window.newsData[id];

                const prompt = `
                    You are a creative Social Media Manager for "Buddika Stores", a retail shop in Sri Lanka.
                    Create a Facebook Post for the following product:
                    
                    Product Name: ${data.title}
                    Description: ${data.description || data.content}
                    Price: ${data.price || 'N/A'} (Old Price: ${data.oldPrice || 'N/A'})
                    Offer: ${data.badge || 'Special Offer'}
                    
                    Instructions:
                    1. Language: Sinhala (Use creative, persuasive, colloquial Sinhala suitable for social media).
                    2. Structure:
                       - Headline (Catchy, using Emojis)
                       - Body (Persuasive text explaining the offer)
                       - Call to Action ("Visit Buddika Stores", "Call us")
                       - Hashtags (English hashtags like #BuddikaStores #LKA)
                    3. Output format: Just the text for the caption.
                    4. Keep it concise but exciting.
                 `;

                // Call Gemini API
                const result = await callGeminiAPI(key, prompt);

                // Update Caption
                document.getElementById('social-caption').value = result;
                showToast("Caption Generated! âœ¨", "success");

            } catch (e) {
                console.error(e);
                alert("AI Generation Failed: " + e.message);
            } finally {
                btn.innerHTML = orgText;
                btn.disabled = false;
            }
        }

        async function callGeminiAPI(key, prompt) {
            const candidates = [
                { model: 'gemini-2.0-flash', version: 'v1beta' },
                { model: 'gemini-1.5-flash', version: 'v1beta' },
                { model: 'gemini-1.5-pro', version: 'v1beta' },
                { model: 'gemini-pro', version: 'v1beta' }
            ];

            let errors = [];

            // Helper to try a specific model
            const tryModel = async (modelName, version) => {
                console.log(`Trying model: ${modelName} (${version})...`);
                const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${key}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || response.statusText);
                }
                const data = await response.json();
                if (data.candidates && data.candidates.length > 0) {
                    return data.candidates[0].content.parts[0].text;
                }
                throw new Error("No content returned");
            };

            // 2. Try Candidates
            for (const item of candidates) {
                try {
                    return await tryModel(item.model, item.version);
                } catch (e) {
                    console.warn(`Failed ${item.model}:`, e);
                    errors.push(`${item.model}: ${e.message}`);
                }
            }

            // 3. AUTO-DISCOVERY FALLBACK (If all hardcoded failed)
            console.log("All hardcoded models failed. Attempting Auto-Discovery...");
            try {
                const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
                const listResp = await fetch(listUrl);

                if (listResp.ok) {
                    const listData = await listResp.json();
                    // Find models that support generateContent
                    const availableModels = listData.models
                        .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent"))
                        .map(m => m.name.replace("models/", "")); // remove prefix

                    console.log("Discovered Models:", availableModels);

                    // Try discovered models one by one
                    for (const discoveredModel of availableModels) {
                        // Skip if we already tried it (optimization)
                        if (candidates.some(c => c.model === discoveredModel)) continue;

                        try {
                            console.log(`Trying Discovered Model: ${discoveredModel}...`);
                            return await tryModel(discoveredModel, 'v1beta');
                        } catch (e) {
                            console.warn(`Discovered model ${discoveredModel} failed:`, e);
                            errors.push(`[Discovered] ${discoveredModel}: ${e.message}`);
                        }
                    }
                } else {
                    console.warn("ListModels failed:", listResp.statusText);
                    errors.push(`Auto-Discovery Failed: ${listResp.statusText}`);
                }
            } catch (autoErr) {
                console.warn("Auto-Discovery Error:", autoErr);
                errors.push(`Auto-Discovery Exception: ${autoErr.message}`);
            }

            // If absolutely everything failed
            throw new Error("All AI models (Hardcoded & Discovered) failed. Debug Info:\n" + errors.join("\n"));
        }


        window.copyCaption = () => {
            const copyText = document.getElementById("social-caption");
            copyText.select();
            copyText.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(copyText.value);
            showToast('Caption copied!', 'success');
        };

        function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
            const words = text.split(' ');
            let line = '';
            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = ctx.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    ctx.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                }
                else {
                    line = testLine;
                }
            }
            ctx.fillText(line, x, y);
        }


        window.showToast = (message, type = 'success') => {
            const toast = document.getElementById('toast');
            const icon = document.getElementById('toast-icon');
            const msg = document.getElementById('toast-message');

            // Set Icon
            if (type === 'success') {
                icon.innerHTML = `<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
            } else {
                icon.innerHTML = `<svg class="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
            }

            msg.innerText = message;

            toast.classList.remove('translate-y-20', 'opacity-0');
            setTimeout(() => {
                toast.classList.add('translate-y-20', 'opacity-0');
            }, 3000);
        };
    </script>

