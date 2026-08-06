// ui.js — v4: Evening warning, trapped banner, sunrise message
const phaseBadge     = document.getElementById('phase-badge');
const playerPosBadge = document.getElementById('player-pos');
const safeZoneBadge  = document.getElementById('safe-zone-status');
const grieverAlert   = document.getElementById('griever-alert');
const statsPanel     = document.getElementById('stats-panel');

let chartInstance = null;

// CHANGE A — updateHUD with 6th param 'trapped'
window.updateHUD = function (phase, timeRemaining, playerPos, inSafeZone, activeAlgo, trapped) {
    if (phaseBadge) {
        const dayNum = window.getDayNumber ? window.getDayNumber() : 1;
        phaseBadge.textContent = (() => {
            if (phase === 'morning') return `DAY ${dayNum}  —  MORNING  ${Math.floor(timeRemaining)}s`;
            if (phase === 'evening') return `DAY ${dayNum}  —  GATE CLOSING!`;
            if (phase === 'night')   return `DAY ${dayNum}  —  NIGHT  ${Math.floor(timeRemaining)}s`;
            return `DAY ${dayNum}  —  ${phase.toUpperCase()}  ${Math.floor(timeRemaining)}s`;
        })();
        phaseBadge.classList.toggle('night', phase === 'night' || phase === 'evening');
    }

    if (playerPosBadge) {
        const algoText = activeAlgo ? ` | AI: ${activeAlgo.toUpperCase()}` : '';
        playerPosBadge.textContent = `POS: (${playerPos.r}, ${playerPos.c})${algoText}`;
    }

    if (safeZoneBadge) {
        safeZoneBadge.textContent = inSafeZone ? 'GLADE: SAFE ✓' : 'MAZE: DANGER ✗';
        safeZoneBadge.classList.toggle('danger', !inSafeZone);
    }

    // Red border when trapped at night
    if (trapped && phase === 'night') {
        document.body.style.boxShadow = 'inset 0 0 0 6px #cc0000';
    } else if (!trapped) {
        if (document.body.style.boxShadow === 'inset 0 0 0 6px #cc0000') {
            document.body.style.boxShadow = '';
        }
    }
    // Stamina bar (C3)
    let staminaBar = document.getElementById('stamina-bar-fill');
    if (!staminaBar) {
        const wrap = document.createElement('div');
        wrap.id = 'stamina-wrap';
        wrap.style.cssText = 'position:fixed;bottom:65px;left:25px;width:140px;' +
            'background:rgba(20,20,25,0.7);border:1px solid rgba(255,255,255,0.1);' +
            'border-radius:6px;padding:5px 8px;z-index:150;pointer-events:none;';
        wrap.innerHTML = '<div style="font-size:10px;color:#aaa;font-family:Space Grotesk;' +
            'letter-spacing:2px;margin-bottom:3px;">STAMINA</div>' +
            '<div style="background:#333;border-radius:3px;height:5px;">' +
            '<div id="stamina-bar-fill" style="height:5px;border-radius:3px;' +
            'background:#4aff8c;width:100%;transition:width 0.1s,background 0.3s;"></div></div>';
        document.body.appendChild(wrap);
        staminaBar = document.getElementById('stamina-bar-fill');
    }
    const pct = Math.round(window.staminaPct !== undefined ? window.staminaPct : 100);
    if (staminaBar) {
        staminaBar.style.width = pct + '%';
        staminaBar.style.background = pct < 20 ? '#ff4a4a' : pct < 50 ? '#ffcc00' : '#4aff8c';
    }

    // Task 10: Day progress bar under phase badge
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
    const dayPct     = Math.min(100, Math.round((elapsedC / totalCycle) * 100));
    dayBar.style.width      = dayPct + '%';
    dayBar.style.background = phase === 'night' ? '#ff4a4a'
        : phase === 'evening' ? '#ffcc00' : '#4aff8c';
};

// CHANGE B — Evening warning banner
window.showEveningWarning = function(secondsLeft) {
    let banner = document.getElementById('evening-warning');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'evening-warning';
        banner.style.cssText = [
            'position:fixed', 'top:50px', 'left:50%',
            'transform:translateX(-50%)',
            'background:#cc2200', 'color:white',
            'font-family:Space Grotesk,monospace',
            'font-size:1.1rem', 'font-weight:bold',
            'padding:10px 24px', 'border-radius:6px',
            'z-index:1000', 'pointer-events:none',
            'letter-spacing:0.05em',
            'animation:flash 0.8s infinite alternate'
        ].join(';');
        document.body.appendChild(banner);
    }
    banner.textContent = `GATE CLOSING IN ${secondsLeft}s — RETURN TO GLADE NOW!`;
    banner.style.display = 'block';
};

