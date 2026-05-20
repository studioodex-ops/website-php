// ============================================
// BUDDIKA STORES - COMMUNITY EVENT HUB (JS)
// Map & Event Logic for Dansal Hub
// Using Google Maps tiles via Leaflet
// ============================================

import { 
    db, 
    auth, 
    onAuthStateChanged,
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    orderBy, 
    onSnapshot
} from './firebase-config.js';

// --- Configuration ---
const WALAPANE_COORDS = [7.0873, 80.8014]; // Town Center
let map = null;
let markers = [];
let events = [];
let currentFilter = 'all';
let submitPinMarker = null; // For the submission form map picker

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

    // Google Maps Tile Layer (Road Map)
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps'
    }).addTo(map);

    // Custom Icon Factory
    const createIcon = (type) => {
        let color = '#3b82f6'; // Default Blue
        if (type === 'rice') color = '#ef4444';
        if (type === 'drinks') color = '#10b981';
        if (type === 'ice_cream') color = '#f59e0b';
        if (type === 'noodles') color = '#8b5cf6';
        if (type === 'coffee') color = '#78350f';

        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="relative flex items-center justify-center">
                    <div class="w-10 h-10 rounded-full shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform" style="background: ${color}; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                        <span class="text-white text-sm">${getEmoji(type)}</span>
                    </div>
                    <div class="absolute -bottom-1.5 w-3 h-3 rotate-45" style="background: ${color}"></div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
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

// --- Initialize the map picker for submission form ---
function initSubmitMapPicker() {
    const pickerEl = document.getElementById('submit-map-picker');
    if (!pickerEl || pickerEl._leaflet_id) return; // Already initialized

    const pickerMap = L.map('submit-map-picker').setView(WALAPANE_COORDS, 14);

    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps'
    }).addTo(pickerMap);

    // Pin marker
    submitPinMarker = L.marker(WALAPANE_COORDS, { draggable: true }).addTo(pickerMap);

    // Update coordinates on drag
    submitPinMarker.on('dragend', function () {
        const pos = submitPinMarker.getLatLng();
        document.getElementById('ev-lat').value = pos.lat.toFixed(6);
        document.getElementById('ev-lng').value = pos.lng.toFixed(6);
    });

    // Click on map to move pin
    pickerMap.on('click', function (e) {
        submitPinMarker.setLatLng(e.latlng);
        document.getElementById('ev-lat').value = e.latlng.lat.toFixed(6);
        document.getElementById('ev-lng').value = e.latlng.lng.toFixed(6);
    });

    // Set initial coords
    document.getElementById('ev-lat').value = WALAPANE_COORDS[0].toFixed(6);
    document.getElementById('ev-lng').value = WALAPANE_COORDS[1].toFixed(6);

    // Fix map rendering after modal opens
    setTimeout(() => pickerMap.invalidateSize(), 300);
    
    window._submitPickerMap = pickerMap;
}

// --- Data Logic ---
function listenToEvents() {
    if (!db) return;

    // Only show 'approved' events to public
    const eventsQuery = query(
        collection(db, 'events'), 
        where('status', 'in', ['approved', 'ongoing'])
    );

    onSnapshot(eventsQuery, (snapshot) => {
        events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort in JS (robust against missing fields/index)
        events.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

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
        if (event.location && event.location.lat && event.location.lng) {
            const marker = L.marker([event.location.lat, event.location.lng], {
                icon: window.createEventIcon(event.type)
            }).addTo(map);

            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.location.lat},${event.location.lng}`;
            
            marker.bindPopup(`
                <div class="p-2 min-w-[200px]">
                    <h3 class="font-bold text-sm mb-1">${event.name}</h3>
                    <p class="text-[11px] text-gray-500 mb-1">📍 ${event.address}</p>
                    <p class="text-[10px] text-gray-400 mb-2">${event.date || ''}</p>
                    <span class="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold uppercase mb-2">
                        ${event.type.replace('_', ' ')}
                    </span>
                    <br>
                    <a href="${directionsUrl}" target="_blank" class="inline-flex items-center gap-1 mt-1 px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition-colors no-underline">
                        🧭 Get Directions
                    </a>
                </div>
            `);
            
            markers.push(marker);
        }
    });
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
            const marker = markers.find(m => {
                const ll = m.getLatLng();
                return Math.abs(ll.lat - event.location.lat) < 0.0001 && Math.abs(ll.lng - event.location.lng) < 0.0001;
            });
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
                // Get coordinates from the map picker
                const lat = parseFloat(document.getElementById('ev-lat')?.value) || WALAPANE_COORDS[0];
                const lng = parseFloat(document.getElementById('ev-lng')?.value) || WALAPANE_COORDS[1];

                const eventData = {
                    name: document.getElementById('ev-name').value,
                    type: document.getElementById('ev-type').value,
                    date: document.getElementById('ev-date').value,
                    address: document.getElementById('ev-address').value,
                    description: document.getElementById('ev-desc').value,
                    status: 'pending', // Requires admin approval
                    location: { lat, lng },
                    createdAt: new Date().toISOString(),
                    submittedBy: auth.currentUser ? (auth.currentUser.email || auth.currentUser.uid) : 'Guest'
                };

                await addDoc(collection(db, 'events'), eventData);
                
                alert('Success! Your event has been submitted for approval.');
                form.reset();
                window.closeSubmitModal();
            } catch (err) {
                console.error('[Events] Submission Error:', err);
                alert(`Error submitting event: ${err.message || 'Please try again'}`);
            } finally {
                btn.disabled = false;
                btn.textContent = 'Submit for Approval';
            }
        };
    }

    // Open submit modal — also init map picker
    const origOpen = window.openSubmitModal;
    window.openSubmitModal = () => {
        document.getElementById('submit-modal').classList.remove('hidden');
        setTimeout(() => {
            initSubmitMapPicker();
            if (window._submitPickerMap) window._submitPickerMap.invalidateSize();
        }, 350);
    };
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
