import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";
import KeyboardControls from "../Components/KeyboardControls";
import MoveButtons from "../Components/MoveButtons";
import PlaybackControls from "../Components/PlaybackControls";
import { cubeApi } from "../lib/api.js";
import { invert } from "../cube/moves.js";
import {
  describeMove,
  shortLabel,
  centreColour,
  COLOUR_HEX,
  STAGE_HELP,
} from "../cube/notation.js";
import { useCubeStore, MODES } from "../store/cubeStore.js";

function Panel({ title, children, className = "" }) {
  return (
    <div
      className={`bg-dark-surface border border-dark-border rounded-xl p-4 ${className}`}
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

function ModeButton({ active, disabled, onClick, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors border disabled:opacity-40 ${
        active
          ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
          : "border-dark-border bg-dark-surface text-gray-300 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({ label, value, tone = "text-white" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono ${tone}`}>{value}</div>
    </div>
  );
}

/** The big "do this next" card. This is the whole point of Guided Mode. */
function InstructionCard({ move, facelets }) {
  const d = describeMove(move, facelets);
  return (
    <div className="rounded-xl border border-neon-blue/60 bg-neon-blue/5 p-4">
      <div className="flex items-center gap-3">
        {d.colourHex ? (
          <span
            className="w-9 h-9 rounded-lg border border-white/20 shrink-0"
            style={{ background: d.colourHex }}
            title={d.colourName}
          />
        ) : (
          <span className="w-9 h-9 rounded-lg border border-white/20 bg-dark-bg flex items-center justify-center text-lg shrink-0">
            ⟳
          </span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-bold text-white leading-tight">
            {d.title}
          </div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5">
            notation: {d.token}
          </div>
        </div>
        <span className="ml-auto text-2xl text-neon-blue leading-none">
          {d.arrow}
        </span>
      </div>
      <p className="text-xs text-gray-300 mt-3 leading-relaxed">{d.detail}</p>
    </div>
  );
}

/** Which colour is on which face right now -- centres move during rotations. */
function FaceLegend({ facelets }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {["U", "D", "L", "R", "F", "B"].map((f) => {
        const c = centreColour(facelets, f);
        return (
          <div
            key={f}
            className="flex items-center gap-1.5 text-[11px] text-gray-400"
          >
            <span
              className="w-3 h-3 rounded border border-white/15 shrink-0"
              style={{ background: COLOUR_HEX[c] }}
            />
            {{ U: "Top", D: "Bottom", L: "Left", R: "Right", F: "Front", B: "Back" }[f]}
          </div>
        );
      })}
    </div>
  );
}

export default function SolveWorkspace() {
  const navigate = useNavigate();

  const facelets = useCubeStore((s) => s.facelets);
  const history = useCubeStore((s) => s.history);
  const mode = useCubeStore((s) => s.mode);
  const solution = useCubeStore((s) => s.solution);
  const cursor = useCubeStore((s) => s.cursor);
  const assisted = useCubeStore((s) => s.assisted);
  const startedAt = useCubeStore((s) => s.startedAt);
  const finishedAt = useCubeStore((s) => s.finishedAt);
  const optimalMoveCount = useCubeStore((s) => s.optimalMoveCount);

  const animatorRef = useRef(null);
  const viewRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [tick, setTick] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const [playback, setPlayback] = useState({ pending: 0, paused: false });
  const [playbackTotal, setPlaybackTotal] = useState(0);

  const solved = useCubeStore((s) => s.isSolved)();
  const stage = useCubeStore((s) => s.currentStage)();

  const onAnimatorReady = useCallback((a) => {
    animatorRef.current = a;
    setReady(true);
  }, []);

  /** The animator pushes queue state up so the controls can be reactive. */
  const onProgress = useCallback(({ pending, paused }) => {
    setPlayback({ pending, paused });
  }, []);

  const changeSpeed = useCallback((value) => {
    setSpeedState(value);
    animatorRef.current?.setSpeed(value);
  }, []);

  const pausePlayback = useCallback(() => animatorRef.current?.pause(), []);
  const resumePlayback = useCallback(() => animatorRef.current?.resume(), []);

  /** Landing here with a solved cube means there is nothing to solve. */
  useEffect(() => {
    const s = useCubeStore.getState();
    if (!s.isSolved() || s.history.length) return;
    let cancelled = false;
    (async () => {
      try {
        const { facelets: fl } = await cubeApi.scramble(20);
        if (cancelled) return;
        const optimal = await cubeApi.solve(fl, "optimal");
        if (cancelled) return;
        useCubeStore.getState().loadScramble(fl, optimal.optimalMoveCount);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Live timer -- 10 Hz while a solve is in progress.
  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [startedAt, finishedAt]);

  const { elapsed, efficiency } = useMemo(
    () => ({
      elapsed: useCubeStore.getState().elapsedSeconds(),
      efficiency: useCubeStore.getState().efficiency(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, history.length, finishedAt, optimalMoveCount],
  );

  // --- user moves ---------------------------------------------------------

  const doMove = useCallback((move) => {
    animatorRef.current?.enqueue(move, true);
  }, []);

  const doUndo = useCallback(() => {
    const move = useCubeStore.getState().undo();
    if (move) animatorRef.current?.enqueue(move, false);
  }, []);

  const doRedo = useCallback(() => {
    const move = useCubeStore.getState().redo();
    if (move) animatorRef.current?.enqueue(move, false);
  }, []);

  // --- assisted modes -----------------------------------------------------

  const confirmAssist = () =>
    assisted ||
    window.confirm(
      "Using a system solve means this attempt won't count toward your " +
        "efficiency or the leaderboard. Continue?",
    );

  const fetchSolution = async (method) => {
    setLoading(true);
    setError("");
    try {
      const data = await cubeApi.solve(useCubeStore.getState().facelets, method);
      useCubeStore.getState().setSolution(data);
      return data;
    } catch (err) {
      setError(
        err.status === 422
          ? `Solver rejected this cube: ${err.message}`
          : err.message,
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** FR-11 -- queue the whole optimal solution and let it play. */
  const runAutoSolve = useCallback(async () => {
    if (!confirmAssist()) return;
    useCubeStore.getState().markAssisted();
    useCubeStore.getState().setMode(MODES.AUTO);
    const data = await fetchSolution("optimal");
    if (!data) return;
    setPlaybackTotal(data.moves.length);
    animatorRef.current?.setSpeed(speed);
    animatorRef.current?.enqueue(data.moves, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facelets, assisted, speed]);

  /** FR-10 -- beginner's method, one move at a time with instructions. */
  const startGuided = useCallback(async () => {
    if (!confirmAssist()) return;
    useCubeStore.getState().markAssisted();
    useCubeStore.getState().setMode(MODES.GUIDED);
    animatorRef.current?.setSpeed(speed);
    setPlaybackTotal(0);
    await fetchSolution("beginner");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facelets, assisted, speed]);

  const stepForward = () => {
    const s = useCubeStore.getState();
    if (!s.solution || s.cursor >= s.solution.moves.length) return;
    animatorRef.current?.enqueue(s.solution.moves[s.cursor], false);
    s.setCursor(s.cursor + 1);
  };

  const stepBack = () => {
    const s = useCubeStore.getState();
    if (!s.solution || s.cursor <= 0) return;
    animatorRef.current?.enqueue(invert(s.solution.moves[s.cursor - 1]), false);
    s.setCursor(s.cursor - 1);
  };

  /** Play out the rest of the current stage without clicking Next 26 times. */
  const playStage = () => {
    const s = useCubeStore.getState();
    if (!s.solution) return;
    const st = s.currentStage();
    if (!st) return;
    const end = Math.max(st.end, s.cursor + 1);
    animatorRef.current?.enqueue(s.solution.moves.slice(s.cursor, end), false);
    s.setCursor(end);
  };

  const backToInteractive = useCallback(() => {
    animatorRef.current?.clear();
    animatorRef.current?.resume();
    setPlaybackTotal(0);
    useCubeStore.getState().setMode(MODES.INTERACTIVE);
  }, []);

  const resetCube = useCallback(() => {
    animatorRef.current?.clear();
    animatorRef.current?.resume();
    setPlaybackTotal(0);
    useCubeStore.getState().reset();
  }, []);

  const guided = mode === MODES.GUIDED && solution;
  const canTurn = ready && mode === MODES.INTERACTIVE;
  const atEnd = solution ? cursor >= solution.moves.length : false;

  return (
    <AppShell>
      <KeyboardControls
        onMove={doMove}
        onUndo={doUndo}
        onRedo={doRedo}
        enabled={canTurn}
      />

      <div className="flex gap-4 h-[calc(100vh-2rem)]">
        {/* --- 3D --- */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Solve Workspace</h2>
            <div className="flex gap-2">
              <ModeButton
                active={mode === MODES.INTERACTIVE}
                disabled={loading}
                onClick={backToInteractive}
                label="Interactive"
              />
              <ModeButton
                active={mode === MODES.GUIDED}
                disabled={loading}
                onClick={startGuided}
                label="Guided"
              />
              <ModeButton
                active={mode === MODES.AUTO}
                disabled={loading}
                onClick={runAutoSolve}
                label="Auto-Solve"
              />
            </div>
          </div>

          <div className="relative flex-1 rounded-xl overflow-hidden border border-dark-border bg-dark-bg min-h-[320px]">
            <CubeScene
              onAnimatorReady={onAnimatorReady}
              onProgress={onProgress}
              showLabels={showLabels}
              viewRef={viewRef}
            />
            {/* Orbiting makes it very easy to lose track of which side is
                which, and every instruction is phrased by face name. */}
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={() => viewRef.current?.resetView()}
                className="px-2.5 py-1.5 rounded-lg border border-dark-border bg-dark-surface/90 text-gray-300 text-[11px] cursor-pointer hover:text-white hover:border-neon-blue transition-colors"
                title="Put the camera back to the front-top-right view"
              >
                Reset view
              </button>
              <button
                onClick={() => setShowLabels((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border bg-dark-surface/90 text-[11px] cursor-pointer transition-colors ${
                  showLabels
                    ? "border-neon-blue text-neon-blue"
                    : "border-dark-border text-gray-400 hover:text-white"
                }`}
              >
                Face labels
              </button>
            </div>
          </div>

          <MoveButtons onMove={doMove} disabled={!canTurn} />

          <p className="text-xs text-gray-500">
            Keyboard: <span className="font-mono text-gray-400">U D L R F B</span>{" "}
            turn clockwise &middot;{" "}
            <span className="font-mono text-gray-400">Shift</span> reverses
            &middot; <span className="font-mono text-gray-400">2</span> then a
            key gives a double turn &middot;{" "}
            <span className="font-mono text-gray-400">Ctrl+Z</span> undo
          </p>
        </div>

        {/* --- sidebar --- */}
        <div className="w-80 flex flex-col gap-4 shrink-0 overflow-y-auto">
          {/* Guided instructions come first: it is the thing you are reading. */}
          {guided && (
            <Panel title={`Step ${Math.min(cursor + 1, solution.moves.length)} of ${solution.moves.length}`}>
              {atEnd ? (
                <div className="text-neon-green text-sm font-bold">
                  All steps complete — the cube is solved.
                </div>
              ) : (
                <InstructionCard
                  move={solution.moves[cursor]}
                  facelets={facelets}
                />
              )}

              {stage && (
                <div className="mt-3">
                  <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-1">
                    Working on: {stage.name}
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {STAGE_HELP[stage.name]}
                  </p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <button
                  onClick={stepBack}
                  disabled={cursor <= 0}
                  className="flex-1 py-2 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  &larr; Back
                </button>
                <button
                  onClick={stepForward}
                  disabled={atEnd}
                  className="flex-1 py-2 rounded-lg bg-neon-blue text-dark-bg text-xs font-bold cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next &rarr;
                </button>
              </div>
              <button
                onClick={playStage}
                disabled={atEnd}
                className="w-full mt-2 py-2 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Play the rest of this stage
              </button>

              {!atEnd && (
                <div className="mt-3 text-[11px] text-gray-500">
                  Coming up:{" "}
                  <span className="text-gray-400">
                    {solution.moves
                      .slice(cursor + 1, cursor + 4)
                      .map(shortLabel)
                      .join(" · ") || "—"}
                  </span>
                </div>
              )}
            </Panel>
          )}

          <Panel title="This attempt">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Time" value={`${elapsed.toFixed(1)}s`} />
              <Stat label="Moves" value={history.length} />
              <Stat
                label="Efficiency"
                value={efficiency ? `${efficiency.toFixed(0)}%` : "--"}
                tone={efficiency >= 50 ? "text-neon-green" : "text-white"}
              />
            </div>
            <div className="mt-3 text-[11px] text-gray-500">
              Optimal solution for this scramble:{" "}
              <span className="text-gray-300 font-mono">
                {optimalMoveCount || "?"}
              </span>{" "}
              moves
            </div>
            {assisted && (
              <div className="mt-3 text-[11px] text-yellow-400 border border-yellow-500/30 bg-yellow-500/5 rounded-lg p-2">
                Assisted run &mdash; this attempt will not be submitted to the
                leaderboard.
              </div>
            )}
          </Panel>

          {solved && (
            <Panel title="Result" className="border-neon-green/50">
              <div className="text-neon-green font-bold text-sm mb-1">
                Cube solved
              </div>
              <div className="text-xs text-gray-400">
                {elapsed.toFixed(1)}s &middot; {history.length} moves
                {assisted ? " (assisted)" : ""}
              </div>
            </Panel>
          )}

          {error && (
            <Panel title="Error" className="border-red-500/40">
              <div className="text-xs text-red-400">{error}</div>
            </Panel>
          )}

          <Panel title="Which side is which">
            <FaceLegend facelets={facelets} />
            <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
              Centres never move relative to each other, so these colours tell
              you the cube&apos;s orientation. Whole-cube rotations change them.
            </p>
          </Panel>

          {guided && (
            <Panel title="Guided stages">
              <div className="space-y-1.5">
                {solution.stages.map((s) => {
                  const active = stage?.name === s.name;
                  const done = cursor >= s.end;
                  return (
                    <div
                      key={s.name}
                      className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-2 border ${
                        active
                          ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
                          : done
                            ? "border-transparent text-neon-green/70"
                            : "border-transparent text-gray-500"
                      }`}
                    >
                      <span>{s.name}</span>
                      <span className="font-mono">{s.end - s.start}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {mode !== MODES.INTERACTIVE && (
            <Panel title="Playback speed">
              <PlaybackControls
                speed={speed}
                onSpeed={changeSpeed}
                paused={playback.paused}
                onPause={pausePlayback}
                onResume={resumePlayback}
                pending={playback.pending}
                total={playbackTotal}
              />
              <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
                Slow it to <span className="font-mono">0.25x</span> if you are
                copying the moves onto a real cube. A speed change applies from
                the next move.
              </p>
            </Panel>
          )}

          {mode === MODES.AUTO && solution && (
            <Panel title="Auto-solve">
              <div className="text-xs text-gray-400 mb-2">
                {solution.moveCount} moves
              </div>
              <div className="text-[11px] font-mono text-gray-300 break-words leading-relaxed">
                {solution.moves.join(" ")}
              </div>
            </Panel>
          )}

          <Panel title="Actions">
            <div className="flex flex-col gap-2">
              <button
                onClick={resetCube}
                className="w-full py-2.5 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white transition-colors"
              >
                Reset to scramble
              </button>
              <button
                onClick={() => navigate("/cube-input")}
                className="w-full py-2.5 rounded-lg border border-dark-border bg-dark-bg text-gray-300 text-xs cursor-pointer hover:text-white transition-colors"
              >
                New cube
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
