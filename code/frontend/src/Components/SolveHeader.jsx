import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCubeStore, MODES } from "../store/cubeStore.js";

export default function SolveHeader({
  loading,
  onStartGuided,
  onRunAutoSolve,
  onBackToInteractive,
  onResetCube,
}) {
  const navigate = useNavigate();

  const assisted = useCubeStore((s) => s.assisted);
  const mode = useCubeStore((s) => s.mode);
  const solution = useCubeStore((s) => s.solution);
  const history = useCubeStore((s) => s.history);
  const startedAt = useCubeStore((s) => s.startedAt);
  const finishedAt = useCubeStore((s) => s.finishedAt);
  const optimalMoveCount = useCubeStore((s) => s.optimalMoveCount);
  const solved = useCubeStore((s) => s.isSolved());

  const [tick, setTick] = useState(0);
  const [showGuidedPicker, setShowGuidedPicker] = useState(false);
  const [assistWarning, setAssistWarning] = useState(null); // null | { type: "guided", method } | { type: "auto" }

  const turnCount = useMemo(
    () => history.filter((m) => !["X", "Y", "Z"].includes(m[0])).length,
    [history],
  );

  // Live timer -- 10 Hz while a solve is in progress.
  useEffect(() => {
    if (!startedAt || finishedAt || solved) return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [startedAt, finishedAt, solved]);

  const { elapsed, efficiency } = useMemo(
    () => ({
      elapsed: useCubeStore.getState().elapsedSeconds(),
      efficiency: useCubeStore.getState().efficiency(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, history.length, finishedAt, solved, optimalMoveCount],
  );

  const handleSelectGuided = useCallback(
    (method) => {
      setShowGuidedPicker(false);
      if (assisted) {
        onStartGuided(method);
      } else {
        setAssistWarning({ type: "guided", method });
      }
    },
    [assisted, onStartGuided],
  );

  const handleSelectAuto = useCallback(() => {
    setShowGuidedPicker(false);
    if (assisted) {
      onRunAutoSolve();
    } else {
      setAssistWarning({ type: "auto" });
    }
  }, [assisted, onRunAutoSolve]);

  const confirmAssistWarning = useCallback(() => {
    if (!assistWarning) return;
    const action = assistWarning;
    setAssistWarning(null);
    if (action.type === "guided") {
      onStartGuided(action.method);
    } else if (action.type === "auto") {
      onRunAutoSolve();
    }
  }, [assistWarning, onStartGuided, onRunAutoSolve]);

  const cancelAssistWarning = useCallback(() => {
    setAssistWarning(null);
  }, []);

  const handleBackToInteractive = useCallback(() => {
    setShowGuidedPicker(false);
    setAssistWarning(null);
    onBackToInteractive();
  }, [onBackToInteractive]);

  // Modal keyboard shortcuts (ESC to cancel, Enter to confirm)
  useEffect(() => {
    if (!assistWarning) return;
    const onModalKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelAssistWarning();
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmAssistWarning();
      }
    };
    window.addEventListener("keydown", onModalKeyDown);
    return () => window.removeEventListener("keydown", onModalKeyDown);
  }, [assistWarning, cancelAssistWarning, confirmAssistWarning]);

  return (
    <>
      {/* --- In-App Custom Warning Modal for Assisted Solves --- */}
      {assistWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="assist-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) cancelAssistWarning();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-morph-in"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-dark-surface border border-dark-border p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xl shrink-0">
                ⚠️
              </div>
              <div className="space-y-1">
                <h3
                  id="assist-modal-title"
                  className="text-sm font-bold text-white tracking-tight"
                >
                  Assisted Solve Notice
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Starting{" "}
                  <span className="font-semibold text-white">
                    {assistWarning.type === "guided"
                      ? `${assistWarning.method.toUpperCase()} Guided Mode`
                      : "Auto-Solve Mode"}
                  </span>{" "}
                  will flag this session as assisted. This attempt will not
                  count toward your efficiency score or the leaderboard.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-dark-border/60">
              <button
                type="button"
                onClick={cancelAssistWarning}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAssistWarning}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                Continue as Assisted
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Top Header HUD --- */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 shrink-0 shadow-sm">
        {/* Left stats: Timer, Moves, Efficiency (Interactive) OR Assisted Run Notice */}
        {!assisted && mode === MODES.INTERACTIVE ? (
          <div className="flex items-center gap-3 sm:gap-5 flex-wrap">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
                Timer
              </span>
              <span className="font-mono text-base sm:text-xl font-bold text-white tracking-tight">
                {elapsed.toFixed(1)}
                <span className="text-xs text-gray-400 font-normal">s</span>
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
                Moves
              </span>
              <span className="font-mono text-sm sm:text-lg font-bold text-white">
                {turnCount}{" "}
                <span className="text-xs text-gray-400 font-normal">
                  / cfop {optimalMoveCount || "?"}
                </span>
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
                Efficiency
              </span>
              <span
                className={`font-mono text-sm sm:text-lg font-bold ${
                  efficiency && efficiency >= 50 ? "text-neon-green" : "text-white"
                }`}
              >
                {efficiency ? `${efficiency.toFixed(0)}%` : "--"}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-morph-in">
            <span className="text-base sm:text-lg select-none">⚠️</span>
            <div className="leading-snug">
              <span className="text-xs sm:text-sm font-bold text-amber-200 block">
                Assisted Run
              </span>
              <span className="text-[11px] sm:text-xs text-amber-300/80 block">
                Timer &amp; leaderboard submission disabled
              </span>
            </div>
          </div>
        )}

        {/* Right Mode Switcher & Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-xl bg-dark-bg/80 p-1 border border-dark-border text-xs transition-all duration-200">
            {showGuidedPicker ? (
              <div
                key="picker"
                className="flex items-center gap-1 animate-morph-in"
              >
                <button
                  type="button"
                  onClick={() => setShowGuidedPicker(false)}
                  className="px-2.5 py-1.5 rounded-lg font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer flex items-center gap-1"
                  title="Cancel and return to modes"
                >
                  <span>←</span>
                  <span>Cancel</span>
                </button>

                <div className="w-px h-3.5 bg-dark-border mx-0.5" />

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectGuided("beginner")}
                  className="px-2.5 py-1.5 rounded-lg font-semibold text-neon-blue hover:bg-neon-blue/15 border border-neon-blue/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-40"
                >
                  <span>📖</span>
                  <span>Beginner</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSelectGuided("cfop")}
                  className="px-2.5 py-1.5 rounded-lg font-semibold text-amber-300 hover:bg-amber-400/15 border border-amber-400/30 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-40"
                >
                  <span>⚡</span>
                  <span>CFOP</span>
                </button>
              </div>
            ) : (
              <div
                key="modes"
                className="flex items-center gap-0.5 animate-morph-in"
              >
                <button
                  disabled={loading}
                  onClick={handleBackToInteractive}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    mode === MODES.INTERACTIVE
                      ? "bg-neon-blue/20 text-neon-blue font-semibold border border-neon-blue/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Interactive
                </button>
                <button
                  disabled={loading}
                  onClick={() => setShowGuidedPicker(true)}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    mode === MODES.GUIDED
                      ? "bg-neon-blue/20 text-neon-blue font-semibold border border-neon-blue/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Guided{" "}
                  {solution?.method_used
                    ? `(${solution.method_used.toUpperCase()})`
                    : ""}
                </button>
                <button
                  disabled={loading}
                  onClick={handleSelectAuto}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    mode === MODES.AUTO
                      ? "bg-neon-blue/20 text-neon-blue font-semibold border border-neon-blue/40 shadow-sm"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  Auto-Solve
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onResetCube}
            title="Reset to scramble"
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 border border-dark-border hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>↺</span> Reset
          </button>
          <button
            onClick={() => navigate("/cube-input")}
            title="Load new cube"
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-white/5 border border-dark-border hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>+</span> New
          </button>
        </div>
      </div>
    </>
  );
}
