# MAZE RUNNER 3D — Implementation Guide (v7 — Gate Fix + UI Overhaul)
### Course: 23AD404 Artificial Intelligence | MEPCO R2023 | BTech AI & Data Science

---

> **Agent instructions:**
> - Read each task fully before writing code.
> - Execute in numbered order — later tasks depend on earlier ones.
> - Mark each task `[COMPLETE]` immediately after finishing.
> - Never modify a file not listed in that task.
> - After Python edits: `python -m py_compile <file>` — zero errors.
> - After JS edits: reload browser — zero red console errors.

---

## Root cause diagnosis — why players pass through the gate at night

**Two problems working together:**

**Problem 1 — 28 open boundary gaps, only 4 are blocked.**
The safe zone is fully cleared: every cell `grid[r1..r2][c1..c2] = 0`.
Only the 4 midpoint cells get gate meshes. The other ~24 boundary cells
(e.g., `r=12, c=12,13,14,16,17,18` for a 7-wide zone) are open paths
with nothing blocking them. The player walks diagonally through any gap.

**Problem 2 — Gate mesh is only 0.2 units thick.**
`BoxGeometry(1, 3, 0.2)` lets the player clip through at diagonal angles
even when the coordinate check fires correctly.

**Fix strategy — two-part:**
1. In `maze_builder.js`: register **every open boundary cell** into `window.safeBoundaryCells` at build time.
2. In `player.js` `hitsWall()`: block any cell in `window.safeBoundaryCells` when `gateActive` — not just the 4 gate cells.
3. Replace 4 thin single-cell gate meshes with **4 full-width panels** covering each opening completely.

---

## What the reference site (hangman) teaches about UI/UX

Dark hacker/cyber palette. "AGENT" identity framing. Neon green `#4aff8c` on black.
Monospace uppercase labels. XP + level display after win. Leaderboard table.
Glassmorphism modals with subtle scanline texture. We apply all of these.

---

## Master Prompt — Paste at start of EVERY Antigravity session

```
I am building a 3D Maze Runner AI game (23AD404, MEPCO R2023, BTech AI & DS).
Stack: Python Flask backend + Three.js r128 (CDN, global THREE) frontend.
No npm/bundler — plain script tags + window.* globals only.

File responsibilities:
  scene.js          → THREE scene, camera, renderer, lights, window.flashlight
  maze_builder.js   → buildMaze(), setGates(), animateWallTransition(), clearMaze()
                       window.safeBoundaryCells = Set of "r,c" strings for safe zone perimeter
  player.js         → updatePlayer(), getPlayerGridPos(), isPlayerInSafeZone()
                       hitsWall() checks window.safeBoundaryCells when gateActive
  griever_renderer.js → griever mesh, updateGriever(), window.grievers[]
  night_cycle.js    → 3-phase cycle morning/evening/night, GATE_CLOSE_TIME=130s
  ui.js             → updateHUD(), banners, minimap, Chart.js panel
  main.js           → initGame(), gameLoop(), keydown handlers
  ai_solver.js      → solveMaze(), runAllThree(), stopAnimation()
  app.py            → Flask REST API

CRITICAL RULES:
  - window.gameCanvas declared in scene.js — NEVER write const canvas in player.js
  - Chart.js lazy init in updateStatsPanel() only — never at load time
  - mesh.geometry.dispose() + mesh.material.dispose() on every scene.remove()
  - window.gameOver is the single shared flag — never re-declare it
  - await initGame() before gameLoop()
  - Only assets/wall.png, assets/floor.png, assets/vines.png exist
  - NEVER load assets/gate.png or assets/grass.png — they do not exist
  - window.safeBoundaryCells is a Set populated in buildMaze() and read in hitsWall()

Now apply: [TASK NUMBER — TITLE]
[PASTE EXACT ANTIGRAVITY PROMPT FROM THAT TASK]
```

---

