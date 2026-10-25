import { useEffect } from "react";
import { processKeyEvent } from "../cube/keyboard.js";

function isKey2(e) {
  // Digit2 on top row, or Numpad2 when producing "2" (NumLock ON).
  // When NumLock is OFF, Numpad2 emits key "ArrowDown", which must NOT be captured as 2.
  return e.key === "2" || e.code === "Digit2" || (e.code === "Numpad2" && e.key === "2");
}

/**
 * Standard cube notation and whole-cube reorientation on the keyboard.
 *
 *   U D L R F B   clockwise quarter turn
 *   M E S         middle slice turns (M follows L, E follows D, S follows F)
 *   + Shift       counter-clockwise (prime, e.g. M')
 *   hold / press 2 double turn like Shift (e.g. hold 2 + M  ->  M2)
 *   Arrow keys    whole-cube rotations (← Y, → Y', ↑ X, ↓ X')
 *   Shift + Arrow double rotation (Y2, X2) avoiding keyboard matrix ghosting
 *   Ctrl/Cmd + Z  undo      Ctrl/Cmd + Shift + Z  redo   (FR-18)
 *
 * Renders nothing -- it is a behaviour, not a widget.
 */
export default function KeyboardControls({
  onMove,
  onUndo,
  onRedo,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;
    let holding2 = false;
    let armed2 = false;

    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if (isKey2(e)) {
        holding2 = true;
        armed2 = true; // Both hold and arm support so matrix ghosting doesn't drop double intent
        e.preventDefault();
        return;
      }

      const isDouble = holding2 || armed2;
      const action = processKeyEvent(e, isDouble);
      if (!action) return;
      e.preventDefault();

      // Reset single-tap armed state once a move or action is performed
      armed2 = false;

      if (action.type === "undo") {
        onUndo?.();
      } else if (action.type === "redo") {
        onRedo?.();
      } else if (action.type === "move") {
        onMove?.(action.move);
      }
    };

    const onKeyUp = (e) => {
      if (isKey2(e)) {
        holding2 = false;
      }
    };

    const onBlur = () => {
      holding2 = false;
      armed2 = false;
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [onMove, onUndo, onRedo, enabled]);

  return null;
}
