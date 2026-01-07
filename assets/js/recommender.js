// AI Product Recommender
// Provides smart product recommendations based on:
// 1. Category matching
// 2. Price similarity
// 3. AI-powered suggestions (using Gemini)

import { db, collection, getDocs, query, where, limit, orderBy } from './firebase-config.js';

// Cache for recommendations
const recommendationCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get product recommendations
 * @param {Object} currentProduct - The product being viewed
 * @param {number} maxResults - Maximum recommendations to return
 * @returns {Promise<Array>} Array of recommended products
 */
export async function getRecommendations(currentProduct, maxResults = 4) {
    if (!currentProduct) return [];

    const cacheKey = currentProduct.id;
    const cached = recommendationCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    try {
        // Strategy 1: Same category products
        const categoryRecs = await getCategoryRecommendations(currentProduct, maxResults * 2);

        // Strategy 2: Price range similarity
        const priceRecs = await getPriceRangeRecommendations(currentProduct, maxResults);

        // Merge and deduplicate
        const allRecs = [...categoryRecs, ...priceRecs];
        const uniqueRecs = deduplicateProducts(allRecs, currentProduct.id);

        // Sort by relevance score
        const scoredRecs = uniqueRecs.map(p => ({
            ...p,
            score: calculateRelevanceScore(currentProduct, p)
        })).sort((a, b) => b.score - a.score);

        const finalRecs = scoredRecs.slice(0, maxResults);

        // Cache the results
        recommendationCache.set(cacheKey, {
            data: finalRecs,
            timestamp: Date.now()
        });

        return finalRecs;
    } catch (e) {
        console.error('Error getting recommendations:', e);
        return [];
    }
}

/**
 * Get products from same category
 */
async function getCategoryRecommendations(product, maxResults) {
    if (!product.category) return [];

    try {
        const q = query(
            collection(db, 'products'),
            where('category', '==', product.category),
            limit(maxResults + 1)
        );

        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.id !== product.id);
    } catch (e) {
        console.warn('Category recommendations error:', e);
        return [];
    }
}

/**
 * Get products in similar price range (±30%)
 */
async function getPriceRangeRecommendations(product, maxResults) {
    const price = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;
    if (price === 0) return [];

    const minPrice = price * 0.7;
    const maxPrice = price * 1.3;

    try {
        // Firebase doesn't support range queries on different fields
        // So we fetch all and filter client-side
        const q = query(
            collection(db, 'products'),
            limit(50)
        );

        const snap = await getDocs(q);
        return snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => {
                if (p.id === product.id) return false;
                const pPrice = parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0;
                return pPrice >= minPrice && pPrice <= maxPrice;
            })
            .slice(0, maxResults);
    } catch (e) {
        console.warn('Price range recommendations error:', e);
        return [];
    }
}

/**
 * Calculate relevance score between two products
 */
function calculateRelevanceScore(baseProduct, compareProduct) {
    let score = 0;

    // Same category: +50 points
    if (baseProduct.category === compareProduct.category) {
        score += 50;
    }

    // Price similarity: up to +30 points
    const basePrice = parseFloat(String(baseProduct.price).replace(/[^0-9.]/g, '')) || 0;
    const compPrice = parseFloat(String(compareProduct.price).replace(/[^0-9.]/g, '')) || 0;

    if (basePrice > 0 && compPrice > 0) {
        const priceDiff = Math.abs(basePrice - compPrice) / basePrice;
        score += Math.max(0, 30 - (priceDiff * 100));
    }

    // Same unit type: +10 points
    if (baseProduct.unit === compareProduct.unit) {
        score += 10;
    }

    // In stock bonus: +10 points
    if (compareProduct.stock > 0) {
        score += 10;
    }

    return score;
}

/**
 * Remove duplicate products and exclude current product
 */
function deduplicateProducts(products, excludeId) {
    const seen = new Set();
    return products.filter(p => {
        if (p.id === excludeId || seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
    });
}

/**
 * Render recommendations UI
 */
export function renderRecommendations(containerId, products) {
    const container = document.getElementById(containerId);
    if (!container || products.length === 0) {
        if (container) container.classList.add('hidden');
        return;
    }

    container.classList.remove('hidden');

    const html = `
        <h3 class="text-xl font-bold mb-4 flex items-center gap-2">
            <span>✨</span> You May Also Like
        </h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${products.map(p => `
                <div class="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
                    <div class="aspect-square bg-gray-50 flex items-center justify-center text-4xl">
                        ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover">` : (p.emoji || '📦')}
                    </div>
                    <div class="p-3">
                        <h4 class="font-semibold text-sm truncate">${escapeHtml(p.name)}</h4>
                        <p class="text-xs text-gray-500">${escapeHtml(p.price)} / ${p.unit || 'unit'}</p>
                        <button onclick="window.addToCart('${escapeJs(p.id)}', '${escapeJs(p.name)}', '${escapeJs(p.price)}', 1, '${p.unit || 'unit'}', ${p.stock || 999})"
                            class="w-full mt-2 bg-black text-white text-xs py-2 rounded-lg hover:bg-gray-800 transition-colors">
                            Add to Cart
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

// Helper functions
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function escapeJs(str) {
    if (!str) return '';
    return String(str).replace(/['"\\]/g, '\\$&');
}

// Make functions available globally
window.getRecommendations = getRecommendations;
window.renderRecommendations = renderRecommendations;