## SECTION 1 — Critical Gate Fix (3 tasks)

---

### TASK 1 — Build safe zone boundary cell registry
**Status:** `[COMPLETE]`
**Priority:** 🔴 CRITICAL

**File:** `frontend/js/maze_builder.js`

**Antigravity Prompt:**
```
Edit maze_builder.js. Find window.buildMaze = function(grid, scene, safeZone).
Find this line inside buildMaze:
  window.safeZone = safeZone;

Add immediately AFTER it:
  // Populate safe zone perimeter for gate collision
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

Do not change anything else.
```

**Verify:** Browser console after load: `window.safeBoundaryCells.size` > 20.
**Mark complete when:** Set is populated.

---

### TASK 2 — Block entire safe zone boundary in collision
**Status:** `[COMPLETE]`
**Priority:** 🔴 CRITICAL

**File:** `frontend/js/player.js`

**Antigravity Prompt:**
```
Edit player.js. Find inside hitsWall():
  if (gateActive && window.gates && window.gates.some(g => g.r === r && g.c === c)) {
    return true;
  }

Replace with:
  if (gateActive && window.safeBoundaryCells &&
      window.safeBoundaryCells.has(`${r},${c}`)) {
    return true;
  }

Do not change anything else.
```

**Verify:**
- Morning: player walks freely in/out of Glade. ✓
- Evening (110s): boundary blocks from every angle. ✓
- Night: player CANNOT enter Glade even diagonally. ✓
- Dawn: player walks freely again. ✓

**Mark complete when:** Zero entry through gate at night confirmed.

---

### TASK 3 — Replace thin gate meshes with full-width panels
**Status:** `[COMPLETE]`
**Priority:** 🟠 High — visual fix so gate looks solid

**File:** `frontend/js/maze_builder.js`

**Antigravity Prompt:**
```
Edit maze_builder.js. Find the entrances block inside buildMaze:
  // Add 4 BIG GATES at safe zone entrances
  const entrances = [ ... ];
  entrances.forEach(ent => {
    const gate = new THREE.Mesh(gateGeo, gateMat);
    ...
    window.gates.push({ mesh: gate, r: ent.r, c: ent.c, openY: -1.4, closedY: 1.5 });
  });

Replace the ENTIRE block with:
  const boundarySpan = safeZone.c2 - safeZone.c1 + 1;
  const midC = Math.round((safeZone.c1 + safeZone.c2) / 2);
  const midR = Math.round((safeZone.r1 + safeZone.r2) / 2);

  // North and South: full-width horizontal panels
  const hPanelGeo = new THREE.BoxGeometry(boundarySpan, 3, 0.35);
  [safeZone.r1, safeZone.r2].forEach(rowR => {
    const panel = new THREE.Mesh(hPanelGeo, gateMat);
    panel.position.set(midC, 1.5, rowR);
    panel.castShadow = true; panel.receiveShadow = true;
    scene.add(panel);
    window.gates.push({ mesh: panel, r: rowR, c: midC, openY: -1.4, closedY: 1.5 });
  });

  // West and East: full-height vertical panels
  const vPanelGeo = new THREE.BoxGeometry(0.35, 3, boundarySpan);
  [safeZone.c1, safeZone.c2].forEach(colC => {
    const panel = new THREE.Mesh(vPanelGeo, gateMat);
    panel.position.set(colC, 1.5, midR);
    panel.castShadow = true; panel.receiveShadow = true;
    scene.add(panel);
    window.gates.push({ mesh: panel, r: midR, c: colC, openY: -1.4, closedY: 1.5 });
  });
```

**Verify:** Night — 4 solid brown panels cover ALL Glade openings, no gaps.
Morning — all 4 panels slide below floor.
**Mark complete when:** No visual gaps in gate at night.

---

## SECTION 2 — UI / UX Overhaul

---

