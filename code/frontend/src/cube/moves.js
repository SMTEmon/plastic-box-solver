/**
 * Port of backend/app/cube/moves.py -- permutations GENERATED from geometry,
 * never hand-typed.
 *
 * A turn is a permutation of the 54 sticker indices, so applying a move is one
 * line: rebuild the string by pulling each sticker from where it came from.
 * "R'" is R applied three times; "R2" is R applied twice. No special cases.
 */

import { FACES, GEOM, INDEX_OF, AXIS, LAYER, key, rot90 } from "./geometry.js";

/** perm[newIndex] = oldIndex, for a single layer turn */
function buildPermutation(face) {
  const axis = AXIS[face];
  const layer = LAYER[face];
  const direction = -layer;
  const perm = [...Array(54).keys()];
  GEOM.forEach((g, i) => {
    if (g.pos[axis] !== layer) return; // only this layer moves
    const j = INDEX_OF.get(
      key(rot90(g.pos, axis, direction), rot90(g.normal, axis, direction)),
    );
    perm[j] = i;
  });
  return perm;
}

export const PERMS = Object.fromEntries(
  FACES.split("").map((f) => [f, buildPermutation(f)]),
);

// --- Whole-cube rotations X / Y / Z -----------------------------------------
// rubik_solver's beginner method emits these as "turn the cube in your hands"
// instructions, so a guided solution can contain them and playback must
// handle them. Same code as a face turn, but with NO layer filter -- every
// sticker moves, not just nine.
const ROT_AXIS = { X: 0, Y: 1, Z: 2 };
const ROT_DIR = { X: 1, Y: 1, Z: 1 };

function buildRotation(letter) {
  const axis = ROT_AXIS[letter];
  const direction = ROT_DIR[letter];
  const perm = [...Array(54).keys()];
  GEOM.forEach((g, i) => {
    // ALL stickers -- no layer filter
    const j = INDEX_OF.get(
      key(rot90(g.pos, axis, direction), rot90(g.normal, axis, direction)),
    );
    perm[j] = i;
  });
  return perm;
}

export const ROT_PERMS = Object.fromEntries(
  ["X", "Y", "Z"].map((l) => [l, buildRotation(l)]),
);

/** move is like "R", "R'", "R2", or a whole-cube rotation "X" / "Y'" / "Z2" */
export function applyMove(facelets, move) {
  const token = move[0];
  const table = ROT_PERMS[token] ?? PERMS[token];
  if (!table) throw new Error(`unknown move token: ${move}`);
  const times = move.endsWith("2") ? 2 : move.endsWith("'") ? 3 : 1;
  let out = facelets;
  for (let n = 0; n < times; n++) {
    out = table.map((src) => out[src]).join("");
  }
  return out;
}

export function applyMoves(facelets, moves) {
  return moves.reduce((state, m) => applyMove(state, m), facelets);
}

export function invert(move) {
  if (move.endsWith("2")) return move;
  if (move.endsWith("'")) return move[0];
  return move + "'";
}

/** Invert a whole sequence: reverse the order AND invert each move. */
export function invertSequence(moves) {
  return moves.slice().reverse().map(invert);
}
