/**
 * Keyboard mapping and processing for cube turns and arrow-key whole-cube rotations.
 *
 *   U D L R F B   outer layer face turns
 *   M E S         middle slice layer turns (M follows L, E follows D, S follows F)
 *   + Shift       counter-clockwise (prime, e.g. M')
 *   hold 2        double turn (e.g. hold 2 + M -> M2)
 *   Arrow keys    whole-cube rotations (← Y, → Y', ↑ X, ↓ X')
 *   Ctrl/Cmd + Z  undo / redo
 */

export const FACE_KEYS = {
  u: "U",
  d: "D",
  l: "L",
  r: "R",
  f: "F",
  b: "B",
  m: "M",
  e: "E",
  s: "S",
};

/**
 * Pure processor for keyboard cube turns and arrow-key whole-cube rotations.
 *
 * Returns an action object:
 *   { type: "undo" }
 *   { type: "redo" }
 *   { type: "move", move: string }
 *   null
 */
export function processKeyEvent(e, isDouble = false) {
  const tag = e.target?.tagName;
  if (tag === "TEXTAREA" || tag === "INPUT") return null;

  if ((e.ctrlKey || e.metaKey) && e.key?.toLowerCase() === "z") {
    return { type: e.shiftKey ? "redo" : "undo" };
  }

  if (
    e.key === "ArrowLeft" ||
    e.key === "ArrowRight" ||
    e.key === "ArrowUp" ||
    e.key === "ArrowDown"
  ) {
    const rotMap = {
      ArrowRight: isDouble ? "Y2" : "Y'",
      ArrowLeft: isDouble ? "Y2" : "Y",
      ArrowUp: isDouble ? "X2" : "X",
      ArrowDown: isDouble ? "X2" : "X'",
    };
    return { type: "move", move: rotMap[e.key] };
  }

  const face = FACE_KEYS[e.key?.toLowerCase()];
  if (!face) return null;

  const suffix = isDouble ? "2" : e.shiftKey ? "'" : "";
  return { type: "move", move: face + suffix };
}
