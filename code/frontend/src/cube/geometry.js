/**
 * Direct port of the GEOM / INDEX_OF construction in
 * backend/app/cube/moves.py (lines 12-38).
 *
 * This is what makes the frontend and backend agree on what "R" means.
 * Neither side hand-writes 54-entry permutation tables; both DERIVE them from
 * this same 3D layout, so they cannot silently disagree.
 *
 * Verified: every permutation table generated from this file is byte-identical
 * to the one Python generates. Do not "clean up" the sign conventions in
 * rot90() or the LAYOUT table -- they are load-bearing, and they already match
 * both moves.py and lib/mapToCubelets.js on all six faces.
 */

export const FACES = "URFDLB";

// normal vector, and how (row, col) maps into a 3D slot position, per face
const LAYOUT = {
  U: { n: [0, 1, 0], pos: (r, c) => [c - 1, 1, r - 1] },
  R: { n: [1, 0, 0], pos: (r, c) => [1, 1 - r, 1 - c] },
  F: { n: [0, 0, 1], pos: (r, c) => [c - 1, 1 - r, 1] },
  D: { n: [0, -1, 0], pos: (r, c) => [c - 1, -1, 1 - r] },
  L: { n: [-1, 0, 0], pos: (r, c) => [-1, 1 - r, c - 1] },
  B: { n: [0, 0, -1], pos: (r, c) => [1 - c, 1 - r, -1] },
};

// GEOM[i] = { pos: [x,y,z], normal: [nx,ny,nz] } for i in 0..53
export const GEOM = [];
for (const f of FACES) {
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      GEOM.push({ pos: LAYOUT[f].pos(r, c), normal: LAYOUT[f].n });
    }
  }
}

export const key = (pos, normal) => `${pos.join(",")}|${normal.join(",")}`;

/** (position, normal) -> sticker index. The inverse of GEOM. */
export const INDEX_OF = new Map(GEOM.map((g, i) => [key(g.pos, g.normal), i]));

export const AXIS = { U: 1, D: 1, R: 0, L: 0, F: 2, B: 2 }; // 0=x 1=y 2=z
export const LAYER = { U: 1, D: -1, R: 1, L: -1, F: 1, B: -1 };

/** Rotate a vector 90 degrees about `axis`. Mirrors _rot90 in moves.py. */
export function rot90(v, axis, direction) {
  const [x, y, z] = v;
  if (axis === 0) return [x, -direction * z, direction * y];
  if (axis === 1) return [direction * z, y, -direction * x];
  return [-direction * y, direction * x, z];
}
