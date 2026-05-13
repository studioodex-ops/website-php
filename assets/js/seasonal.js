// ============================================
// BUDDIKA STORES - SEASONAL THEME ENGINE
// Sri Lankan Festival Auto-Theming System
// ============================================

import { db, doc, getDoc, onSnapshot } from './firebase-config.js';

// --- Default Season Config (hardcoded fallback) ---
const DEFAULT_SEASONS = {
    newyear: {
        id: 'newyear',
        name: 'Sinhala & Tamil New Year',
        nameLocal: 'අලුත් අවුරුදු කාලය',
        active: true,
        startMonth: 4, startDay: 1,
        endMonth: 4, endDay: 20,
        colors: {
            light: {
                'accent-color': '#d4a017',
                'bg-body': '#fef9ef',
                'bg-card': 'rgba(255, 248, 230, 0.65)',
                'text-primary': '#3d1f00',
                'season-primary': '#d4a017',
                'season-secondary': '#c0392b'
            },
            dark: {
                'accent-color': '#f5c518',
                'bg-body': '#1a1000',
                'bg-card': 'rgba(40, 28, 0, 0.6)',
                'text-primary': '#fef3c7',
                'season-primary': '#f5c518',
                'season-secondary': '#e74c3c'
            }
        },
        bannerImage: 'assets/img/seasons/banner-newyear.png',
        heroTitle: 'Happy New Year!',
        heroSubtitle: 'අලුත් අවුරුදු සුභ පැතුම්!',
        heroBadge: 'New Year Offers',
        decorations: true,
        decorationType: 'sparkles',
        productKeywords: ['new year', 'avurudu', 'sweets', 'gifts', 'kevum', 'kokis'],
        priority: 10
    },
    wesak: {
        id: 'wesak',
        name: 'Wesak',
        nameLocal: 'වෙසක්',
        active: true,
        startMonth: 5, startDay: 1,
        endMonth: 5, endDay: 31,
        colors: {
            light: {
                'accent-color': '#b8860b',
                'bg-body': '#fffcf0',
                'bg-card': 'rgba(255, 252, 240, 0.65)',
                'text-primary': '#2c1810',
                'season-primary': '#f5c518',
                'season-secondary': '#1a3a6b'
            },
            dark: {
                'accent-color': '#f5c518',
                'bg-body': '#0d0d1a',
                'bg-card': 'rgba(20, 20, 40, 0.6)',
                'text-primary': '#ffeedd',
                'season-primary': '#f5c518',
                'season-secondary': '#4a90d9'
            }
        },
        bannerImage: 'assets/img/seasons/banner-wesak.png',
        heroTitle: 'Wesak Blessings',
        heroSubtitle: 'සුභ වෙසක් පැතුම්!',
        heroBadge: 'Wesak Special',
        decorations: true,
        decorationType: 'wesak_lanterns',
        productKeywords: ['wesak', 'lantern', 'tissue', 'oil lamp', 'bud', 'pandol'],
        priority: 20
    },
    poson: {
        id: 'poson',
        name: 'Poson',
        nameLocal: 'පොසොන්',
        active: true,
        startMonth: 6, startDay: 1,
        endMonth: 6, endDay: 30,
        colors: {
            light: {
                'accent-color': '#228B22',
                'bg-body': '#f0fff0',
                'bg-card': 'rgba(240, 255, 240, 0.65)',
                'text-primary': '#1a3a1a',
                'season-primary': '#228B22',
                'season-secondary': '#daa520'
            },
            dark: {
                'accent-color': '#32CD32',
                'bg-body': '#0a1a0a',
                'bg-card': 'rgba(15, 30, 15, 0.6)',
                'text-primary': '#e0ffe0',
                'season-primary': '#32CD32',
                'season-secondary': '#ffd700'
            }
        },
        bannerImage: 'assets/img/seasons/banner-poson.png',
        heroTitle: 'Poson Poya',
        heroSubtitle: 'සුභ පොසොන් පැතුම්!',
        heroBadge: 'Poson Special',
        decorations: true,
        decorationType: 'lanterns',
        productKeywords: ['poson', 'lantern', 'flower', 'milky'],
        priority: 25
    },
    christmas: {
        id: 'christmas',
        name: 'Christmas',
        nameLocal: 'නත්තල්',
        active: true,
        startMonth: 12, startDay: 1,
        endMonth: 12, endDay: 31,
        colors: {
            light: {
                'accent-color': '#c41e3a',
                'bg-body': '#fff5f5',
                'bg-card': 'rgba(255, 245, 245, 0.65)',
                'text-primary': '#2d0a0a',
                'season-primary': '#c41e3a',
                'season-secondary': '#228B22'
            },
            dark: {
                'accent-color': '#ff4757',
                'bg-body': '#1a0505',
                'bg-card': 'rgba(30, 10, 10, 0.6)',
                'text-primary': '#ffe0e0',
                'season-primary': '#ff4757',
                'season-secondary': '#2ecc71'
            }
        },
        bannerImage: 'assets/img/seasons/banner-christmas.png',
        heroTitle: 'Merry Christmas!',
        heroSubtitle: 'සුභ නත්තල්!',
        heroBadge: 'Christmas Offers',
        decorations: true,
        decorationType: 'christmas_lights',
        productKeywords: ['christmas', 'cake', 'card', 'decoration', 'tree', 'gift'],
        priority: 30
    },
    independence: {
        id: 'independence',
        name: 'Independence Day',
        nameLocal: 'නිදහස් දිනය',
        active: true,
        startMonth: 2, startDay: 1,
        endMonth: 2, endDay: 4,
        colors: {
            light: {
                'accent-color': '#003399',
                'bg-body': '#f0f4ff',
                'bg-card': 'rgba(240, 244, 255, 0.65)',
                'text-primary': '#0a0a2e',
                'season-primary': '#003399',
                'season-secondary': '#c8a000'
            },
            dark: {
                'accent-color': '#4a90d9',
                'bg-body': '#05051a',
                'bg-card': 'rgba(10, 10, 30, 0.6)',
                'text-primary': '#e0e8ff',
                'season-primary': '#4a90d9',
                'season-secondary': '#ffd700'
            }
        },
        bannerImage: 'assets/img/seasons/banner-independence.png',
        heroTitle: 'Independence Day',
        heroSubtitle: 'නිදහස් දින සුභ පැතුම්!',
        heroBadge: 'National Day',
        decorations: true,
        decorationType: 'flags',
        productKeywords: ['flag', 'independence', 'national', 'decoration'],
        priority: 5
    }
};

