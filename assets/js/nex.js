import { db, collection, getDocs, query, where, limit, doc, getDoc } from './firebase-config.js';

// NEX ASSISTANT MODULE
// Completely rewritten for stability and caching fixes.

let globalApiKey = null;
const API_KEY_STORAGE_KEY = 'gemini_api_key';

// 1. Fetch Configuration (API Key)
async function fetchStoreConfig() {
    console.log("Nex: Fetching config...");
    try {
        const docRef = doc(db, "settings", "store_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            globalApiKey = docSnap.data().geminiApiKey;
            console.log("Nex: API Key loaded successfully.");
        } else {
            console.warn("Nex: Config document missing.");
        }
    } catch (e) {
        console.error("Nex: Failed to load config", e);
    }
}

// 2. Data Context
const SHOP_CONTEXT = `
You are "Nex", the intelligent assistant for "Buddika Stores" in Walapane, Sri Lanka.
Your Goal: Help customers find products, check prices, and understand store policies.
Language: Reply in the same language the user asks (Sinhala, English, or Singlish).
Style: Friendly, helpful, polite, and concise. Use emojis occasionally.

Store Details:
- Name: Buddika Stores
- Location: No 48, Kandy Road, Walapane, Central Province, 20660.
- Phone: 052-2279101
- Hours: 7:00 AM - 9:00 PM (Mon-Sat), 8:00 AM - 8:00 PM (Sun).
- Products: Grocery (Rice, Sugar, Dhal, Spices), Stationery (CR Books, Pens, Pencils, School Items), Newspapers (Wijeya, Lakehouse).
- Services: Retail sales, Home Delivery (in Walapane area), Store Pickup.
- Payment: Cash on Delivery (COD), Direct Bank Transfer.

Key Policies:
- Delivery: We deliver to doorsteps in Walapane town limits.
- Returns: Goods once sold can be exchanged within 2 days with the bill.
- Out of Stock: If an item is out of stock, suggest checking back later or visiting the store.

Instructions:
1. IF ASKED ABOUT PRICES/STOCK: Always check the "REAL-TIME STORE DATA" below. If found, give the exact price. If checking the data, say "Let me check our shelf...".
2. IF GENERAL QUESTION (e.g. "How to cook?"): You may use your general knowledge.
3. IF UNSURE: Say "I'm not sure, please call us at 052-2279101."
`;

// 3. Initialize
export function initNex() {
    renderNexUI();
    attachNexEvents();
    fetchStoreConfig(); // Background fetch
}

