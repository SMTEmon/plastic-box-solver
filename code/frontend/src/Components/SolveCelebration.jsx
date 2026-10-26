/**
 * Zero-dependency HTML5 canvas confetti particle burst for cube solve celebrations.
 * Uses the 6 canonical Rubik's Cube sticker colors plus neon accents.
 */

export const RUBIK_CONFETTI_COLORS = [
  "#ffffff", // White (U)
  "#facc15", // Yellow (D)
  "#22c55e", // Green (F)
  "#3b82f6", // Blue (B)
  "#ef4444", // Red (R)
  "#f97316", // Orange (L)
  "#00f0ff", // Neon Cyan accent
];

/**
 * Generates an initial burst of confetti particles across dual launch origins.
 *
 * @param {number} width Canvas width in CSS pixels
 * @param {number} height Canvas height in CSS pixels
 * @param {number} [count=90] Number of particles to spawn
 */
export function createCelebrationParticles(width = 800, height = 600, count = 90) {
  const safeW = Math.max(200, width);
  const safeH = Math.max(200, height);
  const origins = [
    { x: safeW * 0.3, y: safeH * 0.38 },
    { x: safeW * 0.7, y: safeH * 0.38 },
    { x: safeW * 0.5, y: safeH * 0.28 },
  ];

  return Array.from({ length: count }, (_, idx) => {
    const origin = origins[idx % origins.length];
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
    const speed = 5 + Math.random() * 11;
    const size = 6 + Math.random() * 6;

    return {
      x: origin.x + (Math.random() - 0.5) * 40,
      y: origin.y + (Math.random() - 0.5) * 24,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      gravity: 0.24 + Math.random() * 0.1,
      drag: 0.985,
      size,
      aspect: 0.55 + Math.random() * 0.65,
      color: RUBIK_CONFETTI_COLORS[idx % RUBIK_CONFETTI_COLORS.length],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.22,
      tilt: Math.random() * Math.PI * 2,
      vt: 0.08 + Math.random() * 0.14,
      alpha: 1,
      decay: 0.008 + Math.random() * 0.007,
    };
  });
}

/**
 * Advances particle positions and velocities by dt frames (~60fps normalized)
 * and filters out faded or off-screen particles.
 *
 * @param {Array<Object>} particles
 * @param {number} [dt=1]
 * @param {number} [maxHeight=2000]
 */
export function stepCelebrationParticles(particles, dt = 1, maxHeight = 2000) {
  const next = [];
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const vx = p.vx * Math.pow(p.drag, dt);
    const vy = (p.vy + p.gravity * dt) * Math.pow(p.drag, dt);
    const x = p.x + vx * dt;
    const y = p.y + vy * dt;
    const rotation = p.rotation + p.vr * dt;
    const tilt = p.tilt + p.vt * dt;
    const alpha = p.alpha - p.decay * dt;

    if (alpha > 0.02 && y < maxHeight + 60) {
      next.push({
        ...p,
        x,
        y,
        vx,
        vy,
        rotation,
        tilt,
        alpha,
      });
    }
  }
  return next;
}

/**
 * Pure transition detector: returns true only when `solved` transitions
 * from false -> true while not suppressed (e.g. during a practice drill).
 */
export function shouldTriggerCelebration(prevSolved, solved, suppressed = false) {
  if (suppressed) return false;
  return !prevSolved && Boolean(solved);
}
