/**
 * 🔑 BUDDIKA STORES - LICENSE & TRIAL SYSTEM
 * Controls access based on license key or trial period
 */

(function () {
    'use strict';

    // ==================== CONFIGURATION ====================
    const LICENSE_CONFIG = {
        trialDays: 7,                    // Trial period in days
        storageKey: 'bs_license_data',   // LocalStorage key
        contactPhone: '+94 XX XXX XXXX', // Your phone number
        contactEmail: 'sales@buddikastores.com', // Your email
        contactWhatsApp: '94XXXXXXXXX',  // WhatsApp number (without +)
        companyName: 'Buddika Stores',

        // Valid license keys (you generate these)
        // Format: BS-{clientId}-{expiryDate}-{hash}
        // In production, validate against server
        validLicenses: {
            // 'BS-DEMO-20261231-ABC123': { client: 'Demo User', expires: '2026-12-31' },
            // 'BS-CLIENT1-20270115-XYZ789': { client: 'Client 1', expires: '2027-01-15' },
        }
    };

    // ==================== LICENSE DATA STRUCTURE ====================
    function getLicenseData() {
        try {
            const data = localStorage.getItem(LICENSE_CONFIG.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            return null;
        }
    }

    function saveLicenseData(data) {
        try {
            localStorage.setItem(LICENSE_CONFIG.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save license data');
        }
    }

    // ==================== TRIAL MANAGEMENT ====================
    function initTrial() {
        let data = getLicenseData();

        if (!data) {
            // First time - start trial
            data = {
                type: 'trial',
                startDate: new Date().toISOString(),
                expiryDate: new Date(Date.now() + LICENSE_CONFIG.trialDays * 24 * 60 * 60 * 1000).toISOString(),
                licenseKey: null,
                client: 'Trial User'
            };
            saveLicenseData(data);
            console.log('[License] Trial started:', data.expiryDate);
        }

        return data;
    }

    // ==================== LICENSE VALIDATION ====================
    function validateLicense(key) {
        // Check against local keys
        if (LICENSE_CONFIG.validLicenses[key]) {
            const license = LICENSE_CONFIG.validLicenses[key];
            const expiryDate = new Date(license.expires);

            if (expiryDate > new Date()) {
                // Valid license
                const data = {
                    type: 'licensed',
                    licenseKey: key,
                    client: license.client,
                    expiryDate: license.expires,
                    activatedAt: new Date().toISOString()
                };
                saveLicenseData(data);
                return { valid: true, data };
            } else {
                return { valid: false, reason: 'License has expired' };
            }
        }

        // Simple hash validation for dynamic keys
        // Format: BS-{randomId}-{expiryYYYYMMDD}-{hash}
        const keyParts = key.split('-');
        if (keyParts.length === 4 && keyParts[0] === 'BS') {
            const expiryStr = keyParts[2];
            if (expiryStr.length === 8) {
                const year = parseInt(expiryStr.substring(0, 4));
                const month = parseInt(expiryStr.substring(4, 6)) - 1;
                const day = parseInt(expiryStr.substring(6, 8));
                const expiryDate = new Date(year, month, day);

                // Simple hash check (in production, use proper crypto)
                const expectedHash = generateHash(keyParts[1] + expiryStr);
                if (keyParts[3] === expectedHash && expiryDate > new Date()) {
                    const data = {
                        type: 'licensed',
                        licenseKey: key,
                        client: 'Licensed User',
                        expiryDate: expiryDate.toISOString(),
                        activatedAt: new Date().toISOString()
                    };
                    saveLicenseData(data);
                    return { valid: true, data };
                }
            }
        }

        return { valid: false, reason: 'Invalid license key' };
    }

    // Simple hash generator (for demo - use proper crypto in production)
    function generateHash(input) {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36).toUpperCase().substring(0, 6);
    }

    // ==================== CHECK ACCESS ====================
    function checkAccess() {
        const data = initTrial();
        const now = new Date();
        const expiry = new Date(data.expiryDate);

        if (data.type === 'licensed' && expiry > now) {
            // Valid license
            return {
                allowed: true,
                type: 'licensed',
                client: data.client,
                expiresIn: Math.ceil((expiry - now) / (24 * 60 * 60 * 1000)),
                expiryDate: expiry
            };
        }

        if (data.type === 'trial') {
            if (expiry > now) {
                // Trial still valid
                const daysLeft = Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
                return {
                    allowed: true,
                    type: 'trial',
                    daysLeft: daysLeft,
                    expiryDate: expiry
                };
            } else {
                // Trial expired
                return {
                    allowed: false,
                    type: 'expired',
                    reason: 'Trial period has ended'
                };
            }
        }

        return { allowed: false, type: 'unknown' };
    }

    // ==================== UI COMPONENTS ====================
    function showTrialBanner(daysLeft) {
        const banner = document.createElement('div');
        banner.id = 'trial-banner';
        banner.innerHTML = `
            <div style="
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                background: linear-gradient(135deg, #f59e0b, #d97706);
                color: white;
                padding: 10px 20px;
                text-align: center;
                font-weight: bold;
                z-index: 99999;
                font-size: 14px;
            ">
                ⏰ Trial Mode: ${daysLeft} day${daysLeft > 1 ? 's' : ''} remaining | 
                <span onclick="window.showLicenseDialog()" style="cursor:pointer;text-decoration:underline;">
                    Enter License Key
                </span> | 
                Contact: ${LICENSE_CONFIG.contactPhone}
            </div>
        `;
        document.body.appendChild(banner);
    }

    function showExpiredScreen() {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'license-expired-overlay';
        overlay.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
            ">
                <div style="
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    max-width: 450px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
                ">
                    <div style="font-size: 60px; margin-bottom: 20px;">⛔</div>
                    <h1 style="color: #dc2626; margin-bottom: 10px; font-size: 24px;">Trial Expired</h1>
                    <p style="color: #666; margin-bottom: 30px; line-height: 1.6;">
                        Your 7-day trial period has ended.<br>
                        Purchase a license to continue using all features.
                    </p>
                    
                    <div style="margin-bottom: 20px;">
                        <input type="text" id="license-key-input" placeholder="Enter License Key"
                            style="
                                width: 100%;
                                padding: 15px;
                                border: 2px solid #e5e7eb;
                                border-radius: 10px;
                                font-size: 16px;
                                text-align: center;
                                letter-spacing: 2px;
                                text-transform: uppercase;
                            ">
                    </div>
                    
                    <button onclick="window.activateLicense()" style="
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        padding: 15px 40px;
                        border-radius: 10px;
                        font-weight: bold;
                        font-size: 16px;
                        cursor: pointer;
                        width: 100%;
                        margin-bottom: 15px;
                    ">
                        Activate License
                    </button>
                    
                    <div id="license-error" style="color: #dc2626; margin-bottom: 15px; display: none;"></div>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
                    
                    <p style="color: #888; font-size: 14px; margin-bottom: 15px;">
                        Contact us to purchase a license:
                    </p>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <a href="tel:${LICENSE_CONFIG.contactPhone}" style="
                            background: #f3f4f6;
                            color: #374151;
                            padding: 10px 20px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-size: 14px;
                        ">📞 Call</a>
                        <a href="https://wa.me/${LICENSE_CONFIG.contactWhatsApp}" target="_blank" style="
                            background: #25d366;
                            color: white;
                            padding: 10px 20px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-size: 14px;
                        ">💬 WhatsApp</a>
                        <a href="mailto:${LICENSE_CONFIG.contactEmail}" style="
                            background: #f3f4f6;
                            color: #374151;
                            padding: 10px 20px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-size: 14px;
                        ">📧 Email</a>
                    </div>
                    
                    <p style="color: #aaa; font-size: 12px; margin-top: 20px;">
                        ${LICENSE_CONFIG.companyName} © ${new Date().getFullYear()}
                    </p>
                </div>
            </div>
        `;
        document.body.innerHTML = '';
        document.body.appendChild(overlay);
    }

    function showLicenseDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'license-dialog';
        dialog.innerHTML = `
            <div style="
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999998;
            " onclick="this.remove()">
                <div style="
                    background: white;
                    border-radius: 15px;
                    padding: 30px;
                    max-width: 400px;
                    text-align: center;
                " onclick="event.stopPropagation()">
                    <h2 style="margin-bottom: 20px;">🔑 Enter License Key</h2>
                    <input type="text" id="dialog-license-input" placeholder="BS-XXXXX-XXXXXXXX-XXXXXX"
                        style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #e5e7eb;
                            border-radius: 8px;
                            font-size: 14px;
                            text-align: center;
                            margin-bottom: 15px;
                        ">
                    <button onclick="window.activateLicenseFromDialog()" style="
                        background: black;
                        color: white;
                        border: none;
                        padding: 12px 30px;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                        width: 100%;
                    ">Activate</button>
                    <div id="dialog-license-error" style="color: #dc2626; margin-top: 10px; display: none;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    // ==================== GLOBAL FUNCTIONS ====================
    window.showLicenseDialog = showLicenseDialog;

    window.activateLicense = function () {
        const input = document.getElementById('license-key-input');
        const error = document.getElementById('license-error');
        const key = input.value.trim().toUpperCase();

        if (!key) {
            error.textContent = 'Please enter a license key';
            error.style.display = 'block';
            return;
        }

        const result = validateLicense(key);
        if (result.valid) {
            window.location.reload();
        } else {
            error.textContent = result.reason || 'Invalid license key';
            error.style.display = 'block';
        }
    };

    window.activateLicenseFromDialog = function () {
        const input = document.getElementById('dialog-license-input');
        const error = document.getElementById('dialog-license-error');
        const key = input.value.trim().toUpperCase();

        if (!key) {
            error.textContent = 'Please enter a license key';
            error.style.display = 'block';
            return;
        }

        const result = validateLicense(key);
        if (result.valid) {
            window.location.reload();
        } else {
            error.textContent = result.reason || 'Invalid license key';
            error.style.display = 'block';
        }
    };

    // License key generator (for your use)
    window.generateLicenseKey = function (clientId, expiryDate) {
        // expiryDate format: YYYYMMDD
        const hash = generateHash(clientId + expiryDate);
        return `BS-${clientId.toUpperCase()}-${expiryDate}-${hash}`;
    };

    // ==================== INITIALIZATION ====================
    document.addEventListener('DOMContentLoaded', function () {
        const access = checkAccess();

        console.log('[License] Access check:', access);

        if (!access.allowed) {
            // Show expired screen
            showExpiredScreen();
        } else if (access.type === 'trial') {
            // Show trial banner
            showTrialBanner(access.daysLeft);
        } else if (access.type === 'licensed') {
            // Valid license - show small indicator
            console.log('[License] Licensed to:', access.client);
        }
    });

    console.log('%c🔑 License System Active', 'color: blue; font-size: 16px; font-weight: bold;');

})();
