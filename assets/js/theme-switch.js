// Apple macOS-style Theme Switcher
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const iconPath = themeToggleBtn?.querySelector('path');

    // Icons
    const sunIcon = "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z";
    const moonIcon = "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z";

    // 1. Check LocalStorage or System Preference
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Apply theme immediately
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        htmlElement.setAttribute('data-theme', 'dark');
        htmlElement.classList.add('dark');
        if (iconPath) iconPath.setAttribute('d', sunIcon);
    } else {
        htmlElement.removeAttribute('data-theme');
        htmlElement.classList.remove('dark');
        if (iconPath) iconPath.setAttribute('d', moonIcon);
    }

    // 2. Toggle Event (Only if button exists and not already attached)
    if (themeToggleBtn && !themeToggleBtn.hasAttribute('data-listener')) {
        themeToggleBtn.setAttribute('data-listener', 'true');
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');

            document.body.classList.add('theme-transition');

            if (currentTheme === 'dark') {
                htmlElement.removeAttribute('data-theme');
                htmlElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
                if (iconPath) iconPath.setAttribute('d', moonIcon);
            } else {
                htmlElement.setAttribute('data-theme', 'dark');
                htmlElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
                if (iconPath) iconPath.setAttribute('d', sunIcon);
            }

            setTimeout(() => {
                document.body.classList.remove('theme-transition');
            }, 500);
        });
    }
}

// Expose globally
window.initTheme = initTheme;

// Run on load and custom events
document.addEventListener('DOMContentLoaded', initTheme);
document.addEventListener('header-loaded', initTheme);
