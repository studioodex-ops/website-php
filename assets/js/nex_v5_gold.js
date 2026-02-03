import { db, collection, getDocs, query, limit, doc, getDoc } from './firebase-config.js';

// NEX ASSISTANT V5 (GOLD STANDARD)
console.log("Nex: V5 GOLD LOADED");

let globalApiKey = null;
const API_KEY_STORAGE_KEY = 'gemini_api_key';

// 1. Fetch Configuration
async function fetchStoreConfig() {
    try {
        const docRef = doc(db, "settings", "store_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            globalApiKey = docSnap.data().geminiApiKey?.trim() || '';
        } else {
            // Default if doc doesn't exist
            globalApiKey = '';
        }
    } catch (e) {
        console.error("Nex: Config load failed", e);
        // Fallback on error
        globalApiKey = '';
    }
}

// 2. Data Context
// 2. Data Context
const SHOP_CONTEXT = `
You are Nex, the AI assistant for Buddika Stores in Walapane, Sri Lanka.
Your personality: Friendly, helpful, and polite. You are like a knowledgeable shop manager.

*** CORE KNOWLEDGE BASE (A-Z) ***

1. STORE DETAILS:
- Name: Buddika Stores
- Address: No 48, Kandy Road, Walapane.
- Open: 8.30 AM - 8.30 PM (Daily).
- Type: Retail & Wholesale (Grocery, Stationery, Newspapers, Daily Essentials).

2. CONTACT NUMBERS:
- WhatsApp (Orders): 077-5192756
- Hotline (Landline): 052-2279101
- Voice Call (Mobile): 078-4668883

3. DELIVERY POLICY:
- Locations: We deliver primarily within Walapane town limits.
- Home Delivery: Yes, available for grocery and stationery orders.
- Three-wheel Delivery: Available for larger orders or slightly distant locations (paid to driver).
- Store Pickup: Customers can order online and pick up at the store.

4. HOW TO ORDER (Online):
- Step 1: Browse our website (products page).
- Step 2: Add items to the Cart (Click 'Add to Cart').
- Step 3: Click the Cart Icon.
- Step 4: Click 'Checkout via WhatsApp'. This sends your order list directly to us!

5. PAYMENT METHODS:
- Cash on Delivery (COD): Pay when you receive goods.
- Bank Transfer: Available (Details given at checkout).
- Card Payment: Accepted in-store and online.

6. SMART BUNDLES (NEW FEATURE!):
- Special product bundles with discounts (10%-40% OFF).
- Example: "School Starter Kit" - Exercise books, pens, rulers together at a discounted price.
- Find bundles on the Homepage under "📦 Smart Bundles" section.
- Click "Add Bundle to Cart" to add all items at once with the discount applied.
- Great for school supplies, office essentials, and gift sets!

7. PRODUCT RECOMMENDATIONS:
- When you browse products, we suggest similar items you might like.
- Look for the "You May Also Like" section on the products page.
- Our AI suggests products based on category and price similarity.

8. BOOK COVER SERVICE (NEW! - Back to School):
- "Ready-to-Go Book Pack" - Submit book list, we cover and label all books!
- Service charges: Rs.25/book for basic cover + optional extras.
- Sticky cover: +Rs.10/book, Printed name labels: +Rs.5/label.
- Express service (1 day): +Rs.50 total.
- Order online at book-cover-service.html, drop off books, pick up ready pack in 2 days.
- Perfect for busy working parents during school season!
- Marketing tagline: "රෑ එළි වෙනකම් පොත් කවර දාන්න වද වෙන්න එපා!"

9. LUCKY DRAW (Back to School Promotion):
- Automatic entry for purchases Rs.5000 or more!
- Entry ID shown after checkout - customers should keep it safe.
- Winners drawn at month end by store admin.
- Prizes: School bags, bicycles, stationery hampers, store credit.
- Winners notified via WhatsApp.

10. BOOK LIST PACKAGE (පොත් ලිස්ට් පැකේජය):
- WhatsApp your complete school book list to 077-5192756
- We prepare ALL items from your list!
- Benefits: 10% OFF the total bill OR get books at OLD PRICES (*conditions apply)
- Perfect for busy parents who don't have time to search for items
- Marketing: "ඔයාගේ පොත් ලිස්ට් එක අපිට WhatsApp කරන්න, අපි ඔක්කොම ලෑස්ති කරලා තියන්නම්!"

11. INSTRUCTIONS FOR AI:
- Always reply in the SAME language/style the user uses (Sinhala, Singlish, or English).
- If asked about delivery, explain the Walapane town limit and home delivery option clearly.
- If asked "How to buy", explain the "Add to Cart -> WhatsApp Checkout" process.
- If asked about bundles/offers, mention the Smart Bundles on the homepage with discounts.
- If asked about recommendations, explain the "You May Also Like" feature.
- Be friendly and professional. "Apata katha karanna" (Call us) if complex.
`;

