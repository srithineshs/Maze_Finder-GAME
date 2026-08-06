// main.js
let selectedAlgo = 'astar';
let endCell = { r: 19, c: 19 };
let startCell = { r: 1, c: 1 };
window.gameOver = false;
let startTimeMillis = 0;

window.onload = function() {
    window.initAuth();
    // A4: Hide HUD until player logs in
    const hudEl = document.getElementById('hud');
    if (hudEl) hudEl.style.display = 'none';
    
    window.onUserLoggedIn = async function(user) {
        // Blur any active element (like login inputs) to ensure keyboard events go to document
        if (document.activeElement) document.activeElement.blur();
        
        const overlay = document.createElement('div');
        overlay.id = 'click-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:2000;display:flex;justify-content:center;align-items:center;color:white;font-family:Space Grotesk;font-size:2rem;cursor:pointer;';
        overlay.innerHTML = 'CLICK ANYWHERE TO ENTER THE GLADE';
        document.body.appendChild(overlay);

        overlay.onclick = async () => {
            overlay.remove();
            // A4: Show HUD now that game is starting
            const hud = document.getElementById('hud');
            if (hud) hud.style.display = '';
            await initGame();
            window.gameCanvas.requestPointerLock();
            gameLoop();
            startTimeMillis = Date.now();
            window._startTime = Date.now();  // Task 10: for win screen
        };
    };
};

async function initGame() {
    try {
        const response = await fetch('/api/maze?rows=31&cols=31');  // Task 4: 31x31
        const data = await response.json();

        window.currentGrid = data.grid;
        startCell = { r: data.start[0], c: data.start[1] };
        endCell = { r: data.end[0], c: data.end[1] };
        window.endCell = endCell;   // A7: expose for griever_renderer.js

        window.buildMaze(window.currentGrid, window.scene, data.safe_zone);

        // Spawn player in the center of the Glade (Safe Zone), like the movie
        if (data.safe_zone) {
            const spawnR = Math.round((data.safe_zone.r1 + data.safe_zone.r2) / 2);
            const spawnC = Math.round((data.safe_zone.c1 + data.safe_zone.c2) / 2);
            window.camera.position.set(spawnC, 0.5, spawnR);
        } else {
            window.camera.position.set(startCell.c, 0.5, startCell.r);
        }

        if (window.grieverMesh) {
            window.grieverMesh.position.set(endCell.c, 0, endCell.r);
        }

        // CHANGE A (v4): Wire the 3-phase evening/night events
        window.onEveningStart = function() {
            // Evening warning ticker handled in gameLoop via getSecondsUntilGateClose
        };

        window.startCycle(
            function() {
                // onNightStart — gate just locked
                if (window.hideEveningWarning) window.hideEveningWarning();
                if (window.isPlayerTrapped && window.isPlayerTrapped()) {
                    if (window.showTrappedBanner) window.showTrappedBanner();
                }
            },
            function() {
                // onDayStart — new morning, gate opened
                if (window.hideTrappedBanner) window.hideTrappedBanner();
                if (window.showSunriseMessage) {
                    window.showSunriseMessage(window.getDayNumber ? window.getDayNumber() : '');
                }
            }
        );

        // A1: Open gates on game start (morning)
        if (window.setGates) window.setGates(true);

        // Task 3: Auto-show minimap on game start
        if (window.toggleMinimap) window.toggleMinimap();

    } catch (e) {
        console.error("Failed to fetch maze. Ensure Flask server is running.", e);
    }
}

