// Stock Management Module for Buddika Stores
// Add this script to admin.html for inventory features

(function() {
    'use strict';

    // State
    window.allInventoryProducts = [];
    window.currentInventoryFilter = 'all';

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        // Add event listeners for stock management buttons if they exist
        console.log('Stock Management Module Loaded');
    });

    // Fetch all products for inventory view
    window.fetchInventory = async function() {
        const list = document.getElementById('inventory-list');
        if (!list) return;
        
        list.innerHTML = '<tr><td colspan="4" class="p-12 text-center text-gray-400">Loading...</td></tr>';

        try {
            const q = query(collection(db, 'products'), orderBy('name'));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                list.innerHTML = '<tr><td colspan="4" class="p-12 text-center text-gray-400">No products found</td></tr>';
                window.allInventoryProducts = [];
                return;
            }

            let lowStockCount = 0;
            let outStockCount = 0;

            window.allInventoryProducts = snapshot.docs.map(function(doc) {
                const data = doc.data();
                const stock = data.stock || 0;
                
                if (stock <= 0) outStockCount++;
                else if (stock <= 10) lowStockCount++;
                
                return { id: doc.id, ...data };
            });

            // Update Stats
            const totalEl = document.getElementById('inv-total-products');
            const lowEl = document.getElementById('inv-low-stock');
            const outEl = document.getElementById('inv-out-stock');
            
            if (totalEl) totalEl.innerText = snapshot.size;
            if (lowEl) lowEl.innerText = lowStockCount;
            if (outEl) outEl.innerText = outStockCount;

            renderFilteredInventory();

        } catch (e) {
            console.error(e);
            list.innerHTML = '<tr><td colspan="4" class="p-12 text-center text-red-500">Error: ' + e.message + '</td></tr>';
        }
    };

    // Filter inventory by stock status
    window.filterInventory = function(filter) {
        window.currentInventoryFilter = filter;
        
        // Update button styles
        var allBtn = document.getElementById('inv-filter-all');
        var lowBtn = document.getElementById('inv-filter-low');
        var outBtn = document.getElementById('inv-filter-out');
        
        if (allBtn) allBtn.className = 'px-4 py-2 rounded-lg font-bold text-sm bg-gray-100 text-gray-600 transition-colors';
        if (lowBtn) lowBtn.className = 'px-4 py-2 rounded-lg font-bold text-sm bg-gray-100 text-gray-600 transition-colors';
        if (outBtn) outBtn.className = 'px-4 py-2 rounded-lg font-bold text-sm bg-gray-100 text-gray-600 transition-colors';
        
        if (filter === 'all' && allBtn) {
            allBtn.className = 'px-4 py-2 rounded-lg font-bold text-sm bg-black text-white transition-colors';
        } else if (filter === 'low' && lowBtn) {
            lowBtn.className = 'px-4 py-2 rounded-lg font-bold text-sm bg-orange-500 text-white transition-colors';
        } else if (filter === 'out' && outBtn) {
            outBtn.className = 'px-4 py-2 rounded-lg font-bold text-sm bg-red-500 text-white transition-colors';
        }
        
        renderFilteredInventory();
    };

    // Render inventory with current filter
    window.renderFilteredInventory = function() {
        var list = document.getElementById('inventory-list');
        if (!list) return;
        
        var filter = window.currentInventoryFilter;
        var products = window.allInventoryProducts;
        
        if (filter === 'low') {
            products = products.filter(function(p) { return (p.stock || 0) > 0 && (p.stock || 0) <= 10; });
        } else if (filter === 'out') {
            products = products.filter(function(p) { return (p.stock || 0) <= 0; });
        }
        
        if (products.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="p-12 text-center text-gray-400">No products in this category</td></tr>';
            return;
        }
        
        var html = '';
        products.forEach(function(p) {
            var stock = p.stock || 0;
            var stockClass = 'text-green-600';
            var stockBadge = '';

            if (stock <= 0) {
                stockClass = 'text-red-600 font-bold';
                stockBadge = '<span class="ml-2 px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">OUT OF STOCK</span>';
            } else if (stock <= 10) {
                stockClass = 'text-orange-500 font-bold';
                stockBadge = '<span class="ml-2 px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full">LOW</span>';
            }

            html += '<tr class="hover:bg-gray-50 border-b border-gray-50">';
            html += '<td class="p-4"><div class="font-bold text-gray-900">' + escapeHtml(p.name) + '</div>';
            html += '<div class="text-xs text-gray-400">' + escapeHtml(p.category || '') + '</div></td>';
            html += '<td class="p-4"><span class="' + stockClass + '">' + stock + '</span>';
            html += '<span class="text-xs text-gray-400 ml-1">' + (p.unit || 'unit') + '</span>' + stockBadge + '</td>';
            html += '<td class="p-4"><div class="flex items-center gap-2">';
            html += '<button onclick="adjustStock(\'' + p.id + '\', -1)" class="w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold">-</button>';
            html += '<input type="number" id="stock-adj-' + p.id + '" value="1" min="1" class="w-16 text-center bg-gray-50 border rounded-lg py-1 text-sm">';
            html += '<button onclick="adjustStock(\'' + p.id + '\', 1)" class="w-8 h-8 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-bold">+</button>';
            html += '</div></td>';
            html += '<td class="p-4"><button onclick="quickRestock(\'' + p.id + '\')" class="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-100">Quick Restock</button></td>';
            html += '</tr>';
        });
        
        list.innerHTML = html;
    };

    // Adjust stock by delta
    window.adjustStock = async function(productId, direction) {
        var input = document.getElementById('stock-adj-' + productId);
        var amount = parseInt(input ? input.value : 1) || 1;
        var adjustment = direction * amount;

        try {
            var productRef = doc(db, 'products', productId);
            await updateDoc(productRef, {
                stock: increment(adjustment)
            });

            if (typeof showToast === 'function') {
                showToast('Stock ' + (direction > 0 ? 'added' : 'reduced') + ' by ' + amount, 'success');
            } else {
                alert('Stock ' + (direction > 0 ? 'added' : 'reduced') + ' by ' + amount);
            }
            fetchInventory();
        } catch (e) {
            alert('Error adjusting stock: ' + e.message);
        }
    };

    // Quick restock with prompt
    window.quickRestock = async function(productId) {
        var amount = prompt('Enter restock quantity:', '50');
        if (!amount) return;

        var qty = parseInt(amount);
        if (isNaN(qty) || qty <= 0) {
            alert('Please enter a valid quantity');
            return;
        }

        try {
            var productRef = doc(db, 'products', productId);
            await updateDoc(productRef, {
                stock: increment(qty)
            });

            if (typeof showToast === 'function') {
                showToast('Restocked ' + qty + ' units successfully!', 'success');
            } else {
                alert('Restocked ' + qty + ' units successfully!');
            }
            fetchInventory();
        } catch (e) {
            alert('Error restocking: ' + e.message);
        }
    };

    // Export reorder list as CSV
    window.exportReorderListCSV = function() {
        var lowStockProducts = window.allInventoryProducts.filter(function(p) {
            return (p.stock || 0) <= 10;
        });
        
        if (lowStockProducts.length === 0) {
            if (typeof showToast === 'function') {
                showToast('No low stock items to export!', 'error');
            } else {
                alert('No low stock items to export!');
            }
            return;
        }
        
        // Create CSV content
        var csv = 'Product Name,Category,Current Stock,Unit,Status\n';
        lowStockProducts.forEach(function(p) {
            var status = (p.stock || 0) <= 0 ? 'OUT OF STOCK' : 'LOW STOCK';
            csv += '"' + p.name + '","' + (p.category || 'N/A') + '",' + (p.stock || 0) + ',"' + (p.unit || 'unit') + '","' + status + '"\n';
        });
        
        // Download CSV
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'reorder_list_' + new Date().toISOString().split('T')[0] + '.csv';
        link.click();
        
        if (typeof showToast === 'function') {
            showToast('Exported ' + lowStockProducts.length + ' items to CSV!', 'success');
        }
    };

    // Copy reorder list for WhatsApp
    window.copyReorderListWhatsApp = function() {
        var lowStockProducts = window.allInventoryProducts.filter(function(p) {
            return (p.stock || 0) <= 10;
        });
        
        if (lowStockProducts.length === 0) {
            if (typeof showToast === 'function') {
                showToast('No low stock items to copy!', 'error');
            } else {
                alert('No low stock items to copy!');
            }
            return;
        }
        
        // Create WhatsApp-friendly message
        var message = '📦 *REORDER LIST - Buddika Stores*\n';
        message += '📅 ' + new Date().toLocaleDateString('en-GB') + '\n\n';
        message += '⚠️ *' + lowStockProducts.length + ' items need restocking:*\n\n';
        
        lowStockProducts.forEach(function(p, idx) {
            var emoji = (p.stock || 0) <= 0 ? '🔴' : '🟠';
            message += (idx + 1) + '. ' + emoji + ' *' + p.name + '*\n';
            message += '   📊 Current: ' + (p.stock || 0) + ' ' + (p.unit || 'units') + '\n';
            message += '   📁 Category: ' + (p.category || 'N/A') + '\n\n';
        });
        
        message += '\n_Generated from Buddika Stores Admin_';
        
        // Copy to clipboard
        navigator.clipboard.writeText(message).then(function() {
            if (typeof showToast === 'function') {
                showToast('Reorder list copied! Paste in WhatsApp 📋', 'success');
            }
        }).catch(function() {
            // Fallback
            var textarea = document.createElement('textarea');
            textarea.value = message;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            if (typeof showToast === 'function') {
                showToast('Reorder list copied! Paste in WhatsApp 📋', 'success');
            }
        });
    };

    // Print stock list
    window.printStockList = function() {
        var products = window.allInventoryProducts;
        var filter = window.currentInventoryFilter;
        
        if (!products || products.length === 0) {
            if (typeof showToast === 'function') {
                showToast('No products to print! Load inventory first.', 'error');
            } else {
                alert('No products to print! Load inventory first.');
            }
            return;
        }
        
        // Filter products based on current filter
        var filteredProducts = products;
        var filterTitle = 'All Products';
        
        if (filter === 'low') {
            filteredProducts = products.filter(function(p) { return (p.stock || 0) > 0 && (p.stock || 0) <= 10; });
            filterTitle = 'Low Stock Items';
        } else if (filter === 'out') {
            filteredProducts = products.filter(function(p) { return (p.stock || 0) <= 0; });
            filterTitle = 'Out of Stock Items';
        }
        
        if (filteredProducts.length === 0) {
            if (typeof showToast === 'function') {
                showToast('No products in this filter to print!', 'error');
            }
            return;
        }
        
        // Calculate totals
        var totalProducts = filteredProducts.length;
        var lowStock = filteredProducts.filter(function(p) { return (p.stock || 0) > 0 && (p.stock || 0) <= 10; }).length;
        var outStock = filteredProducts.filter(function(p) { return (p.stock || 0) <= 0; }).length;
        
        // Generate table rows
        var tableRows = '';
        filteredProducts.forEach(function(p, idx) {
            var stock = p.stock || 0;
            var statusClass = 'status-ok';
            var statusText = 'OK';
            if (stock <= 0) { statusClass = 'status-out'; statusText = 'OUT OF STOCK'; }
            else if (stock <= 10) { statusClass = 'status-low'; statusText = 'LOW'; }
            
            tableRows += '<tr>';
            tableRows += '<td>' + (idx + 1) + '</td>';
            tableRows += '<td><strong>' + (p.name || 'N/A') + '</strong></td>';
            tableRows += '<td>' + (p.category || 'N/A') + '</td>';
            tableRows += '<td><strong>' + stock + '</strong></td>';
            tableRows += '<td>' + (p.unit || 'unit') + '</td>';
            tableRows += '<td class="' + statusClass + '">' + statusText + '</td>';
            tableRows += '</tr>';
        });
        
        // Build print HTML
        var printHTML = '<!DOCTYPE html><html><head><title>Stock Report - Buddika Stores</title>';
        printHTML += '<style>';
        printHTML += '* { margin: 0; padding: 0; box-sizing: border-box; }';
        printHTML += 'body { font-family: "Segoe UI", Tahoma, sans-serif; padding: 20px; color: #333; }';
        printHTML += '.header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 20px; }';
        printHTML += '.header h1 { font-size: 24px; }';
        printHTML += '.header p { color: #666; font-size: 12px; margin-top: 5px; }';
        printHTML += '.meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; color: #666; }';
        printHTML += '.summary { display: flex; gap: 20px; margin-bottom: 20px; }';
        printHTML += '.summary-card { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }';
        printHTML += '.summary-card .value { font-size: 24px; font-weight: bold; }';
        printHTML += '.summary-card .label { font-size: 10px; color: #666; text-transform: uppercase; }';
        printHTML += '.summary-card.low { border-color: #f97316; color: #f97316; }';
        printHTML += '.summary-card.out { border-color: #dc2626; color: #dc2626; }';
        printHTML += 'table { width: 100%; border-collapse: collapse; font-size: 11px; }';
        printHTML += 'th { background: #000; color: #fff; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }';
        printHTML += 'td { padding: 8px; border-bottom: 1px solid #eee; }';
        printHTML += 'tr:nth-child(even) { background: #f9f9f9; }';
        printHTML += '.status-ok { color: #16a34a; font-weight: bold; }';
        printHTML += '.status-low { color: #f97316; font-weight: bold; }';
        printHTML += '.status-out { color: #dc2626; font-weight: bold; }';
        printHTML += '.footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }';
        printHTML += '</style></head><body>';
        printHTML += '<div class="header"><h1>📦 BUDDIKA STORES</h1><p>Stock Inventory Report</p></div>';
        printHTML += '<div class="meta"><span><strong>Report Type:</strong> ' + filterTitle + '</span>';
        printHTML += '<span><strong>Generated:</strong> ' + new Date().toLocaleString('en-GB') + '</span></div>';
        printHTML += '<div class="summary">';
        printHTML += '<div class="summary-card"><div class="value">' + totalProducts + '</div><div class="label">Total Items</div></div>';
        printHTML += '<div class="summary-card low"><div class="value">' + lowStock + '</div><div class="label">Low Stock</div></div>';
        printHTML += '<div class="summary-card out"><div class="value">' + outStock + '</div><div class="label">Out of Stock</div></div>';
        printHTML += '</div>';
        printHTML += '<table><thead><tr><th>#</th><th>Product Name</th><th>Category</th><th>Stock</th><th>Unit</th><th>Status</th></tr></thead>';
        printHTML += '<tbody>' + tableRows + '</tbody></table>';
        printHTML += '<div class="footer"><p>Generated from Buddika Stores Admin Panel | ' + new Date().toLocaleDateString('en-GB') + '</p></div>';
        printHTML += '<script>window.onload = function() { window.print(); }<\/script>';
        printHTML += '</body></html>';
        
        // Open print window
        var printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(printHTML);
        printWindow.document.close();
        
        if (typeof showToast === 'function') {
            showToast('Print dialog opened! 🖨️', 'success');
        }
    };

})();
