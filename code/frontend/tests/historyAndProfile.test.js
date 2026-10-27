import assert from "node:assert/strict";
import test from "node:test";
import { useCubeStore, MODES } from "../src/store/cubeStore.js";
import { SOLVED } from "../src/cube/facelets.js";

test("cubeStore: loadReplay sets up guided replay state correctly", () => {
  const store = useCubeStore.getState();
  const testMoves = ["R", "U", "R'", "U'"];
  store.loadReplay(SOLVED, testMoves, 18);

  const updated = useCubeStore.getState();
  assert.equal(updated.mode, MODES.GUIDED);
  assert.equal(updated.assisted, true);
  assert.equal(updated.cursor, 0);
  assert.deepEqual(updated.solution.moves, testMoves);
  assert.equal(updated.solution.stages[0].name, "Solve Replay");
  assert.equal(updated.optimalMoveCount, 18);
});
