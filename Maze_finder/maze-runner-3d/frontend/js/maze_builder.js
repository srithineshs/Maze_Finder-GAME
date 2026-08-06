// maze_builder.js
window.wallMeshes = [];
window.mazeDecorations = []; 
window.safeZone = null;
window.gates = []; // Array of {mesh, r, c}

const textureLoader = new THREE.TextureLoader();
const wallTexture = textureLoader.load('assets/wall.png');
wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
wallTexture.repeat.set(1, 3); 

const wallMat = new THREE.MeshStandardMaterial({ 
    map: wallTexture,
    roughness: 0.9,
    metalness: 0.1
});

// grass.png does not exist — tint wall.png green for the Glade floor
const grassWallTex = textureLoader.load('assets/wall.png');
grassWallTex.wrapS = grassWallTex.wrapT = THREE.RepeatWrapping;
grassWallTex.repeat.set(1, 1);
const grassMat = new THREE.MeshStandardMaterial({
    map: grassWallTex,
    color: 0x2d6b22,
    roughness: 0.9,
    metalness: 0.0
});

// gate.png does not exist — use procedural dark-metal material
const gateMat = new THREE.MeshStandardMaterial({
    color: 0x5c4a2a,
    roughness: 0.4,
    metalness: 0.7,
    envMapIntensity: 0.5
});

const vineTexture = textureLoader.load('assets/vines.png');
vineTexture.wrapS = vineTexture.wrapT = THREE.RepeatWrapping;
const vineMat = new THREE.MeshLambertMaterial({ 
    map: vineTexture, 
    transparent: true, 
    side: THREE.DoubleSide 
});

const vineGeo = new THREE.PlaneGeometry(1, 3);
const wallGeo = new THREE.BoxGeometry(1, 3, 1);
const gateGeo = new THREE.BoxGeometry(1, 3, 0.2); // Thin gate