### TASK 4 — Agent-themed login screen
**Status:** `[COMPLETE]`
**Priority:** 🟠 High

**Files:** `frontend/index.html`, `frontend/css/style.css`

**Antigravity Prompt:**
```
CHANGE 1 — Edit index.html. Find the auth-modal > modal-content div.
Replace its entire inner content with:
  <div class="modal-badge">WICKED SYSTEMS INC.</div>
  <h2 id="auth-title">Runner Identity</h2>
  <p class="modal-subtitle" id="auth-subtitle">Identify yourself, Glader.</p>
  <div class="input-group">
    <input type="text" id="username" placeholder="CALLSIGN" autocomplete="off">
  </div>
  <div class="input-group">
    <input type="password" id="password" placeholder="ACCESS CODE">
  </div>
  <div class="button-group">
    <button id="auth-submit">ENTER THE MAZE</button>
    <button id="toggle-auth">NEW RUNNER? REGISTER</button>
  </div>
  <p id="auth-error" class="error hidden"></p>

CHANGE 2 — Edit css/style.css. Add at the bottom:
  .modal-badge {
    font-size: 10px; letter-spacing: 4px; color: var(--primary);
    border: 1px solid rgba(74,255,140,0.3); padding: 4px 12px;
    border-radius: 20px; display: inline-block; margin-bottom: 20px;
    font-family: 'Courier Prime', monospace;
  }
  .modal-subtitle {
    font-size: 13px; color: rgba(255,255,255,0.4); letter-spacing: 1px;
    margin: -20px 0 24px; font-family: 'Courier Prime', monospace;
  }
  .modal-content { position: relative; }
  h2 { text-shadow: 0 0 20px rgba(74,255,140,0.3); }
```

**Verify:** Login shows "WICKED SYSTEMS INC." badge and "Identify yourself, Glader." subtitle.
**Mark complete when:** Agent theme applied to login.

---

### TASK 5 — Add key hints panel to HUD
**Status:** `[COMPLETE]`
**Priority:** 🟠 High

**Files:** `frontend/index.html`, `frontend/css/style.css`

**Antigravity Prompt:**
```
CHANGE 1 — Edit index.html. Find div id="hud".
Add inside the hud div (after the player-pos div):
  <div id="key-hints" class="hud-item key-hints-panel">
    <span>WASD move</span>
    <span>SHIFT sprint</span>
    <span>SPACE solve</span>
    <span>1/2/3 algo</span>
    <span>4 compare</span>
    <span>M minimap</span>
    <span>TAB chart</span>
  </div>

CHANGE 2 — Edit css/style.css. Add at the bottom:
  .key-hints-panel {
    position: absolute; bottom: 25px; right: 25px;
    display: flex; flex-direction: column; gap: 4px;
    font-size: 11px; letter-spacing: 1px;
    opacity: 0.45; padding: 10px 16px;
  }
  .key-hints-panel span { color: #aaa; font-family: 'Courier Prime', monospace; }
  .key-hints-panel span::before { content: '›  '; color: var(--primary); }
```

**Verify:** Bottom-right shows subtle key hint list.
**Mark complete when:** Hints visible, opacity is low enough not to distract.

---

### TASK 6 — Add /api/scores leaderboard endpoint
**Status:** `[COMPLETE]`
**Priority:** 🟠 High

**File:** `backend/app.py`

**Antigravity Prompt:**
```
Edit app.py. Find the /api/stats GET route.
Add a NEW route immediately AFTER it:

  @app.route('/api/scores', methods=['GET'])
  def get_scores():
      try:
          rows = db_query(
              "SELECT u.username, s.time_taken FROM scores s "
              "JOIN users u ON s.user_id = u.id "
              "ORDER BY s.time_taken ASC LIMIT 10"
          )
          return jsonify([dict(r) for r in (rows or [])])
      except Exception as e:
          return jsonify([])
```

