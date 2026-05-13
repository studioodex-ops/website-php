import { db, collection, getDocs, query, limit, doc, getDoc } from './firebase-config.js';

// NEX ASSISTANT V5.1 (GOLD STANDARD + LOCAL FALLBACK)
console.log("Nex: V5.1 GOLD LOADED");

let globalApiKey = null;
const API_KEY_STORAGE_KEY = 'gemini_api_key';
let productCache = null;
let productCacheTime = 0;
const PRODUCT_CACHE_TTL = 5 * 60 * 1000; // 5 min

// 1. Fetch Configuration
async function fetchStoreConfig() {
    try {
        const docRef = doc(db, "settings", "store_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            globalApiKey = docSnap.data().geminiApiKey?.trim() || '';
        } else {
            globalApiKey = '';
        }
    } catch (e) {
        console.error("Nex: Config load failed", e);
        globalApiKey = '';
    }
}

// 2. Data Context (shortened for API - full version in local fallback)
const SHOP_CONTEXT_SHORT = `You are Nex, AI assistant for Buddika Stores, Walapane, Sri Lanka.
Store: No 48, Kandy Road, Walapane. Open 8.30AM-8.30PM daily.
WhatsApp: 077-5192756 | Mobile: 078-4668883 | Landline: 052-2279101
We accept HelaPay, COD, Bank Transfer, Card.
Delivery: Walapane area. Book cover service Rs.25/book.
Reply in the same language (Sinhala/English) as the user.`;

// ========== LOCAL FALLBACK ENGINE ==========
// Handles common questions WITHOUT API call - saves quota