window.buildMaze = function(grid, scene, safeZone) {
    if (!grid) return;
    window.safeZone = safeZone;

    // Task 1: Populate safe zone perimeter for gate collision
    window.safeBoundaryCells = new Set();
    if (safeZone) {
        for (let c = safeZone.c1; c <= safeZone.c2; c++) {
            window.safeBoundaryCells.add(`${safeZone.r1},${c}`);
            window.safeBoundaryCells.add(`${safeZone.r2},${c}`);
        }
        for (let r = safeZone.r1; r <= safeZone.r2; r++) {
            window.safeBoundaryCells.add(`${r},${safeZone.c1}`);
            window.safeBoundaryCells.add(`${r},${safeZone.c2}`);
        }
    }
    
    // Robustness: Clear walls in the safe zone area on frontend too
    if (safeZone) {
        for (let r = safeZone.r1; r <= safeZone.r2; r++) {
            for (let c = safeZone.c1; c <= safeZone.c2; c++) {
                grid[r][c] = 0;
            }
        }
        // Ensure gate paths are clear
        const midR = Math.round((safeZone.r1 + safeZone.r2) / 2);
        const midC = Math.round((safeZone.c1 + safeZone.c2) / 2);
        grid[safeZone.r1][midC] = 0;
        grid[safeZone.r2][midC] = 0;
        grid[midR][safeZone.c1] = 0;
        grid[midR][safeZone.c2] = 0;
    }
    
    // Setup floor texture
    const floorTexture = textureLoader.load('assets/floor.png');
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(grid[0].length * 0.5, grid.length * 0.5); 
    window.floorMesh.material.map = floorTexture;
    window.floorMesh.material.color.set(0x888888); 
    window.floorMesh.material.needsUpdate = true;

    // A2: Ceiling — close open sky above corridors
    const ceilTexture = textureLoader.load('assets/wall.png');
    ceilTexture.wrapS = ceilTexture.wrapT = THREE.RepeatWrapping;
    ceilTexture.repeat.set(grid[0].length * 0.25, grid.length * 0.25);
    const ceilGeo = new THREE.PlaneGeometry(grid[0].length, grid.length);
    const ceilMat = new THREE.MeshStandardMaterial({
        map: ceilTexture, roughness: 1.0, metalness: 0.0, color: 0x666666
    });
    const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
    ceilMesh.rotation.x = Math.PI / 2;
    ceilMesh.position.set(grid[0].length / 2 - 0.5, 3.0, grid.length / 2 - 0.5);
    scene.add(ceilMesh);
    window.mazeDecorations.push(ceilMesh);

    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] === 1) {
                const mesh = new THREE.Mesh(wallGeo, wallMat);
                mesh.position.set(c, 1.5, r); 
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                window.wallMeshes.push({ mesh, r, c });

                if (Math.random() > 0.6) {
                    const vine = new THREE.Mesh(vineGeo, vineMat);
                    const side = Math.random() > 0.5 ? 0.51 : -0.51;
                    const rotate = Math.random() > 0.5;
                    if(rotate) {
                        vine.position.set(c + side, 1.5, r);
                        vine.rotation.y = Math.PI / 2;
                    } else {
                        vine.position.set(c, 1.5, r + side);
                    }
                    scene.add(vine);
                    window.mazeDecorations.push(vine); 
                }
            }
        }
    }
    
    const tileGeo = new THREE.PlaneGeometry(1, 1);
    
    // Glade (Safe Zone) Grass
    if (safeZone) {
        for (let r = safeZone.r1 + 1; r < safeZone.r2; r++) {
            for (let c = safeZone.c1 + 1; c < safeZone.c2; c++) {
                const grass = new THREE.Mesh(tileGeo, grassMat);
                grass.position.set(c, 0.015, r);
                grass.rotation.x = -Math.PI / 2;
                grass.receiveShadow = true;
                scene.add(grass);
                window.mazeDecorations.push(grass);
            }
        }

        // Task 3: Full-width gate panels (no gaps)
        const boundarySpan = safeZone.c2 - safeZone.c1 + 1;
        const midC = Math.round((safeZone.c1 + safeZone.c2) / 2);
        const midR = Math.round((safeZone.r1 + safeZone.r2) / 2);

        // North + South: full-width horizontal panels
        const hPanelGeo = new THREE.BoxGeometry(boundarySpan, 3, 0.35);
        [safeZone.r1, safeZone.r2].forEach(rowR => {
            const panel = new THREE.Mesh(hPanelGeo, gateMat);
            panel.position.set(midC, 1.5, rowR);
            panel.castShadow = true; panel.receiveShadow = true;
            scene.add(panel);
            window.gates.push({ mesh: panel, r: rowR, c: midC, openY: -1.4, closedY: 1.5 });
        });

        // West + East: full-height vertical panels
        const vPanelGeo = new THREE.BoxGeometry(0.35, 3, boundarySpan);
        [safeZone.c1, safeZone.c2].forEach(colC => {
            const panel = new THREE.Mesh(vPanelGeo, gateMat);
            panel.position.set(colC, 1.5, midR);
            panel.castShadow = true; panel.receiveShadow = true;
            scene.add(panel);
            window.gates.push({ mesh: panel, r: midR, c: colC, openY: -1.4, closedY: 1.5 });
        });
    }

    // B3: Hemisphere light above Glade
    if (safeZone) {
        const gladeCentreR = (safeZone.r1 + safeZone.r2) / 2;
        const gladeCentreC = (safeZone.c1 + safeZone.c2) / 2;
        const gladeLight = new THREE.HemisphereLight(0x88ff88, 0x224422, 1.2);
        gladeLight.position.set(gladeCentreC, 4, gladeCentreR);
        scene.add(gladeLight);
        window.mazeDecorations.push(gladeLight);
    }

    // Spawn marker in safe zone center
    if (safeZone) {
        const spawnR = Math.round((safeZone.r1 + safeZone.r2) / 2);
        const spawnC = Math.round((safeZone.c1 + safeZone.c2) / 2);
        const spawnMat = new THREE.MeshLambertMaterial({ color: 0x4aff8c, transparent: true, opacity: 0.3 });
        const spawnMesh = new THREE.Mesh(tileGeo, spawnMat);
        spawnMesh.position.set(spawnC, 0.02, spawnR);
        spawnMesh.rotation.x = -Math.PI / 2;
        scene.add(spawnMesh);
        window.mazeDecorations.push(spawnMesh);
    }

    const endMat = new THREE.MeshLambertMaterial({
        color: 0xff4a4a, transparent: true, opacity: 0.85,
        emissive: new THREE.Color(0xff1a1a), emissiveIntensity: 0.8
    });
    const endMesh = new THREE.Mesh(tileGeo, endMat);
    endMesh.position.set(grid[0].length - 2, 0.02, grid.length - 2);
    endMesh.rotation.x = -Math.PI / 2;
    scene.add(endMesh);
    window.mazeDecorations.push(endMesh);

    // Task 11: Pulsing exit light
    const exitLight = new THREE.PointLight(0xff4a4a, 1.8, 7);
    exitLight.position.set(grid[0].length - 2, 1.5, grid.length - 2);
    scene.add(exitLight);
    window.mazeDecorations.push(exitLight);
    window.exitLight = exitLight;
    window.exitLightPhase = 0;
};