**Verify:** `curl http://127.0.0.1:5000/api/scores` returns `[]` or a JSON array.
`python -m py_compile backend/app.py` — no errors.
**Mark complete when:** Endpoint exists and compiles.

---

### TASK 7 — Track game start time
**Status:** `[COMPLETE]`
**Priority:** 🟠 High

**File:** `frontend/js/main.js`

**Antigravity Prompt:**
```
Edit main.js. Find inside overlay.onclick handler:
  startTimeMillis = Date.now();
Add ONE line AFTER it:
  window._startTime = Date.now();
```

**Mark complete when:** `window._startTime` set on game entry.

---

### TASK 8 — Restyle win and game-over screens
**Status:** `[COMPLETE]`
**Priority:** 🟠 High

**File:** `frontend/js/ui.js`

**Antigravity Prompt:**
```
Edit ui.js.

REPLACE window.showWinScreen = async function() entirely with:

  window.showWinScreen = async function() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.95);z-index:9999;display:flex;flex-direction:column;' +
      'justify-content:center;align-items:center;font-family:Space Grotesk;' +
      'text-align:center;color:#4aff8c;';
    const day     = window.getDayNumber ? window.getDayNumber() : 1;
    const elapsed = window._startTime ? Math.round((Date.now()-window._startTime)/1000) : 0;
    const xp      = day * 100 + Math.max(0, 300 - elapsed);
    let lbHtml = '';
    try {
      const res = await fetch('/api/scores');
      if (res.ok) {
        const scores = await res.json();
        const rows = scores.slice(0,5).map((s,i)=>
          `<tr><td style="padding:6px 16px;color:#4aff8c">#${i+1}</td>` +
          `<td style="padding:6px 16px;color:white">${s.username||'Runner'}</td>` +
          `<td style="padding:6px 16px;color:#ffcc00">${Math.round(s.time_taken)}s</td></tr>`
        ).join('');
        if (rows) lbHtml = `<div style="margin-top:20px;background:rgba(74,255,140,0.05);` +
          `border:1px solid rgba(74,255,140,0.2);border-radius:12px;padding:14px 0;min-width:300px;">` +
          `<p style="font-size:10px;letter-spacing:3px;color:#4aff8c;margin:0 0 8px;">TOP RUNNERS</p>` +
          `<table style="width:100%;border-collapse:collapse;">${rows}</table></div>`;
      }
    } catch(e) {}
    overlay.innerHTML =
      `<div style="font-size:10px;letter-spacing:4px;color:#4aff8c;border:1px solid ` +
      `rgba(74,255,140,0.3);padding:4px 14px;border-radius:20px;margin-bottom:16px;">` +
      `WICKED SYSTEMS — MISSION COMPLETE</div>` +
      `<h1 style="font-size:3.5rem;margin:0 0 8px;text-shadow:0 0 30px rgba(74,255,140,0.5);">` +
      `MAZE CONQUERED</h1>` +
      `<p style="font-size:1.1rem;color:rgba(255,255,255,0.7);margin:0 0 4px;">` +
      `Day ${day}  ·  ${elapsed}s total</p>` +
      `<p style="font-size:1.4rem;color:#ffcc00;font-weight:700;margin:0 0 8px;">+${xp} XP</p>` +
      lbHtml +
      `<button onclick="location.reload()" style="margin-top:28px;background:#4aff8c;color:#000;` +
      `padding:14px 40px;border-radius:30px;font-weight:700;cursor:pointer;border:none;` +
      `font-size:1rem;letter-spacing:2px;font-family:Space Grotesk;text-transform:uppercase;">` +
      `NEW EXPEDITION</button>`;
    document.body.appendChild(overlay);
  };

