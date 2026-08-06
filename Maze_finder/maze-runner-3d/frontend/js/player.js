// player.js

const canvas = document.getElementById('gameCanvas');

// Player movement and rotation state
let pitch = 0; // Look up/down
let yaw = 0;   // Look left/right
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();

// Movement settings
const SPEED = 5.0; 
const FRICTION = 15.0;
const LOOK_SPEED = 0.002;

// Helper to check bounds
function inBounds(r, c, grid) {
    return r >= 0 && r < grid.length && c >= 0 && c < grid[0].length;
}

// Request Pointer Lock on click
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

// Capture Mouse Movement
document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
        yaw -= e.movementX * LOOK_SPEED;
        pitch -= e.movementY * LOOK_SPEED;
        
        // Clamp pitch to avoid flipping over
        pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
        
        // Apply to camera
        window.camera.rotation.set(pitch, yaw, 0, 'YXZ');
    }
});

const keys = new Set();
document.addEventListener('keydown', (e) => {
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    keys.add(e.code);
});
document.addEventListener('keyup', (e) => keys.delete(e.code));

const clock = new THREE.Clock(); // Add at top scope

// C3: Stamina system
let stamina           = 100;
const STAMINA_DRAIN   = 20;
const STAMINA_REGEN   = 10;
window.getStamina     = () => stamina;

window.updatePlayer = function (grid) {
    if (!grid) return;

    const delta = Math.min(clock.getDelta(), 0.1); 
    
    // Calculate direction from key states
    direction.z = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
    direction.x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    
    // Apply friction
    velocity.x -= velocity.x * FRICTION * delta;
    velocity.z -= velocity.z * FRICTION * delta;

    // Apply movement acceleration
    if (direction.z !== 0 || direction.x !== 0) {
        direction.normalize();
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(window.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(window.camera.quaternion);
        
        forward.y = 0; forward.normalize();
        right.y = 0; right.normalize();

        const moveDir = new THREE.Vector3();
        moveDir.addScaledVector(forward, -direction.z);
        moveDir.addScaledVector(right, direction.x);
        moveDir.normalize();

        const isSprinting = keys.has('ShiftLeft') || keys.has('ShiftRight');
        const canSprint   = isSprinting && stamina > 0;
        const moveSpeed   = canSprint ? SPEED * 2 : SPEED;

        if (canSprint) {
            stamina = Math.max(0, stamina - STAMINA_DRAIN * delta);
        } else if (!isSprinting) {
            stamina = Math.min(100, stamina + STAMINA_REGEN * delta);
        }
        window.staminaPct = stamina;

        velocity.addScaledVector(moveDir, moveSpeed * FRICTION * delta);
    }

    const RADIUS = 0.12; 
    const currentX = window.camera.position.x;
    const currentZ = window.camera.position.z;
    const nextX = currentX + velocity.x * delta;
    const nextZ = currentZ + velocity.z * delta;

    function hitsWall(x, z) {
        const isNight   = window.currentPhase === 'night';
        const isEvening = window.currentPhase === 'evening';
        const gateActive = isNight || isEvening;
        const MARGIN = 0.05; // Extra buffer
        
        const testPoints = [
            {x: x - RADIUS, z: z - RADIUS},
            {x: x + RADIUS, z: z - RADIUS},
            {x: x - RADIUS, z: z + RADIUS},
            {x: x + RADIUS, z: z + RADIUS},
            {x: x, z: z}
        ];

        for (let pt of testPoints) {
            const r = Math.round(pt.z);
            const c = Math.round(pt.x);
            
            if (inBounds(r, c, grid) && grid[r][c] === 1) return true;
            
            // Task 2: Block entire safe zone boundary, not just 4 gate meshes
            if (gateActive && window.safeBoundaryCells &&
                    window.safeBoundaryCells.has(`${r},${c}`)) {
                return true;
            }
        }
        return false;
    }

    // Attempt X movement
    if (!hitsWall(nextX, currentZ)) {
        window.camera.position.x = nextX;
    } else {
        velocity.x = 0;
    }

    // Attempt Z movement
    if (!hitsWall(window.camera.position.x, nextZ)) {
        window.camera.position.z = nextZ;
    } else {
        velocity.z = 0;
    }
};

window.getPlayerGridPos = () => {
    return {
        r: Math.round(window.camera.position.z),
        c: Math.round(window.camera.position.x)
    };
};

window.isPlayerInSafeZone = (sz) => {
    if (!sz) return false;
    const pos = window.getPlayerGridPos();
    return pos.r >= sz.r1 && pos.r <= sz.r2 && pos.c >= sz.c1 && pos.c <= sz.c2;
};