// 4. UI Rendering
function renderNexUI() {
    // Remove any old chatbot elements if they exist
    const oldIcon = document.getElementById('chat-icon');
    if (oldIcon) oldIcon.remove();
    const oldWindow = document.getElementById('chat-window');
    if (oldWindow) oldWindow.remove();

    const uiHtml = `
    <!-- Nex Icon -->
    <div id="nex-icon" class="fixed bottom-6 right-6 z-50 cursor-pointer hover:scale-110 transition-transform duration-300">
        <div class="bg-black text-white p-4 rounded-full shadow-lg flex items-center justify-center w-16 h-16 border-2 border-white">
            <span class="text-3xl">🤖</span>
        </div>
    </div>

    <!-- Nex Window -->
    <div id="nex-window" class="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 transform transition-all duration-300 origin-bottom-right scale-0 opacity-0 hidden flex flex-col h-[500px]">
        <!-- Header -->
        <div class="bg-black text-white p-4 rounded-t-2xl flex justify-between items-center">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center border border-gray-500">
                    <span class="text-xl">🤖</span>
                </div>
                <div>
                    <h3 class="font-bold font-heading text-lg">Nex Assistant</h3>
                    <p class="text-xs text-gray-400">Online • Buddika Stores</p>
                </div>
            </div>
            <button id="close-nex" class="hover:bg-gray-800 p-2 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>

        <!-- Messages -->
        <div id="nex-messages" class="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
            <div class="flex flex-col items-start fade-in-up">
                <div class="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm shadow-sm">
                    Ayubowan! 👋 I am <b>Nex</b>.<br>
                    ඔයාට බඩු මිල ගණන් දැනගන්න ඕනද? මගෙන් අහන්න!
                </div>
                <span class="text-[10px] text-gray-400 mt-1 mx-1">Nex</span>
            </div>
        </div>

        <!-- Input -->
        <div class="p-4 bg-white border-t border-gray-100 rounded-b-2xl">
            <div class="flex items-center gap-2 bg-gray-100 p-2 rounded-xl">
                <input type="text" id="nex-input" placeholder="Ask anything..." 
                    class="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 py-1 outline-none text-gray-800"
                    onkeypress="if(event.key === 'Enter') sendNexMessage()">
                <button onclick="sendNexMessage()" class="bg-black text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                </button>
            </div>
            <div class="text-center mt-2">
                 <p class="text-[10px] text-gray-400">Powered by Gemini AI ✨</p>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', uiHtml);
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

// 5. Messaging Logic
window.sendNexMessage = async () => {
    const input = document.getElementById('nex-input');
    const text = input.value.trim();
    if (!text) return;

    // UI Updates
    input.value = '';
    addMessage('user', text);
    const typingId = showTyping();

    // Check Key
    let key = globalApiKey || localStorage.getItem(API_KEY_STORAGE_KEY);
    if (!key) {
        await fetchStoreConfig();
        key = globalApiKey;
    }

    if (!key) {
        removeTyping(typingId);
        addMessage('system', '⚠️ Configuration Error: API Key missing. Please contact admin.');
        return;
    }

    // Call AI
    try {
        const reply = await callGeminiSafe(key, text);
        removeTyping(typingId);
        addMessage('bot', reply);
    } catch (err) {
        removeTyping(typingId);
        console.error(err);
        addMessage('system', `❌ System Error: ${err.message}. (Try refreshing)`);
    }
};

// 6. Robust API Call (The Core Fix)
async function callGeminiSafe(key, prompt) {
    // 6a. Get Data
    const products = await getProductData();
    const headers = await getPromoData();

    // 6b. Construct Prompt
    const finalPrompt = `
${SHOP_CONTEXT}

=== REAL-TIME STORE DATA ===
${headers}
${products}
============================

User Query: ${prompt}

Answer:`;

    // 6c. Robust Fetch Loop
    const modelsToTry = [
        { name: 'gemini-1.5-flash', version: 'v1beta' },
        { name: 'gemini-1.5-pro', version: 'v1beta' },
        { name: 'gemini-pro', version: 'v1' },        // Stable legacy
        { name: 'gemini-1.0-pro', version: 'v1beta' }
    ];

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            const url = `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${key}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: finalPrompt }] }]
                })
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || response.statusText);
            }

            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble thinking right now.";

        } catch (e) {
            console.warn(`Nex: Failed with ${model.name}`, e);
            lastError = e;
            // Continue to next model...
        }
    }

    throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

// Helpers
async function getProductData() {
    try {
        // Limit to 100 for safety/speed
        const snap = await getDocs(query(collection(db, "products"), limit(100)));
        if (snap.empty) return "No products found.";
        return snap.docs.map(d => {
            const p = d.data();
            return p.active !== false ? `- ${p.name}: Rs ${p.price} (${p.stock > 0 ? 'In Stock' : 'No Stock'})` : '';
        }).join('\n');
    } catch (e) { return "(Product data unavailable)"; }
}

async function getPromoData() {
    try {
        const snap = await getDocs(query(collection(db, "promotions")));
        return snap.docs.map(d => {
            const p = d.data();
            return (p.active !== false && p.status !== 'soldout') ? `PROMO: ${p.title} at Rs ${p.price}` : '';
        }).join('\n');
    } catch (e) { return ""; }
}

function addMessage(sender, text) {
    const container = document.getElementById('nex-messages');
    const isUser = sender === 'user';
    const isSystem = sender === 'system';

    let bg = isUser ? 'bg-black text-white' : (isSystem ? 'bg-red-100 text-red-800' : 'bg-white border border-gray-200');
    let align = isUser ? 'items-end' : 'items-start';

    const html = `
    <div class="flex flex-col ${align} fade-in-up">
        <div class="${bg} p-3 rounded-2xl shadow-sm max-w-[85%] text-sm ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'}">
            ${text.replace(/\n/g, '<br>')}
        </div>
        <span class="text-[10px] text-gray-400 mt-1 mx-1">${isUser ? 'You' : 'Nex'}</span>
    </div>`;

    container.insertAdjacentHTML('beforeend', html);
    container.scrollTop = container.scrollHeight;
}

function showTyping() {
    const id = 'typing-' + Date.now();
    document.getElementById('nex-messages').insertAdjacentHTML('beforeend', `
        <div id="${id}" class="flex flex-col items-start fade-in-up">
            <div class="bg-gray-100 p-3 rounded-2xl rounded-tl-none max-w-[50px] flex items-center gap-1">
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
        </div>
    `);
    document.getElementById('nex-messages').scrollTop = document.getElementById('nex-messages').scrollHeight;
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// Auto-init
document.addEventListener('DOMContentLoaded', initNex);
