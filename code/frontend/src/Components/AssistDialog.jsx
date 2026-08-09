import { useState } from "react";
import { Modal, Button, Note } from "./ui.jsx";

/**
 * Pre-flight for Auto-Solve and Guided.
 *
 * Two jobs, both of which were previously done badly:
 *
 *  1. Auto-Solve used to start immediately at a fixed speed, which is far too
 *     fast to follow and much too fast to copy onto a real cube. Speed is now
 *     chosen BEFORE anything moves, and it defaults to half speed rather than
 *     full, because the common case is someone trying to watch what happens.
 *  2. The "this won't count" warning was a browser window.confirm(), which is
 *     ugly and easy to dismiss without reading.
 */

const SPEED_CHOICES = [
  { value: 0.25, label: "Very slow", hint: "For copying onto a real cube" },
  { value: 0.5, label: "Slow", hint: "Easy to follow along" },
  { value: 1, label: "Normal", hint: "Default pace" },
  { value: 2, label: "Fast", hint: "Skim through it" },
  { value: 4, label: "Very fast", hint: "Just show me the end" },
];

export default function AssistDialog({
  open,
  mode, // "auto" | "guided"
  moveCount,
  alreadyAssisted,
  initialSpeed = 0.5,
  onCancel,
  onStart,
}) {
  const [speed, setSpeed] = useState(initialSpeed);

  const isAuto = mode === "auto";

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={isAuto ? "Auto-Solve" : "Guided Mode"}
    >
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        {isAuto
          ? "The full solution will play out on the cube from start to finish. Pick a speed first — you can still change it or pause while it runs."
          : "You will be walked through the solution one move at a time, in plain language. Pick how fast each move animates."}
        {typeof moveCount === "number" && moveCount > 0 && (
          <>
            {" "}
            This solution is{" "}
            <span className="text-white font-mono">{moveCount}</span> moves.
          </>
        )}
      </p>

      <div className="space-y-1.5 mb-4">
        {SPEED_CHOICES.map((s) => (
          <button
            key={s.value}
            onClick={() => setSpeed(s.value)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-left cursor-pointer transition-all ${
              speed === s.value
                ? "border-neon-blue bg-neon-blue/10"
                : "border-dark-border bg-dark-bg/50 hover:border-dark-border-strong"
            }`}
          >
            <span>
              <span
                className={`block text-sm font-medium ${
                  speed === s.value ? "text-neon-blue" : "text-white"
                }`}
              >
                {s.label}
              </span>
              <span className="block text-[11px] text-gray-500">{s.hint}</span>
            </span>
            <span className="text-[11px] font-mono text-gray-500">
              {s.value}x
            </span>
          </button>
        ))}
      </div>

      {!alreadyAssisted && (
        <Note tone="warn" className="mb-4">
          This marks the attempt as <strong>assisted</strong>. Assisted solves
          are never submitted to the leaderboard — that is what keeps the
          rankings meaningful. Your timer keeps running either way.
        </Note>
      )}

      <div className="flex gap-2">
        <Button size="md" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="md"
          variant="primary"
          className="flex-1"
          onClick={() => onStart(speed)}
        >
          {isAuto ? "Start solving" : "Start guide"}
        </Button>
      </div>
    </Modal>
  );
}