const LOCAL_RESPONSES = [
    {
        keywords: ['helapay', 'hela pay', 'qr', 'scan'],
        reply: 'Ow! Buddika Stores wala HelaPay payments den piligannawa! QR eka scan karala lesiyenma gewanna puluwan. In-store and online donatakama puluwan! \ud83d\udcb3'
    },
    {
        keywords: ['payment', 'pay', 'wage', 'dhana', 'hadima'],
        reply: 'Buddika Stores wala payment methods:\n\ud83d\udcb3 HelaPay (QR scan)\n\ud83d\udcb5 Cash on Delivery (COD)\n\ud83c\udfe6 Bank Transfer\n\ud83d\udcb3 Card Payment\n\nHelaPay eka fastest and easiest!'
    },
    {
        keywords: ['deliver', 'delivery', 'aweesh', 'awesh', 'yawanawa', 'gnne', 'geniyanne'],
        reply: 'Buddika Stores wala home delivery thiyenawa! Walapane area ekata delivery karanawa.\n\ud83d\ude9a Grocery, stationery, newspaper orders walata.\n\ud83c\udfed Store pickup ekath puluwan - online order karala store eken ganna.\n\nWhatsApp karanna: 077-5192756'
    },
    {
        keywords: ['time', 'open', 'close', 'kaleta', 'paththe', 'weda', 'hour', 'kale'],
        reply: 'Buddika Stores wada kale:\n\u23f0 Open: 8.30 AM - 8.30 PM (Daily)\n\ud83d\udccd No 48, Kandy Road, Walapane\n\nDawasema 7 kana wata open!\ud83d\ude0a'
    },
    {
        keywords: ['location', 'address', 'koheda', 'thiyenne', 'where', 'map'],
        reply: 'Buddika Stores thiyenne:\n\ud83d\udccd No 48, Kandy Road, Walapane\n\nWalapane town eke, Kandy Road eke thiyenne - hondai hoyaganna puluwan!\ud83d\ude0a'
    },
    {
        keywords: ['whatsapp', 'message', 'call', 'contact', 'number', 'call karanna', 'num'],
        reply: 'Buddika Stores contact:\n\ud83d\udcac WhatsApp (Orders): 077-5192756\n\ud83d\udcf1 Mobile: 078-4668883\n\ud83d\udcde Landline: 052-2279101\n\nWhatsApp ekata message karala orders place karanna puluwan!'
    },
    {
        keywords: ['book cover', 'cover', 'kavara', 'kawaru', 'label'],
        reply: 'Buddika Stores wala book cover service thiyenawa!\n\ud83d\udcda Rs.25 per book\n\ud83d\udcdd Cover + Label hadenawa\n\n"\u0dbb\u0dd1 \u0d91\u0dc5\u0dd2 \u0dc0\u0dd9\u0db1\u0d9a\u0dcf\u0db8\u0dca\u0dad \u0db4\u0ddc\u0dad\u0dca \u0d9a\u0dc0\u0dbb \u0daf\u0dcf\u0db1\u0dca\u0db1 \u0dc0\u0daf \u0dc0\u0dd9\u0db1\u0dca\u0db1 \u0d91\u0db4\u0dcf!"\n\nStore ekata enna, \u0d85\u0db4\u0dd2 \u0d9a\u0dbb\u0db1\u0dca\u0db1 \u0d91\u0db4\u0dcf!'
    },
    {
        keywords: ['order', 'karanawa', 'order karanna', 'ganna', 'buy', 'how to order', 'hadanna'],
        reply: 'Online order karanna:\n1\ufe0f\u20e3 Products page eke items add karanna\n2\ufe0f\u20e3 Cart icon eka click karanna\n3\ufe0f\u20e3 Checkout button eka press karanna\n4\ufe0f\u20e3 HelaPay/Card pay wenath \u0d85\u0db8 WhatsApp ekata yawanna puluwan\n\nWhatsApp orders: 077-5192756'
    },
    {
        keywords: ['stationery', 'office', 'pen', 'pencil', 'book', 'copy', 'note'],
        reply: 'Buddika Stores wala stationery items full set ekak thiyenawa!\n\ud83d\udcda CR Books, Notebooks\n\ud83d\udcdd Pens, Pencils, Markers\n\ud83d\udcd0 Geometry Boxes\n\ud83d\udccf Files, Folders\n\ud83d\udd2c Art supplies\n\nSchool book list ekath package wage hadenawa - 10% OFF! \ud83c\udf93'
    },
    {
        keywords: ['grocery', 'food', 'rice', 'sugar', 'dhal', 'biscuit', 'tea', 'kema'],
        reply: 'Buddika Stores wala grocery items full range ekak thiyenawa!\n\ud83c\udf5e Rice, Flour\n\ud83c\udf6c Biscuits, Snacks\n\ud83c\udf75 Tea, Coffee\n\ud83e\udd63 Spices, Dhal\n\ud83e\uddca Beverages\n\nWholesale and retail donatakama! \ud83d\uded2'
    },
    {
        keywords: ['newspaper', 'news', 'paper', 'paththara', 'morning', 'update'],
        reply: 'Buddika Stores wala all major newspapers thiyenawa!\n\ud83d\udcf0 Daily News, Dinamina, Lankadeepa\n\ud83d\udcf0 Silumina, Rivira, Mawbima\n\ud83d\udcf0 Weekend papers ekath\n\nMorning Update widget eke check karanna - daily papers stock eka! \ud83d\udcf0'
    },
    {
        keywords: ['photocopy', 'copy', 'print', 'printout', 'colour', 'laminate', 'binding'],
        reply: 'Buddika Stores wala printing services thiyenawa!\n\ud83d\udc4f Photocopy (B&W and Colour)\n\ud83d\udda8\ufe0f Printouts\n\ud83d\udc40 Lamination\n\ud83d\udcc4 Binding\n\ud83c\udfa8 Colour Printouts\n\nFast service - store ekata enna! \u26a1'
    },
    {
        keywords: ['offer', 'discount', 'sale', 'promo', 'promotion', 'salli', 'wadima', 'reduce'],
        reply: 'Buddika Stores wala offers thiyenawa!\n\ud83c\udf93 Book List Package - 10% OFF\n\ud83c\udf81 Seasonal promotions\n\ud83d\udced Special bundles\n\nWebsite eke Promotions section eke balanna! \ud83d\udc47'
    },
    {
        keywords: ['hello', 'hi', 'hey', 'ayubowan', 'kohomada', 'kohomathe', 'good morning', 'good evening'],
        reply: 'Ayubowan! \ud83d\ude4f Nex Assistant ekata welcome!\n\nBuddika Stores, Walapane eke online helper kenek. Mata ask karanna:\n\ud83c\udfe6 Payment methods\n\ud83d\ude9a Delivery info\n\ud83d\udcda Products & services\n\ud83c\udf81 Offers\n\nMata kiyanna, help karanawa! \ud83d\ude0a'
    },
    {
        keywords: ['thank', 'thanks', 'sthu', 'sthuthi', 'thank you'],
        reply: 'Welcome! \ud83d\ude4f Mathaka thiyena - Buddika Stores, Walapane. Koheda question ekakath thiyenawa nam, aayesh! \ud83d\ude0a'
    }
];

function getLocalReply(text) {
    const lower = text.toLowerCase();
    let bestMatch = null;
    let bestScore = 0;

    for (const entry of LOCAL_RESPONSES) {
        let score = 0;
        for (const kw of entry.keywords) {
            if (lower.includes(kw)) score++;
        }
        if (score > bestScore) {
            bestScore = score;
            bestMatch = entry;
        }
    }

    return bestScore > 0 ? bestMatch.reply : null;
}

// ========== MAIN LOGIC ==========

export function initNex() {
    if (document.getElementById('nex-icon')) {
        console.log("Nex: Already initialized, skipping duplicate");
        return;
    }
    renderNexUI();
    attachNexEvents();
    fetchStoreConfig();
}

