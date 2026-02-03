import { auth, onAuthStateChanged, signOut } from './firebase-config.js';
import { escapeHtml } from './utils.js';

// Init Logic
const init = async () => {
    await loadHeader();
    loadFooter();
    // Initialize Theme Switcher after Header Load
    if (window.initTheme) window.initTheme(); // Assuming we export this, or just re-run the script logic?
    // Actually theme-switch.js runs on DOMContentLoaded. If header loads AFTER, the button isn't there.
    // We need to re-bind the listener.
    const evt = new Event('header-loaded');
    document.dispatchEvent(evt);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

async function loadHeader() {
    const headerContainer = document.getElementById('header-container');
    if (!headerContainer) return;

    // Base Header HTML
    let headerHTML = `
    <nav class="glass-nav sticky top-0 z-[100] transition-all duration-300" id="navbar">
        <div class="container mx-auto px-4 md:px-6 h-20 flex items-center justify-between">
            <a href="index.html" class="text-2xl font-bold font-heading tracking-tighter flex items-center gap-2 group">
                <div class="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300 shadow-md">
                    <span class="text-white dark:text-black text-lg">B</span>
                </div>
                <span class="text-primary">Buddika Stores</span>
            </a>

            <!-- Desktop Menu -->
            <div class="hidden md:flex space-x-8">
                <a href="index.html" class="nav-link text-sm font-bold uppercase tracking-wide text-secondary hover:text-primary transition-colors relative">Home</a>
                <a href="products.html" class="nav-link text-sm font-bold uppercase tracking-wide text-secondary hover:text-primary transition-colors relative">Shop</a>
                <a href="about.html" class="nav-link text-sm font-bold uppercase tracking-wide text-secondary hover:text-primary transition-colors relative">About</a>
                <a href="contact.html" class="nav-link text-sm font-bold uppercase tracking-wide text-secondary hover:text-primary transition-colors relative">Contact</a>
            </div>

            <!-- Icons -->
            <div class="flex items-center space-x-4">
                <!-- Search Bar -->
                <div class="relative hidden lg:block group mr-2">
                    <input type="text" 
                        onkeypress="handleSearch(event)"
                        placeholder="Search items..." 
                        class="bg-gray-100 dark:bg-white/10 border border-transparent dark:border-white/10 rounded-full py-2 px-4 pl-10 text-sm text-primary placeholder-gray-500 focus:ring-2 focus:ring-black/5 dark:focus:ring-white/20 w-48 transition-all group-hover:w-64">
                    <svg class="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>

                <!-- Cart -->
                <button onclick="openCart()" class="relative group">
                   <div class="icon-glass-btn group-hover:bg-primary group-hover:text-white transition-colors">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                   </div>
                   <span id="cart-count" class="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center hidden shadow-sm border-2 border-white dark:border-black">0</span>
                </button>

                <!-- Auth Section (Dynamic) -->
                <div id="auth-section" class="relative">
                    <!-- Default: Login Button -->
                    <a href="login.html" class="hidden md:flex items-center space-x-2 bg-white text-black px-5 py-2 rounded-full hover:bg-gray-200 transition-transform active:scale-95 shadow-lg shadow-white/10">
                        <span class="text-xs font-bold uppercase tracking-wider">Log In</span>
                    </a>
                </div>
            
                <!-- Theme Toggle -->
                <button id="theme-toggle" class="icon-glass-btn group" aria-label="Toggle Theme">
                    <svg class="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z">
                        </path>
                    </svg>
                </button>

                <!-- Mobile Menu Button -->
                <button onclick="toggleMobileMenu()" class="md:hidden icon-glass-btn text-primary">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
                </button>
            </div>
        </div>

        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden bg-[#0d0221]/95 backdrop-blur-xl border-t border-white/10 absolute w-full left-0 top-20 shadow-xl">
            <a href="index.html" class="block py-4 px-6 text-sm font-bold text-white border-b border-white/5 hover:bg-white/5">HOME</a>
            <a href="products.html" class="block py-4 px-6 text-sm font-bold text-white border-b border-white/5 hover:bg-white/5">PRODUCTS</a>
            <a href="contact.html" class="block py-4 px-6 text-sm font-bold text-white hover:bg-white/5">CONTACT</a>
        </div>
    </nav>
    `;

    // Append to container
    headerContainer.innerHTML = headerHTML + `
    <!-- Mobile Bottom Nav -->
    <div class="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-[#0d0221]/90 backdrop-blur-lg border-t border-white/10 flex justify-around items-center shadow-[0_-5px_15px_rgba(0,0,0,0.2)]">
        <a href="index.html" class="flex flex-col items-center justify-center text-gray-400 hover:text-white w-full h-full">
            <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span class="text-[10px] font-bold uppercase tracking-wide">Home</span>
        </a>
        <a href="products.html" class="flex flex-col items-center justify-center text-gray-400 hover:text-white w-full h-full">
            <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            <span class="text-[10px] font-bold uppercase tracking-wide">Shop</span>
        </a>
        <button onclick="openCart()" class="flex flex-col items-center justify-center text-gray-400 hover:text-white w-full h-full relative">
            <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            <span class="text-[10px] font-bold uppercase tracking-wide">Cart</span>
            <span id="mobile-cart-count" class="absolute top-2 right-6 bg-purple-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center hidden shadow-sm">0</span>
        </button>
        <a href="login.html" class="flex flex-col items-center justify-center text-gray-400 hover:text-white w-full h-full">
            <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            <span class="text-[10px] font-bold uppercase tracking-wide">Profile</span>
        </a>
    </div>`;

    // Listen for Auth Changes
    onAuthStateChanged(auth, (user) => {
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        if (user) {
            // User is signed in
            const photoURL = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=000000&color=fff`;
            authSection.innerHTML = `
                    <div class="relative group cursor-pointer">
                        <div onclick="toggleProfileDropdown()" class="flex items-center gap-2">
                            <img src="${photoURL}" class="w-10 h-10 rounded-full border-2 border-gray-100" />
                        </div>
                        
                        <!-- Dropdown -->
                        <div id="profile-dropdown" class="absolute right-0 top-full mt-2 w-48 bg-white shadow-xl rounded-xl py-2 hidden group-hover:block border border-gray-100 animate-fade-in-up">
                            <div class="px-4 py-2 border-b border-gray-50">
                                <p class="text-xs font-bold text-gray-900 truncate">${escapeHtml(user.displayName) || 'My Account'}</p>
                                <p class="text-[10px] text-gray-500 truncate">${escapeHtml(user.email)}</p>
                            </div>
                            <a href="profile.html" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Profile</a>
                            <a href="profile.html#orders" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Orders</a>
                            <button onclick="handleLogout()" class="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 font-bold border-t border-gray-50">Log Out</button>
                        </div>
                    </div>
                `;

            // Update Mobile Menu Profile Link
            const mobileProfile = document.querySelector('a[href="login.html"]'); // Select by href
            if (mobileProfile) {
                mobileProfile.href = "profile.html";
                mobileProfile.innerHTML = `
                        <div class="w-6 h-6 rounded-full overflow-hidden mb-1 border border-gray-300">
                             <img src="${photoURL}" class="w-full h-full object-cover">
                        </div>
                        <span class="text-[10px] font-bold uppercase tracking-wide">Me</span>
                     `;
            }

            // Re-attach listeners for dynamic content
            window.toggleProfileDropdown = () => {
                const dropdown = document.getElementById('profile-dropdown');
                if (dropdown) dropdown.classList.toggle('hidden');
            };

            window.handleLogout = () => {
                signOut(auth).then(() => {
                    window.location.href = 'index.html';
                });
            };
        } else {
            // User is signed out
            authSection.innerHTML = `
                    <a href="login.html" class="hidden md:flex items-center space-x-2 bg-black text-white px-5 py-2 rounded-full hover:bg-gray-800 transition-transform active:scale-95 shadow-lg shadow-gray-200">
                        <span class="text-xs font-bold uppercase tracking-wider">Log In</span>
                    </a>
                `;

            // Reset Mobile Menu
            const mobileProfile = document.querySelector('a[href="profile.html"]');
            if (mobileProfile) {
                mobileProfile.href = "login.html";
                mobileProfile.innerHTML = `
                        <svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                        <span class="text-[10px] font-bold uppercase tracking-wide">Profile</span>
                     `;
            }
        }
    });

    // Mobile Menu Toggle Logic
    window.toggleMobileMenu = function () {
        const menu = document.getElementById('mobile-menu');
        if (menu) {
            menu.classList.toggle('hidden');
        }
    }
}

function loadFooter() {
    const footerHTML = `
        <footer class="text-white pt-16 pb-8">
            <div class="container mx-auto px-4 md:px-6">
                <div class="grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div class="col-span-1 md:col-span-2">
                        <h3 class="text-2xl font-bold tracking-tighter mb-4">BUDDIKA STORES</h3>
                        <p class="text-gray-400 text-sm leading-relaxed max-w-sm">
                            Your trusted local partner for retail, grocery, stationery, and daily news. Serving the community with quality and dedication.
                        </p>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">Explore</h4>
                        <ul class="space-y-3">
                            <li><a href="index.html" class="text-sm text-gray-300 hover:text-white transition-colors">Home</a></li>
                            <li><a href="about.html" class="text-sm text-gray-300 hover:text-white transition-colors">About Us</a></li>
                            <li><a href="products.html" class="text-sm text-gray-300 hover:text-white transition-colors">Products</a></li>
                            <li><a href="contact.html" class="text-sm text-gray-300 hover:text-white transition-colors">Contact</a></li>
                            <!-- Link Removed -->
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">Contact</h4>
                        <ul class="space-y-3">
                            <li class="flex items-start text-sm text-gray-300">
                                <span class="block">Buddika stores, No 48,<br>Kandy Road, Walapane</span>
                            </li>
                            <li><a href="tel:0522279101" class="text-sm text-gray-300 hover:text-white transition-colors">Landline: 052-2279101</a></li>
                            <li><a href="tel:0775192756" class="text-sm text-gray-300 hover:text-white transition-colors">WhatsApp: 077-5192756</a></li>
                            <li><a href="tel:0784668883" class="text-sm text-gray-300 hover:text-white transition-colors">Voice: 0784668883</a></li>
                            <li><a href="mailto:info@buddikastores.com" class="text-sm text-gray-300 hover:text-white transition-colors">info@buddikastores.com</a></li>
                        </ul>
                    </div>
                </div>
                <div class="border-t border-gray-900 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center">
                    <p class="text-xs text-gray-600">&copy; ${new Date().getFullYear()} Buddika Stores. All rights reserved.</p>
                </div>
            </div>
        </footer>
        `;

    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) footerContainer.innerHTML = footerHTML;
}

function handleSearch(event) {
    if (event.key === 'Enter') {
        const query = event.target.value;
        if (query.trim()) {
            window.location.href = `products.html?search=${encodeURIComponent(query)}`;
        }
    }
}

// Make global
window.handleSearch = handleSearch;
