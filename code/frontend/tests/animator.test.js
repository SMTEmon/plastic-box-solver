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
import { SOLVED } from "../src/cube/facelets.js";

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
