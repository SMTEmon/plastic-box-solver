/**
 * Zero-dependency HTML5 canvas confetti particle burst for cube solve celebrations.
 * Uses the 6 canonical Rubik's Cube sticker colors plus neon accents.
 */

import { useEffect, useRef } from "react";

const RUBIK_CONFETTI_COLORS = [
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
function createCelebrationParticles(width = 800, height = 600, count = 90) {
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
function stepCelebrationParticles(particles, dt = 1, maxHeight = 2000) {
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
function shouldTriggerCelebration(prevSolved, solved, suppressed = false) {
  if (suppressed) return false;
  return !prevSolved && Boolean(solved);
}

export default function SolveCelebration({ solved = false, suppressed = false }) {
  const canvasRef = useRef(null);
  const prevSolvedRef = useRef(Boolean(solved));

  useEffect(() => {
    const shouldFire = shouldTriggerCelebration(
      prevSolvedRef.current,
      solved,
      suppressed,
    );
    if (!suppressed) {
      prevSolvedRef.current = Boolean(solved);
    }
    if (!shouldFire) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    let width = typeof window !== "undefined" ? window.innerWidth : 800;
    let height = typeof window !== "undefined" ? window.innerHeight : 600;
    const dpr = typeof window !== "undefined" ? Math.min(2, window.devicePixelRatio || 1) : 1;

    const syncSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    syncSize();
    window.addEventListener("resize", syncSize);

    let particles = createCelebrationParticles(
      width,
      height,
      prefersReducedMotion ? 24 : 96,
    );
    let rafId = null;
    let lastTime = performance.now();

    const renderFrame = (now) => {
      const elapsedMs = Math.min(48, Math.max(8, now - lastTime));
      lastTime = now;
      const dt = elapsedMs / 16.667;

      ctx.clearRect(0, 0, width, height);
      particles = stepCelebrationParticles(particles, dt, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const w = p.size;
        const h = p.size * p.aspect * Math.max(0.25, Math.abs(Math.cos(p.tilt)));
        ctx.fillStyle = p.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.restore();
      }

      if (particles.length > 0) {
        rafId = window.requestAnimationFrame(renderFrame);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.removeEventListener("resize", syncSize);
      if (rafId) window.cancelAnimationFrame(rafId);
      ctx.clearRect(0, 0, width, height);
    };
  }, [solved, suppressed]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-50 w-full h-full"
    />
  );
}

