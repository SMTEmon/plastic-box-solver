/**
 * Cross-checks the JS move engine against the live Python engine.
 *
 * This is the most important test in the project: it proves the frontend and
 * backend cannot disagree about what a move does. If it fails, nothing
 * downstream (auto-solve playback, guided stepping, solved-detection) is
 * trustworthy.
 *
 * Requires the backend running:
 *   cd code/backend && source venv/bin/activate && uvicorn app.main:app --port 8000
 *   cd code/frontend && npm run test:parity
 */

import test from "node:test";
import assert from "node:assert";

import { applyMove, applyMoves, invert } from "../src/cube/moves.js";
import { SOLVED, faceletsToFaces, facesToFacelets } from "../src/cube/facelets.js";

const API = "http://localhost:8000/api";

async function post(path, body) {
  const res = await fetch(API + path, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

test("algebraic invariants (no backend needed)", () => {
  for (const f of "URFDLB") {
    let s = SOLVED;
    for (let i = 0; i < 4; i++) s = applyMove(s, f);
    assert.strictEqual(s, SOLVED, `4x ${f} should be the identity`);
    assert.strictEqual(applyMove(applyMove(SOLVED, f), invert(f)), SOLVED);
  }
  for (const r of "XYZ") {
    let s = SOLVED;
    for (let i = 0; i < 4; i++) s = applyMove(s, r);
    assert.strictEqual(s, SOLVED, `4x ${r} should be the identity`);
    assert.strictEqual(
      applyMove(SOLVED, `${r}2`),
      applyMove(applyMove(SOLVED, r), r),
    );
  }
  let s = SOLVED;
  for (let i = 0; i < 6; i++) s = applyMoves(s, ["R", "U", "R'", "U'"]);
  assert.strictEqual(s, SOLVED, "sexy move x6 should be the identity");
});

test("facelets <-> faces round trip", () => {
  const scrambled = applyMoves(SOLVED, ["R", "U2", "F'", "L", "B2", "D"]);
  assert.strictEqual(facesToFacelets(faceletsToFaces(scrambled)), scrambled);
});

test("JS engine reproduces the backend's scramble exactly", async () => {
  for (let trial = 0; trial < 20; trial++) {
    const { facelets, moves } = await post("/cube/scramble?n_moves=20");
    const mine = applyMoves(SOLVED, moves);
    assert.strictEqual(
      mine,
      facelets,
      `mismatch on [${moves.join(" ")}]\n  backend: ${facelets}\n  js     : ${mine}`,
    );
  }
});

test("JS engine replays the backend's solutions to solved", async () => {
  for (const method of ["optimal", "beginner"]) {
    const { facelets } = await post("/cube/scramble?n_moves=20");
    const sol = await post("/cube/solve", { facelets, method });
    assert.strictEqual(
      applyMoves(facelets, sol.moves),
      SOLVED,
      `${method} solution did not solve in the JS engine`,
    );
  }
});

test("guided stage segments are contiguous and cover the whole list", async () => {
  const { facelets } = await post("/cube/scramble?n_moves=20");
  const sol = await post("/cube/solve", { facelets, method: "beginner" });

  assert.ok(sol.stages.length > 0, "expected stage segments");
  assert.strictEqual(sol.stages[0].start, 0);
  assert.strictEqual(sol.stages.at(-1).end, sol.moves.length);
  sol.stages.reduce((prevEnd, s) => {
    assert.strictEqual(s.start, prevEnd, "stages must be contiguous");
    return s.end;
  }, 0);
});
