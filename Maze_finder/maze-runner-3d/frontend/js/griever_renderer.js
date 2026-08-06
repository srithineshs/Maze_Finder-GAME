// griever_renderer.js

window.grieverTarget = null;
window.grieverState = 'DORMANT';

// Build Griever
const group = new THREE.Group();

const bodyGeo = new THREE.BoxGeometry(0.6, 0.4, 0.8);
const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 0.3;
body.castShadow = true;
group.add(body);

const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4);
const legMat = new THREE.MeshLambertMaterial({ color: 0x333333 });

const legPositions = [
    [0.35, -0.1, 0.3], [-0.35, -0.1, 0.3],
    [0.35, -0.1, 0.1], [-0.35, -0.1, 0.1],
    [0.35, -0.1, -0.1], [-0.35, -0.1, -0.1],
    [0.35, -0.1, -0.3], [-0.35, -0.1, -0.3]
];

legPositions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(pos[0], pos[1] + 0.3, pos[2]);
    leg.rotation.z = pos[0] > 0 ? -Math.PI / 4 : Math.PI / 4;
    leg.castShadow = true;
    group.add(leg);
});

const eyeGeo = new THREE.SphereGeometry(0.08);
const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green dormant

const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
leftEye.position.set(-0.15, 0.4, -0.4);
group.add(leftEye);

const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
rightEye.position.set(0.15, 0.4, -0.4);
group.add(rightEye);

// --- Chase Aura & Light ---
const chaseAuraGeo = new THREE.SphereGeometry(0.8, 16, 16);
const chaseAuraMat = new THREE.MeshBasicMaterial({ 
    color: 0xff0000, 
    transparent: true, 
    opacity: 0,
    side: THREE.BackSide
});
const chaseAura = new THREE.Mesh(chaseAuraGeo, chaseAuraMat);
group.add(chaseAura);

const dangerLight = new THREE.PointLight(0xff0000, 0, 5);
group.add(dangerLight);

window.grieverMesh = group;
window.scene.add(window.grieverMesh);

// A7 + C1: Multi-Griever system
const _initPos = window.endCell
  ? { r: window.endCell.r, c: window.endCell.c }
  : { r: 19, c: 19 };

window.grievers = [{
    mesh: group,
    pos: { r: _initPos.r, c: _initPos.c },
    target: { r: _initPos.r, c: _initPos.c },
    frameOffset: 0
}];
window.grieverMesh.position.set(_initPos.c, 0, _initPos.r);

let frameCount = 0;

// Spawn extra grievers when day > 1 (called from night_cycle.js on night start)
window.spawnExtraGrievers = function() {
    const day   = window.getDayNumber ? window.getDayNumber() : 1;
    const count = Math.min(day, 4);

    // Remove old extra grievers
    for (let i = 1; i < window.grievers.length; i++) {
        window.scene.remove(window.grievers[i].mesh);
    }
    window.grievers = [window.grievers[0]];

    // Add new extra grievers
    for (let i = 1; i < count; i++) {
        const g2 = group.clone();
        const startR = 1 + i * 2;
        const startC = 19 - i * 2;
        g2.position.set(startC, 0, startR);
        window.scene.add(g2);
        window.grievers.push({
            mesh: g2,
            pos:    { r: startR, c: startC },
            target: { r: startR, c: startC },
            frameOffset: i * 10
        });
    }
};

window.updateGriever = async function(playerPos, isNight) {
    frameCount++;
    for (const gv of window.grievers) {
        // Smooth lerp towards target
        const tx = gv.target.c;
        const tz = gv.target.r;
        gv.mesh.position.x += (tx - gv.mesh.position.x) * 0.1;
        gv.mesh.position.z += (tz - gv.mesh.position.z) * 0.1;
        const dx = tx - gv.mesh.position.x;
        const dz = tz - gv.mesh.position.z;
        if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            gv.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI;
        }

        // Task 8: Proximity pulse — screen edges glow red as Griever approaches
        const ddx = gv.mesh.position.x - playerPos.c;
        const ddz = gv.mesh.position.z - playerPos.r;
        const proximityDist = Math.sqrt(ddx*ddx + ddz*ddz);
        if (gv === window.grievers[0]) {
            if (proximityDist < 7 && !window.playerTrapped) {
                const t = Math.round((1 - Math.min(proximityDist, 7) / 7) * 200);
                document.body.style.boxShadow =
                    `inset 0 0 ${30 + t}px rgba(${t + 55},0,0,${0.2 + (1 - proximityDist / 7) * 0.5})`;
            } else if (proximityDist >= 7 && !window.playerTrapped) {
                document.body.style.boxShadow = '';
            }
        }

        // Game over check (all grievers)
        if (proximityDist < 0.8 && !window.gameOver) {
            window.gameOver = true;
            if (window.showGameOverScreen) window.showGameOverScreen();
        }

        // Staggered API calls
        if ((frameCount + gv.frameOffset) % 30 === 0) {
            gv.pos = { r: Math.round(gv.mesh.position.z), c: Math.round(gv.mesh.position.x) };
            try {
                const res = await fetch('/api/griever', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        griever_pos: [gv.pos.r, gv.pos.c],
                        player_pos:  [playerPos.r, playerPos.c],
                        is_night:    isNight,
                        use_cached:  true
                    })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.next_move) {
                        gv.target.r = data.next_move[0];
                        gv.target.c = data.next_move[1];
                    }
                    // Visual state only on primary griever
                    if (gv === window.grievers[0]) {
                        const sc = { DORMANT: 0x00ff00, ALERT: 0xffff00, CHASE: 0xff0000 };
                        eyeMat.color.setHex(sc[data.state] || 0x00ff00);
                        chaseAuraMat.opacity = data.state === 'CHASE' ? 0.3 : data.state === 'ALERT' ? 0.1 : 0;
                        dangerLight.intensity = data.state === 'CHASE' ? 1.5 : data.state === 'ALERT' ? 0.3 : 0;
                        if (window.showGrieverAlert) window.showGrieverAlert(data.state);
                    }
                }
            } catch(e) { console.error('Griever fetch failed:', e); }
        }
    }
};
