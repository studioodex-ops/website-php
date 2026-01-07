import { db, collection, getDocs, query, where, limit, doc, getDoc } from './firebase-config.js';

// Chatbot Module for Buddika Stores
// Handles UI rendering, Context Management, and Gemini API calls

let globalApiKey = null;

// Fetch Config (API Key) from Firestore
async function fetchStoreConfig() {
    try {
        const docRef = doc(db, "settings", "store_config");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            globalApiKey = docSnap.data().geminiApiKey;
            console.log("Chatbot: API Key loaded.");
        } else {
            // No alert for missing config, just proceed without key
        }
    } catch (e) {
        console.error("Chatbot: Failed to load config", e);
    }
}

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
1. If asked about prices, say "Prices may vary, please check the 'Products' page for latest prices." unless you are sure.
2. If asked to place an order, guide them to add items to cart and checkout via WhatsApp.
3. If unsure, say "I'm not sure, please call us at 052-2279101 for that info."
`;

export function initChatbot() {
    renderChatUI(); // Show UI immediately
    attachEventListeners();
    fetchStoreConfig(); // Fetch Key in background
}

function renderChatUI() {
    // 1. Chat Icon
    const iconHtml = `
        <div id="chat-icon" class="fixed bottom-6 right-6 z-50 cursor-pointer hover:scale-110 transition-transform duration-300">
            <div class="bg-black text-white p-4 rounded-full shadow-lg flex items-center justify-center w-16 h-16">
                <span class="text-3xl">🤖</span>
            </div>
        </div>
    `;

    // 2. Chat Window
    const windowHtml = `
        <div id="chat-window" class="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 transform transition-all duration-300 origin-bottom-right scale-0 opacity-0 hidden flex flex-col h-[500px]">
            <!-- Header -->
            <div class="bg-black text-white p-4 rounded-t-2xl flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                        <span class="text-xl">🤖</span>
                    </div>
                    <div>
                        <h3 class="font-bold font-heading">Nex</h3>
                        <p class="text-xs text-gray-400">Online • Replies Instantly</p>
                    </div>
                </div>
                <button id="close-chat" class="hover:bg-gray-800 p-2 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Messages Area -->
            <div id="chat-messages" class="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50">
                <!-- Welcome Message -->
                <div class="flex flex-col items-start fade-in-up">
                    <div class="bg-white border border-gray-200 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-sm shadow-sm">
                        Ayubowan! Welcome to Buddika Stores. 👋<br>
                        I am <b>Nex</b>. මම ඔයාට කොහොමද උදව් කරන්න පුළුවන්?
                    </div>
                    <span class="text-[10px] text-gray-400 mt-1 mx-1">Nex</span>
                </div>
            </div>

            <!-- Input Area -->
            <div class="p-4 bg-white border-t border-gray-100 rounded-b-2xl">
                <div class="flex items-center gap-2 bg-gray-100 p-2 rounded-xl">
                    <input type="text" id="chat-input" placeholder="Type a message..." 
                        class="flex-1 bg-transparent border-none focus:ring-0 text-sm px-2 py-1 outline-none text-gray-800"
                        onkeypress="if(event.key === 'Enter') sendChatMessage()">
                    <button onclick="sendChatMessage()" class="bg-black text-white p-2 rounded-lg hover:bg-gray-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </div>
                <div class="text-center mt-2">
                     <p class="text-[10px] text-gray-400 flex items-center justify-center gap-1">
                        Powered by Gemini AI ✨
                    </p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', iconHtml + windowHtml);
}

function attachEventListeners() {
    const icon = document.getElementById('chat-icon');
    const window = document.getElementById('chat-window');
    const closeBtn = document.getElementById('close-chat');

    const toggleChat = () => {
        const isHidden = window.classList.contains('hidden');
        if (isHidden) {
            window.classList.remove('hidden');
            // Small delay to allow display:block to apply before opacity transition
            setTimeout(() => {
                window.classList.remove('scale-0', 'opacity-0');
            }, 10);
        } else {
            window.classList.add('scale-0', 'opacity-0');
            setTimeout(() => {
                window.classList.add('hidden');
            }, 300);
        }
    };

    icon.addEventListener('click', toggleChat);
    closeBtn.addEventListener('click', toggleChat);
}