// CHANGE C — Hide evening warning
window.hideEveningWarning = function() {
    const b = document.getElementById('evening-warning');
    if (b) b.style.display = 'none';
};

// CHANGE D — Trapped banner
window.showTrappedBanner = function() {
    let banner = document.getElementById('trapped-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'trapped-banner';
        banner.style.cssText = [
            'position:fixed', 'bottom:40px', 'left:50%',
            'transform:translateX(-50%)',
            'background:#8b0000', 'color:white',
            'font-family:Space Grotesk,monospace',
            'font-size:1rem', 'font-weight:bold',
            'padding:8px 22px', 'border-radius:6px',
            'z-index:1000', 'pointer-events:none',
            'letter-spacing:0.04em'
        ].join(';');
        document.body.appendChild(banner);
    }
    banner.textContent = 'SURVIVE UNTIL SUNRISE — GATE OPENS AT DAWN';
    banner.style.display = 'block';
};

// CHANGE E — Hide trapped banner
window.hideTrappedBanner = function() {
    const b = document.getElementById('trapped-banner');
    if (b) b.style.display = 'none';
};

// CHANGE F — Sunrise flash
window.showSunriseMessage = function(dayNumber) {
    const msg = document.createElement('div');
    msg.style.cssText = [
        'position:fixed', 'top:50%', 'left:50%',
        'transform:translate(-50%,-50%)',
        'background:rgba(74,124,63,0.92)',
        'color:#aee88a',
        'font-family:Space Grotesk,monospace',
        'font-size:1.6rem', 'font-weight:bold',
        'padding:20px 40px', 'border-radius:8px',
        'z-index:2000', 'text-align:center',
        'pointer-events:none'
    ].join(';');
    msg.innerHTML = `DAY ${dayNumber}<br>` +
      `<span style="font-size:0.85rem;color:#d0f0b0">Gate open — maze regenerated</span>`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 3000);
};

