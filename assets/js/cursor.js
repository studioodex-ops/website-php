
document.addEventListener('DOMContentLoaded', () => {
    // Disable on mobile devices or small screens
    const isMobile = window.matchMedia("(max-width: 1024px)").matches || ('ontouchstart' in window);
    if (isMobile) return;

    // Create cursor trail element
    const trail = document.createElement('div');
    trail.classList.add('cursor-trail');
    document.body.appendChild(trail);

    let mouseX = 0;
    let mouseY = 0;
    let trailX = 0;
    let trailY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateTrail() {
        // If element removed or hidden, stop
        if (!document.body.contains(trail)) return;

        const dx = mouseX - trailX;
        const dy = mouseY - trailY;

        trailX += dx * 0.1; // Smooth following delay
        trailY += dy * 0.1;

        trail.style.left = trailX + 'px';
        trail.style.top = trailY + 'px';

        requestAnimationFrame(animateTrail);
    }

    animateTrail();
});
