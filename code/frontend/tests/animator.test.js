/**
 * Tests the animation engine + logical store together, with minimal stand-ins
 * for the Three.js groups. No browser, no WebGL, no backend needed.
 *
 * These cover the two things the old Buttons.jsx got wrong:
 *   - it silently DROPPED any move requested while an animation was running
 *   - it kept no logical state at all, so nothing could be verified
 *
 * Run: npm test
 */

import test from "node:test";
import assert from "node:assert";

import JEASINGS from "jeasings";
import { createAnimator } from "../src/cube/animate.js";
import { useCubeStore } from "../src/store/cubeStore.js";
import { applyMoves } from "../src/cube/moves.js";
import { SOLVED, isSolved } from "../src/cube/facelets.js";

// --- minimal Three.js stand-ins (only what the animator touches) ------------

const mkVec = () => ({
  x: 0,
  y: 0,
  z: 0,
  set(a, b, c) {
    this.x = a;
    this.y = b;
    this.z = c;
  },
});

function mkGroup() {
  return {
    children: [],
    position: mkVec(),
    rotation: mkVec(),
    quaternion: { set() {} },
    attach(c) {
      if (c.__parent) {
        c.__parent.children = c.__parent.children.filter((k) => k !== c);
      }
      c.__parent = this;
      this.children.push(c);
    },
  };
}

function harness() {
  const cube = mkGroup();
  const rot = mkGroup();
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) {
        // Three.js positions are Vector3, so they carry .set() -- the animator
        // uses it to snap cubelets back onto the integer lattice each turn.
        const p = mkVec();
        p.set(x, y, z);
        cube.attach({ position: p });
      }

  const done = [];
  const animator = createAnimator({
    cubeGroup: { current: cube },
    rotationGroup: { current: rot },
    onMoveDone: (move, count) => {
      done.push(move);
      useCubeStore.getState().applyMove(move, count);
    },
  });

  // JEASINGS.update() reads the wall clock, so this must be a real loop.
  const raf = setInterval(() => JEASINGS.update(), 8);
  const drain = async () => {
    while (animator.pending) await new Promise((r) => setTimeout(r, 20));
    await new Promise((r) => setTimeout(r, 40));
  };
  return { cube, rot, done, animator, drain, stop: () => clearInterval(raf) };
}

const SEXY = ["R", "U", "R'", "U'"];

test("queued moves are never dropped, even mid-animation", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(SOLVED, 0);
  const seq = [...SEXY, ...SEXY, ...SEXY];

  h.animator.enqueue(seq, true);
  h.animator.enqueue(seq, true); // arrives while the first batch is running
  await h.drain();

  assert.strictEqual(h.done.length, 24, "every queued move should complete");
  assert.strictEqual(h.done.join(" "), seq.concat(seq).join(" "), "order kept");
  assert.ok(useCubeStore.getState().isSolved(), "sexy move x6 is the identity");
  assert.strictEqual(useCubeStore.getState().history.length, 24);
  assert.strictEqual(h.cube.children.length, 27, "cubelets re-parented back");
  assert.strictEqual(h.rot.children.length, 0, "rotation group emptied");
  h.stop();
});

test("assisted playback does not inflate the user's move count", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(applyMoves(SOLVED, ["R", "U2", "F'"]), 3);

  h.animator.enqueue(["F", "U2", "R'"], false); // count=false -> assisted
  await h.drain();

  assert.ok(useCubeStore.getState().isSolved(), "playback reaches solved");
  assert.strictEqual(useCubeStore.getState().history.length, 0);
  h.stop();
});

test("whole-cube rotations play back without crashing", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(SOLVED, 0);

  h.animator.enqueue(["X", "Y'", "Z2"], false);
  await h.drain();

  assert.strictEqual(useCubeStore.getState().facelets.length, 54);
  h.stop();
});