window.updateStatsPanel = function (bfs, dfs, astar) {
    if (!bfs || !dfs || !astar) return;
    // A6: Do not auto-show — toggleStatsPanel handles visibility

    if (!chartInstance) {
        const ctx = document.getElementById('algoChart').getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels: ['Nodes Visited', 'Path Length', 'Time (ms)'], datasets: [] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: 'white', font: { family: 'Outfit' } } },
                    title: { display: true, text: 'Algorithm Performance Comparison', color: 'white', font: { size: 16, family: 'Space Grotesk' } }
                },
                scales: {
                    x: { ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { beginAtZero: true, ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    // A5: Fixed dataset with null-safe values
    chartInstance.data.datasets = [
        {
            label: 'BFS',
            data: [bfs.steps_count || 0, bfs.path_length || 0, Math.round(bfs.time_ms || 0)],
            backgroundColor: 'rgba(74,140,255,0.8)', borderColor: '#4a8cff', borderWidth: 1
        },
        {
            label: 'DFS',
            data: [dfs.steps_count || 0, dfs.path_length || 0, Math.round(dfs.time_ms || 0)],
            backgroundColor: 'rgba(255,107,74,0.8)', borderColor: '#ff6b4a', borderWidth: 1
        },
        {
            label: 'A*',
            data: [astar.steps_count || 0, astar.path_length || 0, Math.round(astar.time_ms || 0)],
            backgroundColor: 'rgba(74,255,140,0.8)', borderColor: '#4aff8c', borderWidth: 1
        }
    ];
    chartInstance.options.scales.y.beginAtZero = true;
    chartInstance.update('none');
};

window.showGrieverAlert = function (state) {
    if (state === 'CHASE') {
        grieverAlert.classList.remove('hidden');
        document.body.style.outline = '3px solid red';
    } else {
        grieverAlert.classList.add('hidden');
        if (document.body.style.outline) document.body.style.outline = '';
    }
};

// Task 8: Restyle win and game-over screens
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

window.toggleStatsPanel = function () {
    if (window._statsVisible) {
        statsPanel.classList.add('hidden');
        window._statsVisible = false;
    } else {
        statsPanel.classList.remove('hidden');
        window._statsVisible = true;
    }
};

// === MINIMAP (C2 — Unit III: Knowledge Representation — fog of war) ===
let minimapVisible = false;
let exploredCells  = new Set();
let minimapCanvas  = null;
let minimapCtx     = null;

window.initMinimap = function() {
    minimapCanvas = document.createElement('canvas');
    minimapCanvas.id = 'minimap';
    minimapCanvas.width  = 200;  // Task 9: enlarged
    minimapCanvas.height = 200;
    minimapCanvas.style.cssText = [
        'position:fixed', 'top:80px', 'right:25px',
        'width:200px', 'height:200px',
        'border:1px solid rgba(74,255,140,0.2)',
        'border-radius:10px', 'background:rgba(0,0,0,0.8)',
        'z-index:150', 'display:none'
    ].join(';');
    document.body.appendChild(minimapCanvas);
    minimapCtx = minimapCanvas.getContext('2d');
};

window.toggleMinimap = function() {
    if (!minimapCanvas) window.initMinimap();
    minimapVisible = !minimapVisible;
    minimapCanvas.style.display = minimapVisible ? 'block' : 'none';
};

window.updateMinimap = function(grid, playerPos, grieverPos) {
    if (!minimapVisible || !minimapCtx || !grid) return;
    const rows = grid.length;
    const cols = grid[0].length;
    const cs      = Math.floor(196 / Math.max(rows, cols));  // Task 6
    const offsetX = Math.floor((200 - cols * cs) / 2);
    const offsetY = Math.floor((200 - rows * cs) / 2);
    minimapCtx.clearRect(0, 0, 200, 200);

    // Mark current + adjacent cells as explored (forward chaining)
    [
        [playerPos.r,   playerPos.c],
        [playerPos.r-1, playerPos.c],
        [playerPos.r+1, playerPos.c],
        [playerPos.r,   playerPos.c-1],
        [playerPos.r,   playerPos.c+1]
    ].forEach(([r,c]) => {
        if (r >= 0 && r < rows && c >= 0 && c < cols) exploredCells.add(`${r},${c}`);
    });

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (!exploredCells.has(`${r},${c}`)) continue;
            minimapCtx.fillStyle = grid[r][c] === 1 ? '#444' : '#888';
            minimapCtx.fillRect(offsetX + c*cs, offsetY + r*cs, cs, cs);
        }
    }
    // Safe zone overlay — brighter green (Task 6)
    if (window.safeZone) {
        const sz = window.safeZone;
        minimapCtx.fillStyle = 'rgba(74,255,140,0.35)';
        minimapCtx.fillRect(
            offsetX + sz.c1*cs, offsetY + sz.r1*cs,
            (sz.c2-sz.c1+1)*cs, (sz.r2-sz.r1+1)*cs
        );
    }
    // Exit marker
    minimapCtx.fillStyle = '#ffcc00';
    minimapCtx.fillRect(offsetX + (cols-2)*cs+1, offsetY + (rows-2)*cs+1, cs-2, cs-2);
    // Griever
    if (grieverPos && exploredCells.has(`${grieverPos.r},${grieverPos.c}`)) {
        minimapCtx.fillStyle = '#ff2200';
        minimapCtx.beginPath();
        minimapCtx.arc(offsetX + grieverPos.c*cs+cs/2, offsetY + grieverPos.r*cs+cs/2, cs, 0, Math.PI*2);
        minimapCtx.fill();
    }
    // Player
    minimapCtx.fillStyle = '#4aff8c';
    minimapCtx.beginPath();
    minimapCtx.arc(offsetX + playerPos.c*cs+cs/2, offsetY + playerPos.r*cs+cs/2, cs, 0, Math.PI*2);
    minimapCtx.fill();
    // Task 9: Compass N + MAP label
    minimapCtx.fillStyle = 'rgba(255,255,255,0.4)';
    minimapCtx.font = 'bold 9px monospace';
    minimapCtx.fillText('N', 94, 11);
    minimapCtx.fillStyle = 'rgba(74,255,140,0.3)';
    minimapCtx.font = '8px monospace';
    minimapCtx.fillText('MAP', 80, 198);
};
