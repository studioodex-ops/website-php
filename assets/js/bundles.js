// Smart Bundles Display for Homepage
// Fetches active bundles from Firebase and displays them to customers

import { db, collection, getDocs, query, where, orderBy, doc, getDoc } from './firebase-config.js';
import { escapeHtml, escapeJs } from './utils.js';

// Fetch and display bundles on page load
document.addEventListener('DOMContentLoaded', async () => {
    await fetchAndDisplayBundles();
});

const MOCK_BUNDLES = [
    {
        name: "Monthly Home Essentials",
        nameSi: "මාසික ගෘහ අවශ්‍යතා",
        discount: 10,
        active: true,
        products: ["Rice 5kg", "Sugar 2kg", "Dhal 1kg", "Tea 500g"], // Mock names
        mockPrice: 4500,
        mockSaving: 500
    },
    {
        name: "Student Starter Pack",
        nameSi: "පාසල් ආරම්භක කට්ටලය",
        discount: 15,
        active: true,
        products: ["CR Books x6", "Blue Pens x10", "Pencils x5", "Eraser"],
        mockPrice: 1800,
        mockSaving: 270
    },
    {
        name: "Cleaning Bundle",
        nameSi: "පිරිසිදු කිරීමේ කට්ටලය",
        discount: 20,
        active: false,
        products: ["Detergent 1kg", "Dishwash Liquid", "Floor Cleaner"],
        mockPrice: 1200,
        mockSaving: 240
    }
];

