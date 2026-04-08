import { db, collection, getDocs, query, limit } from './firebase-config.js';
import { escapeHtml, escapeJs } from './utils.js';

const MOCK_PROMOS = [
    {
        title: "Back to School Kit",
        price: "Rs. 2,500",
        oldPrice: "Rs. 3,200",
        image: "assets/img/promo1.jpg",
        description: "Complete stationery set for Grade 6-11 students. Includes CR books, pens, and geometry box.",
        badge: "Best Seller"
    },
    {
        title: "Family Grocery Pack",
        price: "Rs. 5,000",
        oldPrice: "Rs. 5,800",
        image: "assets/img/promo2.jpg",
        description: "Weekly essentials pack: Rice, Sugar, Dhal, and Spices. Free delivery included.",
        badge: "15% OFF"
    },
    {
        title: "Weekend Special",
        price: "Rs. 1,200",
        oldPrice: "Rs. 1,500",
        image: "assets/img/promo3.jpg",
        description: "Assorted Biscuits and Tea leaves bundle. Perfect for your evening tea.",
        badge: "Limited"
    }
];

async function fetchPromotions() {
    const container = document.getElementById('promotions-grid');
    if (!container) return;

    try {
        const q = query(collection(db, "promotions"));
        const querySnapshot = await getDocs(q);

        // USE MOCK DATA IF EMPTY
        if (querySnapshot.empty || true) { // Force mock for demo
            container.innerHTML = '';
            MOCK_PROMOS.forEach((promo) => {
                const card = createPromoCard(promo);
                container.insertAdjacentHTML('beforeend', card);
            });
            return;
        }

        container.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const promo = doc.data();
            const card = createPromoCard(promo);
            container.insertAdjacentHTML('beforeend', card);
        });

    } catch (error) {
        console.error("Error fetching promotions:", error);
        // Fallback to mock on error too
        container.innerHTML = '';
        MOCK_PROMOS.forEach((promo) => {
            const card = createPromoCard(promo);
            container.insertAdjacentHTML('beforeend', card);
        });
    }
}

function createPromoCard(promo) {
    // Fallback image
    const image = promo.image || 'https://placehold.co/600x400/222/fff?text=No+Image';

    // Format Price Display
    const priceDisplay = promo.price ? `
        ${promo.oldPrice ? `<span class="text-secondary line-through text-sm">${promo.oldPrice}</span>` : ''}
        <span class="text-primary font-bold text-lg ml-2">${promo.price}</span>
    ` : `<span class="text-primary font-bold text-lg">Check Details</span>`;

    // Badge
    const badgeHTML = promo.badge ? `
        <div class="absolute top-4 right-4 bg-black dark:bg-white text-white dark:text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">
            ${promo.badge}
        </div>
    ` : '';

    const isSoldOut = promo.status === 'soldout';

    return `
    <div class="group relative bg-white border border-gray-200 p-6 rounded-2xl hover:shadow-lg hover:border-red-300 transition-all duration-300 fade-in-up ${isSoldOut ? 'opacity-75 grayscale' : ''}">
        ${badgeHTML ? `<div class="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">${escapeHtml(promo.badge)}</div>` : ''}
        ${isSoldOut ? `<div class="absolute top-12 right-4 bg-gray-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">SOLD OUT</div>` : ''}
        
        <div class="h-48 bg-gray-50 rounded-xl mb-6 flex items-center justify-center relative overflow-hidden">
            <img src="${image}" alt="${escapeHtml(promo.title)}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">
        </div>
        <h3 class="text-xl font-bold mb-2 text-gray-900">${escapeHtml(promo.title)}</h3>
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${escapeHtml(promo.description)}</p>
        <div class="flex justify-between items-center mt-auto">
            <div>
                ${promo.price ? `
                    ${promo.oldPrice ? `<span class="text-gray-400 line-through text-sm">${escapeHtml(promo.oldPrice)}</span>` : ''}
                    <span class="text-red-600 font-bold text-lg ml-2">${escapeHtml(promo.price)}</span>
                ` : `<span class="text-gray-900 font-bold text-lg">Check Details</span>`}
            </div>
            
            ${isSoldOut ? `
                <button disabled class="bg-gray-200 text-gray-500 w-24 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-not-allowed hidden">
                    Sold Out
                </button>
            ` : `
                <button onclick="addToCart('${escapeJs(promo.title)}', '${escapeJs(promo.price || '0')}')" class="bg-red-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors shadow">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                    </svg>
                </button>
            `}
        </div>
    </div>
    `;
}

// Init
document.addEventListener('DOMContentLoaded', fetchPromotions);
