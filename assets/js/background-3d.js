document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Particle Material
    const particlesGeometry = new THREE.BufferGeometry();
    const particleCount = 1200; // Adjust for density

    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
        // Spread particles in a wide area
        posArray[i] = (Math.random() - 0.5) * 100;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        color: 0x8b5cf6, // Violet-500
        transparent: true,
        opacity: 0.8,
    });

    // Option 2: Constellation / Network Effect
    // "Tharu Ya Wena Lines" - We use Wireframe Geometries to create a connected network.

    // 1. Inner Network (Dense)
    // Using a slightly larger radius to match the visual weight of previous options
    const geoInner = new THREE.IcosahedronGeometry(13, 1);
    const wireframeInner = new THREE.WireframeGeometry(geoInner);
    const lineInner = new THREE.LineSegments(wireframeInner);
    lineInner.material.color = new THREE.Color(0x6366f1); // Indigo
    lineInner.material.transparent = true;
    lineInner.material.opacity = 0.2; // Slightly more visible
    lineInner.material.depthTest = false;

    // 2. Outer Network (Sparse, Larger)
    const geoOuter = new THREE.IcosahedronGeometry(20, 0); // Less detail
    const wireframeOuter = new THREE.WireframeGeometry(geoOuter);
    const lineOuter = new THREE.LineSegments(wireframeOuter);
    lineOuter.material.color = new THREE.Color(0xa855f7); // Purple
    lineOuter.material.transparent = true;
    lineOuter.material.opacity = 0.1;
    lineOuter.material.depthTest = false;

    // Group them to rotate comfortably
    const sphereMesh = new THREE.Group();
    sphereMesh.add(lineInner);
    sphereMesh.add(lineOuter);
    scene.add(sphereMesh);

    // Starfield Mesh
    const particlesMesh = new THREE.Points(particlesGeometry, material);
    scene.add(particlesMesh);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    // Handle Resize
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });

    // Animation Loop
    const clock = new THREE.Clock();

    const animate = () => {
        requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();

        // 1. Rotate whole system (Original Logic)
        // In main.js: particlesMesh.rotation.y = elapsedTime * 0.05;
        // 2. Dynamic Rotation (Constellation Drift)
        sphereMesh.rotation.y = elapsedTime * 0.05;
        sphereMesh.rotation.x = elapsedTime * 0.02;

        // Internal Counter-Rotation for "Moving Parts" feel
        if (sphereMesh.children.length >= 2) {
            sphereMesh.children[0].rotation.y += 0.002; // Inner spins one way
            sphereMesh.children[1].rotation.x -= 0.002; // Outer spins another
        }

        particlesMesh.rotation.y = elapsedTime * 0.05;

        // 2. Mouse Parallax (Original "Follow" Logic)
        const targetCamX = (mouseX * 0.05);
        const targetCamY = (mouseY * 0.05);

        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        camera.position.y += (-targetCamY - camera.position.y) * 0.05;

        // Ensure camera always looks at center
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    };

    animate();
});
