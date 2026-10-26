import test from "node:test";
import assert from "node:assert";

import {
  CUBE_ANATOMY,
  FOUR_MOVE_SEQUENCES,
  RESET_DRILL_CYCLE,
  RESET_DRILL_TOTAL_CYCLES,
  RESET_DRILL_MOVES,
  getDrillProgress,
} from "../src/cube/stageGuides.js";
import { applyMoves } from "../src/cube/moves.js";
import { SOLVED } from "../src/cube/facelets.js";
import { useCubeStore } from "../src/store/cubeStore.js";

test("CUBE_ANATOMY defines 6 Centers, 12 Edges, and 8 Corners", () => {
  assert.strictEqual(CUBE_ANATOMY.length, 3);
  assert.deepStrictEqual(
    CUBE_ANATOMY.map((p) => ({ id: p.id, count: p.count, stickers: p.stickers })),
    [
      { id: "centers", count: 6, stickers: 1 },
      { id: "edges", count: 12, stickers: 2 },
      { id: "corners", count: 8, stickers: 3 },
    ],
  );
});

test("FOUR_MOVE_SEQUENCES defines Right (R U R' U') and Left (L' U' L U) 4-moves", () => {
  assert.strictEqual(FOUR_MOVE_SEQUENCES.length, 2);
  assert.deepStrictEqual(FOUR_MOVE_SEQUENCES[0].moves, ["R", "U", "R'", "U'"]);
  assert.deepStrictEqual(FOUR_MOVE_SEQUENCES[1].moves, ["L'", "U'", "L", "U"]);
});

test("getDrillProgress tracks Cycle 1/6 through Cycle 6/6 — Reset Complete!", () => {
  assert.strictEqual(RESET_DRILL_TOTAL_CYCLES, 6);
  assert.strictEqual(RESET_DRILL_MOVES.length, 24);
  assert.deepStrictEqual(RESET_DRILL_CYCLE, ["R", "U", "R'", "U'"]);

  const first = getDrillProgress(0, false);
  assert.strictEqual(first.cycle, 1);
  assert.strictEqual(first.currentMove, "R");
  assert.strictEqual(first.label, "Cycle 1/6");
  assert.strictEqual(first.isComplete, false);

  const cycle3 = getDrillProgress(9, false);
  assert.strictEqual(cycle3.cycle, 3);
  assert.strictEqual(cycle3.moveInCycle, 1);
  assert.strictEqual(cycle3.currentMove, "U");
  assert.strictEqual(cycle3.label, "Cycle 3/6");

  const cycle6 = getDrillProgress(23, false);
  assert.strictEqual(cycle6.cycle, 6);
  assert.strictEqual(cycle6.currentMove, "U'");
  assert.strictEqual(cycle6.label, "Cycle 6/6");

  const done = getDrillProgress(24, true);
  assert.strictEqual(done.isComplete, true);
  assert.strictEqual(done.label, "Cycle 6/6 — Reset Complete!");
});

test("4-Move Reset Drill (24 moves) returns cube to identity without affecting timer or move count", () => {
  const scramble = applyMoves(SOLVED, ["F", "R", "U2", "L'", "D"]);
  useCubeStore.getState().loadScramble(scramble, 5);

  assert.strictEqual(useCubeStore.getState().startedAt, null);
  assert.strictEqual(useCubeStore.getState().history.length, 0);

  for (const m of RESET_DRILL_MOVES) {
    useCubeStore.getState().applyMove(m, "drill");
  }

  const afterIdleDrill = useCubeStore.getState();
  assert.strictEqual(
    afterIdleDrill.facelets,
    scramble,
    "6 cycles of R U R' U' returns scrambled cube to exact starting state",
  );
  assert.strictEqual(afterIdleDrill.history.length, 0, "move count unaffected");
  assert.strictEqual(afterIdleDrill.startedAt, null, "timer never started by drill");
  assert.strictEqual(afterIdleDrill.finishedAt, null, "finishedAt never set by drill");

  // Now simulate a user who already made 2 moves (timer running) and runs the drill
  useCubeStore.getState().applyMove("U", true);
  useCubeStore.getState().applyMove("R", true);
  const stateAfterTwoMoves = useCubeStore.getState().facelets;
  const startedBeforeDrill = useCubeStore.getState().startedAt;
  assert.ok(startedBeforeDrill !== null);
  assert.strictEqual(useCubeStore.getState().history.length, 2);

  for (const m of RESET_DRILL_MOVES) {
    useCubeStore.getState().applyMove(m, "drill");
  }
  useCubeStore.getState().shiftStartTime(1200);

  const afterActiveDrill = useCubeStore.getState();
  assert.strictEqual(afterActiveDrill.facelets, stateAfterTwoMoves);
  assert.strictEqual(afterActiveDrill.history.length, 2, "user move count preserved at 2");
  assert.strictEqual(
    afterActiveDrill.startedAt,
    startedBeforeDrill + 1200,
    "startedAt shifted by drill duration",
  );
});
