import assert from "node:assert/strict";
import test from "node:test";
import { FACE_ORDER, SOLVED, facesToFacelets, faceletsToFaces } from "../src/cube/facelets.js";

test("facelets format matches 54 characters URFDLB", () => {
  assert.strictEqual(FACE_ORDER, "URFDLB");
  assert.strictEqual(SOLVED.length, 54);
  assert.strictEqual(
    SOLVED,
    "wwwwwwwwwrrrrrrrrrgggggggggyyyyyyyyyooooooooobbbbbbbbb"
  );
});

test("center stickers in canonical order URFDLB are w, r, g, y, o, b", () => {
  const centers = [0, 1, 2, 3, 4, 5].map((fi) => SOLVED[fi * 9 + 4]);
  assert.deepStrictEqual(centers, ["w", "r", "g", "y", "o", "b"]);
});

test("facesToFacelets and faceletsToFaces round-trip accurately", () => {
  const faces = faceletsToFaces(SOLVED);
  assert.deepStrictEqual(faces.U, Array(9).fill("W"));
  assert.deepStrictEqual(faces.R, Array(9).fill("R"));
  assert.deepStrictEqual(faces.F, Array(9).fill("G"));
  assert.deepStrictEqual(faces.D, Array(9).fill("Y"));
  assert.deepStrictEqual(faces.L, Array(9).fill("O"));
  assert.deepStrictEqual(faces.B, Array(9).fill("B"));

  const roundTrip = facesToFacelets(faces);
  assert.strictEqual(roundTrip, SOLVED);
});

test("custom facelets parse correctly to face groups", () => {
  const testFacelets = "w".repeat(9) + "r".repeat(9) + "g".repeat(9) + "y".repeat(9) + "o".repeat(9) + "b".repeat(9);
  const faces = faceletsToFaces(testFacelets);
  assert.strictEqual(faces.U.length, 9);
  assert.strictEqual(faces.D.length, 9);
  assert.strictEqual(faces.R.length, 9);
  assert.strictEqual(faces.L.length, 9);
  assert.strictEqual(faces.F.length, 9);
  assert.strictEqual(faces.B.length, 9);
});
