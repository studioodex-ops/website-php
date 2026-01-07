import { db, collection, getDocs, query, orderBy, limit } from './firebase-config.js';
import { escapeHtml, escapeJs } from './utils.js';

// Global store to avoid inline quoting issues
window.newsDataStore = {};

async function fetchNews() {
    const list = document.getElementById('news-grid');
    if (!list) return;

    try {
        const q = query(collection(db, "news"), orderBy('createdAt', 'desc'), limit(3));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            list.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-400 text-sm">No latest news at the moment.</p></div>';
            return;
        }

        list.innerHTML = snapshot.docs.map((doc, index) => {
            const p = doc.data();
            const delay = (index + 1) * 100;
            const image = p.image || `https://placehold.co/600x400/222/fff?text=News+${index + 1}`;

            // Store data globally using doc ID
            window.newsDataStore[doc.id] = { ...p, image };

            return `
                <article class="group cursor-pointer fade-in-up" style="animation-delay: ${delay}ms" onclick="showNewsDetail('${escapeJs(doc.id)}')">
                    <div class="h-64 bg-gray-200 rounded-2xl mb-6 overflow-hidden relative">
                        <div class="absolute inset-0 bg-gray-800/10 group-hover:bg-gray-800/0 transition-colors"></div>
                        <img src="${image}" alt="${escapeHtml(p.title)}" class="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500">
                    </div>
                    <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">${escapeHtml(p.date)}</span>
                    <h3 class="text-xl font-bold mb-3 group-hover:text-gray-600 transition-colors font-heading">${escapeHtml(p.title)}</h3>
                    <p class="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">${escapeHtml(p.content)}</p>
                    <span class="text-xs font-bold underline">Read Article</span>
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

    const modalHTML = `
        <div id="news-read-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" onclick="this.remove()">
            <div class="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 relative" onclick="event.stopPropagation()">
                <button onclick="document.getElementById('news-read-modal').remove()" class="absolute top-4 right-4 text-gray-400 hover:text-black">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <img src="${newsItem.image}" class="w-full h-64 object-cover rounded-xl mb-6">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">${escapeHtml(newsItem.date)}</span>
                <h2 class="text-3xl font-bold font-heading mb-6">${escapeHtml(newsItem.title)}</h2>
                <div class="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                    ${escapeHtml(newsItem.content)}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

document.addEventListener('DOMContentLoaded', fetchNews);
