/**
 * Canonical cube format -- the JS mirror of backend/app/cube/constants.py.
 *
 * facelets = 54-char string, 6 blocks of 9, in URFDLB face order.
 * Each char is a LOWERCASE COLOUR letter (w r o y g b) -- NOT a face letter.
 * index = face*9 + row*3 + col  (row top->bottom, col left->right, viewed from
 * outside that face).
 *
 *   index:  0-8    9-17   18-26   27-35   36-44   45-53
 *   face:    U      R       F       D       L       B
 *
 * The existing UI shape ({U:[...9 UPPERCASE], R:[...], ...}, produced by
 * lib/cubeInput.js and consumed by lib/mapToCubelets.js) is left untouched --
 * both of those files are already correct and geometry-consistent with the
 * backend. The two functions below are the bridge between the two shapes.
 *
 * If you change this file, change constants.py too. They are one contract.
 */

export const FACE_ORDER = "URFDLB";

export const SOLVED =
  "w".repeat(9) + // U  white
  "r".repeat(9) + // R  red
  "g".repeat(9) + // F  green
  "y".repeat(9) + // D  yellow
  "o".repeat(9) + // L  orange
  "b".repeat(9); // B  blue

/** {U:[...9 UPPERCASE], R:[...], ...} -> 54-char lowercase facelet string */
export function facesToFacelets(faces) {
  let out = "";
  for (const f of FACE_ORDER) {
    const arr = faces[f];
    if (!arr || arr.length !== 9) {
      throw new Error(`face ${f} must have 9 stickers`);
    }
    out += arr.join("").toLowerCase();
  }
  return out;
}

/** 54-char lowercase facelet string -> {U:[...9 UPPERCASE], R:[...], ...} */
export function faceletsToFaces(facelets) {
  if (facelets.length !== 54) {
    throw new Error(`expected 54 stickers, got ${facelets.length}`);
  }
  const out = {};
  FACE_ORDER.split("").forEach((f, i) => {
    out[f] = facelets
      .slice(i * 9, i * 9 + 9)
      .toUpperCase()
      .split("");
  });
  return out;
}

export function isSolved(facelets) {
  return facelets === SOLVED;
}
