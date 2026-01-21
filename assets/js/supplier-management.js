// Supplier Management Module for Buddika Stores
// Handles supplier CRUD operations and purchase order generation

(function () {
    'use strict';

    // Helper function for HTML escaping
    function escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // State
    window.allSuppliers = [];
    window.editingSupplierId = null;

    // ==================== FETCH SUPPLIERS ====================
    window.fetchSuppliers = async function () {
        const list = document.getElementById('suppliers-list');
        if (!list) return;

        list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">Loading suppliers...</td></tr>';

        try {
            const q = query(collection(db, 'suppliers'), orderBy('name'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-gray-400">No suppliers found. Add your first supplier!</td></tr>';
                window.allSuppliers = [];
                updateSupplierStats();
                return;
            }

            window.allSuppliers = snapshot.docs.map(function (doc) {
                return { id: doc.id, ...doc.data() };
            });

            renderSuppliers();
            updateSupplierStats();

        } catch (e) {
            console.error('Error fetching suppliers:', e);
            list.innerHTML = '<tr><td colspan="5" class="p-12 text-center text-red-500">Error: ' + e.message + '</td></tr>';
        }
    };

    // ==================== RENDER SUPPLIERS ====================
    window.renderSuppliers = function () {
        const list = document.getElementById('suppliers-list');
        if (!list || window.allSuppliers.length === 0) return;

        var html = '';
        window.allSuppliers.forEach(function (s) {
            var statusBadge = s.isActive !== false
                ? '<span class="px-2 py-1 bg-green-100 text-green-600 text-xs font-bold rounded-full">Active</span>'
                : '<span class="px-2 py-1 bg-gray-100 text-gray-500 text-xs font-bold rounded-full">Inactive</span>';

            var categories = (s.categories || []).join(', ') || 'No categories';

            html += '<tr class="hover:bg-gray-50 border-b border-gray-50">';
            html += '<td class="p-4"><div class="font-bold text-gray-900">' + escapeHtml(s.name) + '</div>';
            html += '<div class="text-xs text-gray-400">' + escapeHtml(s.address || 'No address') + '</div></td>';
            html += '<td class="p-4"><div class="text-sm">' + escapeHtml(s.phone || '-') + '</div>';
            if (s.whatsapp) {
                html += '<a href="https://wa.me/' + s.whatsapp + '" target="_blank" class="text-xs text-green-600 hover:underline">📱 WhatsApp</a>';
            }
            html += '</td>';
            html += '<td class="p-4"><div class="text-xs text-gray-500">' + escapeHtml(categories) + '</div></td>';
            html += '<td class="p-4">' + statusBadge + '</td>';
            html += '<td class="p-4"><div class="flex gap-2">';
            html += '<button onclick="editSupplier(\'' + s.id + '\')" class="text-blue-600 hover:text-blue-800 text-sm font-bold">Edit</button>';
            html += '<button onclick="deleteSupplier(\'' + s.id + '\')" class="text-red-500 hover:text-red-700 text-sm font-bold">Delete</button>';
            html += '<button onclick="orderFromSupplier(\'' + s.id + '\')" class="bg-green-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-green-600">📦 Order</button>';
            html += '</div></td>';
            html += '</tr>';
        });

        list.innerHTML = html;
    };

    // ==================== UPDATE STATS ====================
    function updateSupplierStats() {
        var totalEl = document.getElementById('sup-total');
        var activeEl = document.getElementById('sup-active');

        if (totalEl) totalEl.innerText = window.allSuppliers.length;
        if (activeEl) {
            var active = window.allSuppliers.filter(function (s) { return s.isActive !== false; }).length;
            activeEl.innerText = active;
        }
    }

    // ==================== OPEN SUPPLIER MODAL ====================
    window.openSupplierModal = function (supplierId) {
        window.editingSupplierId = supplierId || null;

        var modal = document.getElementById('supplier-modal');
        var title = document.getElementById('supplier-modal-title');
        var form = document.getElementById('supplier-form');

        if (!modal) return;

        // Reset form
        form.reset();
        document.getElementById('sup-active').checked = true;

        if (supplierId) {
            // Edit mode
            title.innerText = 'Edit Supplier';
            var supplier = window.allSuppliers.find(function (s) { return s.id === supplierId; });
            if (supplier) {
                document.getElementById('sup-name').value = supplier.name || '';
                document.getElementById('sup-phone').value = supplier.phone || '';
                document.getElementById('sup-whatsapp').value = supplier.whatsapp || '';
                document.getElementById('sup-email').value = supplier.email || '';
                document.getElementById('sup-address').value = supplier.address || '';
                document.getElementById('sup-categories').value = (supplier.categories || []).join(', ');
                document.getElementById('sup-notes').value = supplier.notes || '';
                document.getElementById('sup-active-check').checked = supplier.isActive !== false;
            }
        } else {
            // Add mode
            title.innerText = 'Add New Supplier';
        }

        modal.classList.remove('hidden');
        setTimeout(function () {
            document.getElementById('supplier-modal-content').classList.remove('scale-95', 'opacity-0');
        }, 10);
    };

    // ==================== CLOSE SUPPLIER MODAL ====================
    window.closeSupplierModal = function () {
        var modal = document.getElementById('supplier-modal');
        var content = document.getElementById('supplier-modal-content');

        content.classList.add('scale-95', 'opacity-0');
        setTimeout(function () {
            modal.classList.add('hidden');
            window.editingSupplierId = null;
        }, 200);
    };

    // ==================== SAVE SUPPLIER ====================
    window.saveSupplier = async function (event) {
        event.preventDefault();

        var name = document.getElementById('sup-name').value.trim();
        var phone = document.getElementById('sup-phone').value.trim();
        var whatsapp = document.getElementById('sup-whatsapp').value.trim();
        var email = document.getElementById('sup-email').value.trim();
        var address = document.getElementById('sup-address').value.trim();
        var categoriesStr = document.getElementById('sup-categories').value.trim();
        var notes = document.getElementById('sup-notes').value.trim();
        var isActive = document.getElementById('sup-active-check').checked;

        if (!name) {
            alert('Supplier name is required!');
            return;
        }

        // Parse categories
        var categories = categoriesStr.split(',').map(function (c) { return c.trim(); }).filter(function (c) { return c; });

        var supplierData = {
            name: name,
            phone: phone,
            whatsapp: whatsapp.replace(/[^0-9]/g, ''), // Clean phone number
            email: email,
            address: address,
            categories: categories,
            notes: notes,
            isActive: isActive,
            updatedAt: new Date().toISOString()
        };

        try {
            if (window.editingSupplierId) {
                // Update existing
                await updateDoc(doc(db, 'suppliers', window.editingSupplierId), supplierData);
                if (typeof showToast === 'function') {
                    showToast('Supplier updated successfully! ✅', 'success');
                }
            } else {
                // Add new
                supplierData.createdAt = new Date().toISOString();
                await addDoc(collection(db, 'suppliers'), supplierData);
                if (typeof showToast === 'function') {
                    showToast('Supplier added successfully! 🎉', 'success');
                }
            }

            closeSupplierModal();
            fetchSuppliers();

        } catch (e) {
            console.error('Error saving supplier:', e);
            alert('Error saving supplier: ' + e.message);
        }
    };

    // ==================== EDIT SUPPLIER ====================
    window.editSupplier = function (supplierId) {
        openSupplierModal(supplierId);
    };

    // ==================== DELETE SUPPLIER ====================
    window.deleteSupplier = async function (supplierId) {
        if (!confirm('Are you sure you want to delete this supplier?')) return;

        try {
            await deleteDoc(doc(db, 'suppliers', supplierId));
            if (typeof showToast === 'function') {
                showToast('Supplier deleted! 🗑️', 'success');
            }
            fetchSuppliers();
        } catch (e) {
            console.error('Error deleting supplier:', e);
            alert('Error deleting supplier: ' + e.message);
        }
    };

    // ==================== ORDER FROM SUPPLIER ====================
    window.orderFromSupplier = async function (supplierId) {
        var supplier = window.allSuppliers.find(function (s) { return s.id === supplierId; });
        if (!supplier) return;

        // Get low stock products (optionally filtered by supplier's categories)
        var lowStockProducts = (window.allInventoryProducts || []).filter(function (p) {
            var stock = p.stock || 0;
            if (stock > 10) return false;

            // If supplier has categories, filter by them
            if (supplier.categories && supplier.categories.length > 0) {
                return supplier.categories.includes(p.category);
            }
            return true;
        });

        if (lowStockProducts.length === 0) {
            if (typeof showToast === 'function') {
                showToast('No low stock items for this supplier!', 'error');
            }
            return;
        }

        // Generate WhatsApp order message
        var message = '📦 *PURCHASE ORDER*\n';
        message += '*From:* Buddika Stores, Walapane\n';
        message += '*To:* ' + supplier.name + '\n';
        message += '*Date:* ' + new Date().toLocaleDateString('en-GB') + '\n\n';
        message += '━━━━━━━━━━━━━━━\n';
        message += '*Items to Order:*\n\n';

        lowStockProducts.forEach(function (p, idx) {
            var suggestedQty = Math.max(50 - (p.stock || 0), 10); // Suggest qty to reach 50
            message += (idx + 1) + '. *' + p.name + '*\n';
            message += '   Current Stock: ' + (p.stock || 0) + '\n';
            message += '   Suggested Order: ' + suggestedQty + ' ' + (p.unit || 'units') + '\n\n';
        });

        message += '━━━━━━━━━━━━━━━\n';
        message += 'Please confirm availability and delivery date.\n\n';
        message += '_Sent from Buddika Stores POS_';

        // Open WhatsApp with message
        var whatsappUrl = 'https://wa.me/' + supplier.whatsapp + '?text=' + encodeURIComponent(message);
        window.open(whatsappUrl, '_blank');

        if (typeof showToast === 'function') {
            showToast('Opening WhatsApp with order... 📱', 'success');
        }
    };

    // ==================== GENERATE PURCHASE ORDER FOR ALL ====================
    window.generatePurchaseOrderAll = function () {
        if (!window.allSuppliers || window.allSuppliers.length === 0) {
            alert('No suppliers found! Add suppliers first.');
            return;
        }

        var lowStockProducts = (window.allInventoryProducts || []).filter(function (p) {
            return (p.stock || 0) <= 10;
        });

        if (lowStockProducts.length === 0) {
            if (typeof showToast === 'function') {
                showToast('No low stock items to order!', 'error');
            }
            return;
        }

        // Show supplier selection modal or generate for first active supplier
        var activeSuppliers = window.allSuppliers.filter(function (s) { return s.isActive !== false; });

        if (activeSuppliers.length === 1) {
            orderFromSupplier(activeSuppliers[0].id);
        } else {
            // Show selection dialog
            var supplierNames = activeSuppliers.map(function (s, i) { return (i + 1) + '. ' + s.name; }).join('\n');
            var choice = prompt('Select supplier (enter number):\n\n' + supplierNames);

            if (choice) {
                var idx = parseInt(choice) - 1;
                if (idx >= 0 && idx < activeSuppliers.length) {
                    orderFromSupplier(activeSuppliers[idx].id);
                }
            }
        }
    };

    // ==================== POPULATE SUPPLIER DROPDOWN IN PRODUCT FORM ====================
    window.populateSupplierDropdown = async function () {
        var select = document.getElementById('p-supplier');
        if (!select) return;

        // Keep the first option (No Supplier)
        select.innerHTML = '<option value="">-- No Supplier --</option>';

        try {
            // Fetch suppliers if not already loaded
            if (!window.allSuppliers || window.allSuppliers.length === 0) {
                var q = query(collection(db, 'suppliers'), orderBy('name'));
                var snapshot = await getDocs(q);
                window.allSuppliers = snapshot.docs.map(function (doc) {
                    return { id: doc.id, ...doc.data() };
                });
            }

            // Populate dropdown
            window.allSuppliers.forEach(function (s) {
                if (s.isActive !== false) {
                    var option = document.createElement('option');
                    option.value = s.id;
                    option.textContent = s.name;
                    select.appendChild(option);
                }
            });
        } catch (e) {
            console.error('Error loading suppliers for dropdown:', e);
        }
    };

    // Auto-populate supplier dropdown when product modal opens
    // Hook into MutationObserver to detect modal visibility
    var productModalObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                var modal = document.getElementById('product-modal');
                if (modal && !modal.classList.contains('hidden')) {
                    populateSupplierDropdown();
                }
            }
        });
    });

    // Start observing product modal when DOM is ready
    document.addEventListener('DOMContentLoaded', function () {
        var modal = document.getElementById('product-modal');
        if (modal) {
            productModalObserver.observe(modal, { attributes: true });
        }
    });

})();
