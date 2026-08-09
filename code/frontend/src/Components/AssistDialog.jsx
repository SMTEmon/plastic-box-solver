import { useState } from "react";
import { Modal, Button, Note } from "./ui.jsx";
import { COLOUR_HEX, COLOUR_NAMES, centreColour } from "../cube/notation.js";

/**
 * Pre-flight for Auto-Solve and Guided.
 *
 * Guided asks three separate questions -- which colour, which method, how fast
 * -- and stacking them vertically made a dialog taller than the viewport, so
 * the Start button ended up below the fold. It is laid out in columns instead:
 * the two decisions that shape the lesson on the left, pace on the right.
 *
 * Auto-Solve only asks one question, so it stays narrow.
 */

const FIRST_COLOURS = ["w", "y", "r", "o", "g", "b"];

const SPEED_CHOICES = [
  { value: 0.25, label: "Very slow", hint: "Copying onto a real cube" },
  { value: 0.5, label: "Slow", hint: "Easy to follow" },
  { value: 1, label: "Normal", hint: "Default pace" },
  { value: 2, label: "Fast", hint: "Skim through" },
  { value: 4, label: "Very fast", hint: "Just show the end" },
];

/**
 * The two teaching methods. Kociemba is deliberately absent: it produces a
 * ~20-move solution, but the moves are near-optimal rather than meaningful,
 * so there is nothing to learn by following them. It powers Auto-Solve.
 */
const METHODS = [
  {
    value: "beginner",
    label: "Beginner's method",
    hint: "The one people are actually taught. Longest, but every step has a reason.",
    typical: "~190",
  },
  {
    value: "cfop",
    label: "CFOP (Fridrich)",
    hint: "What speedcubers use. Builds the first two layers together.",
    typical: "~105",
  },
];

function SectionLabel({ children }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.13em] text-gray-500 mb-1.5">
      {children}
    </div>
  );
}

function SpeedList({ speed, setSpeed }) {
  return (
    <div className="space-y-1">
      {SPEED_CHOICES.map((s) => (
        <button
          key={s.value}
          onClick={() => setSpeed(s.value)}
          className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-left cursor-pointer transition-all ${
            speed === s.value
              ? "border-neon-blue bg-neon-blue/10"
              : "border-dark-border bg-dark-bg/50 hover:border-dark-border-strong"
          }`}
        >
          <span className="min-w-0">
            <span
              className={`block text-xs font-medium ${
                speed === s.value ? "text-neon-blue" : "text-white"
              }`}
            >
              {s.label}
            </span>
            <span className="block text-[10px] text-gray-500 truncate">
              {s.hint}
            </span>
          </span>
          <span className="text-[10px] font-mono text-gray-500 shrink-0">
            {s.value}x
          </span>
        </button>
      ))}
    </div>
  );
}

export default function AssistDialog({
  open,
  mode, // "auto" | "guided"
  moveCount,
  alreadyAssisted,
  initialSpeed = 0.5,
  initialMethod = "beginner",
  facelets,
  onCancel,
  onStart,
}) {
  const [speed, setSpeed] = useState(initialSpeed);
  const [method, setMethod] = useState(initialMethod);
  // Default to whatever is already on the bottom: that is what the solver does
  // with no instruction, and it means zero setup moves.
  const [firstColour, setFirstColour] = useState(() =>
    facelets ? centreColour(facelets, "D") : "y",
  );

  const isAuto = mode === "auto";

  const footer = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-5 pt-4 border-t border-dark-border">
      {!alreadyAssisted ? (
        <Note tone="warn" className="flex-1">
          Marks this attempt <strong>assisted</strong> — assisted solves are
          never submitted to the leaderboard. Your timer keeps running.
        </Note>
      ) : (
        <div className="flex-1" />
      )}
      <div className="flex gap-2 shrink-0">
        <Button size="md" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="md"
          variant="primary"
          onClick={() => onStart({ speed, method, firstColour })}
        >
          {isAuto ? "Start solving" : "Start guide"}
        </Button>
      </div>
    </div>
  );

  if (isAuto) {
    return (
      <Modal
        open={open}
        onClose={onCancel}
        title="Auto-Solve"
        subtitle={
          `Kociemba's two-phase algorithm solves this cube in about ${moveCount || 20} moves and plays the whole thing out. ` +
          "Pick a pace — you can change it or pause while it runs."
        }
      >
        <SectionLabel>Animation speed</SectionLabel>
        <SpeedList speed={speed} setSpeed={setSpeed} />
        {footer}
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="lg"
      title="Guided Mode"
      subtitle="You'll be walked through the solution one move at a time, in plain language."
    >
      <div className="grid gap-5 sm:grid-cols-[1.35fr_1fr]">
        {/* left: the two decisions that shape the lesson */}
        <div className="space-y-5">
          <div>
            <SectionLabel>Which colour do you want to solve first?</SectionLabel>
            <div className="flex gap-1.5">
              {FIRST_COLOURS.map((c) => (
                <button
                  key={c}
                  onClick={() => setFirstColour(c)}
                  title={COLOUR_NAMES[c]}
                  className={`flex-1 h-10 rounded-lg border-2 cursor-pointer transition-transform ${
                    firstColour === c
                      ? "border-neon-blue scale-105"
                      : "border-white/10 hover:border-white/35"
                  }`}
                  style={{ background: COLOUR_HEX[c] }}
                />
              ))}
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              Every method builds one face first and works up. Tutorials usually
              say white; it genuinely does not matter which you pick. Step one
              will tell you how to turn the cube so{" "}
              <span className="capitalize text-gray-400">
                {COLOUR_NAMES[firstColour]}
              </span>{" "}
              ends up on the bottom.
            </p>
          </div>

          <div>
            <SectionLabel>Which method should teach you?</SectionLabel>
            <div className="space-y-1.5">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={`w-full flex items-start justify-between gap-3 px-3 py-2 rounded-lg border text-left cursor-pointer transition-all ${
                    method === m.value
                      ? "border-accent-violet bg-accent-violet/10"
                      : "border-dark-border bg-dark-bg/50 hover:border-dark-border-strong"
                  }`}
                >
                  <span className="min-w-0">
                    <span
                      className={`block text-xs font-medium ${
                        method === m.value ? "text-accent-violet" : "text-white"
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="block text-[10px] text-gray-500 leading-relaxed">
                      {m.hint}
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 shrink-0 pt-0.5">
                    {m.typical} moves
                  </span>
                </button>
              ))}
            </div>
            {method === "cfop" && (
              <p className="text-[11px] text-accent-amber mt-1.5 leading-relaxed">
                CFOP trips a bug in the solver library on about 1 cube in 7. If
                this is one of them you get the beginner method instead, and are
                told so — never just an error.
              </p>
            )}
          </div>
        </div>

        {/* right: pace */}
        <div>
          <SectionLabel>How fast should each move animate?</SectionLabel>
          <SpeedList speed={speed} setSpeed={setSpeed} />
        </div>
      </div>

      {footer}
    </Modal>
  );
}
