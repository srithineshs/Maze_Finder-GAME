// scene.js

window.gameCanvas = document.getElementById('gameCanvas');
const w = window.innerWidth;
const h = window.innerHeight;

window.scene = new THREE.Scene();
window.scene.background = new THREE.Color(0xa0a0a0); // Overcast sky gray

window.camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
window.renderer = new THREE.WebGLRenderer({ canvas: window.gameCanvas, antialias: true });

window.renderer.setSize(w, h);
window.renderer.shadowMap.enabled = true;
window.renderer.setPixelRatio(window.devicePixelRatio);
window.scene.fog = new THREE.FogExp2(0xa0a0a0, 0.03);  // Task 5: lower density for 31x31

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Brighter ambient
window.scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); // White sun light
dirLight.position.set(50, 100, 50);
dirLight.castShadow = true;
window.scene.add(dirLight);
// Increase shadow map size for better quality
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
window.scene.add(dirLight);

const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
window.floorMesh = new THREE.Mesh(floorGeo, floorMat);
window.floorMesh.rotation.x = -Math.PI / 2;
window.floorMesh.receiveShadow = true;
window.scene.add(window.floorMesh);

// Player Flashlight (Warmer)
window.flashlight = new THREE.PointLight(0xfff0dd, 0.8, 12);
window.flashlight.castShadow = true;
window.scene.add(window.flashlight);

window.setNightMode = function (isNight) {
    if (isNight) {
        window.scene.background.set(0x050015);
        window.scene.fog.color.set(0x050015); // Deep space purple/dark
        window.scene.fog.density = 0.10;  // Task 5: was 0.15
        ambientLight.color.set(0x4400ff);
        ambientLight.intensity = 0.1;
        if (window.flashlight) window.flashlight.intensity = 0.4;
    } else {
        window.scene.background.set(0xa0a0a0);
        window.scene.fog.color.set(0xa0a0a0); // Back to overcast gray
        window.scene.fog.density = 0.03;  // Task 5: was 0.05
        ambientLight.color.set(0xffffff);
        ambientLight.intensity = 0.6;
        if (window.flashlight) window.flashlight.intensity = 0.8;
    }
}

window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    window.renderer.setSize(width, height);
    window.camera.aspect = width / height;
    window.camera.updateProjectionMatrix();
});
