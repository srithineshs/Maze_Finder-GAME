// auth_3d.js - 3D Background for Login/Register Screen
(function() {
    const container = document.getElementById('auth-bg');
    const modal = document.getElementById('auth-modal');
    
    if (!container || !modal) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Create a rotating "Core" or Maze elements
    const group = new THREE.Group();
    scene.add(group);

    // Add some wireframe geometry for a technical look
    const geometry = new THREE.IcosahedronGeometry(10, 1);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0x4aff8c, 
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    
    const core = new THREE.Mesh(geometry, material);
    group.add(core);

    // Floating particles
    const particlesCount = 200;
    const pGeometry = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particlesCount * 3);
    
    for(let i = 0; i < particlesCount * 3; i++) {
        pPositions[i] = (Math.random() - 0.5) * 50;
    }
    
    pGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMaterial = new THREE.PointsMaterial({ 
        color: 0x4aff8c, 
        size: 0.2,
        transparent: true,
        opacity: 0.5
    });
    
    const particles = new THREE.Points(pGeometry, pMaterial);
    group.add(particles);

    camera.position.z = 30;

    function animate() {
        if (modal.classList.contains('hidden')) {
            // Stop rendering if modal is hidden to save resources
            return;
        }
        
        requestAnimationFrame(animate);
        
        group.rotation.y += 0.002;
        group.rotation.x += 0.001;
        
        core.rotation.z += 0.005;
        
        renderer.render(scene, camera);
    }

    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Function to check if we should still animate
    window.updateAuthAnimation = function() {
        if (!modal.classList.contains('hidden')) {
            animate();
        }
    };
})();