// --- State ---
let currentSeason = null;
let seasonConfig = null;
let originalBanner = null; // Store original hero values for restoration

const CACHE_KEY = 'buddika_season_config';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// --- Fetch Season Config from Firebase + localStorage cache ---
async function fetchSeasonConfig() {
    // Try localStorage cache first (instant application)
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                seasonConfig = data;
                console.log('[Seasonal] Using cached config');
                return data;
            }
        }
    } catch (e) { /* ignore */ }

    // Fetch from Firebase
    try {
        if (!db) {
            console.warn('[Seasonal] Firebase db not initialized, using defaults');
            seasonConfig = { seasons: DEFAULT_SEASONS, forceSeason: '' };
            return seasonConfig;
        }

        const docRef = doc(db, 'settings', 'seasonal_config');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists() && docSnap.data().seasons) {
            seasonConfig = docSnap.data();
            console.log('[Seasonal] Loaded config from Firebase');
        } else {
            // No config in Firebase yet - use defaults
            seasonConfig = { seasons: DEFAULT_SEASONS, forceSeason: '' };
            console.log('[Seasonal] No Firebase config, using defaults');
        }

        // Cache to localStorage
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            data: seasonConfig,
            timestamp: Date.now()
        }));

        return seasonConfig;
    } catch (e) {
        console.error('[Seasonal] Error fetching config:', e);
        seasonConfig = { seasons: DEFAULT_SEASONS, forceSeason: '' };
        return seasonConfig;
    }
}

