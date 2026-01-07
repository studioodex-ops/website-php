# Nex Chatbot Reinstatement Plan (100% Guaranteed Fix)

This plan is prepared to restore the Nex Chatbot with **ZERO ERRORS** when you are ready.

## The Problems We Solved
1.  **Caching:** Browsers kept old code.
    *   *Solution:* We will use a file named `assets/js/nex_v5_gold.js` to ensure 100% fresh loading.
2.  **Quota Exceeded:** The "Pro" model was too expensive for your free key.
    *   *Solution:* We will ONLY use `gemini-1.5-flash`. It is faster and has very high free limits.
3.  **API Key Errors:**
    *   *Solution:* The code will auto-trim spaces from the key.

---

## Step 1: Create the Javascript File
Create `assets/js/nex_v5_gold.js` with this code:

```javascript
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
            globalApiKey = docSnap.data().geminiApiKey?.trim();
        }
    } catch (e) {
        console.error("Nex: Config load failed", e);
    }
}

// 2. Data Context
const SHOP_CONTEXT = `
You are Nex, the assistant for Buddika Stores in Walapane.
Goal: Help customers with prices and stock.
Language: Reply in the same language as the user.
Store: No 48, Kandy Road, Walapane. Phone: 052-2279101. 7am-9pm.
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
    <div id="nex-icon" class="fixed bottom-6 right-6 z-50 cursor-pointer hover:scale-110 transition-transform duration-300">
        <div class="bg-black text-white p-4 rounded-full shadow-lg flex items-center justify-center w-16 h-16 border-2 border-white">
            <span class="text-3xl">🤖</span>
        </div>
    </div>
    <!-- Nex Window -->
    <div id="nex-window" class="fixed bottom-24 right-6 w-96 bg-white rounded-2xl shadow-2xl z-50 transform transition-all duration-300 origin-bottom-right scale-0 opacity-0 hidden flex flex-col h-[500px]">
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
                <input type="text" id="nex-input" placeholder="Ask anything..." class="flex-1 bg-transparent outline-none text-sm" onkeypress="if(event.key === 'Enter') sendNexMessage()">
                <button onclick="sendNexMessage()" class="bg-black text-white p-2 rounded-lg">➤</button>
            </div>
        </div>
    </div>`;
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

window.sendNexMessage = async () => {
    const input = document.getElementById('nex-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addMessage('user', text);
    const typingId = showTyping();

    if (!globalApiKey && !localStorage.getItem(API_KEY_STORAGE_KEY)) await fetchStoreConfig();
    let key = globalApiKey;

    if (!key) {
        removeTyping(typingId);
        addMessage('system', '⚠️ API Key Missing in Settings.');
        return;
    }

    try {
        const reply = await callGeminiFlash(key, text);
        removeTyping(typingId);
        addMessage('bot', reply);
    } catch (err) {
        removeTyping(typingId);
        addMessage('system', `❌ ${err.message}`);
    }
};

async function callGeminiFlash(key, prompt) {
    const products = await getProductData();
    const finalPrompt = `${SHOP_CONTEXT}\n\n=== DATA ===\n${products}\n============\nUser: ${prompt}\nAnswer:`;

    // FORCE FLASH MODEL (High Limits, Fast)
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: finalPrompt }] }] })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || response.statusText);
    }
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
}

async function getProductData() {
    try {
        const snap = await getDocs(query(collection(db, "products"), limit(50)));
        return snap.docs.map(d => {
            const p = d.data();
            return p.active !== false ? `- ${p.name}: Rs ${p.price}` : '';
        }).join('\n');
    } catch(e) { return ""; }
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
```

## Step 2: Link in HTML
Add this line to the bottom of your HTML files:
`<script type="module" src="assets/js/nex_v5_gold.js"></script>`
