// night_cycle.js — v4: 3-phase cycle (morning → evening → night)

// D2: Web Audio API sound effects
function playGateClose() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.start(); osc.stop(ctx.currentTime + 1.2);
    } catch(e) {}
}

function playDawnChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784, 1047].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.15;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.25, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
            osc.start(t); osc.stop(t + 0.8);
        });
    } catch(e) {}
}

const CYCLE_DURATION  = 150;   // Task 4: longer day for 31×31 maze
const EVENING_START   = 110;   // warning starts at 110s
const GATE_CLOSE_TIME = 130;   // gate locks at 130s
const NIGHT_END       = 150;   // new day at 150s

window.currentPhase  = 'morning';
window.timeRemaining = CYCLE_DURATION;
window.playerTrapped = false;
window.dayNumber     = 1;
let cycleTimer       = null;
let elapsedSeconds   = 0;
const formations     = ['spiral', 'cross', 'random'];

window.startCycle = function(onNightStart, onDayStart) {
  if (cycleTimer) clearInterval(cycleTimer);
  elapsedSeconds       = 0;
  window.currentPhase  = 'morning';
  window.timeRemaining = CYCLE_DURATION;
  window.playerTrapped = false;

  cycleTimer = setInterval(async () => {
    elapsedSeconds++;
    window.timeRemaining = CYCLE_DURATION - elapsedSeconds;

    // MORNING -> EVENING: show warning
    if (elapsedSeconds === EVENING_START && window.currentPhase === 'morning') {
      window.currentPhase = 'evening';
      if (window.onEveningStart) window.onEveningStart();
    }

    // EVENING -> NIGHT: check trap, close gate, run CSP
    if (elapsedSeconds === GATE_CLOSE_TIME && window.currentPhase === 'evening') {
      window.currentPhase = 'night';

      // TRAP CHECK: is player outside safe zone when gate locks?
      const inSafe = window.isPlayerInSafeZone
        ? window.isPlayerInSafeZone(window.safeZone)
        : true;
      window.playerTrapped = !inSafe;

      // Close the gate mesh
      if (window.setGates) window.setGates(false);
      playGateClose(); // D2

      // CSP maze reformation
      const formation = formations[Math.floor(Math.random() * formations.length)];
      const playerPos = window.getPlayerGridPos ? window.getPlayerGridPos() : null;
      try {
        const res = await fetch('/api/night', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            current_grid:   window.currentGrid,
            formation:      formation,
            player_pos:     playerPos ? [playerPos.r, playerPos.c] : null,
            player_trapped: window.playerTrapped
          })
        });
        if (res.ok) {
          const data         = await res.json();
          const oldGrid      = window.currentGrid;
          window.currentGrid = data.new_grid;
          // Also clear safe zone on frontend for robustness
          if (window.safeZone) {
            const sz = window.safeZone;
            for (let r = sz.r1; r <= sz.r2; r++)
              for (let c = sz.c1; c <= sz.c2; c++)
                window.currentGrid[r][c] = 0;
          }
          window.animateWallTransition(oldGrid, window.currentGrid, window.scene);
          setTimeout(() => window.setNightMode(true), 550);
        }
      } catch(e) { console.error('Night transition failed:', e); }

      if (window.spawnExtraGrievers) window.spawnExtraGrievers(); // C1
      if (onNightStart) onNightStart();
    }

    // NIGHT -> MORNING: new day, open gate
    if (elapsedSeconds >= NIGHT_END) {
      elapsedSeconds       = 0;
      window.timeRemaining = CYCLE_DURATION;
      window.currentPhase  = 'morning';
      window.playerTrapped = false;
      window.dayNumber++;

      if (window.setGates)    window.setGates(true);
      playDawnChime(); // D2
      if (window.setNightMode) window.setNightMode(false);

      if (onDayStart) onDayStart();
    }
  }, 1000);
};

window.getCurrentPhase          = () => window.currentPhase;
window.getTimeRemaining         = () => window.timeRemaining;
window.isPlayerTrapped          = () => window.playerTrapped;
window.getDayNumber             = () => window.dayNumber;
window.getSecondsUntilGateClose = () => {
  if (window.currentPhase !== 'evening') return null;
  return Math.max(0, GATE_CLOSE_TIME - elapsedSeconds);
};