test("undo restores the previous state exactly (no double-apply)", async () => {
  const h = harness();
  const scramble = applyMoves(SOLVED, ["R"]);
  useCubeStore.getState().loadScramble(scramble, 1);

  h.animator.enqueue("U", true);
  await h.drain();
  assert.strictEqual(useCubeStore.getState().history.length, 1);

  // undo() rewinds the bookkeeping and returns the move for the animator to
  // play; the animator advances `facelets` exactly once.
  const move = useCubeStore.getState().undo();
  h.animator.enqueue(move, false);
  await h.drain();

  assert.strictEqual(useCubeStore.getState().facelets, scramble);
  assert.strictEqual(useCubeStore.getState().history.length, 0);
  h.stop();
});

test("onStep callback is invoked and setSpeed updates speed", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(SOLVED, 0);

  const steps = [];
  h.animator.onStep = (move, count) => {
    steps.push({ move, count });
  };

  h.animator.setSpeed(2.5);
  assert.strictEqual(h.animator.speed, 2.5);

  h.animator.enqueue(["R", "U"], false);
  await h.drain();

  assert.strictEqual(steps.length, 2);
  assert.deepStrictEqual(steps, [
    { move: "R", count: false },
    { move: "U", count: false },
  ]);
  h.stop();
});

test("animation speeds up dynamically when moves accumulate in the queue", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(SOLVED, 0);

  const start = Date.now();
  h.animator.enqueue(["R", "U", "R'", "U'"], true);
  await h.drain();
  const elapsed = Date.now() - start;

  // Unboosted time: 4 * 220ms = 880ms + 60ms drain = ~940ms.
  // With queue multiplier (2.5x, 2.0x, 1.5x), it drains significantly faster (< 750ms).
  assert.ok(elapsed < 750, `expected queue-boosted moves to finish under 750ms, took ${elapsed}ms`);
  assert.strictEqual(h.done.length, 4);
  assert.deepStrictEqual(h.done, ["R", "U", "R'", "U'"]);
  assert.strictEqual(useCubeStore.getState().history.length, 4);
  assert.strictEqual(h.cube.children.length, 27, "all 27 cubelets in cubeGroup");
  assert.strictEqual(h.rot.children.length, 0, "rotationGroup cleanly emptied");

  for (const c of h.cube.children) {
    assert.strictEqual(c.position.x, Math.round(c.position.x));
    assert.strictEqual(c.position.y, Math.round(c.position.y));
    assert.strictEqual(c.position.z, Math.round(c.position.z));
  }
  h.stop();
});

test("fastForward immediately completes in-flight move and updates logical state", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(SOLVED, 0);

  h.animator.enqueue("R", true);
  assert.ok(h.animator.isBusy, "animator should be busy immediately");
  assert.strictEqual(h.done.length, 0, "move has not completed yet");

  h.animator.fastForward();
  assert.strictEqual(h.animator.isBusy, false, "animator should no longer be busy");
  assert.strictEqual(h.done.length, 1, "move should be completed by fastForward");
  assert.strictEqual(h.done[0], "R");
  assert.strictEqual(useCubeStore.getState().history.length, 1);
  assert.strictEqual(h.cube.children.length, 27, "all cubelets reparented back");
  assert.strictEqual(h.rot.children.length, 0, "rotation group emptied");
  h.stop();
});

test("rapid move inputs with fastForward process in exact order with zero lag and zero desync", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(SOLVED, 0);

  const moves = ["R", "U", "R'", "U'"];
  for (const m of moves) {
    h.animator.fastForward();
    h.animator.enqueue(m, true);
  }
  await h.drain();

  assert.strictEqual(h.done.length, 4);
  assert.deepStrictEqual(h.done, ["R", "U", "R'", "U'"]);
  assert.strictEqual(useCubeStore.getState().history.length, 4);
  assert.strictEqual(h.cube.children.length, 27);
  assert.strictEqual(h.rot.children.length, 0);
  h.stop();
});

