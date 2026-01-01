import { db, collection, getDocs, query, limit } from './firebase-config.js';
import { escapeHtml, escapeJs } from './utils.js';

async function fetchPromotions() {
    const container = document.getElementById('promotions-grid');
    if (!container) return;

    try {
        const q = query(collection(db, "promotions"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-400 text-sm">Check back later for exclusive deals!</p></div>';
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
        container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-400 text-sm">Failed to load offers. Please try refresh.</p></div>';
    }
}

function createPromoCard(promo) {
    // Fallback image
    const image = promo.image || 'https://placehold.co/600x400/222/fff?text=No+Image';

    // Format Price Display
    const priceDisplay = promo.price ? `
        ${promo.oldPrice ? `<span class="text-gray-500 line-through text-sm">${promo.oldPrice}</span>` : ''}
        <span class="text-white font-bold text-lg ml-2">${promo.price}</span>
    ` : `<span class="text-white font-bold text-lg">Check Details</span>`;

    // Badge
    const badgeHTML = promo.badge ? `
        <div class="absolute top-4 right-4 bg-white text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">
            ${promo.badge}
        </div>
    ` : '';

    return `
    <div class="group relative bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all duration-500 fade-in-up">
        ${badgeHTML ? `<div class="absolute top-4 right-4 bg-white text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">${escapeHtml(promo.badge)}</div>` : ''}
        <div class="h-48 bg-white/5 rounded-xl mb-6 flex items-center justify-center relative overflow-hidden">
            <img src="${image}" alt="${escapeHtml(promo.title)}" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500">
        </div>
        <h3 class="text-xl font-bold mb-2 font-heading">${escapeHtml(promo.title)}</h3>
        <p class="text-gray-400 text-sm mb-4 line-clamp-2">${escapeHtml(promo.description)}</p>
        <div class="flex justify-between items-center">
            <div>
                ${promo.price ? `
                    ${promo.oldPrice ? `<span class="text-gray-500 line-through text-sm">${escapeHtml(promo.oldPrice)}</span>` : ''}
                    <span class="text-white font-bold text-lg ml-2">${escapeHtml(promo.price)}</span>
                ` : `<span class="text-white font-bold text-lg">Check Details</span>`}
            </div>
            <button onclick="addToCart('${escapeJs(promo.title)}', '${escapeJs(promo.price || '0')}')" class="bg-white text-black w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
            </button>
        </div>
    </div>
    `;
}

// Init
document.addEventListener('DOMContentLoaded', fetchPromotions);