function renderNexUI() {
    const uiHtml = `
    <!-- Nex Icon -->
    <div id="nex-icon" class="fixed bottom-6 right-4 md:right-6 z-[9999] cursor-pointer hover:scale-110 transition-transform duration-300">
        <div class="bg-black text-white p-3 md:p-4 rounded-full shadow-lg flex items-center justify-center w-14 h-14 md:w-16 md:h-16 border-2 border-white">
            <span class="text-2xl md:text-3xl">🤖</span>
        </div>
    </div>
    <!-- Nex Window -->
    <div id="nex-window" class="fixed bottom-24 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-2xl shadow-2xl z-[9999] transform transition-all duration-300 origin-bottom-right scale-0 opacity-0 hidden flex flex-col h-[500px] max-h-[70vh]">
        <div class="bg-black text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-xl">🤖</span>
                <div><h3 class="font-bold">Nex Assistant</h3><p class="text-xs text-gray-400">Online</p></div>
            </div>
            <button id="close-nex" class="p-2 hover:bg-white/10 rounded-lg transition-colors">✕</button>
        </div>
        <div id="nex-messages" class="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50"></div>
        <div class="p-4 bg-white border-t border-gray-100 rounded-b-2xl">
            <div class="flex items-center gap-2 bg-gray-100 p-2 rounded-xl">
                <button id="nex-mic-btn" class="text-gray-500 hover:text-black p-2 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                </button>
                <input type="text" id="nex-input" placeholder="Ask or speak..." class="flex-1 bg-transparent outline-none text-sm text-black placeholder-gray-500" onkeypress="if(event.key === 'Enter') sendNexMessage()">
                <button onclick="sendNexMessage()" class="bg-black text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">➤</button>
            </div>
        </div>
    </div>`;
    if (document.body) {
        document.body.insertAdjacentHTML('beforeend', uiHtml);
        setTimeout(setupVoiceInput, 1000);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            document.body.insertAdjacentHTML('beforeend', uiHtml);
            setTimeout(setupVoiceInput, 1000);
        });
    }
}

function setupVoiceInput() {
    const btn = document.getElementById('nex-mic-btn');
    if (!btn) return;

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        btn.style.display = 'none';
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'si-LK';

    btn.addEventListener('click', () => {
        try {
            recognition.start();
            btn.classList.add('text-red-600', 'animate-pulse');
            document.getElementById('nex-input').placeholder = "Listening...";
        } catch (e) { console.error(e); }
    });

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('nex-input').value = transcript;
        sendNexMessage();
    };

    recognition.onend = () => {
        btn.classList.remove('text-red-600', 'animate-pulse');
        btn.classList.add('text-gray-500');
        document.getElementById('nex-input').placeholder = "Ask anything...";
    };

    recognition.onerror = (event) => {
        console.error("Speech Error:", event.error);
        btn.classList.remove('text-red-600', 'animate-pulse');
        document.getElementById('nex-input').placeholder = "Error. Try again.";
    };
}

function attachNexEvents() {
    const icon = document.getElementById('nex-icon');
    const nexWindow = document.getElementById('nex-window');
    const closeBtn = document.getElementById('close-nex');
    const toggle = () => {
        if (nexWindow.classList.contains('hidden')) {
            nexWindow.classList.remove('hidden');
            setTimeout(() => nexWindow.classList.remove('scale-0', 'opacity-0'), 10);
        } else {
            nexWindow.classList.add('scale-0', 'opacity-0');
            setTimeout(() => nexWindow.classList.add('hidden'), 300);
        }
    };
    icon.addEventListener('click', toggle);
    closeBtn.addEventListener('click', toggle);
}