window.setGates = function(isOpen) {
    const targetY = isOpen ? -1.4 : 1.5;
    window.gates.forEach(gate => {
        // Simple lerp animation (actual implementation would use a timer or tween)
        new TWEEN_GATES(gate.mesh, targetY);
    });
};

function TWEEN_GATES(mesh, targetY) {
    const startY = mesh.position.y;
    const duration = 2000; // 2 seconds to close/open
    const startTime = performance.now();

    function animate(time) {
        const elapsed = time - startTime;
        let p = elapsed / duration;
        if (p > 1) p = 1;

        mesh.position.y = startY + (targetY - startY) * p;

        if (p < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

window.clearMaze = function(scene) {
    window.wallMeshes.forEach(item => scene.remove(item.mesh));
    window.wallMeshes = [];
    window.mazeDecorations.forEach(mesh => scene.remove(mesh));
    window.mazeDecorations = [];
    window.gates.forEach(item => scene.remove(item.mesh));
    window.gates = [];
};

window.animateWallTransition = function(oldGrid, newGrid, scene) {
    const animationDuration = 500;
    const startTime = performance.now();
    const animatingMeshes = []; 

    for (let r = 0; r < newGrid.length; r++) {
        for (let c = 0; c < newGrid[r].length; c++) {
            const oldVal = oldGrid[r][c];
            const newVal = newGrid[r][c];
            
            if (oldVal === 1 && newVal === 0) {
                const index = window.wallMeshes.findIndex(m => m.r === r && m.c === c);
                if (index > -1) {
                    const wallObj = window.wallMeshes[index];
                    window.wallMeshes.splice(index, 1);
                    animatingMeshes.push({ mesh: wallObj.mesh, startY: 1.5, endY: -1.5, action: 'remove' });
                }
            } else if (oldVal === 0 && newVal === 1) {
                const mesh = new THREE.Mesh(wallGeo, wallMat);
                mesh.position.set(c, -1.5, r);
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                scene.add(mesh);
                window.wallMeshes.push({ mesh, r, c });
                animatingMeshes.push({ mesh, startY: -1.5, endY: 1.5, action: 'add' });
            }
        }
    }
    
    function updateTween(currentTime) {
        const elapsed = currentTime - startTime;
        let progress = elapsed / animationDuration;
        if (progress > 1) progress = 1;
        const t = progress - 1;
        const ease = t * t * t + 1;
        animatingMeshes.forEach(item => {
            item.mesh.position.y = item.startY + (item.endY - item.startY) * ease;
        });
        if (progress < 1) requestAnimationFrame(updateTween);
        else {
            animatingMeshes
                .filter(i => i.action === 'remove')
                .forEach(item => {
                    scene.remove(item.mesh);
                    // B4: Do NOT dispose wallGeo/wallMat — they are shared.
                    // Null refs to allow GC.
                    item.mesh.geometry = null;
                    item.mesh.material = null;
                });
        }
    }
    requestAnimationFrame(updateTween);
};