// --- Detect Current Season by Date ---
function detectCurrentSeason(config) {
    if (!config || !config.seasons) return null;

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // JS months are 0-indexed
    const currentDay = now.getDate();

    // Check URL parameter forceSeason first (admin preview link)
    const urlParams = new URLSearchParams(window.location.search);
    const urlForce = urlParams.get('forceSeason');
    if (urlForce && config.seasons[urlForce]) {
        console.log('[Seasonal] URL forceSeason override:', urlForce);
        return config.seasons[urlForce];
    }

    // Check forceSeason from Firebase config (admin override for preview)
    if (config.forceSeason && config.seasons[config.forceSeason]) {
        const forced = config.seasons[config.forceSeason];
        if (forced.active) return forced;
    }

    // Auto-detect by date
    let matchedSeasons = [];

    Object.values(config.seasons).forEach(season => {
        if (!season.active) return;

        const { startMonth, startDay, endMonth, endDay } = season;

        if (startMonth === endMonth) {
            // Same month range (e.g., May 1-31)
            if (currentMonth === startMonth && currentDay >= startDay && currentDay <= endDay) {
                matchedSeasons.push(season);
            }
        } else if (startMonth < endMonth) {
            // Cross-month range (e.g., Apr 1 - Apr 20 → same month, but this handles multi-month too)
            if ((currentMonth === startMonth && currentDay >= startDay) ||
                (currentMonth === endMonth && currentDay <= endDay) ||
                (currentMonth > startMonth && currentMonth < endMonth)) {
                matchedSeasons.push(season);
            }
        } else {
            // Year wrap (e.g., Dec 1 - Jan 5)
            if ((currentMonth === startMonth && currentDay >= startDay) ||
                (currentMonth === endMonth && currentDay <= endDay) ||
                currentMonth > startMonth || currentMonth < endMonth) {
                matchedSeasons.push(season);
            }
        }
    });

    // If multiple seasons match, pick highest priority
    if (matchedSeasons.length > 1) {
        matchedSeasons.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    return matchedSeasons[0] || null;
}

// --- Inject Seasonal CSS Variables ---
function injectSeasonalCSS(season) {
    let styleEl = document.getElementById('seasonal-override');

    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'seasonal-override';
        document.head.appendChild(styleEl);
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const colorSet = isDark ? (season.colors.dark || {}) : (season.colors.light || {});
    const seasonId = season.id;

    let css = `/* Seasonal override: ${season.name} */\n`;

    // Light mode overrides
    const lightColors = season.colors.light || {};
    css += `[data-season="${seasonId}"]:root {\n`;
    Object.entries(lightColors).forEach(([prop, value]) => {
        css += `  --${prop}: ${value};\n`;
    });
    css += '}\n\n';

    // Dark mode overrides
    const darkColors = season.colors.dark || {};
    css += `[data-theme='dark'][data-season="${seasonId}"] {\n`;
    Object.entries(darkColors).forEach(([prop, value]) => {
        css += `  --${prop}: ${value};\n`;
    });
    css += '}\n';

    styleEl.textContent = css;
}

// --- Swap Hero Banner ---
function swapHeroBanner(season) {
    const bannerImg = document.getElementById('hero-banner-img');
    const badge = document.getElementById('hero-badge');
    const title = document.getElementById('hero-title');
    const subtitle = document.getElementById('hero-subtitle');

    if (!bannerImg) return; // Not on index.html

    // Store originals on first call
    if (!originalBanner) {
        originalBanner = {
            imgSrc: bannerImg.src,
            badgeText: badge ? badge.textContent : '',
            titleHTML: title ? title.innerHTML : '',
            subtitleText: subtitle ? subtitle.textContent : ''
        };
    }

    // Apply season
    if (season.bannerImage) {
        bannerImg.src = season.bannerImage;
        bannerImg.onerror = () => { bannerImg.src = originalBanner.imgSrc; };
    }
    if (badge) badge.textContent = season.heroBadge || '';
    if (title) title.innerHTML = (season.heroTitle || '').replace('!', '!<br>');
    if (subtitle) subtitle.textContent = season.heroSubtitle || '';
}

// --- Restore Original Banner ---
function restoreBanner() {
    if (!originalBanner) return;

    const bannerImg = document.getElementById('hero-banner-img');
    const badge = document.getElementById('hero-badge');
    const title = document.getElementById('hero-title');
    const subtitle = document.getElementById('hero-subtitle');

    if (bannerImg) bannerImg.src = originalBanner.imgSrc;
    if (badge) badge.textContent = originalBanner.badgeText;
    if (title) title.innerHTML = originalBanner.titleHTML;
    if (subtitle) subtitle.textContent = originalBanner.subtitleText;
}

// --- Wesak Lantern SVG ---
function getWesakLanternSVG(size = 40) {
    return `<svg width="${size}" height="${size * 1.5}" viewBox="0 0 40 60" class="lantern">
        <line x1="20" y1="0" x2="20" y2="10" stroke="#b8860b" stroke-width="1.5"/>
        <polygon points="12,10 28,10 30,15 10,15" fill="#f5c518" stroke="#b8860b" stroke-width="0.5"/>
        <polygon points="10,15 30,15 26,40 14,40" fill="#ffd700" stroke="#b8860b" stroke-width="0.5" opacity="0.9"/>
        <polygon points="14,40 26,40 28,45 12,45" fill="#f5c518" stroke="#b8860b" stroke-width="0.5"/>
        <line x1="20" y1="45" x2="20" y2="55" stroke="#b8860b" stroke-width="1"/>
        <circle cx="20" cy="57" r="2" fill="#ff6b00"/>
    </svg>`;
}

// --- Christmas Light SVG ---
function getChristmasLightsHTML() {
    const colors = ['#ff0000', '#00ff00', '#ffd700', '#0066ff', '#ff6600'];
    let html = '<div class="christmas-lights">';
    for (let i = 0; i < 20; i++) {
        const color = colors[i % colors.length];
        html += `<div class="christmas-light" style="background:${color};box-shadow:0 0 6px ${color}"></div>`;
    }
    html += '</div>';
    return html;
}

// --- Sparkle SVG (New Year) ---
function getSparkleSVG(size = 20) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" class="sparkle">
        <polygon points="10,0 12,8 20,10 12,12 10,20 8,12 0,10 8,8" fill="#ffd700" opacity="0.8"/>
    </svg>`;
}

// --- Flag SVG (Independence) ---
function getFlagSVG(size = 30) {
    return `<svg width="${size}" height="${size * 0.6}" viewBox="0 0 30 18" class="flag">
        <rect width="30" height="6" fill="#003399"/>
        <rect y="6" width="30" height="6" fill="#daa520"/>
        <rect y="12" width="30" height="6" fill="#003399"/>
        <rect y="7" width="30" height="4" fill="#8B0000"/>
    </svg>`;
}

// --- Generic Lantern SVG (Poson) ---
function getLanternSVG(size = 35) {
    return `<svg width="${size}" height="${size * 1.3}" viewBox="0 0 35 45" class="lantern">
        <line x1="17.5" y1="0" x2="17.5" y2="8" stroke="#228B22" stroke-width="1.5"/>
        <polygon points="10,8 25,8 27,12 8,12" fill="#228B22" stroke="#1a6b1a" stroke-width="0.5"/>
        <polygon points="8,12 27,12 23,35 12,35" fill="#90EE90" stroke="#228B22" stroke-width="0.5" opacity="0.85"/>
        <polygon points="12,35 23,35 25,39 10,39" fill="#228B22" stroke="#1a6b1a" stroke-width="0.5"/>
        <line x1="17.5" y1="39" x2="17.5" y2="45" stroke="#228B22" stroke-width="1"/>
    </svg>`;
}

// --- Inject Decorations ---
function injectDecorations(season) {
    const container = document.getElementById('seasonal-decoration');
    if (!container || !season.decorations) return;

    container.innerHTML = ''; // Clear previous

    switch (season.decorationType) {
        case 'wesak_lanterns':
            container.innerHTML = getWesakLanternSVG(45) + getWesakLanternSVG(35) + getWesakLanternSVG(50) + getWesakLanternSVG(30);
            break;

        case 'lanterns':
            container.innerHTML = getLanternSVG(40) + getLanternSVG(30) + getLanternSVG(45);
            break;

        case 'christmas_lights':
            container.innerHTML = getChristmasLightsHTML();
            break;

        case 'sparkles':
            container.innerHTML = getSparkleSVG(18) + getSparkleSVG(24) + getSparkleSVG(15) + getSparkleSVG(20) + getSparkleSVG(22);
            break;

        case 'flags':
            container.innerHTML = getFlagSVG(35) + getFlagSVG(28);
            break;

        default:
            break;
    }
}

// --- Apply Season ---
function applySeason(season) {
    if (!season) {
        clearSeason();
        return;
    }

    currentSeason = season;
    window.currentSeason = season; // Expose for promotions.js

    // Set data-season attribute
    document.documentElement.setAttribute('data-season', season.id);

    // Inject CSS variables
    injectSeasonalCSS(season);

    // Swap hero banner (index.html only)
    swapHeroBanner(season);

    // Inject decorations
    injectDecorations(season);

    // Update seasonal promo badge
    const promoBadge = document.getElementById('seasonal-promo-badge');
    if (promoBadge && season.heroBadge) {
        promoBadge.textContent = season.heroBadge;
        promoBadge.classList.remove('hidden');
    }

    console.log(`[Seasonal] Applied: ${season.name} (${season.nameLocal || ''})`);
}

// --- Clear Season (revert to default) ---
function clearSeason() {
    currentSeason = null;
    window.currentSeason = null;

    // Remove data-season attribute
    document.documentElement.removeAttribute('data-season');

    // Remove injected CSS
    const styleEl = document.getElementById('seasonal-override');
    if (styleEl) styleEl.remove();

    // Restore original banner
    restoreBanner();

    // Clear decorations
    const container = document.getElementById('seasonal-decoration');
    if (container) container.innerHTML = '';

    // Hide promo badge
    const promoBadge = document.getElementById('seasonal-promo-badge');
    if (promoBadge) promoBadge.classList.add('hidden');

    console.log('[Seasonal] Cleared - back to default theme');
}

// --- Watch for Theme Changes (dark/light toggle) ---
function watchThemeChanges() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.attributeName === 'data-theme' && currentSeason) {
                // Re-inject CSS with correct theme colors
                injectSeasonalCSS(currentSeason);
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });
}

// --- Listen for Real-time Firebase Updates ---
function listenForConfigChanges() {
    if (!db) return;

    try {
        const configRef = doc(db, 'settings', 'seasonal_config');
        onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                seasonConfig = docSnap.data();
                console.log('[Seasonal] Config updated from Firebase');

                // Update cache
                localStorage.setItem(CACHE_KEY, JSON.stringify({
                    data: seasonConfig,
                    timestamp: Date.now()
                }));

                // Re-detect and apply
                const newSeason = detectCurrentSeason(seasonConfig);
                if (newSeason?.id !== currentSeason?.id) {
                    applySeason(newSeason);
                }
            }
        }, (error) => {
            console.warn('[Seasonal] onSnapshot error:', error);
        });
    } catch (e) {
        console.warn('[Seasonal] Could not set up listener:', e);
    }
}

// --- Initialize ---
async function init() {
    console.log('[Seasonal] Initializing...');

    // Fetch config
    await fetchSeasonConfig();

    // Detect current season
    const season = detectCurrentSeason(seasonConfig);

    if (season) {
        applySeason(season);
    } else {
        console.log('[Seasonal] No active season - using default theme');
    }

    // Watch for dark/light theme changes
    watchThemeChanges();

    // Listen for real-time config changes
    listenForConfigChanges();
}

// --- Start ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
