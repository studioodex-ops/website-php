// ============================================
// BUDDIKA STORES - COMMUNITY EVENT HUB (JS)
// Map & Event Logic for Dansal Hub
// ============================================

import { db, auth, onAuthStateChanged } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    onSnapshot,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Configuration ---
const WALAPANE_COORDS = [7.0873, 80.8014]; // Town Center
let map = null;
let markers = [];
let events = [];
let currentFilter = 'all';

// --- Initialization ---
async function init() {
    console.log('[Events] Hub Initializing...');
    
    // 1. Initialize Map
    initMap();
    
    // 2. Listen for Real-time Updates
    listenToEvents();
    
    // 3. Setup UI Listeners
    setupListeners();
}

// --- Map Logic ---
function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    map = L.map('map').setView(WALAPANE_COORDS, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Custom Icon Factory
    const createIcon = (type) => {
        let color = '#3b82f6'; // Default Blue
        if (type === 'rice') color = '#ef4444';
        if (type === 'drinks') color = '#10b981';
        if (type === 'ice_cream') color = '#f59e0b';

        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="w-8 h-8 rounded-full shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform" style="background: ${color}; border: 2px solid white;">
                        <span class="text-white text-xs">${getEmoji(type)}</span>
                    </div>
                    <div class="absolute -bottom-1 w-2 h-2 rotate-45" style="background: ${color}"></div>
                </div>
            `,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });
    };

    window.createEventIcon = createIcon;
}

function getEmoji(type) {
    const emojis = {
        'rice': '🍚',
        'drinks': '🥤',
        'ice_cream': '🍦',
        'noodles': '🍜',
        'coffee': '☕',
        'other': '🏮'
    };
    return emojis[type] || '🏮';
}

// --- Data Logic ---
function listenToEvents() {
    if (!db) return;

    // Only show 'approved' events to public
    const eventsQuery = query(
        collection(db, 'events'), 
        where('status', 'in', ['approved', 'ongoing']),
        orderBy('createdAt', 'desc')
    );

    onSnapshot(eventsQuery, (snapshot) => {
        events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderEvents();
    }, (error) => {
        console.error('[Events] Error fetching events:', error);
        showErrorInList();
    });
}

// --- Render Logic ---
function renderEvents() {
    const listEl = document.getElementById('event-list');
    if (!listEl) return;

    // Filter events
    const filteredEvents = currentFilter === 'all' 
        ? events 
        : events.filter(e => e.type === currentFilter);

    // Clear existing
    listEl.innerHTML = '';
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    if (filteredEvents.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <p class="font-bold">No events found</p>
                <p class="text-xs">Be the first to submit an event!</p>
            </div>
        `;
        return;
    }

    filteredEvents.forEach(event => {
        // Add to List
        const card = createEventCard(event);
        listEl.appendChild(card);

        // Add to Map
        if (event.location) {
            const marker = L.marker([event.location.lat, event.location.lng], {
                icon: window.createEventIcon(event.type)
            }).addTo(map);

            marker.bindPopup(`
                <div class="p-1">
                    <h3 class="font-bold text-sm mb-1">${event.name}</h3>
                    <p class="text-[10px] text-gray-500 mb-2">${event.address}</p>
                    <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold uppercase">
                        ${event.type}
                    </span>
                </div>
            `);
            
            markers.push(marker);
        }
    });

    // If search active, further filter
    const searchVal = document.getElementById('event-search')?.value.toLowerCase();
    if (searchVal) {
        // ... handled by a separate search listener usually
    }
}

function createEventCard(event) {
    const div = document.createElement('div');
    div.className = 'event-card glass-panel p-4 rounded-xl border border-gray-100 dark:border-white/5 cursor-pointer hover:border-amber-500 transition-all';
    
    const dateStr = event.date ? new Date(event.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Soon';
    const statusColor = event.status === 'ongoing' ? 'bg-green-500' : 'bg-blue-500';

    div.innerHTML = `
        <div class="flex gap-4">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gray-50 dark:bg-white/5">
                ${getEmoji(event.type)}
            </div>
            <div class="flex-1">
                <div class="flex justify-between items-start mb-1">
                    <h4 class="font-bold text-sm">${event.name}</h4>
                    <span class="text-[10px] font-bold text-gray-400">${dateStr}</span>
                </div>
                <p class="text-[11px] text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">${event.address}</p>
                <div class="flex items-center justify-between">
                    <span class="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400 text-[9px] font-bold uppercase">
                        ${event.type.replace('_', ' ')}
                    </span>
                    <span class="flex items-center gap-1 text-[9px] font-bold text-gray-500">
                        <span class="w-1.5 h-1.5 rounded-full ${statusColor}"></span>
                        ${event.status.toUpperCase()}
                    </span>
                </div>
            </div>
        </div>
    `;

    div.onclick = () => {
        if (event.location && map) {
            map.setView([event.location.lat, event.location.lng], 16);
            // find marker and open popup
            const marker = markers.find(m => m.getLatLng().lat === event.location.lat);
            if (marker) marker.openPopup();
        }
    };

    return div;
}

// --- Interaction Logic ---
function setupListeners() {
    // Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-black', 'dark:bg-white', 'text-white', 'dark:text-black'));
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.add('bg-white', 'dark:bg-white/5', 'text-gray-900', 'dark:text-white'));
            
            btn.classList.add('active', 'bg-black', 'dark:bg-white', 'text-white', 'dark:text-black');
            btn.classList.remove('bg-white', 'dark:bg-white/5');
            
            currentFilter = btn.dataset.type;
            renderEvents();
        };
    });

    // Search
    const searchInput = document.getElementById('event-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            const val = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.event-card');
            cards.forEach(card => {
                const text = card.textContent.toLowerCase();
                card.style.display = text.includes(val) ? 'block' : 'none';
            });
        };
    }

    // Form Submission
    const form = document.getElementById('event-form');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            btn.textContent = 'Submitting...';

            try {
                // Approximate coordinates for Walapane Area (Randomize slightly around center)
                // In a real app, you'd use a map picker
                const lat = WALAPANE_COORDS[0] + (Math.random() - 0.5) * 0.01;
                const lng = WALAPANE_COORDS[1] + (Math.random() - 0.5) * 0.01;

                const eventData = {
                    name: document.getElementById('ev-name').value,
                    type: document.getElementById('ev-type').value,
                    date: document.getElementById('ev-date').value,
                    address: document.getElementById('ev-address').value,
                    description: document.getElementById('ev-desc').value,
                    status: 'pending', // Requires admin approval
                    location: { lat, lng },
                    createdAt: serverTimestamp(),
                    submittedBy: auth.currentUser ? auth.currentUser.email : 'Guest'
                };

                await addDoc(collection(db, 'events'), eventData);
                
                alert('Success! Your event has been submitted for approval.');
                form.reset();
                window.closeSubmitModal();
            } catch (err) {
                console.error(err);
                alert('Error submitting event. Please try again.');
            } finally {
                btn.disabled = false;
                btn.textContent = 'Submit for Approval';
            }
        };
    }
}

function showErrorInList() {
    const listEl = document.getElementById('event-list');
    if (listEl) {
        listEl.innerHTML = `<div class="text-center py-12 text-red-400 text-xs">Error loading events. Please refresh.</div>`;
    }
}

// --- Start ---
document.addEventListener('DOMContentLoaded', init);
window.initEventsHub = init;
