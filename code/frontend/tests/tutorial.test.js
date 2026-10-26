import test from "node:test";
import assert from "node:assert/strict";

import {
  TUTORIAL_CATEGORIES,
  TUTORIAL_STAGES,
  parseFormulaMoves,
  generateClientFallbackCase,
} from "../src/cube/tutorialData.js";
import { useTutorialStore } from "../src/store/tutorialStore.js";
import { applyMoves } from "../src/cube/moves.js";

test("tutorialData: defines required categories and stages", () => {
  assert.ok(TUTORIAL_CATEGORIES.includes("Beginner Method"));
  assert.ok(TUTORIAL_CATEGORIES.includes("Core Drills"));
  assert.ok(TUTORIAL_CATEGORIES.includes("CFOP"));
  assert.ok(TUTORIAL_STAGES.length >= 8);

  const ids = TUTORIAL_STAGES.map((s) => s.id);
  assert.ok(ids.includes("top_cross"));
  assert.ok(ids.includes("match_cross"));
  assert.ok(ids.includes("match_corners"));
  assert.ok(ids.includes("middle_layer_right"));
  assert.ok(ids.includes("sexy_move"));
});

test("tutorialData: parseFormulaMoves handles parentheses and spacing", () => {
  const m1 = parseFormulaMoves("F (R U R' U') F'");
  assert.deepEqual(m1, ["F", "R", "U", "R'", "U'", "F'"]);

  const m2 = parseFormulaMoves("R U R' U R U2 R'");
  assert.deepEqual(m2, ["R", "U", "R'", "U", "R", "U2", "R'"]);
});

test("tutorialData: generateClientFallbackCase produces valid partial state and matching target", () => {
  const c = generateClientFallbackCase("top_cross");
  assert.equal(c.id, "top_cross");
  assert.equal(c.facelets.length, 54);
  assert.equal(c.target_facelets.length, 54);
  assert.ok(c.target_moves.length > 0);

  // Applying target_moves to facelets must equal target_facelets
  const actualTarget = applyMoves(c.facelets, c.target_moves);
  assert.equal(actualTarget, c.target_facelets);
});

test("tutorialStore: moves validation, wrong-move reset, and completion", async () => {
  const store = useTutorialStore.getState();

  // 1. Select stage
  await store.selectStage("sexy_move");
  const state1 = useTutorialStore.getState();
  assert.equal(state1.selectedStageId, "sexy_move");
  assert.ok(state1.currentCase);
  assert.equal(state1.moveCursor, 0);
  assert.equal(state1.isCompleted, false);

  const expectedMoves = state1.currentCase.target_moves;
  assert.deepEqual(expectedMoves, ["R", "U", "R'", "U'"]);
  const initialFacelets = state1.currentCase.facelets;
  const initialEpoch = state1.sceneEpoch;

  // 2. Play first correct move ("R")
  const res1 = useTutorialStore.getState().validateAndApplyMove("R");
  assert.equal(res1.correct, true);
  assert.equal(res1.completed, false);
  const state2 = useTutorialStore.getState();
  assert.equal(state2.moveCursor, 1);
  assert.notEqual(state2.facelets, initialFacelets);

  // 3. Play a WRONG move (e.g. "D" instead of "U") -> cube must RESET!
  const resWrong = useTutorialStore.getState().validateAndApplyMove("D");
  assert.equal(resWrong.correct, false);
  const stateAfterWrong = useTutorialStore.getState();
  assert.equal(stateAfterWrong.moveCursor, 0); // reset back to 0
  assert.equal(stateAfterWrong.facelets, initialFacelets); // reset to initial state
  assert.ok(stateAfterWrong.wrongMoveAlert);
  assert.equal(stateAfterWrong.wrongMoveAlert.move, "D");
  assert.equal(stateAfterWrong.wrongMoveAlert.expected, "U");
  assert.ok(stateAfterWrong.sceneEpoch > initialEpoch); // scene re-mounted

  // 4. Now execute all 4 moves correctly to completion
  for (const m of expectedMoves) {
    const r = useTutorialStore.getState().validateAndApplyMove(m);
    assert.equal(r.correct, true);
  }

  const stateDone = useTutorialStore.getState();
  assert.equal(stateDone.isCompleted, true);
  assert.equal(stateDone.moveCursor, 4);
  assert.ok(stateDone.casesSolved >= 1);

  // 5. Exit back to catalog
  useTutorialStore.getState().exitToCatalog();
  const stateExited = useTutorialStore.getState();
  assert.equal(stateExited.selectedStageId, null);
  assert.equal(stateExited.currentCase, null);
});
