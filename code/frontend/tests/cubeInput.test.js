import assert from "node:assert/strict";
import test from "node:test";

import { parseCubeFaceRows } from "../src/lib/cubeInput.js";
import { parseCubeString } from "../src/lib/cubeInput.js";
import { mapFacesToCubelets } from "../src/lib/mapToCubelets.js";

test("parses cube face rows in the order they are entered", () => {
  assert.deepEqual(parseCubeFaceRows("RRRRGRRRR\nGGGGRGGG"), [
    "RRRRGRRRR",
    "GGGGRGGG",
  ]);
});

test("ignores blank lines and surrounding whitespace", () => {
  assert.deepEqual(parseCubeFaceRows("  RRRRGRRRR  \n\n  GGGGRGGG  \n"), [
    "RRRRGRRRR",
    "GGGGRGGG",
  ]);
});

test("parses a 6-line, full-cube input into faces", () => {
  const input = [
    "WWWWWWWWW",
    "RRRRRRRRR",
    "BBBBBBBBB",
    "YYYYYYYYY",
    "OOOOOOOOO",
    "GGGGGGGGG",
  ].join("\n");

  const out = parseCubeString(input);
  assert.deepEqual(out.U, Array(9).fill("W"));
  assert.deepEqual(out.D, Array(9).fill("Y"));
  assert.deepEqual(out.R, Array(9).fill("R"));
  assert.deepEqual(out.L, Array(9).fill("O"));
  assert.deepEqual(out.F, Array(9).fill("B"));
  assert.deepEqual(out.B, Array(9).fill("G"));
});

test("parses a single-line 54-char cube string", () => {
  const s =
    "W".repeat(9) +
    "R".repeat(9) +
    "B".repeat(9) +
    "Y".repeat(9) +
    "O".repeat(9) +
    "G".repeat(9);
  const out = parseCubeString(s);
  assert.strictEqual(out.U[0], "W");
  assert.strictEqual(out.D[0], "Y");
});

test("throws on invalid opposite centers", () => {
  const bad = [
    "WWWWWWWWW",
    "RRRRRRRRR",
    "BBBBBBBBB",
    "YYYYRRYYY", // D center is R, swapped with Y below
    "OOOOOOOOO",
    "GGGYYGGGG", // B center is Y
  ].join("\n");

  assert.throws(() => parseCubeString(bad));
});

test("mapFacesToCubelets maps orientations correctly", () => {
  // Use distinct labels for all 54 stickers to catch rotation/mirror bugs
  const faces = {
    U: ["U0", "U1", "U2", "U3", "U4", "U5", "U6", "U7", "U8"],
    R: ["R0", "R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"],
    F: ["F0", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8"],
    D: ["D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
    L: ["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8"],
    B: ["B0", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"],
  };
  
  const map = mapFacesToCubelets(faces);

  // Material index mapping: 0:+x(R), 1:-x(L), 2:+y(U), 3:-y(D), 4:+z(F), 5:-z(B)
  
  // Test Top-Left-Back corner (x = -1, y = 1, z = -1)
  const tlb = map["-1,1,-1"];
  assert.strictEqual(tlb[2], "U0", "Top side should be U0 (Top-Left of U)");
  assert.strictEqual(tlb[1], "L0", "Left side should be L0 (Top-Left of L)");
  assert.strictEqual(tlb[5], "B2", "Back side should be B2 (Top-Right of B)");

  // Test Bottom-Right-Front corner (x = 1, y = -1, z = 1)
  const brf = map["1,-1,1"];
  assert.strictEqual(brf[3], "D2", "Bottom side should be D2 (Top-Right of D)");
  assert.strictEqual(brf[0], "R6", "Right side should be R6 (Bottom-Left of R)");
  assert.strictEqual(brf[4], "F8", "Front side should be F8 (Bottom-Right of F)");
});
