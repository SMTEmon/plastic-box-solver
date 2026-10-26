import React, { useCallback, useEffect, useRef, useState } from "react";
import CubeScene from "../Three/CubeScene";
import { getMoveDescription } from "../cube/stageGuides.js";
import { useTutorialStore } from "../store/tutorialStore.js";
import TutorialCelebration from "./TutorialCelebration.jsx";

const FACE_BUTTONS = [
  ["U", "U'", "U2"],
  ["D", "D'", "D2"],
  ["R", "R'", "R2"],
  ["L", "L'", "L2"],
  ["F", "F'", "F2"],
  ["B", "B'", "B2"],
];

export default function TutorialWorkspace() {
  const currentCase = useTutorialStore((s) => s.currentCase);
  const facelets = useTutorialStore((s) => s.facelets);
  const sceneEpoch = useTutorialStore((s) => s.sceneEpoch);
  const moveCursor = useTutorialStore((s) => s.moveCursor);
  const isCompleted = useTutorialStore((s) => s.isCompleted);
  const wrongMoveAlert = useTutorialStore((s) => s.wrongMoveAlert);
  const loading = useTutorialStore((s) => s.loading);

  const validateAndApplyMove = useTutorialStore((s) => s.validateAndApplyMove);
  const resetCurrentCase = useTutorialStore((s) => s.resetCurrentCase);
  const loadNewCase = useTutorialStore((s) => s.loadNewCase);
  const exitToCatalog = useTutorialStore((s) => s.exitToCatalog);
  const clearWrongMoveAlert = useTutorialStore((s) => s.clearWrongMoveAlert);

  const animatorRef = useRef(null);
  const controlsRef = useRef(null);
  const [showButtons, setShowButtons] = useState(true);

  const targetMoves = currentCase?.target_moves || [];
  const expectedMove = targetMoves[moveCursor] || null;
  const activeFace = expectedMove && "URFDLB".includes(expectedMove[0]) ? expectedMove[0] : null;

  // Handle user move (from keyboard or button)
  const handleUserMove = useCallback(
    (move) => {
      if (!move || !animatorRef.current || isCompleted || loading) return;

      // Animate move on 3D cube
      animatorRef.current.enqueue(move);
    },
    [isCompleted, loading],
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        isCompleted ||
        loading
      ) {
        return;
      }

      const key = e.key.toUpperCase();
      if ("URFDLB".includes(key)) {
        e.preventDefault();
        const move = e.shiftKey ? `${key}'` : key;
        handleUserMove(move);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUserMove, isCompleted, loading]);

  // Callback when 3D animation finishes
  const handleMoveDone = useCallback(
    (move) => {
      const result = validateAndApplyMove(move);
      if (!result.correct && animatorRef.current) {
        // Wrong move - fast forward/drain any lingering moves and cancel
        animatorRef.current.cancel();
      }
    },
    [validateAndApplyMove],
  );

  if (!currentCase) {
    return null;
  }

  return (
    <div className="relative flex flex-col h-full min-h-[calc(100vh-4.5rem)] text-gray-100 select-none">
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 border-b border-dark-border bg-dark-surface/90 backdrop-blur-md shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={exitToCatalog}
            className="p-1.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span>←</span>
            <span className="hidden sm:inline">All Tutorials</span>
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-neon-blue/15 text-neon-blue border border-neon-blue/30">
                {currentCase.stage_name}
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                {currentCase.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={resetCurrentCase}
            title="Reset cube to start of case"
            className="px-2.5 py-1.5 rounded-xl border border-dark-border bg-dark-bg hover:bg-white/5 text-gray-300 text-xs font-medium transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>↺</span>
            <span className="hidden sm:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={loadNewCase}
            disabled={loading}
            title="Generate a new random scramble for this stage"
            className="px-3 py-1.5 rounded-xl bg-neon-blue/15 hover:bg-neon-blue hover:text-black text-neon-blue text-xs font-semibold border border-neon-blue/40 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <span>⚡</span>
            <span>{loading ? "Scrambling..." : "New Case"}</span>
          </button>
        </div>
      </header>

      {/* Formula & Moves Visualizer Bar */}
      <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-dark-surface/60 border-b border-dark-border/80 backdrop-blur-sm z-10 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-gray-400 font-sans text-[11px] font-semibold uppercase tracking-wider">
              Formula:
            </span>
            <span className="text-neon-blue font-bold px-2 py-0.5 rounded bg-black/40 border border-white/5">
              {currentCase.formula}
            </span>
            <span className="text-gray-400 text-[11px]">
              ({currentCase.formula_name})
            </span>
          </div>

          <div className="text-[11px] text-gray-400 flex items-center gap-2">
            <span>Progress:</span>
            <span className="font-mono text-white font-bold">
              {moveCursor} / {targetMoves.length}
            </span>
            <span>moves</span>
          </div>
        </div>

        {/* Move Chips Progression */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {targetMoves.map((m, idx) => {
            const isPast = idx < moveCursor;
            const isCurrent = idx === moveCursor;
            return (
              <div
                key={`${m}-${idx}`}
                className={`flex flex-col items-center justify-center min-w-[38px] px-2 py-1 rounded-lg font-mono text-xs font-bold transition-all border ${
                  isPast
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                    : isCurrent
                    ? "bg-neon-blue/20 text-neon-blue border-neon-blue animate-pulse shadow-md shadow-neon-blue/20 scale-105"
                    : "bg-white/[0.02] text-gray-500 border-white/5"
                }`}
              >
                <span>{m}</span>
                <span className="text-[9px] font-normal opacity-70">
                  {isPast ? "✓" : isCurrent ? "Next" : `${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wrong Move Alert Notice */}
      {wrongMoveAlert && (
        <div className="mx-3 mt-2 sm:mx-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between animate-morph-in z-20 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-base">❌</span>
            <div>
              <span className="font-bold text-white">Wrong move: {wrongMoveAlert.move}!</span>
              <span className="ml-1 text-gray-300">
                Expected <span className="font-mono font-bold text-neon-blue">{wrongMoveAlert.expected}</span>. Cube has been reset. Try the formula again!
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={clearWrongMoveAlert}
            className="p-1 text-rose-300 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 3D Canvas Area */}
      <div className="relative flex-1 min-h-[300px] w-full overflow-hidden">
        <CubeScene
          onAnimatorReady={(animator) => {
            animatorRef.current = animator;
          }}
          controlsRef={controlsRef}
          onMoveDone={handleMoveDone}
          facelets={facelets}
          sceneEpoch={sceneEpoch}
          activeFace={activeFace}
          swipeEnabled={true}
        />

        {/* Instructions / Tip Box Overlay */}
        <div className="absolute top-3 left-3 max-w-sm p-3 rounded-xl bg-dark-surface/85 backdrop-blur-md border border-white/10 shadow-lg text-xs space-y-1 pointer-events-auto hidden sm:block">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <span>💡</span>
            <span>Case Instructions</span>
          </div>
          <p className="text-gray-300 leading-relaxed text-[11px]">
            {currentCase.description}
          </p>
          {currentCase.tip && (
            <p className="text-gray-400 text-[10px] pt-1 border-t border-white/5">
              <span className="text-neon-blue font-semibold">Tip: </span>
              {currentCase.tip}
            </p>
          )}
          {expectedMove && (
            <div className="pt-1 text-[11px] text-gray-200">
              Target next:{" "}
              <span className="font-mono font-bold text-neon-blue bg-black/40 px-1.5 py-0.5 rounded">
                {expectedMove}
              </span>{" "}
              <span className="text-gray-400 text-[10px]">
                ({getMoveDescription(expectedMove)})
              </span>
            </div>
          )}
        </div>

        {/* Move Buttons Toggle */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={() => setShowButtons((prev) => !prev)}
            className="px-2.5 py-1 rounded-lg bg-dark-surface/90 border border-white/10 text-[11px] text-gray-300 hover:text-white transition-all cursor-pointer shadow-md"
          >
            {showButtons ? "Hide Buttons" : "Show Buttons"}
          </button>
        </div>

        {/* Bottom Interactive Move Buttons Dock */}
        {showButtons && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 p-2 rounded-2xl bg-dark-surface/90 border border-white/10 backdrop-blur-md shadow-2xl z-10 max-w-[95vw] overflow-x-auto">
            <div className="flex items-center gap-1.5 sm:gap-2">
              {FACE_BUTTONS.map((group) => (
                <div key={group[0]} className="flex flex-col gap-1">
                  {group.map((m) => {
                    const isTarget = m === expectedMove;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleUserMove(m)}
                        className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border active:scale-95 ${
                          isTarget
                            ? "bg-neon-blue text-black border-neon-blue shadow-md shadow-neon-blue/30 scale-105"
                            : "bg-white/[0.04] text-gray-200 border-white/5 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="text-center text-[10px] text-gray-500 mt-1.5 hidden sm:block">
              Or use keyboard: U, R, F, D, L, B (hold Shift for counter-clockwise)
            </div>
          </div>
        )}
      </div>

      {/* Completion Celebration Overlay */}
      {isCompleted && (
        <TutorialCelebration
          currentCase={currentCase}
          onNextCase={loadNewCase}
          onChooseAnother={exitToCatalog}
        />
      )}
    </div>
  );
}
