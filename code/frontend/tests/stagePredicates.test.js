import assert from "node:assert/strict";
import test from "node:test";

import { SOLVED } from "../src/cube/facelets.js";
import { applyMove } from "../src/cube/moves.js";
import {
  evaluateCubeStages,
  downCrossDone,
  firstLayerDone,
  middleLayerDone,
  isFullySolved,
} from "../src/cube/stagePredicates.js";

test("stagePredicates: SOLVED cube satisfies all stages", () => {
  const evalResult = evaluateCubeStages(SOLVED);
  assert.equal(evalResult.allDone, true);
  assert.equal(evalResult.completedIndex, 6);
  assert.equal(evalResult.currentStage.name, "Solved");
  assert.equal(isFullySolved(SOLVED), true);
});

test("stagePredicates: top face turn preserves first and second layer done", () => {
  const turned = applyMove(SOLVED, "U");
  assert.equal(downCrossDone(turned), true);
  assert.equal(firstLayerDone(turned), true);
  assert.equal(middleLayerDone(turned), true);
});

test("stagePredicates: bottom face turn breaks down cross", () => {
  const turned = applyMove(SOLVED, "D");
  // Center stays, but side ring breaks
  assert.equal(downCrossDone(turned), false);
  const evalResult = evaluateCubeStages(turned);
  assert.equal(evalResult.completedIndex, -1);
  assert.equal(evalResult.currentStage.name, "Bottom cross");
});
