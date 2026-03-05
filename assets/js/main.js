
// Tilt + Page Transitions
document.addEventListener("DOMContentLoaded", () => {
    initTilt();
});

// Vanilla Tilt Logic
function initTilt() {
    const btn = document.querySelector('.tilt-btn');
    if (!btn) return;

    btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -15; // Max rotation deg
        const rotateY = ((x - centerX) / centerX) * 15;

        btn.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    });
}

// Page Transitions
// Add fade-in on load
document.body.classList.add('page-transition');

// Handle exit transitions
document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    // Check if valid internal navigation
    if (href &&
        !href.startsWith('#') &&
        !href.startsWith('javascript') &&
        !href.startsWith('mailto:') &&
        !href.startsWith('tel:') &&
        !href.startsWith('https://wa.me') &&
        link.target !== '_blank') {

        // Skip external links (different domain)
        try {
            const linkUrl = new URL(href, window.location.origin);
            if (linkUrl.origin !== window.location.origin) return;
        } catch (err) { /* relative URL, continue */ }

        e.preventDefault();
        document.body.classList.add('page-transition-exit');
        setTimeout(() => {
            window.location.href = href;
        }, 300);
    }
});
