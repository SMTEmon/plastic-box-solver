import { useEffect, useRef } from "react";
import MoveButtons from "./MoveButtons";
import { getMoveDescription } from "../cube/stageGuides.js";
import { useCubeStore, MODES } from "../store/cubeStore.js";

function SpeedControl({ speed, onSetSpeed }) {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 text-xs bg-dark-bg/60 border border-dark-border rounded-xl p-1 shrink-0">
      {[0.5, 1, 1.5, 2].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSetSpeed(s)}
          className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[11px] sm:text-xs font-mono font-medium transition-all cursor-pointer ${
            speed === s
              ? "bg-neon-blue/20 text-neon-blue font-bold border border-neon-blue/40 shadow-sm"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

export default function SolveControlsDock({
  speed,
  onSetSpeed,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBack,
  canTurn,
  onMove,
  onUndo,
  onRedo,
  onResetCube,
}) {
  const mode = useCubeStore((s) => s.mode);
  const solution = useCubeStore((s) => s.solution);
  const cursor = useCubeStore((s) => s.cursor);
  const history = useCubeStore((s) => s.history);
  const redoStack = useCubeStore((s) => s.redoStack);
  const stage = useCubeStore((s) => s.currentStage());

  const autoTapeRef = useRef(null);

  // Auto-scroll the Auto-Solve mode move sequence ticker
  useEffect(() => {
    if (mode !== MODES.AUTO || !autoTapeRef.current) return;
    autoTapeRef.current
      .querySelector('[data-active="true"]')
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [cursor, mode]);

  // Keyboard shortcuts for Guided and Auto-Solve playback
  useEffect(() => {
    if (mode !== MODES.GUIDED && mode !== MODES.AUTO) return;

    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        if (isPlaying) {
          onTogglePlay();
        } else if (e.shiftKey) {
          onStepBack();
        } else if (e.code === "Space" || e.key === " ") {
          onTogglePlay();
        } else {
          onStepForward();
        }
        return;
      }

      if (
        e.key === "Backspace" ||
        e.key === "ArrowLeft" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        onStepBack();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, isPlaying, onTogglePlay, onStepForward, onStepBack]);

  const isAssistedMode = (mode === MODES.GUIDED || mode === MODES.AUTO) && solution;

  return (
    <div className="bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl p-2.5 sm:px-4 sm:py-3 shrink-0 shadow-md min-h-[74px] flex flex-col justify-center">
      {isAssistedMode ? (
        cursor < solution.moves.length ? (
          <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
            {/* Left: Active Move Focus */}
            <div className="flex items-center gap-3 min-w-[180px] max-w-[300px] shrink-0">
              <div className="w-13 h-13 rounded-xl bg-neon-blue text-black flex items-center justify-center font-mono font-black text-2xl shadow-lg shadow-neon-blue/25 border-2 border-cyan-200 shrink-0 select-none">
                {solution.moves[cursor]}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neon-blue/15 text-neon-blue border border-neon-blue/30 shrink-0">
                    {mode === MODES.AUTO
                      ? `Auto-Solve ${cursor + 1}/${solution.moves.length}`
                      : `Move ${cursor + 1}/${solution.moves.length}`}
                  </span>
                  {mode === MODES.GUIDED && stage?.name && (
                    <span className="text-xs font-semibold text-gray-300 truncate">
                      {stage.name}
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-white mt-0.5 truncate">
                  {getMoveDescription(solution.moves[cursor])}
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  {cursor + 1 < solution.moves.length ? (
                    <span>
                      Next:{" "}
                      <strong className="text-neon-blue font-bold">
                        {solution.moves[cursor + 1]}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">
                      Final move!
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Center & Right: Playback Control Trio & Speed */}
            <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={onStepBack}
                  disabled={cursor <= 0 || isPlaying}
                  title="Previous move (Backspace or ←)"
                  className="py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl border border-dark-border bg-dark-bg text-gray-200 text-xs font-semibold cursor-pointer hover:text-white hover:border-gray-500 transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  <span>← Back</span>
                  <kbd className="hidden 2xl:inline text-[9px] font-mono text-gray-400 px-1 py-0.5 rounded bg-black/40 border border-dark-border">
                    Backspace
                  </kbd>
                </button>

                <button
                  type="button"
                  onClick={onTogglePlay}
                  disabled={cursor >= solution.moves.length}
                  title="Toggle play/pause (Space)"
                  className={`py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
                    isPlaying
                      ? "border-amber-400/50 bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
                      : "border-neon-blue/40 bg-neon-blue/15 text-neon-blue hover:bg-neon-blue/25"
                  }`}
                >
                  <span>{isPlaying ? "⏸ Pause" : "▶ Play"}</span>
                </button>

                <button
                  type="button"
                  onClick={onStepForward}
                  disabled={cursor >= solution.moves.length || isPlaying}
                  title="Next move (Space or →)"
                  className="py-1.5 sm:py-2 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black text-xs font-bold cursor-pointer transition-all flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-neon-blue/25 active:scale-95"
                >
                  <span>Next →</span>
                  <kbd className="hidden 2xl:inline text-[9px] font-mono text-black/80 font-bold px-1.5 py-0.5 rounded bg-black/15">
                    Space
                  </kbd>
                </button>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <SpeedControl speed={speed} onSetSpeed={onSetSpeed} />
                {mode === MODES.GUIDED && stage && (
                  <div className="hidden xl:flex flex-col items-end text-right shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Stage Progress
                    </span>
                    <span className="text-xs font-mono font-bold text-gray-300">
                      {Math.max(
                        0,
                        Math.min(
                          stage.end - stage.start,
                          cursor - stage.start,
                        ),
                      )}
                      /{stage.end - stage.start}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Right for Auto-Solve: Sequence Ticker */}
            {mode === MODES.AUTO && (
              <div
                ref={autoTapeRef}
                className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-sm py-1 px-2 bg-dark-bg/60 border border-dark-border rounded-xl"
              >
                {solution.moves.map((m, i) => (
                  <span
                    key={i}
                    data-active={i === cursor ? "true" : undefined}
                    className={`text-[11px] font-mono px-2 py-0.5 rounded shrink-0 transition-all font-bold ${
                      i === cursor
                        ? "bg-neon-blue text-black shadow-sm scale-105 border border-cyan-300"
                        : i < cursor
                          ? "text-gray-500 line-through"
                          : "text-gray-400 bg-white/5"
                    }`}
                  >
                    {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🎉</span>
              <div>
                <div className="font-bold text-xs text-white">
                  All Moves Completed!
                </div>
                <div className="text-[11px] text-emerald-400">
                  The cube has been completely solved.
                </div>
              </div>
            </div>
            <button
              onClick={onResetCube}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs shadow-md cursor-pointer hover:bg-emerald-400 transition-colors"
            >
              Reset Scramble
            </button>
          </div>
        )
      ) : (
        /* Interactive Mode Dock */
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: MoveButtons */}
          <div className="flex items-center gap-3">
            <MoveButtons onMove={onMove} disabled={!canTurn} />
          </div>

          {/* Center: Keyboard hint */}
          <div className="hidden sm:block text-[11px] text-gray-400 text-center">
            Turn:{" "}
            <span className="font-mono text-gray-200">U D L R F B</span>{" "}
            &middot; Middle:{" "}
            <span className="font-mono text-gray-200">M E S</span>{" "}
            &middot; Rotate:{" "}
            <span className="font-mono text-gray-200">← → ↑ ↓</span>{" "}
            &middot;{" "}
            <span className="font-mono text-gray-200">Shift</span> counter &middot;{" "}
            <span className="font-mono text-gray-200">2</span> /{" "}
            <span className="font-mono text-gray-200">Shift+Arrow</span> double &middot;{" "}
            <span className="font-mono text-gray-200">Ctrl+Z</span> undo
          </div>

          {/* Right: Undo / Redo */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canTurn || history.length === 0}
              className="px-3 py-1.5 rounded-xl border border-dark-border bg-dark-bg/80 text-gray-300 hover:text-white hover:border-gray-500 text-xs font-semibold disabled:opacity-30 cursor-pointer shadow-sm transition-all"
            >
              ↶ Undo
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canTurn || redoStack.length === 0}
              className="px-3 py-1.5 rounded-xl border border-dark-border bg-dark-bg/80 text-gray-300 hover:text-white hover:border-gray-500 text-xs font-semibold disabled:opacity-30 cursor-pointer shadow-sm transition-all"
            >
              ↷ Redo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
