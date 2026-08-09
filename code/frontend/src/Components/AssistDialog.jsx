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

/**
 * The two teaching methods. Kociemba is deliberately absent: it produces a
 * ~20-move solution, but the moves are near-optimal rather than meaningful,
 * so there is nothing to learn by following them. It powers Auto-Solve
 * instead.
 */
const METHODS = [
  {
    value: "beginner",
    label: "Beginner's method",
    hint: "The one people are actually taught. Longest, but every step has a reason.",
    typical: "~190 moves",
  },
  {
    value: "cfop",
    label: "CFOP (Fridrich)",
    hint: "What speedcubers use. About half the moves — it builds the first two layers together.",
    typical: "~105 moves",
  },
];

export default function AssistDialog({
  open,
  mode, // "auto" | "guided"
  moveCount,
  alreadyAssisted,
  initialSpeed = 0.5,
  initialMethod = "beginner",
  onCancel,
  onStart,
}) {
  const [speed, setSpeed] = useState(initialSpeed);
  const [method, setMethod] = useState(initialMethod);

  const isAuto = mode === "auto";

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={isAuto ? "Auto-Solve" : "Guided Mode"}
    >
      <p className="text-xs text-gray-400 leading-relaxed mb-4">
        {isAuto
          ? "Kociemba's two-phase algorithm will solve this cube in about 20 moves and play the whole thing out. Pick a speed first — you can still change it or pause while it runs."
          : "You will be walked through the solution one move at a time, in plain language."}
        {typeof moveCount === "number" && moveCount > 0 && (
          <>
            {" "}
            This solution is{" "}
            <span className="text-white font-mono">{moveCount}</span> moves.
          </>
        )}
      </p>

      {!isAuto && (
        <>
          <div className="text-[11px] uppercase tracking-[0.12em] text-gray-500 mb-2">
            Which method should teach you?
          </div>
          <div className="space-y-1.5 mb-4">
            {METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMethod(m.value)}
                className={`w-full flex items-start justify-between gap-3 px-3 py-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                  method === m.value
                    ? "border-accent-violet bg-accent-violet/10"
                    : "border-dark-border bg-dark-bg/50 hover:border-dark-border-strong"
                }`}
              >
                <span className="min-w-0">
                  <span
                    className={`block text-sm font-medium ${
                      method === m.value ? "text-accent-violet" : "text-white"
                    }`}
                  >
                    {m.label}
                  </span>
                  <span className="block text-[11px] text-gray-500 leading-relaxed">
                    {m.hint}
                  </span>
                </span>
                <span className="text-[10px] font-mono text-gray-500 shrink-0 pt-0.5">
                  {m.typical}
                </span>
              </button>
            ))}
          </div>

          {method === "cfop" && (
            <Note tone="info" className="mb-4">
              CFOP trips a bug inside the solver library on roughly 1 cube in 7.
              If this is one of them you will be given the beginner method
              instead, and told so — you will never just get an error.
            </Note>
          )}

          <div className="text-[11px] uppercase tracking-[0.12em] text-gray-500 mb-2">
            Animation speed
          </div>
        </>
      )}

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
          onClick={() => onStart({ speed, method })}
        >
          {isAuto ? "Start solving" : "Start guide"}
        </Button>
      </div>
    </Modal>
  );
}