REPLACE window.showGameOverScreen = function() entirely with:

  window.showGameOverScreen = function() {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'background:rgba(0,0,0,0.97);z-index:9999;display:flex;flex-direction:column;' +
      'justify-content:center;align-items:center;font-family:Space Grotesk;' +
      'text-align:center;color:#ff4a4a;';
    const day = window.getDayNumber ? window.getDayNumber() : 1;
    overlay.innerHTML =
      `<div style="font-size:10px;letter-spacing:4px;color:#ff4a4a;border:1px solid ` +
      `rgba(255,74,74,0.3);padding:4px 14px;border-radius:20px;margin-bottom:16px;">` +
      `RUNNER ELIMINATED</div>` +
      `<h1 style="font-size:3.5rem;margin:0 0 8px;">GRIEVED</h1>` +
      `<p style="font-size:1.1rem;color:rgba(255,255,255,0.6);margin:0 0 20px;">` +
      `The Griever claimed another Runner on Day ${day}.</p>` +
      `<p style="font-size:0.9rem;color:rgba(255,255,255,0.3);` +
      `font-family:Courier Prime,monospace;letter-spacing:2px;">` +
      `THE MAZE REMEMBERS NOTHING.</p>` +
      `<button onclick="location.reload()" style="margin-top:28px;background:#ff4a4a;` +
      `color:white;padding:14px 40px;border-radius:30px;font-weight:700;cursor:pointer;` +
      `border:none;font-size:1rem;letter-spacing:2px;font-family:Space Grotesk;` +
      `text-transform:uppercase;">TRY AGAIN</button>`;
    document.body.appendChild(overlay);
  };
```

**Verify:** Win screen shows "MISSION COMPLETE" badge, XP earned, leaderboard.
Game-over shows "GRIEVED" with day number.
**Mark complete when:** Both screens use agent/hacker theme.

---

## SECTION 3 — Minimap, Progress Bar, Polish

---

### TASK 9 — Minimap top-right, always-on, 200×200
**Status:** `[COMPLETE]`
**Priority:** 🟠 High

**Files:** `frontend/js/ui.js`, `frontend/js/main.js`

**Antigravity Prompt:**
```
CHANGE 1 — Edit ui.js. Find window.initMinimap = function().

Change canvas size:
  minimapCanvas.width  = 200;
  minimapCanvas.height = 200;

Replace cssText with:
  minimapCanvas.style.cssText = [
    'position:fixed', 'top:80px', 'right:25px',
    'width:200px', 'height:200px',
    'border:1px solid rgba(74,255,140,0.2)',
    'border-radius:10px', 'background:rgba(0,0,0,0.8)',
    'z-index:150', 'display:none'
  ].join(';');

In window.updateMinimap:
  Change clearRect(0,0,180,180) to clearRect(0,0,200,200).
  Change: const cs = Math.floor(180 / Math.max(rows, cols));
  To:
    const cs      = Math.floor(196 / Math.max(rows, cols));
    const offsetX = Math.floor((200 - cols * cs) / 2);
    const offsetY = Math.floor((200 - rows * cs) / 2);

  For ALL fillRect(c*cs, r*cs, ...) calls, add offsetX and offsetY:
    minimapCtx.fillRect(offsetX + c*cs, offsetY + r*cs, cs, cs);

  For safe zone fillRect, prefix with offsetX/offsetY.
  For exit fillRect, prefix with offsetX/offsetY.
  For Griever arc, prefix cx/cy with offsetX/offsetY.
  For Player arc, prefix cx/cy with offsetX/offsetY.

  At END of updateMinimap add:
    minimapCtx.fillStyle = 'rgba(255,255,255,0.4)';
    minimapCtx.font = 'bold 9px monospace';
    minimapCtx.fillText('N', 94, 11);
    minimapCtx.fillStyle = 'rgba(74,255,140,0.3)';
    minimapCtx.font = '8px monospace';
    minimapCtx.fillText('MAP', 80, 198);

CHANGE 2 — Edit main.js. Find inside initGame() after setGates(true) line:
  if (!window._minimapShown) {
    if (window.toggleMinimap) window.toggleMinimap();
    window._minimapShown = true;
  }
