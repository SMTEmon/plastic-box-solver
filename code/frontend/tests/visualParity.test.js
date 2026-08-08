/**
 * Does the ANIMATION move the cube the same way the MODEL says it moves?
 *
 * moves.js is verified against Python, so the logical model is trustworthy.
 * But animate.js's MOVE_SPEC is a separate, hand-written table of
 * (axis, layer, direction) triples describing how the scene graph physically
 * spins. Nothing tied the two together, and they disagreed on X/Y/Z: the
 * model rotates them one way (ROT_DIR = +1) while a face turn derives its
 * direction from -LAYER. The animation copied the face-turn sign instead.
 *
 * The symptom was ugly and hard to trace: a guided solution (which contains
 * whole-cube rotations) would finish with the store reporting "solved" while
 * the cube on screen was visibly scrambled.
 *
 * This test rebuilds the permutation implied by MOVE_SPEC and asserts it
 * equals the permutation the model uses. It is the thing that was missing.
 */

import test from "node:test";
import assert from "node:assert";

import { GEOM, INDEX_OF, key, rot90 } from "../src/cube/geometry.js";
import { PERMS, ROT_PERMS, applyMove } from "../src/cube/moves.js";
import { SOLVED } from "../src/cube/facelets.js";
import { MOVE_SPEC } from "../src/cube/animate.js";

const AXIS_INDEX = { x: 0, y: 1, z: 2 };

/**
 * The permutation the ANIMATION produces, derived from MOVE_SPEC exactly the
 * way animate.js uses it: pick the cubelets in the layer, rotate their
 * position and normal by (PI/2 * sign) about the axis.
 */
function permutationFromMoveSpec(token) {
  const spec = MOVE_SPEC[token];
  const axis = AXIS_INDEX[spec.axis];
  const perm = [...Array(54).keys()];

  GEOM.forEach((g, i) => {
    const inLayer =
      spec.limit === null
        ? true
        : spec.limit < 0
          ? g.pos[axis] < spec.limit
          : g.pos[axis] > spec.limit;
    if (!inLayer) return;
    const j = INDEX_OF.get(
      key(rot90(g.pos, axis, spec.sign), rot90(g.normal, axis, spec.sign)),
    );
    perm[j] = i;
  });
  return perm;
}

test("animation direction matches the model for all six face turns", () => {
  for (const f of "URFDLB") {
    assert.deepStrictEqual(
      permutationFromMoveSpec(f),
      PERMS[f],
      `MOVE_SPEC.${f} spins the opposite way to the model`,
    );
  }
});

test("animation direction matches the model for whole-cube rotations", () => {
  for (const r of "XYZ") {
    assert.deepStrictEqual(
      permutationFromMoveSpec(r),
      ROT_PERMS[r],
      `MOVE_SPEC.${r} spins the opposite way to the model`,
    );
  }
});

test("a long mixed sequence lands in the same place visually and logically", () => {
  // Composition of equal permutations is equal, so this follows from the two
  // tests above -- but it is the exact scenario that broke: a guided solution
  // hundreds of moves long, containing whole-cube rotations, finishing
  // "solved" in the model while the screen showed a scrambled cube.
  const tokens = "URFDLBXYZ".split("");
  const suffixes = ["", "'", "2"];
  const seq = Array.from({ length: 200 }, (_, i) => {
    const t = tokens[(i * 7 + 3) % tokens.length];
    return t + suffixes[(i * 5 + 1) % suffixes.length];
  });

  let visual = SOLVED;
  for (const move of seq) {
    const perm = permutationFromMoveSpec(move[0]);
    const times = move.endsWith("2") ? 2 : move.endsWith("'") ? 3 : 1;
    for (let n = 0; n < times; n++) {
      visual = perm.map((src) => visual[src]).join("");
    }
  }

  let logical = SOLVED;
  for (const move of seq) logical = applyMove(logical, move);

  assert.strictEqual(visual, logical, "scene and model drifted apart");
});

test("every move token the solver can emit is animatable", () => {
  // A guided solution can contain any face turn plus X/Y/Z, each bare,
  // primed or doubled.
  for (const t of "URFDLBXYZ") {
    for (const suffix of ["", "'", "2"]) {
      assert.ok(MOVE_SPEC[t], `no animation spec for ${t}${suffix}`);
      assert.strictEqual(applyMove(SOLVED, t + suffix).length, 54);
    }
  }
});
