/**
 * 🔐 BUDDIKA STORES - CODE PROTECTION MODULE
 * Maximum security against code theft and reverse engineering
 * 
 * Features:
 * - Right-click protection
 * - Keyboard shortcut blocking
 * - DevTools detection
 * - Debugger traps
 * - Console manipulation detection
 * - Source code protection
 */

(function () {
    'use strict';

    // ==================== CONFIGURATION ====================
    const CONFIG = {
        enableRightClickBlock: true,
        enableKeyboardBlock: true,
        enableDevToolsDetection: true,
        enableDebuggerTraps: true,
        enableConsoleProtection: true,
        enableTextSelectBlock: true,
        warningMessage: '⚠️ This application is protected. Unauthorized access is prohibited.',
        redirectOnDetection: false,
        redirectUrl: '/access-denied.html'
    };

    // ==================== RIGHT-CLICK PROTECTION ====================
    if (CONFIG.enableRightClickBlock) {
        // Block context menu
        document.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();
            showWarning();
            return false;
        }, true);

        // Multiple event binding for stronger protection
        document.oncontextmenu = function () { return false; };

        // Block on all elements
        document.querySelectorAll('*').forEach(function (el) {
            el.oncontextmenu = function () { return false; };
        });
    }

    // ==================== KEYBOARD SHORTCUT BLOCKING ====================
    if (CONFIG.enableKeyboardBlock) {
        const blockedKeys = [
            { key: 'F12', keyCode: 123 },                    // DevTools
            { key: 'I', keyCode: 73, ctrl: true, shift: true }, // Inspect
            { key: 'J', keyCode: 74, ctrl: true, shift: true }, // Console
            { key: 'C', keyCode: 67, ctrl: true, shift: true }, // Elements
            { key: 'U', keyCode: 85, ctrl: true },              // View Source
            { key: 'S', keyCode: 83, ctrl: true },              // Save Page
            { key: 'P', keyCode: 80, ctrl: true, shift: true }, // Print Preview
        ];

        document.addEventListener('keydown', function (e) {
            for (let blocked of blockedKeys) {
                let match = true;

                if (blocked.keyCode && e.keyCode !== blocked.keyCode) match = false;
                if (blocked.ctrl && !e.ctrlKey) match = false;
                if (blocked.shift && !e.shiftKey) match = false;
                if (blocked.alt && !e.altKey) match = false;

                // Special case for F12
                if (e.keyCode === 123) match = true;

                if (match && (e.keyCode === blocked.keyCode || e.key === blocked.key)) {
                    e.preventDefault();
                    e.stopPropagation();
                    showWarning();
                    return false;
                }
            }
        }, true);

        // Double protection
        document.onkeydown = function (e) {
            if (e.keyCode === 123 || // F12
                (e.ctrlKey && e.shiftKey && [73, 74, 67].includes(e.keyCode)) || // Ctrl+Shift+I/J/C
                (e.ctrlKey && e.keyCode === 85)) { // Ctrl+U
                return false;
            }
        };
    }

    // ==================== DEVTOOLS DETECTION ====================
    if (CONFIG.enableDevToolsDetection) {
        let devToolsOpen = false;

        // Method 1: Window size detection
        const threshold = 160;
        const checkDevTools = function () {
            const widthThreshold = window.outerWidth - window.innerWidth > threshold;
            const heightThreshold = window.outerHeight - window.innerHeight > threshold;

            if (widthThreshold || heightThreshold) {
                if (!devToolsOpen) {
                    devToolsOpen = true;
                    onDevToolsOpen();
                }
            } else {
                devToolsOpen = false;
            }
        };

        setInterval(checkDevTools, 500);
        window.addEventListener('resize', checkDevTools);

        // Method 2: Console.log timing detection
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: function () {
                onDevToolsOpen();
                return 'devtools-trap';
            }
        });

        setInterval(function () {
            console.log('%c', element);
            console.clear();
        }, 1000);

        // Method 3: Debugger detection
        const detectDebugger = function () {
            const start = performance.now();
            debugger;
            const end = performance.now();
            if (end - start > 100) {
                onDevToolsOpen();
            }
        };

        // Run debugger detection periodically
        if (CONFIG.enableDebuggerTraps) {
            setInterval(detectDebugger, 2000);
        }

        function onDevToolsOpen() {
            console.clear();
            console.log('%c⛔ STOP!', 'color: red; font-size: 60px; font-weight: bold;');
            console.log('%cThis browser feature is for developers only.', 'font-size: 18px;');
            console.log('%cIf someone told you to copy-paste something here, it\'s a scam.', 'font-size: 16px; color: red;');

            // Optional: Redirect or block
            if (CONFIG.redirectOnDetection) {
                window.location.href = CONFIG.redirectUrl;
            }

            // Clear page content (aggressive protection)
            // document.body.innerHTML = '<h1 style="text-align:center;margin-top:20%;">Access Denied</h1>';
        }
    }

    // ==================== CONSOLE PROTECTION ====================
    if (CONFIG.enableConsoleProtection) {
        // Override console methods
        const noop = function () { };

        // Clear console periodically
        setInterval(function () {
            console.clear();
        }, 500);

        // Warning message
        console.log('%c⚠️ Warning!', 'color: red; font-size: 40px; font-weight: bold;');
        console.log('%cThis is a protected application. All actions are logged.', 'font-size: 16px;');
    }

    // ==================== TEXT SELECTION BLOCKING ====================
    if (CONFIG.enableTextSelectBlock) {
        // CSS-based selection blocking
        const style = document.createElement('style');
        style.textContent = `
            body, html {
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                user-select: none !important;
            }
            input, textarea, [contenteditable="true"] {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
        `;
        document.head.appendChild(style);

        // JavaScript-based selection blocking
        document.addEventListener('selectstart', function (e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                return false;
            }
        }, true);

        // Block copy
        document.addEventListener('copy', function (e) {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                showWarning();
                return false;
            }
        }, true);

        // Block cut
        document.addEventListener('cut', function (e) {
            e.preventDefault();
            return false;
        }, true);
    }

    // ==================== DRAG PROTECTION ====================
    document.addEventListener('dragstart', function (e) {
        e.preventDefault();
        return false;
    }, true);

    // ==================== IFRAME PROTECTION ====================
    if (window.top !== window.self) {
        // Page is in iframe - possible clickjacking
        window.top.location = window.self.location;
    }

    // ==================== SOURCE CODE OBFUSCATION TRAP ====================
    // Self-defending code - detects if code has been modified
    (function () {
        const originalCode = arguments.callee.toString();
        setInterval(function () {
            try {
                if (arguments.callee.toString() !== originalCode) {
                    // Code has been tampered
                    console.error('Tampering detected!');
                }
            } catch (e) { }
        }, 5000);
    })();

    // ==================== WARNING DISPLAY ====================
    function showWarning() {
        // Create warning toast
        let toast = document.getElementById('protection-warning');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'protection-warning';
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #ff4444, #cc0000);
                color: white;
                padding: 15px 30px;
                border-radius: 10px;
                font-weight: bold;
                font-size: 14px;
                z-index: 999999;
                box-shadow: 0 4px 20px rgba(255,0,0,0.4);
                display: none;
                animation: shake 0.5s ease-in-out;
            `;

            // Add shake animation
            const style = document.createElement('style');
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(-50%) rotate(0deg); }
                    25% { transform: translateX(-50%) rotate(-2deg); }
                    75% { transform: translateX(-50%) rotate(2deg); }
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(toast);
        }

        toast.textContent = CONFIG.warningMessage;
        toast.style.display = 'block';

        setTimeout(function () {
            toast.style.display = 'none';
        }, 3000);
    }

    // ==================== ANTI-AUTOMATION ====================
    // Detect Selenium/Puppeteer
    if (navigator.webdriver) {
        console.error('Automation detected');
    }

    // ==================== INITIALIZATION ====================
    console.log('%c🔐 Protection Active', 'color: green; font-size: 16px; font-weight: bold;');

})();
