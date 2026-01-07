// FOMO Countdown Timer Module
// Fetches dates from Firebase and displays countdown timers

import { db, doc, getDoc } from './firebase-config.js';

(async function () {
    'use strict';

    // Default fallback dates (used if Firebase data not available)
    const DEFAULT_TIMERS = {
        'book-list-offer': {
            endDate: new Date('2026-01-09T23:59:59'),
            message: '⏰ Offer ends in:'
        },
        'bundles': {
            endDate: new Date('2026-01-07T23:59:59'),
            message: '🔥 Limited time:'
        }
    };

    let OFFER_TIMERS = { ...DEFAULT_TIMERS };

    // Fetch timer settings from Firebase
    async function fetchTimerSettings() {
        console.log('🔥 Fetching timer settings from Firebase...');
        try {
            const docRef = doc(db, "settings", "store_config");
            const docSnap = await getDoc(docRef);

            console.log('📄 Document exists:', docSnap.exists());

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log('📦 Full Firebase data:', data);
                console.log('⏰ countdownTimers:', data.countdownTimers);

                const timers = data.countdownTimers;

                if (timers) {
                    if (timers.bookListOffer) {
                        const newDate = new Date(timers.bookListOffer);
                        console.log('📚 Book List from Firebase:', timers.bookListOffer, '→', newDate);
                        OFFER_TIMERS['book-list-offer'].endDate = newDate;
                    } else {
                        console.log('⚠️ bookListOffer is empty/missing');
                    }
                    if (timers.bundles) {
                        const newDate = new Date(timers.bundles);
                        console.log('📦 Bundles from Firebase:', timers.bundles, '→', newDate);
                        OFFER_TIMERS['bundles'].endDate = newDate;
                    } else {
                        console.log('⚠️ bundles is empty/missing');
                    }
                } else {
                    console.log('⚠️ countdownTimers object is missing in Firebase');
                }
            } else {
                console.log('⚠️ No settings document found in Firebase');
            }
        } catch (e) {
            console.error('❌ Error fetching timer settings:', e);
        }
    }

    // Create countdown display
    function createCountdownHTML(containerId, config) {
        const container = document.getElementById(containerId);
        if (!container) return null;

        let timerEl = container.querySelector('.fomo-timer');
        if (!timerEl) {
            timerEl = document.createElement('div');
            timerEl.className = 'fomo-timer';
            timerEl.innerHTML = `
                <div class="fomo-timer-wrapper">
                    <span class="fomo-label">${config.message}</span>
                    <div class="fomo-countdown">
                        <div class="fomo-unit">
                            <span class="fomo-value" data-unit="days">00</span>
                            <span class="fomo-unit-label">Days</span>
                        </div>
                        <span class="fomo-separator">:</span>
                        <div class="fomo-unit">
                            <span class="fomo-value" data-unit="hours">00</span>
                            <span class="fomo-unit-label">Hours</span>
                        </div>
                        <span class="fomo-separator">:</span>
                        <div class="fomo-unit">
                            <span class="fomo-value" data-unit="minutes">00</span>
                            <span class="fomo-unit-label">Mins</span>
                        </div>
                        <span class="fomo-separator">:</span>
                        <div class="fomo-unit">
                            <span class="fomo-value" data-unit="seconds">00</span>
                            <span class="fomo-unit-label">Secs</span>
                        </div>
                    </div>
                </div>
            `;

            const firstChild = container.querySelector('.max-w-5xl, .max-w-7xl');
            if (firstChild) {
                firstChild.insertBefore(timerEl, firstChild.firstChild);
            } else {
                container.insertBefore(timerEl, container.firstChild);
            }
        }

        return timerEl;
    }

    // Update countdown values
    function updateCountdown(timerEl, endDate) {
        const now = new Date().getTime();
        const distance = endDate.getTime() - now;

        if (distance < 0) {
            timerEl.innerHTML = '<div class="fomo-expired">⚠️ This offer has ended!</div>';
            return false;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const daysEl = timerEl.querySelector('[data-unit="days"]');
        const hoursEl = timerEl.querySelector('[data-unit="hours"]');
        const minsEl = timerEl.querySelector('[data-unit="minutes"]');
        const secsEl = timerEl.querySelector('[data-unit="seconds"]');

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minsEl) minsEl.textContent = String(minutes).padStart(2, '0');
        if (secsEl) secsEl.textContent = String(seconds).padStart(2, '0');

        return true;
    }

    // Initialize all timers
    function initCountdowns() {
        const activeTimers = [];

        Object.entries(OFFER_TIMERS).forEach(([containerId, config]) => {
            const timerEl = createCountdownHTML(containerId, config);
            if (timerEl) {
                // Store containerId instead of endDate for dynamic updates
                activeTimers.push({ timerEl, containerId });
                console.log('Timer initialized for:', containerId, 'End:', config.endDate);
            }
        });

        if (activeTimers.length > 0) {
            setInterval(() => {
                activeTimers.forEach(({ timerEl, containerId }) => {
                    // Get current endDate from OFFER_TIMERS (allows dynamic updates)
                    const currentConfig = OFFER_TIMERS[containerId];
                    if (currentConfig) {
                        updateCountdown(timerEl, currentConfig.endDate);
                    }
                });
            }, 1000);

            // Initial update
            activeTimers.forEach(({ timerEl, containerId }) => {
                const currentConfig = OFFER_TIMERS[containerId];
                if (currentConfig) {
                    updateCountdown(timerEl, currentConfig.endDate);
                }
            });
        }
    }

    // Add styles
    function addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .fomo-timer { width: 100%; margin-bottom: 1rem; }
            .fomo-timer-wrapper {
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border-radius: 1rem; padding: 1rem 1.5rem;
                display: flex; align-items: center; justify-content: center;
                gap: 1rem; flex-wrap: wrap;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            .fomo-label {
                color: #fbbf24; font-weight: bold; font-size: 0.9rem;
                text-transform: uppercase; letter-spacing: 0.1em;
            }
            .fomo-countdown { display: flex; align-items: center; gap: 0.5rem; }
            .fomo-unit {
                display: flex; flex-direction: column; align-items: center;
                background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
                border-radius: 0.5rem; padding: 0.5rem 0.75rem; min-width: 50px;
                box-shadow: 0 2px 10px rgba(239, 68, 68, 0.4);
            }
            .fomo-value {
                color: white; font-size: 1.5rem; font-weight: bold;
                font-family: 'Courier New', monospace; line-height: 1;
            }
            .fomo-unit-label {
                color: rgba(255,255,255,0.8); font-size: 0.6rem;
                text-transform: uppercase; letter-spacing: 0.1em;
            }
            .fomo-separator { color: #fbbf24; font-size: 1.5rem; font-weight: bold; }
            .fomo-expired {
                background: #fee2e2; color: #dc2626; padding: 1rem;
                border-radius: 0.5rem; font-weight: bold; text-align: center;
            }
            @media (max-width: 640px) {
                .fomo-timer-wrapper { flex-direction: column; padding: 0.75rem; }
                .fomo-unit { min-width: 45px; padding: 0.4rem 0.5rem; }
                .fomo-value { font-size: 1.25rem; }
            }
        `;
        document.head.appendChild(style);
    }

    // Initialize
    async function init() {
        addStyles();
        await fetchTimerSettings();
        initCountdowns();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('FOMO Countdown Timer loaded (Firebase enabled)');
})();