window.sendNexMessage = async () => {
    const input = document.getElementById('nex-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    const typingId = showTyping();

    // STEP 1: Try local keyword match FIRST (free, no API needed)
    const localReply = getLocalReply(text);
    if (localReply) {
        removeTyping(typingId);
        // Small delay to feel natural
        setTimeout(() => addMessage('bot', localReply), 400);
        return;
    }

    // STEP 2: Try Gemini API for complex questions
    if (!globalApiKey) {
        const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
        if (storedKey) {
            globalApiKey = storedKey;
        } else {
            await fetchStoreConfig();
        }
    }

    let key = globalApiKey;

    if (!key) {
        removeTyping(typingId);
        addMessage('bot', generateGeneralReply(text));
        return;
    }

    try {
        const reply = await callGeminiFlash(key, text);
        removeTyping(typingId);
        addMessage('bot', reply);
    } catch (err) {
        removeTyping(typingId);

        // On API failure, fall back to local smart reply instead of error message
        if (err.message.includes('429') || err.message.includes('quota') ||
            err.message.includes('403') || err.message.includes('denied') ||
            err.message.includes('All models failed')) {
            console.warn("Nex: API failed, using local fallback");
            addMessage('bot', generateGeneralReply(text));
        } else {
            addMessage('system', 'Sorry, something went wrong. Please try again or WhatsApp us: 077-5192756');
            console.error("Nex Error:", err);
        }
    }
};

// Smart general fallback when API is down - still gives useful answer
function generateGeneralReply(text) {
    const lower = text.toLowerCase();

    // Product price check
    if (productCache && (lower.includes('price') || lower.includes('kda') || lower.includes('katay') || lower.includes('kiyala') || lower.includes('how much') || lower.includes('rate'))) {
        return 'Product prices check karanna website eke Products page eke balanna, \u0d85\u0db8 WhatsApp karanna: 077-5192756. Mata exact price eka dena puluwan! \ud83d\udcb0';
    }

    // General helpful response
    return `Mata eka answer karanna behe, API eka temporarily down. \ud83d\ude4f

Eka gana info one nam:\n\ud83d\udcac WhatsApp: 077-5192756\n\ud83d\udcf1 Call: 078-4668883\n\ud83d\udccd Store: No 48, Kandy Road, Walapane\n\nStore ekata enna \u0d85\u0db8 call karanna puluwan! \ud83d\ude0a`;
}

async function callGeminiFlash(key, prompt) {
    // Only include product data if we don't have a local match (saves tokens)
    let contextData = '';
    try {
        const now = Date.now();
        if (!productCache || (now - productCacheTime) > PRODUCT_CACHE_TTL) {
            const products = await getProductData();
            const promotions = await getPromotionsData();
            productCache = { products, promotions };
            productCacheTime = now;
        }
        contextData = `\n\nPromotions: ${productCache.promotions}\nProducts (sample): ${productCache.products}`;
    } catch (e) { /* ignore */ }

    const finalPrompt = `${SHOP_CONTEXT_SHORT}${contextData}\n\nUser: ${prompt}\nAnswer briefly:`;

    // Try models - prioritize free flash models
    const modelsToTry = [
        'models/gemini-2.0-flash-lite',
        'models/gemini-2.0-flash',
        'models/gemini-1.5-flash',
        'models/gemini-1.5-flash-8b'
    ];

    let errors = [];

    for (const model of modelsToTry) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }],
                    generationConfig: {
                        maxOutputTokens: 256,
                        temperature: 0.7
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || response.statusText);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

        } catch (e) {
            console.warn(`Nex: Model ${model} failed:`, e.message);
            errors.push(e.message);
            // If quota error, no point trying other models with same key
            if (e.message.includes('429') || e.message.includes('quota')) {
                throw new Error('Quota exceeded for all models');
            }
        }
    }

    throw new Error("All models failed. Errors: " + errors.join(' | '));
}

async function getPromotionsData() {
    try {
        const q = query(collection(db, "promotions"), limit(10));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return "No active promotions.";
        return snapshot.docs.map(doc => {
            const p = doc.data();
            if (p.status === 'soldout') return '';
            return `- ${p.title}: ${p.price}${p.oldPrice ? ' (Was ' + p.oldPrice + ')' : ''}`;
        }).filter(s => s).join('\n');
    } catch (e) { return ""; }
}

async function getProductData() {
    try {
        const snap = await getDocs(query(collection(db, "products"), limit(30)));
        return snap.docs.map(d => {
            const p = d.data();
            return p.active !== false ? `- ${p.name}: Rs ${p.price}` : '';
        }).filter(s => s).join('\n');
    } catch (e) { return ""; }
}

function addMessage(sender, text) {
    const c = document.getElementById('nex-messages');
    if (!c) return;
    const bg = sender === 'user' ? 'bg-black text-white' : (sender === 'system' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white border border-gray-200 text-black');
    const align = sender === 'user' ? 'items-end' : 'items-start';
    c.insertAdjacentHTML('beforeend', `<div class="flex flex-col ${align}"><div class="${bg} p-3 rounded-2xl max-w-[85%] text-sm leading-relaxed">${text}</div></div>`);
    c.scrollTop = c.scrollHeight;
}

function showTyping() {
    const id = 'typing-' + Date.now();
    const c = document.getElementById('nex-messages');
    if (!c) return id;
    c.insertAdjacentHTML('beforeend', `<div id="${id}" class="flex items-center gap-1 text-xs text-gray-400 p-2"><span class="animate-bounce" style="animation-delay:0ms">.</span><span class="animate-bounce" style="animation-delay:150ms">.</span><span class="animate-bounce" style="animation-delay:300ms">.</span></div>`);
    c.scrollTop = c.scrollHeight;
    return id;
}
function removeTyping(id) { document.getElementById(id)?.remove(); }
// initNex is called manually from index.html - no auto-init to avoid double render