async function fetchAndDisplayBundles() {
    const grid = document.getElementById('bundles-display-grid');
    if (!grid) return;

    // Use Mock Data directly for demo
    const activeBundles = MOCK_BUNDLES.filter(b => b.active);

    // Original Logic Shim
    if (activeBundles.length === 0) {
        grid.innerHTML = `
                 <div class="col-span-full text-center py-12">
                     <p class="text-gray-400">No bundles available at the moment.</p>
                 </div>
             `;
        return;
    }

    // Custom Renderer for Mock Data
    let html = '';
    for (const bundle of activeBundles) {
        // Using mock values since we skipped DB fetch
        const totalPrice = bundle.mockPrice + bundle.mockSaving;
        const discountedPrice = bundle.mockPrice;
        const savings = bundle.mockSaving;
        const productNames = bundle.products;

        html += `
                <div class="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-sm border border-gray-200 dark:border-white/10 overflow-hidden hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
                    <div class="bg-red-600 text-white p-4 text-center">
                        <span class="text-sm font-bold uppercase tracking-widest">${bundle.discount}% OFF</span>
                    </div>
                    <div class="p-6">
                        <h3 class="font-bold text-xl mb-1 text-gray-900 dark:text-white">${escapeHtml(bundle.name)}</h3>
                        ${bundle.nameSi ? `<p class="text-gray-500 text-sm font-sinhala mb-3">${escapeHtml(bundle.nameSi)}</p>` : ''}
                        
                        <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4 max-h-24 overflow-y-auto">
                            ${productNames.map(name => `<div class="flex items-center gap-2"><span class="text-green-500">✓</span> ${escapeHtml(name)}</div>`).join('')}
                        </div>
                        
                        <div class="border-t border-gray-100 pt-4">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-gray-400 line-through text-sm">Rs. ${totalPrice.toLocaleString()}</span>
                                <span class="text-green-600 dark:text-green-400 font-bold text-xs bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded">Save Rs. ${savings.toFixed(0)}</span>
                            </div>
                            <div class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Rs. ${discountedPrice.toLocaleString()}</div>
                            
                            <button onclick="alert('Added mock bundle to cart!')" 
                                class="w-full bg-red-600 text-white font-bold py-3 rounded-xl transition-colors hover:bg-red-700 flex items-center justify-center gap-2 shadow hover:shadow-lg">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                Add Bundle
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }
    grid.innerHTML = html;
    return; // Exit function so we don't run the original DB logic below

    /* ORIGINAL LOGIC BELOW IGNORED */
    try {


        let html = '';

        for (const bundleDoc of activeBundles) {
            const bundle = bundleDoc.data();
            const products = bundle.products || [];

            // Calculate bundle price
            let totalPrice = 0;
            let productNames = [];

            for (const p of products) {
                const productId = typeof p === 'object' ? p.id : p;
                const qty = typeof p === 'object' ? p.qty : 1;
                const productName = typeof p === 'object' ? p.name : '';

                // Fetch product details for price
                try {
                    console.log('Fetching product:', productId);
                    const prodSnap = await getDoc(doc(db, "products", productId));
                    console.log('Product exists:', prodSnap.exists());

                    if (prodSnap.exists()) {
                        const prodData = prodSnap.data();
                        console.log('Product data:', prodData);
                        console.log('Raw price:', prodData.price);

                        // Extract numeric price - FIRST remove "Rs." or "Rs " prefix, THEN parse
                        let priceStr = String(prodData.price || '0');
                        // Remove Rs. or Rs prefix first
                        priceStr = priceStr.replace(/^Rs\.?\s*/i, '');
                        // Now parse the remaining number (remove commas for thousands)
                        let price = parseFloat(priceStr.replace(/,/g, '')) || 0;

                        console.log('Parsed price:', price, 'Qty:', qty);

                        totalPrice += price * qty;
                        productNames.push(`${productName || prodData.name} x${qty}`);
                    } else {
                        console.warn('Product not found:', productId);
                        // Use name from bundle if product not in DB
                        if (productName) productNames.push(`${productName} x${qty}`);
                    }
                } catch (e) {
                    console.error('Error fetching product:', productId, e);
                }
            }

            const discountPercent = bundle.discount || 0;
            const discountedPrice = totalPrice * (1 - discountPercent / 100);
            const savings = totalPrice - discountedPrice;

            html += `
                <div class="bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div class="bg-purple-600 text-white p-4 text-center">
                        <span class="text-sm font-bold uppercase tracking-widest">${bundle.discount}% OFF</span>
                    </div>
                    <div class="p-6">
                        <h3 class="font-bold text-xl mb-1 text-gray-900 dark:text-white">${escapeHtml(bundle.name)}</h3>
                        ${bundle.nameSi ? `<p class="text-gray-500 text-sm font-sinhala mb-3">${escapeHtml(bundle.nameSi)}</p>` : ''}
                        
                        <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-4 max-h-24 overflow-y-auto">
                            ${productNames.map(name => `<div class="flex items-center gap-2"><span>✓</span> ${escapeHtml(name)}</div>`).join('')}
                        </div>
                        
                        <div class="border-t pt-4">
                            <div class="flex items-center justify-between mb-3">
                                <span class="text-gray-400 line-through text-sm">Rs. ${totalPrice.toLocaleString()}</span>
                                <span class="text-green-600 dark:text-green-400 text-xs font-bold">Save Rs. ${savings.toFixed(0)}</span>
                            </div>
                            <div class="text-2xl font-bold text-gray-900 dark:text-white mb-4">Rs. ${discountedPrice.toLocaleString()}</div>
                            
                            <button onclick="addBundleToCart('${bundleDoc.id}')" 
                                class="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path>
                                </svg>
                                Add Bundle to Cart
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;

    } catch (e) {
        console.error('Error fetching bundles:', e);
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-red-500">Error loading bundles.</p>
            </div>
        `;
    }
}

// Add all bundle products to cart at discounted price
window.addBundleToCart = async (bundleId) => {
    try {
        const bundleSnap = await getDoc(doc(db, "bundles", bundleId));
        if (!bundleSnap.exists()) {
            alert('Bundle not found');
            return;
        }

        const bundle = bundleSnap.data();
        const products = bundle.products || [];
        const discountPercent = bundle.discount || 0;

        for (const p of products) {
            const productId = typeof p === 'object' ? p.id : p;
            const qty = typeof p === 'object' ? p.qty : 1;

            // Fetch product details
            const prodSnap = await getDoc(doc(db, "products", productId));
            if (prodSnap.exists()) {
                const prodData = prodSnap.data();
                const originalPrice = parseFloat(String(prodData.price).replace(/[^0-9.]/g, '')) || 0;
                const discountedPrice = originalPrice * (1 - discountPercent / 100);

                // Add to cart with discounted price
                if (window.addToCart) {
                    window.addToCart(
                        prodData.name + ` (${bundle.name})`,
                        `Rs. ${discountedPrice.toFixed(2)}`,
                        qty,
                        prodData.unit || 'unit',
                        prodData.stock || 999
                    );
                }
            }
        }

        // Show success message
        if (window.showToast) {
            window.showToast(`🎉 ${bundle.name} added to cart!`);
        } else {
            alert(`${bundle.name} added to cart!`);
        }

    } catch (e) {
        console.error('Error adding bundle to cart:', e);
        alert('Error adding bundle to cart');
    }
};