window.sendChatMessage = async () => {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const userText = input.value.trim();
    // Use Global Key (First preference) 
    let apiKey = globalApiKey || localStorage.getItem('gemini_api_key');

    // Double check: if still no key, try fetching fresh from DB one last time
    if (!apiKey) {
        await fetchStoreConfig();
        apiKey = globalApiKey;
    }

    if (!userText) return;

    if (!apiKey) {
        appendMessage('system', '⚠️ Chat unavailable. Please contact 052-2279101.'); // Generic message for users
        console.warn("API Key missing. Admin must set it in Dashboard > Settings.");
        return;
    }

    // 1. Add User Message
    appendMessage('user', userText);
    input.value = '';

    // 2. Show Typing Indicator
    const typingId = 'typing-' + Date.now();
    appendTypingIndicator(typingId);
    scrollToBottom();

    try {
        // 3. Call API
        const responseText = await callGeminiAPI(apiKey, userText);

        // 4. Remove Typing & Add Bot Response
        removeTypingIndicator(typingId);
        appendMessage('bot', responseText);

    } catch (error) {
        removeTypingIndicator(typingId);
        console.error(error);
        appendMessage('system', '⚠️ Error: ' + error.message); // Show actual error for debugging
        // appendMessage('system', 'Sorry, something went wrong. Please try again.');
    }

    scrollToBottom();
};

