import { db, collection, getDocs, query, orderBy, limit, where } from './firebase-config.js';
import { escapeHtml, escapeJs } from './utils.js';

// Global store to avoid inline quoting issues
window.newsDataStore = {};

const MOCK_NEWS = [
    {
        id: "mock1",
        title: "New Stock: Exercise Books Arrived",
        date: "Today",
        content: "New Atlas and CR books are now available in store. Special discounts for bulk purchases.",
        image: "assets/img/news1.jpg"
    },
    {
        id: "mock2",
        title: "Delivery Areas Expanded",
        date: "Yesterday",
        content: "We now deliver to Harasbedda and Nildandahinna areas. Order via WhatsApp for instant delivery.",
        image: "assets/img/news2.jpg"
    },
    {
        id: "mock3",
        title: "Community Charity Event",
        date: "Last Week",
        content: "Buddika Stores was proud to sponsor the local school sports meet. See photos from the event.",
        image: "assets/img/news3.jpg"
    }
];

// Helper: format ISO date to readable string
function formatNewsDate(isoString) {
    if (!isoString) return 'Today';
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHours < 1) return 'Just Now';
        if (diffHours < 24) return `${diffHours}h ago`;
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
        return 'Today';
    }
}

async function fetchNews() {
    const list = document.getElementById('news-grid');
    if (!list) return;

    try {
        // Fetch from "products" collection where automation uploads newspaper data
        const q = query(
            collection(db, "products"),
            where("category", "==", "Newspapers"),
            orderBy('createdAt', 'desc'),
            limit(3)
        );
        const snapshot = await getDocs(q);

        // Fallback to mock data only if no real news exists
        if (snapshot.empty) {
            list.innerHTML = MOCK_NEWS.map((p, index) => {
                const delay = (index + 1) * 100;
                window.newsDataStore[p.id] = p;

                return `
                    <article class="group cursor-pointer fade-in-up" style="animation-delay: ${delay}ms" onclick="showNewsDetail('${escapeJs(p.id)}')">
                        <div class="h-64 bg-gray-200 rounded-2xl mb-6 overflow-hidden relative">
                            <div class="absolute inset-0 bg-gray-800/10 group-hover:bg-gray-800/0 transition-colors"></div>
                            <img src="${p.image}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">
                        </div>
                        <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">${escapeHtml(p.date)}</span>
                        <h3 class="text-xl font-bold mb-3 group-hover:text-gray-600 transition-colors font-heading text-white">${escapeHtml(p.title)}</h3>
                        <p class="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">${escapeHtml(p.content)}</p>
                        <span class="text-xs font-bold underline">Read Article</span>
                    </article>
                `;
            }).join('');
            return;
        }

        // Render real automated news from Firebase
        list.innerHTML = snapshot.docs.map((doc, index) => {
            const p = doc.data();
            const delay = (index + 1) * 100;
            const image = p.image || `https://placehold.co/600x400/222/fff?text=News+${index + 1}`;
            // Map automation fields: name→title, desc→content, createdAt→date
            const title = p.name || p.title || 'Latest News';
            const content = p.desc || p.content || '';
            const date = formatNewsDate(p.createdAt || p.date);
            const link = p.link || '#';

            // Store data globally using doc ID
            window.newsDataStore[doc.id] = { title, content, date, image, link, brand: p.brand };

            return `
                <article class="group cursor-pointer fade-in-up" style="animation-delay: ${delay}ms" onclick="showNewsDetail('${escapeJs(doc.id)}')">
                    <div class="h-64 bg-gray-200 rounded-2xl mb-6 overflow-hidden relative">
                        <div class="absolute inset-0 bg-gray-800/10 group-hover:bg-gray-800/0 transition-colors"></div>
                        <img src="${image}" alt="${escapeHtml(title)}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" onerror="this.src='https://placehold.co/600x400/222/fff?text=News'">
                    </div>
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">${escapeHtml(p.brand || '')} • ${escapeHtml(date)}</span>
                    <h3 class="text-xl font-bold mb-3 group-hover:text-gray-600 transition-colors font-heading">${escapeHtml(title)}</h3>
                    <p class="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">${escapeHtml(content)}</p>
                    <span class="text-xs font-bold underline">Read Article →</span>
                </article>
            `;
        }).join('');

    } catch (error) {
        console.error("Error fetching news:", error);
        list.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-400 text-sm">Failed to load news.</p></div>';
    }
}

// Robust Modal for Reading Full Article
window.showNewsDetail = (id) => {
    const newsItem = window.newsDataStore[id];
    if (!newsItem) return;

    const existingModal = document.getElementById('news-read-modal');
    if (existingModal) existingModal.remove();

    const linkButton = newsItem.link && newsItem.link !== '#'
        ? `<a href="${newsItem.link}" target="_blank" rel="noopener noreferrer" class="inline-block mt-6 bg-black text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors">Read Full Article →</a>`
        : '';

    const brandLabel = newsItem.brand
        ? `<span class="inline-block bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full mb-3">${escapeHtml(newsItem.brand)}</span>`
        : '';

    const modalHTML = `
        <div id="news-read-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onclick="this.remove()">
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('news-read-modal').remove()" class="absolute top-4 right-4 text-gray-400 hover:text-black">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <img src="${newsItem.image}" class="w-full h-64 object-cover rounded-xl mb-6" onerror="this.src='https://placehold.co/600x400/222/fff?text=News'">
                ${brandLabel}
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">${escapeHtml(newsItem.date || '')}</span>
                <h2 class="text-3xl font-bold font-heading mb-6">${escapeHtml(newsItem.title)}</h2>
                <div class="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                    ${escapeHtml(newsItem.content)}
                </div>
                ${linkButton}
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

document.addEventListener('DOMContentLoaded', fetchNews);