export function initNex() {
    renderNexUI();
    attachNexEvents();
    fetchStoreConfig();
}

function renderNexUI() {
    // ... (Standard UI Code) ...
    const uiHtml = `
    <!-- Nex Icon -->
    <div id="nex-icon" class="fixed bottom-28 md:bottom-6 right-4 md:right-6 z-[9999] cursor-pointer hover:scale-110 transition-transform duration-300">
        <div class="bg-black text-white p-3 md:p-4 rounded-full shadow-lg flex items-center justify-center w-14 h-14 md:w-16 md:h-16 border-2 border-white">
            <span class="text-2xl md:text-3xl">🤖</span>
        </div>
    </div>
    <!-- Nex Window -->
    <div id="nex-window" class="fixed bottom-48 md:bottom-24 right-4 md:right-6 w-[calc(100vw-2rem)] md:w-96 bg-white rounded-2xl shadow-2xl z-[9999] transform transition-all duration-300 origin-bottom-right scale-0 opacity-0 hidden flex flex-col h-[500px] max-h-[70vh]">
        <div class="bg-black text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div class="flex items-center gap-3">
                <span class="text-xl">🤖</span>
                <div><h3 class="font-bold">Nex Assistant</h3><p class="text-xs text-gray-400">Online</p></div>
            </div>
            <button id="close-nex" class="p-2">✕</button>
        </div>
        <div id="nex-messages" class="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50"></div>
        <div class="p-4 bg-white border-t border-gray-100 rounded-b-2xl">
            <div class="flex items-center gap-2 bg-gray-100 p-2 rounded-xl">
                <button id="nex-mic-btn" class="text-gray-500 hover:text-black p-2 transition-colors">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
                </button>
                <input type="text" id="nex-input" placeholder="Ask or speak..." class="flex-1 bg-transparent outline-none text-sm" onkeypress="if(event.key === 'Enter') sendNexMessage()">
                <button onclick="sendNexMessage()" class="bg-black text-white p-2 rounded-lg">➤</button>
            </div>
        </div>
    </div>`;
    if (document.body) {
        document.body.insertAdjacentHTML('beforeend', uiHtml);
        setTimeout(setupVoiceInput, 1000); // Init Voice after render
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
        btn.style.display = 'none'; // Not supported
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US'; // Default to English, but tries to detect

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
    const window = document.getElementById('nex-window');
    const closeBtn = document.getElementById('close-nex');
    const toggle = () => {
        if (window.classList.contains('hidden')) {
            window.classList.remove('hidden');
            setTimeout(() => window.classList.remove('scale-0', 'opacity-0'), 10);
        } else {
            window.classList.add('scale-0', 'opacity-0');
            setTimeout(() => window.classList.add('hidden'), 300);
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

    // Priority: Global Var > LocalStorage > Fetch from DB
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
        const msg = '⚠️ API Key Missing! Please go to Admin > Settings and save your Gemini API Key.';
        addMessage('system', msg);
        alert(msg);
        return;
    }

    try {
        const reply = await callGeminiFlash(key, text);
        removeTyping(typingId);
        addMessage('bot', reply);
    } catch (err) {
        removeTyping(typingId);
        addMessage('system', `❌ Error: ${err.message}`);
        console.error("Nex Error:", err);
        // Debug Alert
        alert("Chatbot Error: " + err.message);
    }
};

async function callGeminiFlash(key, prompt) {
    const products = await getProductData();
    const promotions = await getPromotionsData();
    const finalPrompt = `${SHOP_CONTEXT}\n\n=== ACTIVE PROMOTIONS ===\n${promotions}\n\n=== PRODUCT DATA ===\n${products}\n============\nUser: ${prompt}\nAnswer:`;

    // LIST OF MODELS TO TRY (Fallback Strategy)
    const models = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-001',
        'gemini-1.5-flash-latest',
        'gemini-pro',
        'gemini-1.0-pro'
    ];

    let lastError = null;

    for (const model of models) {
        console.log(`Nex: Trying model ${model}...`);
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                // If model not found (404) or invalid arg (400), throw to try next
                throw new Error(err.error?.message || response.statusText);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";

        } catch (e) {
            console.warn(`Nex: Model ${model} failed:`, e.message);
            lastError = e;
            // Continue to next model
        }
    }

    // If all hardcoded models failed, try Auto-Discovery
    console.warn("Nex: All hardcoded models failed. Attempting Auto-Discovery...");
    try {
        const autoModel = await findActiveModel(key);
        if (autoModel) {
            console.log(`Nex: Auto-discovered model: ${autoModel}`);
            const url = `https://generativelanguage.googleapis.com/v1beta/${autoModel}:generateContent?key=${key}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] })
            });
            if (response.ok) {
                const data = await response.json();
                return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
            }
        }
    } catch (discoveryErr) {
        console.error("Nex: Auto-discovery failed", discoveryErr);
    }

    // If discovery also failed or no model found
    throw lastError || new Error("All models failed and auto-discovery didn't work.");
}

// Helper: Auto-discover models
async function findActiveModel(key) {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) return null;
        const data = await response.json();
        const validModel = data.models?.find(m =>
            m.supportedGenerationMethods?.includes('generateContent') &&
            (m.name.includes('gemini') || m.name.includes('flash'))
        );
        return validModel ? validModel.name : null;
    } catch (e) {
        return null;
    }
}

async function getPromotionsData() {
    try {
        const q = query(collection(db, "promotions"));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return "No active promotions at the moment.";

        return snapshot.docs.map(doc => {
            const p = doc.data();
            if (p.status === 'soldout') return '';
            return `- [OFFER] ${p.title}: ${p.price} ${p.oldPrice ? '(Was ' + p.oldPrice + ')' : ''}. Details: ${p.description || ''}`;
        }).filter(s => s).join('\n');
    } catch (e) { return "Error fetching promotions."; }
}

async function getProductData() {
    try {
        const snap = await getDocs(query(collection(db, "products"), limit(50)));
        return snap.docs.map(d => {
            const p = d.data();
            return p.active !== false ? `- ${p.name}: Rs ${p.price}` : '';
        }).join('\n');
    } catch (e) { return ""; }
}

function addMessage(sender, text) {
    const c = document.getElementById('nex-messages');
    const bg = sender === 'user' ? 'bg-black text-white' : (sender === 'system' ? 'bg-red-100 text-red-800' : 'bg-white border');
    const align = sender === 'user' ? 'items-end' : 'items-start';
    c.insertAdjacentHTML('beforeend', `<div class="flex flex-col ${align}"><div class="${bg} p-3 rounded-2xl max-w-[85%] text-sm">${text}</div></div>`);
    c.scrollTop = c.scrollHeight;
}

function showTyping() {
    const id = 'typing-' + Date.now();
    document.getElementById('nex-messages').insertAdjacentHTML('beforeend', `<div id="${id}" class="text-xs text-gray-400 p-2">typing...</div>`);
    return id;
}
function removeTyping(id) { document.getElementById(id)?.remove(); }
document.addEventListener('DOMContentLoaded', initNex);
