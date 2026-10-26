import test from "node:test";
import assert from "node:assert";

import {
  chunkMoves,
  getTriggerAtMove,
  getTurnDirection,
} from "../src/cube/triggerChunker.js";

test("triggerChunker: chunks plain moves with no triggers as singles", () => {
  const moves = ["U", "D", "L", "R"];
  const chunks = chunkMoves(moves);
  assert.strictEqual(chunks.length, 4);
  assert.strictEqual(chunks[0].type, "single");
  assert.strictEqual(chunks[0].move, "U");
  assert.strictEqual(chunks[0].startIndex, 0);
  assert.strictEqual(chunks[0].endIndex, 1);
});

test("triggerChunker: recognizes 4-move Sexy Move (R U R' U')", () => {
  const moves = ["F", "R", "U", "R'", "U'", "F'"];
  // Note: F R U R' U' F' matches FRURUF (Top Cross, 6 moves) as greedy longest-match
  const chunks = chunkMoves(moves);
  assert.strictEqual(chunks.length, 1);
  assert.strictEqual(chunks[0].type, "trigger");
  assert.strictEqual(chunks[0].badge, "Top Cross");
  assert.strictEqual(chunks[0].startIndex, 0);
  assert.strictEqual(chunks[0].endIndex, 6);
});

test("triggerChunker: recognizes Sexy Move when not wrapped in FRURUF", () => {
  const moves = ["U", "R", "U", "R'", "U'", "D"];
  const chunks = chunkMoves(moves, 10);
  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0].type, "single");
  assert.strictEqual(chunks[0].move, "U");
  assert.strictEqual(chunks[0].startIndex, 10);

  assert.strictEqual(chunks[1].type, "trigger");
  assert.strictEqual(chunks[1].badge, "⚡ Right 4-Moves");
  assert.strictEqual(chunks[1].startIndex, 11);
  assert.strictEqual(chunks[1].endIndex, 15);
  assert.deepStrictEqual(chunks[1].moves, ["R", "U", "R'", "U'"]);

  assert.strictEqual(chunks[2].type, "single");
  assert.strictEqual(chunks[2].move, "D");
  assert.strictEqual(chunks[2].startIndex, 15);
});

test("triggerChunker: recognizes Sune and Niklas", () => {
  const sune = ["R", "U", "R'", "U", "R", "U2", "R'"];
  const niklas = ["U", "R", "U'", "L'", "U", "R'", "U'", "L"];
  const chunks = chunkMoves([...sune, "Y", ...niklas]);

  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0].name, "Sune");
  assert.strictEqual(chunks[0].startIndex, 0);
  assert.strictEqual(chunks[0].endIndex, 7);

  assert.strictEqual(chunks[1].type, "single");
  assert.strictEqual(chunks[1].move, "Y");

  assert.strictEqual(chunks[2].name, "Niklas");
  assert.strictEqual(chunks[2].startIndex, 8);
  assert.strictEqual(chunks[2].endIndex, 16);
});

test("triggerChunker: getTriggerAtMove provides active step context", () => {
  const moves = ["R", "U", "R'", "U'"];
  const chunks = chunkMoves(moves, 5);

  const active = getTriggerAtMove(chunks, 7); // Move R' at index 7 (5+2)
  assert.ok(active);
  assert.strictEqual(active.name, "Right 4-Moves (Sexy Move)");
  assert.strictEqual(active.stepInTrigger, 3);
  assert.strictEqual(active.totalSteps, 4);

  const outside = getTriggerAtMove(chunks, 9);
  assert.strictEqual(outside, null);
});

test("triggerChunker: getTurnDirection returns correct direction cues", () => {
  assert.deepStrictEqual(getTurnDirection("R"), {
    direction: "cw",
    label: "Clockwise",
    arrow: "↻",
    short: "CW",
  });

  assert.deepStrictEqual(getTurnDirection("B'"), {
    direction: "ccw",
    label: "Counter-Clockwise",
    arrow: "↺",
    short: "CCW",
  });

  assert.deepStrictEqual(getTurnDirection("D2"), {
    direction: "double",
    label: "180° Double Turn",
    arrow: "⟳",
    short: "180°",
  });

  assert.deepStrictEqual(getTurnDirection("Y'"), {
    direction: "ccw",
    label: "Rotate Counter-Clockwise",
    arrow: "↺",
    short: "CCW",
  });
});

test("triggerChunker: recognizes Beginner Front Insert (F' U' F) and Corner Orient Insert", () => {
  const frontInsert = ["F'", "U'", "F"];
  const chunks = chunkMoves(["U", ...frontInsert, "Y'"]);
  assert.strictEqual(chunks.length, 3);
  assert.strictEqual(chunks[0].type, "single");
  assert.strictEqual(chunks[0].move, "U");
  assert.strictEqual(chunks[1].type, "trigger");
  assert.strictEqual(chunks[1].name, "Front Insert (3-Move)");
  assert.strictEqual(chunks[1].badge, "Front Insert");
  assert.deepStrictEqual(chunks[1].moves, ["F'", "U'", "F"]);
  assert.strictEqual(chunks[2].type, "single");
  assert.strictEqual(chunks[2].move, "Y'");

  const cornerOrient = ["R", "U2", "R'", "U'", "R", "U", "R'"];
  const coChunks = chunkMoves(cornerOrient);
  assert.strictEqual(coChunks.length, 1);
  assert.strictEqual(coChunks[0].type, "trigger");
  assert.strictEqual(coChunks[0].name, "Corner Orient Insert");
  assert.strictEqual(coChunks[0].badge, "Corner Orient");
});

test("triggerChunker: recognizes translated CFOP PLL and OLL algorithms", () => {
  // F-Perm translated rotation Y'
  const fPerm = [
    "R'", "U2", "R'", "Y'", "U'", "R'", "F'", "R2",
    "U'", "R'", "U", "R'", "F", "R", "U'", "F"
  ];
  const fChunks = chunkMoves(fPerm);
  assert.strictEqual(fChunks.length, 1);
  assert.strictEqual(fChunks[0].name, "F-Perm");
  assert.strictEqual(fChunks[0].badge, "F-Perm");

  // OLL 25 translated rotation Y (leading U' setup cleanly separated from core alg)
  const oll25 = [
    "U'", "R", "U2", "R'", "U'", "R", "U'", "R2",
    "Y", "R'", "U'", "R", "U", "B"
  ];
  const ollChunks = chunkMoves(oll25);
  assert.strictEqual(ollChunks.length, 2);
  assert.strictEqual(ollChunks[0].type, "single");
  assert.strictEqual(ollChunks[0].move, "U'");
  assert.strictEqual(ollChunks[1].name, "OLL 25 (Bowtie)");
  assert.strictEqual(ollChunks[1].badge, "OLL");

  // OLL 30 (Spotted) with simplified R2 move
  const oll30 = [
    "R'", "U2", "X", "R2", "U'", "R'", "U", "X'", "R'", "U2", "R"
  ];
  const oll30Chunks = chunkMoves(oll30);
  assert.strictEqual(oll30Chunks.length, 1);
  assert.strictEqual(oll30Chunks[0].name, "OLL 30 (Spotted)");
});