test("cancel drops queued moves and in-flight move without firing callbacks", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(SOLVED, 0);

  h.animator.enqueue(["R", "U", "F"], true);
  assert.ok(h.animator.isBusy);

  h.animator.cancel();
  assert.strictEqual(h.animator.isBusy, false);
  assert.strictEqual(h.animator.pending, 0);
  assert.strictEqual(h.done.length, 0, "cancelled in-flight move should not fire onMoveDone");
  assert.strictEqual(useCubeStore.getState().history.length, 0, "store history untouched");
  assert.strictEqual(h.cube.children.length, 27, "all cubelets returned to cubeGroup");
  assert.strictEqual(h.rot.children.length, 0, "rot group clean");
  h.stop();
});

test("fastForwardAll drains entire queue synchronously to completion", async () => {
  const h = harness();
  useCubeStore.getState().loadScramble(SOLVED, 0);

  h.animator.enqueue(["R", "U", "R'", "U'"], true);
  assert.ok(h.animator.isBusy);

  h.animator.fastForwardAll();
  assert.strictEqual(h.animator.isBusy, false);
  assert.strictEqual(h.animator.pending, 0);
  assert.strictEqual(h.done.length, 4);
  assert.deepStrictEqual(h.done, ["R", "U", "R'", "U'"]);
  assert.strictEqual(useCubeStore.getState().history.length, 4);
  h.stop();
});

test("manually solving cube automatically sets finishedAt and stops timer", async () => {
  const h = harness();
  const scramble = applyMoves(SOLVED, ["R", "U"]);
  useCubeStore.getState().loadScramble(scramble, 2);

  assert.strictEqual(useCubeStore.getState().startedAt, null);
  assert.strictEqual(useCubeStore.getState().finishedAt, null);
  assert.strictEqual(useCubeStore.getState().isSolved(), false);

  // User manually makes first move: U'
  h.animator.enqueue("U'", true);
  await h.drain();

  assert.ok(useCubeStore.getState().startedAt !== null, "startedAt set on first move");
  assert.strictEqual(useCubeStore.getState().finishedAt, null, "not yet solved");
  assert.strictEqual(useCubeStore.getState().isSolved(), false);

  // User manually makes solving move: R'
  h.animator.enqueue("R'", true);
  await h.drain();

  assert.ok(useCubeStore.getState().isSolved(), "cube is solved");
  assert.ok(useCubeStore.getState().finishedAt !== null, "finishedAt is automatically set");
  assert.ok(useCubeStore.getState().finishedAt >= useCubeStore.getState().startedAt);
  const elapsed = useCubeStore.getState().elapsedSeconds();
  assert.ok(elapsed >= 0);

  // Moving away from solved state resets finishedAt to null
  h.animator.enqueue("R", true);
  await h.drain();
  assert.strictEqual(useCubeStore.getState().isSolved(), false);
  assert.strictEqual(useCubeStore.getState().finishedAt, null, "finishedAt reset when no longer solved");

  h.stop();
});

test("reoriented solved cube (monochromatic faces in any orientation) is solved and stops timer", async () => {
  const h = harness();
  // Cube rotated around X axis via slice move M': R L' M'
  const rotXSolved = applyMoves(SOLVED, ["R", "L'", "M'"]);
  assert.ok(isSolved(rotXSolved), "isSolved handles reoriented cube");

  // Scramble from that reoriented state with U
  const scrambled = applyMoves(rotXSolved, ["U"]);
  useCubeStore.getState().loadScramble(scrambled, 1);

  assert.strictEqual(useCubeStore.getState().isSolved(), false);
  assert.strictEqual(useCubeStore.getState().finishedAt, null);

  // Solve with U'
  h.animator.enqueue("U'", true);
  await h.drain();

  assert.ok(useCubeStore.getState().isSolved(), "cube in reoriented state is solved");
  assert.ok(useCubeStore.getState().finishedAt !== null, "timer automatically stopped for reoriented solve");
  h.stop();
});