```

**Verify:** Minimap visible top-right on game start. N compass at top, MAP at bottom.
Fog of war, player dot, Griever dot all correct.
**Mark complete when:** Minimap in top-right, auto-visible, 200×200.

---

### TASK 10 — Day progress bar under phase badge
**Status:** `[COMPLETE]`
**Priority:** 🟡 Medium

**File:** `frontend/js/ui.js`

**Antigravity Prompt:**
```
Edit ui.js. At the END of window.updateHUD (before closing brace) add:

  let dayBar = document.getElementById('day-progress-bar');
  if (!dayBar) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;top:68px;left:25px;width:185px;' +
      'height:3px;background:rgba(255,255,255,0.08);border-radius:2px;' +
      'z-index:150;pointer-events:none;';
    dayBar = document.createElement('div');
    dayBar.id = 'day-progress-bar';
    dayBar.style.cssText = 'height:3px;border-radius:2px;width:0%;' +
      'transition:width 0.9s linear,background 0.5s;';
    wrap.appendChild(dayBar);
    document.body.appendChild(wrap);
  }
  const totalCycle = 150;
  const elapsedC   = totalCycle - Math.max(0, Math.floor(timeRemaining));
  const pct        = Math.min(100, Math.round((elapsedC / totalCycle) * 100));
  dayBar.style.width      = pct + '%';
  dayBar.style.background = phase === 'night' ? '#ff4a4a'
    : phase === 'evening' ? '#ffcc00' : '#4aff8c';
```

**Verify:** Thin 3px bar below phase badge depletes: green → yellow → red.
**Mark complete when:** Bar visible and synced with phase.

---

### TASK 11 — Pulsing exit door glow
**Status:** `[COMPLETE]`
**Priority:** 🟡 Medium

**Files:** `frontend/js/maze_builder.js`, `frontend/js/main.js`

**Antigravity Prompt:**
```
CHANGE 1 — Edit maze_builder.js. Find and replace the endMesh block:

  const endMat = new THREE.MeshLambertMaterial({ color: 0xff4a4a, transparent: true, opacity: 0.6 });
  const endMesh = new THREE.Mesh(tileGeo, endMat);
  endMesh.position.set(grid[0].length - 2, 0.02, grid.length - 2);
  endMesh.rotation.x = -Math.PI / 2;
  scene.add(endMesh);
  window.mazeDecorations.push(endMesh);

With:
  const endMat = new THREE.MeshLambertMaterial({
    color: 0xff4a4a, transparent: true, opacity: 0.85,
    emissive: new THREE.Color(0xff1a1a), emissiveIntensity: 0.8
  });
  const endMesh = new THREE.Mesh(tileGeo, endMat);
  endMesh.position.set(grid[0].length - 2, 0.02, grid.length - 2);
  endMesh.rotation.x = -Math.PI / 2;
  scene.add(endMesh);
  window.mazeDecorations.push(endMesh);
  const exitLight = new THREE.PointLight(0xff4a4a, 1.8, 7);
  exitLight.position.set(grid[0].length - 2, 1.5, grid.length - 2);
  scene.add(exitLight);
  window.mazeDecorations.push(exitLight);
  window.exitLight = exitLight;
  window.exitLightPhase = 0;

CHANGE 2 — Edit main.js. Find inside gameLoop() before renderer.render():
  if (window.exitLight) {
    window.exitLightPhase = (window.exitLightPhase || 0) + 0.04;
    window.exitLight.intensity = 1.2 + Math.sin(window.exitLightPhase) * 0.9;
  }
