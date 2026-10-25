import test from "node:test";
import assert from "node:assert";
import { processKeyEvent, FACE_KEYS } from "../src/cube/keyboard.js";

test("keyboard: FACE_KEYS includes outer faces and middle layers", () => {
  assert.strictEqual(FACE_KEYS.u, "U");
  assert.strictEqual(FACE_KEYS.d, "D");
  assert.strictEqual(FACE_KEYS.l, "L");
  assert.strictEqual(FACE_KEYS.r, "R");
  assert.strictEqual(FACE_KEYS.f, "F");
  assert.strictEqual(FACE_KEYS.b, "B");
  assert.strictEqual(FACE_KEYS.m, "M");
  assert.strictEqual(FACE_KEYS.e, "E");
  assert.strictEqual(FACE_KEYS.s, "S");
});

test("keyboard: standard face turns (U, D, L, R, F, B)", () => {
  for (const k of ["u", "d", "l", "r", "f", "b"]) {
    const res = processKeyEvent({ key: k });
    assert.deepStrictEqual(res, { type: "move", move: k.toUpperCase() });
  }
});

test("keyboard: middle slice turns (M, E, S)", () => {
  assert.deepStrictEqual(processKeyEvent({ key: "m" }), { type: "move", move: "M" });
  assert.deepStrictEqual(processKeyEvent({ key: "e" }), { type: "move", move: "E" });
  assert.deepStrictEqual(processKeyEvent({ key: "s" }), { type: "move", move: "S" });
});

test("keyboard: Shift prime turns (M', E', S', R')", () => {
  assert.deepStrictEqual(processKeyEvent({ key: "M", shiftKey: true }), { type: "move", move: "M'" });
  assert.deepStrictEqual(processKeyEvent({ key: "E", shiftKey: true }), { type: "move", move: "E'" });
  assert.deepStrictEqual(processKeyEvent({ key: "S", shiftKey: true }), { type: "move", move: "S'" });
  assert.deepStrictEqual(processKeyEvent({ key: "R", shiftKey: true }), { type: "move", move: "R'" });
});

test("keyboard: double turns with '2' held (M2, E2, S2, U2)", () => {
  assert.strictEqual(processKeyEvent({ key: "2" }), null);
  assert.deepStrictEqual(processKeyEvent({ key: "m" }, true), { type: "move", move: "M2" });
  assert.deepStrictEqual(processKeyEvent({ key: "e" }, true), { type: "move", move: "E2" });
  assert.deepStrictEqual(processKeyEvent({ key: "s" }, true), { type: "move", move: "S2" });
  assert.deepStrictEqual(processKeyEvent({ key: "u" }, true), { type: "move", move: "U2" });
});

test("keyboard: Arrow keys trigger whole-cube rotations (Y, Y', X, X')", () => {
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowLeft" }), { type: "move", move: "Y" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowRight" }), { type: "move", move: "Y'" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowUp" }), { type: "move", move: "X" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowDown" }), { type: "move", move: "X'" });
});

test("keyboard: Arrow keys with '2' held trigger double rotation (Y2, X2)", () => {
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowLeft" }, true), { type: "move", move: "Y2" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowRight" }, true), { type: "move", move: "Y2" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowUp" }, true), { type: "move", move: "X2" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowDown" }, true), { type: "move", move: "X2" });
});

test("keyboard: Arrow keys with Shift trigger double rotation (Y2, X2)", () => {
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowLeft", shiftKey: true }), { type: "move", move: "Y2" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowRight", shiftKey: true }), { type: "move", move: "Y2" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowUp", shiftKey: true }), { type: "move", move: "X2" });
  assert.deepStrictEqual(processKeyEvent({ key: "ArrowDown", shiftKey: true }), { type: "move", move: "X2" });
});

test("keyboard: Undo (Ctrl+Z) and Redo (Ctrl+Shift+Z or Cmd)", () => {
  assert.deepStrictEqual(processKeyEvent({ key: "z", ctrlKey: true }), { type: "undo" });
  assert.deepStrictEqual(processKeyEvent({ key: "z", metaKey: true }), { type: "undo" });
  assert.deepStrictEqual(processKeyEvent({ key: "Z", ctrlKey: true, shiftKey: true }), { type: "redo" });
  assert.deepStrictEqual(processKeyEvent({ key: "Z", metaKey: true, shiftKey: true }), { type: "redo" });
});

test("keyboard: ignores inputs when focused inside TEXTAREA or INPUT", () => {
  assert.strictEqual(processKeyEvent({ key: "m", target: { tagName: "INPUT" } }), null);
  assert.strictEqual(processKeyEvent({ key: "r", target: { tagName: "TEXTAREA" } }), null);
  assert.strictEqual(processKeyEvent({ key: "ArrowLeft", target: { tagName: "INPUT" } }), null);
  assert.strictEqual(processKeyEvent({ key: "z", ctrlKey: true, target: { tagName: "TEXTAREA" } }), null);
});