function appendMessage(sender, text) {
    const messages = document.getElementById('chat-messages');
    const isUser = sender === 'user';
    const isSystem = sender === 'system';

    let bubbleClass = isUser
        ? 'bg-black text-white rounded-tr-none'
        : (isSystem ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-white border border-gray-200 rounded-tl-none');

    const alignClass = isUser ? 'items-end' : 'items-start';

    const html = `
        <div class="flex flex-col ${alignClass} fade-in-up">
            <div class="${bubbleClass} p-3 rounded-2xl shadow-sm max-w-[85%] text-sm">
                ${text.replace(/\n/g, '<br>')}
            </div>
            <span class="text-[10px] text-gray-400 mt-1 mx-1">${isUser ? 'You' : 'Nex'}</span>
        </div>
    `;

    messages.insertAdjacentHTML('beforeend', html);
}

function appendTypingIndicator(id) {
    const messages = document.getElementById('chat-messages');
    const html = `
        <div id="${id}" class="flex flex-col items-start fade-in-up">
            <div class="bg-gray-100 p-3 rounded-2xl rounded-tl-none max-w-[50px] flex items-center gap-1">
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
        </div>
    `;
    messages.insertAdjacentHTML('beforeend', html);
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    const messages = document.getElementById('chat-messages');
    messages.scrollTop = messages.scrollHeight;
}

// Fetch Active Promotions safely (Client-side filtering to avoid index issues)
async function getPromotionsContext() {
    try {
        const q = query(collection(db, "promotions"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return "Current Promotions: None.";

        let promoText = "🔥 Active Promotions & Offers:\n";
        let hasPromos = false;

        querySnapshot.forEach((doc) => {
            const p = doc.data();
            // Filter out sold out or inactive ones manually
            if (p.status === 'soldout' || p.active === false) return;

            hasPromos = true;
            promoText += `- ${p.title}: Rs. ${p.price} ${p.oldPrice ? '(Was: ' + p.oldPrice + ')' : ''}. ${p.badge ? '[' + p.badge + ']' : ''}\n`;
        });

        return hasPromos ? promoText : "Current Promotions: None active at the moment.";
    } catch (e) {
        console.warn("Failed to fetch promos for bot:", e);
        return "Promotions info unavailable currently.";
    }
}

// Fetch Product Summary (Top 50 items to keep context small but useful)
async function getProductsContext() {
    try {
        const q = query(collection(db, "products"), limit(300)); // Increased limit to cover more inventory
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return "Products: No items listed currently.";

        let productsText = "📦 Available Store Products (Partial List):\n";

        querySnapshot.forEach((doc) => {
            const p = doc.data();
            if (p.active === false) return;
            const stockStatus = (p.stock && p.stock > 0) ? "In Stock" : "Out of Stock";
            productsText += `- ${p.name || p.title} (${p.category}): Rs. ${p.price} [${stockStatus}]\n`;
        });

        return productsText;
    } catch (e) {
        console.warn("Failed to fetch products for bot:", e);
        return "Product list unavailable.";
    }
}

// Reuse robust API logic from Admin
async function callGeminiAPI(key, userPrompt) {
    // Parallel fetch for speed
    const [promoContext, productContext] = await Promise.all([
        getPromotionsContext(),
        getProductsContext()
    ]);

    const fullPrompt = `
${SHOP_CONTEXT}

=== REAL-TIME WEBSITE DATA (Store Inventory & Offers) ===
${promoContext}

${productContext}
==============================

User Question: ${userPrompt}

Instructions for Answer:
1.  **Priority 1 - Store Data:** ALWAYS check the "REAL-TIME WEBSITE DATA" above first. If the user asks about a product we have, give that exact price/stock info.
2.  **Priority 2 - Google Search:** If the user asks about general info (e.g., "What is 400g milk powder price generally?" or "How to cook dhal?"), and it's NOT in our store data, USE GOOGLE SEARCH to find the answer.
3.  **Accuracy:** Do NOT guess. If you find info via Search, mention "According to the web...". If using Store Data, state it as "We have...".
4.  **Proof:** Provide accurate, verified information only.

Answer:`;

    const candidates = [
        { model: 'gemini-1.5-flash', version: 'v1beta' }, // Flash v1beta supports search tools
        { model: 'gemini-1.5-pro', version: 'v1beta' }
    ];

    let errors = [];

    const tryModel = async (modelName, version, useTools = false) => {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent?key=${key}`;

        const requestBody = {
            contents: [{ parts: [{ text: fullPrompt }] }]
        };

        // Only add tools if requested
        if (useTools) {
            requestBody.tools = [{ googleSearchRetrieval: {} }];
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || response.statusText);
        }
        const data = await response.json();
        if (data.candidates && data.candidates.length > 0) {
            return data.candidates[0].content.parts[0].text;
        }
        throw new Error("No content returned");
    };

    // Strategy: Try with Search first -> If fail, Try Standard behavior
    const strategies = [
        { model: 'gemini-1.5-flash', version: 'v1beta', useTools: true }, // 1. Try Search
        { model: 'gemini-1.5-flash', version: 'v1beta', useTools: false }, // 2. Fallback to standard
        { model: 'gemini-1.5-pro', version: 'v1beta', useTools: true },
        { model: 'gemini-1.5-pro', version: 'v1beta', useTools: false },
        { model: 'gemini-pro', version: 'v1', useTools: false }
    ];

    for (const strat of strategies) {
        try {
            return await tryModel(strat.model, strat.version, strat.useTools);
        } catch (e) {
            console.warn(`Failed ${strat.model} (Tools: ${strat.useTools}):`, e);
            errors.push(`${strat.model} (Tools: ${strat.useTools}): ${e.message}`);
        }
    }

    // Auto-Discovery Fallback
    try {
        const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const listResp = await fetch(listUrl);
        if (listResp.ok) {
            const listData = await listResp.json();
            const availableModels = listData.models
                .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
                .map(m => m.name.replace("models/", ""));

            for (const discoveredModel of availableModels) {
                if (candidates.some(c => c.model === discoveredModel)) continue;
                try {
                    return await tryModel(discoveredModel, 'v1beta');
                } catch (e) {
                    errors.push(`[Discovered] ${discoveredModel}: ${e.message}`);
                }
            }
        }
    } catch (e) { errors.push(`Auto-Discovery Error: ${e.message}`); }

    throw new Error("Chat unavailable temporarily. Please contact us via WhatsApp.");
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', initChatbot);