document.addEventListener('keydown', async (e) => {
    // IMPORTANT: Do NOT fire game hotkeys while the user is typing in an input
    const tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (window.gameOver) return;

    const playerPos = window.getPlayerGridPos ? window.getPlayerGridPos() : { r: startCell.r, c: startCell.c };

    if (e.code === 'Space') {
        window.solveMaze(window.currentGrid, [playerPos.r, playerPos.c], [endCell.r, endCell.c], selectedAlgo);
    } else if (e.code === 'Digit1') {
        selectedAlgo = 'bfs';
        window.solveMaze(window.currentGrid, [playerPos.r, playerPos.c], [endCell.r, endCell.c], 'bfs');
    } else if (e.code === 'Digit2') {
        selectedAlgo = 'dfs';
        window.solveMaze(window.currentGrid, [playerPos.r, playerPos.c], [endCell.r, endCell.c], 'dfs');
    } else if (e.code === 'Digit3') {
        selectedAlgo = 'astar';
        window.solveMaze(window.currentGrid, [playerPos.r, playerPos.c], [endCell.r, endCell.c], 'astar');
    } else if (e.code === 'Digit4') {
        window.runAllThree(window.currentGrid, [playerPos.r, playerPos.c], [endCell.r, endCell.c]);
    } else if (e.code === 'KeyR') {
        location.reload(); 
    } else if (e.code === 'KeyP') {
        if (window.safeZone) {
            const spawnR = Math.round((window.safeZone.r1 + window.safeZone.r2) / 2);
            const spawnC = Math.round((window.safeZone.c1 + window.safeZone.c2) / 2);
            window.camera.position.set(spawnC, 0.5, spawnR);
            console.log("Panic teleport to Glade center!");
        }
    } else if (e.code === 'KeyM') {
        if (window.toggleMinimap) window.toggleMinimap();
    } else if (e.code === 'Tab') {
        e.preventDefault();
        window.toggleStatsPanel();
    }
});

function gameLoop() {
    if (window.gameOver) return;
    
    requestAnimationFrame(gameLoop);

    if (window.currentGrid) {
        window.updatePlayer(window.currentGrid);
        // A3: Sync flashlight to camera position
        if (window.flashlight && window.camera) {
            window.flashlight.position.copy(window.camera.position);
        }
        
        const playerPos = window.getPlayerGridPos();
        const inSafeZone = window.isPlayerInSafeZone(window.safeZone);
        const isNight = window.getCurrentPhase() === 'night';

        if (window.updateGriever) {
            window.updateGriever(playerPos, isNight);
        }

        // CHANGE B (v4): Evening countdown + phase badge color + trapped state
        const phase   = window.getCurrentPhase();
        const trapped = window.isPlayerTrapped ? window.isPlayerTrapped() : false;

        // Evening countdown banner
        if (phase === 'evening' && window.showEveningWarning) {
            const secs = window.getSecondsUntilGateClose ? window.getSecondsUntilGateClose() : null;
            if (secs !== null) window.showEveningWarning(secs);
        } else if (phase !== 'evening' && window.hideEveningWarning) {
            window.hideEveningWarning();
        }

        window.updateHUD(phase, window.getTimeRemaining(), playerPos, inSafeZone, selectedAlgo, trapped);

        // Phase badge color
        const badge = document.getElementById('phase-badge');
        if (badge) {
            if (phase === 'morning') {
                badge.style.background = 'rgba(74,124,63,0.85)';
                badge.style.color      = '#aee88a';
            } else if (phase === 'evening') {
                badge.style.background = 'rgba(204,102,0,0.9)';
                badge.style.color      = '#ffffff';
            } else if (phase === 'night') {
                badge.style.background = 'rgba(139,0,0,0.9)';
                badge.style.color      = '#ffaaaa';
            }
        }

        // C2: Update minimap
        const gvPos = window.grievers && window.grievers[0]
            ? { r: Math.round(window.grievers[0].mesh.position.z), c: Math.round(window.grievers[0].mesh.position.x) }
            : null;
        if (window.updateMinimap) window.updateMinimap(window.currentGrid, playerPos, gvPos);

        // Win Condition — distance-based for reliability
        const dWinR = playerPos.r - endCell.r;
        const dWinC = playerPos.c - endCell.c;
        if (Math.sqrt(dWinR*dWinR + dWinC*dWinC) < 1.0 && !window.gameOver) {
            window.gameOver = true;
            const timeTaken = (Date.now() - startTimeMillis) / 1000;
            
            if (window.currentUser) {
                fetch('/api/save_score', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: window.currentUser.id,
                        time_taken: timeTaken,
                        maze_seed: 0 
                    })
                });
            }
            if(window.showWinScreen) window.showWinScreen();
        }
    }

    // Task 11: Pulse exit light
    if (window.exitLight) {
        window.exitLightPhase = (window.exitLightPhase || 0) + 0.04;
        window.exitLight.intensity = 1.2 + Math.sin(window.exitLightPhase) * 0.9;
    }

    if (window.renderer && window.scene && window.camera) {
        window.renderer.render(window.scene, window.camera);
    }
}
