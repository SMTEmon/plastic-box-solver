import { useEffect } from "react";

const FACE_KEYS = { u: "U", d: "D", l: "L", r: "R", f: "F", b: "B" };

/**
 * FR-20 -- standard cube notation on the keyboard.
 *
 *   U D L R F B   clockwise quarter turn
 *   + Shift       counter-clockwise (prime)
 *   press 2 first double turn (e.g. 2 then R  ->  R2)
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
    let doubleArmed = false;

    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return e.shiftKey ? onRedo?.() : onUndo?.();
      }

      if (e.key === "2") {
        doubleArmed = true;
        return;
      }

      const face = FACE_KEYS[e.key.toLowerCase()];
      if (!face) return;
      e.preventDefault();

      const suffix = doubleArmed ? "2" : e.shiftKey ? "'" : "";
      doubleArmed = false;
      onMove?.(face + suffix);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMove, onUndo, onRedo, enabled]);

  return null;
}
