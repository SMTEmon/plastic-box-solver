import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { useCubeStore } from "../src/store/cubeStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const celebrationPath = path.resolve(
  __dirname,
  "../src/Components/SolveCelebration.jsx",
);
const celebrationSource = fs.readFileSync(celebrationPath, "utf8");

// Extract pure helper module portion before the React default export for direct Node execution
const pureModuleSource =
  celebrationSource
    .replace(/^import\s+\{[^}]+\}\s+from\s+["']react["'];?\s*/m, "")
    .split("export default function SolveCelebration")[0] +
  "\nexport { RUBIK_CONFETTI_COLORS, createCelebrationParticles, stepCelebrationParticles, shouldTriggerCelebration };\n";

const celebrationMod = await import(
  `data:text/javascript;base64,${Buffer.from(pureModuleSource).toString("base64")}`
);

const {
  RUBIK_CONFETTI_COLORS,
  createCelebrationParticles,
  stepCelebrationParticles,
  shouldTriggerCelebration,
} = celebrationMod;

test("SolveCelebration: exports 6 canonical Rubik sticker colors plus neon cyan", () => {
  assert.ok(Array.isArray(RUBIK_CONFETTI_COLORS));
  assert.strictEqual(RUBIK_CONFETTI_COLORS.length, 7);
  assert.ok(RUBIK_CONFETTI_COLORS.includes("#ffffff"));
  assert.ok(RUBIK_CONFETTI_COLORS.includes("#facc15"));
  assert.ok(RUBIK_CONFETTI_COLORS.includes("#22c55e"));
  assert.ok(RUBIK_CONFETTI_COLORS.includes("#3b82f6"));
  assert.ok(RUBIK_CONFETTI_COLORS.includes("#ef4444"));
  assert.ok(RUBIK_CONFETTI_COLORS.includes("#f97316"));
});

test("SolveCelebration: createCelebrationParticles and stepCelebrationParticles simulate burst physics until decay", () => {
  const initial = createCelebrationParticles(1024, 768, 48);
  assert.strictEqual(initial.length, 48);

  for (const p of initial) {
    assert.strictEqual(typeof p.x, "number");
    assert.strictEqual(typeof p.y, "number");
    assert.strictEqual(typeof p.vx, "number");
    assert.strictEqual(typeof p.vy, "number");
    assert.strictEqual(p.alpha, 1);
    assert.ok(p.decay > 0);
  }

  const stepped = stepCelebrationParticles(initial, 1, 768);
  assert.strictEqual(stepped.length, 48);
  assert.ok(stepped[0].alpha < initial[0].alpha);

  // Advance until all particles fade out
  let current = stepped;
  let ticks = 0;
  while (current.length > 0 && ticks < 300) {
    current = stepCelebrationParticles(current, 1.5, 768);
    ticks += 1;
  }
  assert.strictEqual(current.length, 0, "All confetti particles should decay and clean up");
});

test("SolveCelebration: shouldTriggerCelebration fires only on false -> true when not suppressed", () => {
  assert.strictEqual(shouldTriggerCelebration(false, true, false), true);
  assert.strictEqual(shouldTriggerCelebration(true, true, false), false);
  assert.strictEqual(shouldTriggerCelebration(false, false, false), false);
  assert.strictEqual(shouldTriggerCelebration(true, false, false), false);
  // Suppressed during 4-move reset drill
  assert.strictEqual(shouldTriggerCelebration(false, true, true), false);
});

test("SolveCelebration: component respects prefers-reduced-motion and renders aria-hidden canvas", () => {
  assert.ok(celebrationSource.includes("prefers-reduced-motion: reduce"));
  assert.ok(celebrationSource.includes('aria-hidden="true"'));
  assert.ok(celebrationSource.includes("pointer-events-none"));
});

test("Solve Summary store integration: records solve completion timestamp and move count on solve transition", () => {
  const store = useCubeStore.getState();
  store.reset();

  // Turn R away from solved state (counted move starts timer)
  store.applyMove("R", true);
  let state = useCubeStore.getState();
  assert.strictEqual(state.isSolved(), false);
  assert.strictEqual(state.history.length, 1);
  assert.strictEqual(typeof state.startedAt, "number");
  assert.strictEqual(state.finishedAt, null);

  // Turn R' back to solved state (completes solve and sets finishedAt)
  store.applyMove("R'", true);
  state = useCubeStore.getState();
  assert.strictEqual(state.isSolved(), true);
  assert.strictEqual(state.history.length, 2);
  assert.strictEqual(typeof state.finishedAt, "number");
  assert.ok(state.finishedAt >= state.startedAt);
});