```

**Mark complete when:** Red pulsing glow visible at maze exit.

---

### TASK 12 — Griever proximity screen pulse
**Status:** `[COMPLETE]`
**Priority:** 🟡 Medium

**File:** `frontend/js/griever_renderer.js`

**Antigravity Prompt:**
```
Edit griever_renderer.js. Inside the per-griever loop in updateGriever.
Find the game over check:
  const ddx = gv.mesh.position.x - playerPos.c;
  const ddz = gv.mesh.position.z - playerPos.r;
  if (Math.sqrt(ddx*ddx + ddz*ddz) < 0.8 && !window.gameOver) {

Add BEFORE that block:
  if (gv === window.grievers[0]) {
    const dist = Math.sqrt(ddx*ddx + ddz*ddz);
    if (dist < 7 && !window.playerTrapped) {
      const t = Math.round((1 - Math.min(dist,7)/7) * 200);
      document.body.style.boxShadow =
        `inset 0 0 ${30+t}px rgba(${t+55},0,0,${0.2+(1-dist/7)*0.5})`;
    } else if (dist >= 7 && !window.playerTrapped) {
      document.body.style.boxShadow = '';
    }
  }
```

**Mark complete when:** Red glow on screen edges near Griever.

---

## Build Order

| Step | Task | File(s) | Test |
|------|------|---------|------|
| 1 | Task 1 — Boundary registry | `maze_builder.js` | `window.safeBoundaryCells.size > 20` in console |
| 2 | Task 2 — Block boundary | `player.js` | Cannot enter Glade at night from ANY angle |
| 3 | Task 3 — Wide gate panels | `maze_builder.js` | Full-width panels, no visual gaps |
| 4 | Task 6 — /api/scores | `app.py` | `curl /api/scores` returns JSON |
| 5 | Task 7 — Start time | `main.js` | `window._startTime` set in console |
| 6 | Task 4 — Login theme | `index.html` + `style.css` | "WICKED SYSTEMS INC." visible |
| 7 | Task 5 — Key hints HUD | `index.html` + `style.css` | Hints bottom-right |
| 8 | Task 8 — Win/game-over | `ui.js` | Win shows XP + leaderboard |
| 9 | Task 9 — Minimap top-right | `ui.js` + `main.js` | Map top-right, auto-on, 200px |
| 10 | Task 10 — Progress bar | `ui.js` | 3px bar under badge |
| 11 | Task 11 — Exit glow | `maze_builder.js` + `main.js` | Pulsing red at exit |
| 12 | Task 12 — Proximity pulse | `griever_renderer.js` | Screen glows near Griever |

---

## Verification

```bash
cd maze-runner-3d/backend
python -m py_compile app.py           && echo "app OK"
python -m py_compile maze_generator.py && echo "maze OK"
python -m py_compile griever.py       && echo "griever OK"
python -m py_compile csp_solver.py    && echo "csp OK"
python -m py_compile solvers.py       && echo "solvers OK"
python app.py
# http://127.0.0.1:5000 — DevTools console: 0 red errors
```

---

## Gate Fix — Viva Explanation

**Q: Why did players pass through the gate at night?**
"The safe zone is a 7×7 cleared area. All cells on the boundary are `grid=0` (walkable).
We placed 4 gate meshes at the 4 midpoint cells — but the other ~24 boundary cells
had no collision. Players walked diagonally through any unguarded cell."

**Q: How is it fixed?**
"In `buildMaze()` we build `window.safeBoundaryCells` — a Set containing every cell
on all 4 sides of the safe zone perimeter. In `hitsWall()`, when `gateActive` (night
or evening), any cell in this Set returns `true` (blocked). The entire 28-cell
boundary is now impassable, not just the 4 mesh positions."

**Q: What about the visual gate?**
"We replaced the 4 thin 1-unit gates with 4 full-width panels — North and South span
the full 7-cell width; West and East span the full 7-cell height. They slide below
the floor in the morning and rise at evening."

---

*End of Implementation Guide v7 — Gate Fix + UI Overhaul*
*23AD404 Artificial Intelligence | MEPCO R2023 | BTech AI & Data Science*
