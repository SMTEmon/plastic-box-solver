import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";
import KeyboardControls from "../Components/KeyboardControls";
import MoveButtons from "../Components/MoveButtons";
import PlaybackControls from "../Components/PlaybackControls";
import AssistDialog from "../Components/AssistDialog";
import GuidedPanel, { StageProgress, CubeBasics } from "../Components/GuidedPanel";
import MethodComparison from "../Components/MethodComparison";
import { Panel, Button, Note, Segmented } from "../Components/ui.jsx";
import { cubeApi, solvesApi } from "../lib/api.js";
import { invert } from "../cube/moves.js";
import { centreColour, COLOUR_HEX, COLOUR_NAMES } from "../cube/notation.js";
import { useCubeStore, MODES } from "../store/cubeStore.js";
import { useAuthStore } from "../store/authStore.js";

const FACE_LABELS = {
  U: "Top",
  D: "Bottom",
  L: "Left",
  R: "Right",
  F: "Front",
  B: "Back",
};

/**
 * Which colour is on which face, as a strip floating over the canvas.
 *
 * This used to be a whole sidebar panel. It is a six-item lookup -- it does not
 * deserve a panel, and the cube needs the room.
 */
function FaceLegendOverlay({ facelets }) {
  return (
    <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-2.5 gap-y-1 max-w-[15rem] px-2.5 py-1.5 rounded-xl bg-dark-surface/85 backdrop-blur border border-dark-border">
      {Object.keys(FACE_LABELS).map((f) => (
        <span
          key={f}
          className="flex items-center gap-1 text-[10px] text-gray-400"
          title={`${FACE_LABELS[f]} is ${COLOUR_NAMES[centreColour(facelets, f)]}`}
        >
          <span
            className="w-2.5 h-2.5 rounded-sm border border-white/15"
            style={{ background: COLOUR_HEX[centreColour(facelets, f)] }}
          />
          {FACE_LABELS[f]}
        </span>
      ))}
    </div>
  );
}

/** One compact figure in the stats strip. */
function Metric({ label, value, tone = "text-white" }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.1em] text-gray-500">
        {label}
      </span>
      <span className={`text-sm font-bold font-mono ${tone}`}>{value}</span>
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
  const initial = useCubeStore((s) => s.initial);

  const token = useAuthStore((s) => s.token);

  const animatorRef = useRef(null);
  const viewRef = useRef(null);
  const submittedRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [tick, setTick] = useState(0);
  const [speed, setSpeedState] = useState(0.5);
  const [playback, setPlayback] = useState({ pending: 0, paused: false });
  const [playbackTotal, setPlaybackTotal] = useState(0);
  const [dialog, setDialog] = useState(null); // "auto" | "guided" | null
  const [guidedMethod, setGuidedMethod] = useState("beginner");
  const [saveState, setSaveState] = useState(null);

  const solved = useCubeStore((s) => s.isSolved)();
  const stage = useCubeStore((s) => s.currentStage)();

  const onAnimatorReady = useCallback((a) => {
    animatorRef.current = a;
    a.setSpeed(0.5);
    setReady(true);
  }, []);

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

  /** FR-13a: save a finished solve, if it was genuinely the user's own work. */
  useEffect(() => {
    if (!solved || assisted || !history.length || !token) return;
    if (submittedRef.current) return;
    submittedRef.current = true;

    const s = useCubeStore.getState();
    setSaveState("saving");
    solvesApi
      .create({
        solve_time: s.elapsedSeconds(),
        move_count: s.history.length,
        optimal_moves: s.optimalMoveCount,
        method: "Interactive",
        scramble: s.initial,
        solution: s.history.join(" "),
      })
      .then(() => setSaveState("saved"))
      .catch((err) => setSaveState(err.message));
  }, [solved, assisted, history.length, token]);

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

  const fetchSolution = async (method, firstColour = null) => {
    setLoading(true);
    setError("");
    try {
      const data = await cubeApi.solve(
        useCubeStore.getState().facelets,
        method,
        firstColour,
      );
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

  const beginAssisted = async ({ speed: chosenSpeed, method, firstColour }) => {
    const which = dialog;
    setDialog(null);
    changeSpeed(chosenSpeed);
    useCubeStore.getState().markAssisted();
    animatorRef.current?.setSpeed(chosenSpeed);

    if (which === "auto") {
      useCubeStore.getState().setMode(MODES.AUTO);
      const data = await fetchSolution("optimal");
      if (!data) return;
      setPlaybackTotal(data.moves.length);
      animatorRef.current?.enqueue(data.moves, false);
    } else {
      setGuidedMethod(method);
      useCubeStore.getState().setMode(MODES.GUIDED);
      setPlaybackTotal(0);
      await fetchSolution(method, firstColour);
    }
  };

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

  const onModeChange = (next) => {
    if (next === MODES.INTERACTIVE) return backToInteractive();
    setDialog(next === MODES.AUTO ? "auto" : "guided");
  };

  const resetCube = useCallback(() => {
    animatorRef.current?.clear();
    animatorRef.current?.resume();
    setPlaybackTotal(0);
    setSaveState(null);
    submittedRef.current = false;
    useCubeStore.getState().reset();
  }, []);

  const guided = mode === MODES.GUIDED && solution;
  const canTurn = ready && mode === MODES.INTERACTIVE;

  const canvasButton =
    "px-2 py-1 rounded-lg border bg-dark-surface/90 backdrop-blur text-[10px] cursor-pointer transition-colors";

  return (
    <AppShell>
      <KeyboardControls
        onMove={doMove}
        onUndo={doUndo}
        onRedo={doRedo}
        enabled={canTurn}
      />

      <AssistDialog
        open={dialog !== null}
        mode={dialog}
        moveCount={dialog === "auto" ? optimalMoveCount : undefined}
        alreadyAssisted={assisted}
        initialSpeed={speed}
        initialMethod={guidedMethod}
        facelets={facelets}
        onCancel={() => setDialog(null)}
        onStart={beginAssisted}
      />

      {/* Fixed-height flex column on large screens so the cube can take every
          pixel the other rows do not need. Stacks normally below lg. */}
      <div className="flex flex-col gap-2.5 lg:h-[calc(100vh-2rem)] lg:min-h-0">
        {/* --- one compact bar: title, stats, mode, actions --- */}
        <div className="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 className="text-lg font-bold text-white">Solve</h2>

          <div className="flex items-center gap-4">
            <Metric label="Time" value={`${elapsed.toFixed(1)}s`} />
            <Metric label="Moves" value={history.length} />
            <Metric
              label="Eff"
              value={efficiency ? `${efficiency.toFixed(0)}%` : "--"}
              tone={efficiency >= 50 ? "text-neon-green" : "text-white"}
            />
            <Metric
              label="Optimal"
              value={optimalMoveCount || "?"}
              tone="text-gray-400"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Segmented
              value={mode}
              onChange={onModeChange}
              disabled={loading}
              options={[
                { value: MODES.INTERACTIVE, label: "Interactive" },
                { value: MODES.GUIDED, label: "Guided" },
                { value: MODES.AUTO, label: "Auto" },
              ]}
            />
            <Button onClick={resetCube}>Reset</Button>
            <Button onClick={() => navigate("/cube-input")}>New cube</Button>
          </div>
        </div>

        {/* --- inline status, only when there is something to say --- */}
        {error && <Note tone="error" className="shrink-0">{error}</Note>}

        {solved && (
          <Note tone="success" className="shrink-0">
            <strong>Solved</strong> in {elapsed.toFixed(1)}s and {history.length}{" "}
            moves{assisted ? " (assisted — not submitted)" : ""}.
            {saveState === "saving" && " Saving..."}
            {saveState === "saved" && " Saved to your history."}
            {!token && !assisted && " Sign in to save it."}
          </Note>
        )}

        {assisted && !solved && (
          <div className="shrink-0 text-[11px] text-accent-amber">
            Assisted run — this attempt will not be submitted to the leaderboard.
          </div>
        )}

        {guided && solution.fellBack && (
          <Note tone="warn" className="shrink-0">
            CFOP hit a bug in the solver library on this cube, so you are being
            shown the <strong>beginner method</strong> instead.
          </Note>
        )}

        {/* --- stage strip --- */}
        {guided && (
          <div className="shrink-0">
            <div className="text-[11px] text-gray-500 mb-1.5">
              {solution.methodLabel}
              {solution.firstColour && (
                <>
                  {" · building the "}
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm border border-white/20 align-[-1px]"
                    style={{ background: COLOUR_HEX[solution.firstColour] }}
                  />{" "}
                  <span className="capitalize">
                    {COLOUR_NAMES[solution.firstColour]}
                  </span>
                  {" face first"}
                </>
              )}
              {" · "}
              {solution.moveCount} moves (Kociemba: {optimalMoveCount})
            </div>
            <StageProgress
              stages={solution.stages}
              cursor={cursor}
              currentStage={stage}
            />
          </div>
        )}

        {/* --- the cube gets everything that is left --- */}
        <div className="flex-1 flex flex-col lg:flex-row gap-2.5 lg:min-h-0">
          <div className="flex-1 flex flex-col gap-2.5 min-w-0 lg:min-h-0">
            <div className="relative flex-1 min-h-[300px] lg:min-h-0 rounded-2xl overflow-hidden border border-dark-border bg-dark-bg/70">
              <CubeScene
                onAnimatorReady={onAnimatorReady}
                onProgress={onProgress}
                showLabels={showLabels}
                viewRef={viewRef}
              />

              <div className="absolute top-2 right-2 flex gap-1.5">
                <button
                  onClick={() => viewRef.current?.resetView()}
                  className={`${canvasButton} border-dark-border text-gray-300 hover:text-white hover:border-neon-blue`}
                  title="Put the camera back to the default view"
                >
                  Reset view
                </button>
                <button
                  onClick={() => setShowLabels((v) => !v)}
                  className={`${canvasButton} ${
                    showLabels
                      ? "border-neon-blue text-neon-blue"
                      : "border-dark-border text-gray-400 hover:text-white"
                  }`}
                >
                  Labels
                </button>
                <button
                  onClick={() => setShowLegend((v) => !v)}
                  className={`${canvasButton} ${
                    showLegend
                      ? "border-neon-blue text-neon-blue"
                      : "border-dark-border text-gray-400 hover:text-white"
                  }`}
                >
                  Colours
                </button>
              </div>

              {showLegend && <FaceLegendOverlay facelets={facelets} />}
            </div>

            {/* mode-specific row, directly under the cube */}
            {guided && (
              <div className="shrink-0">
                <GuidedPanel
                  solution={solution}
                  cursor={cursor}
                  facelets={facelets}
                  currentStage={stage}
                  onBack={stepBack}
                  onNext={stepForward}
                  onPlayStage={playStage}
                  busy={loading}
                />
              </div>
            )}

            {mode === MODES.INTERACTIVE && (
              <div className="shrink-0">
                <MoveButtons onMove={doMove} disabled={!canTurn} />
                <p className="text-[10px] text-gray-600 mt-1.5">
                  <span className="font-mono text-gray-500">U D L R F B</span>{" "}
                  turn · <span className="font-mono text-gray-500">Shift</span>{" "}
                  reverses · <span className="font-mono text-gray-500">2</span>{" "}
                  then a key = half turn ·{" "}
                  <span className="font-mono text-gray-500">Ctrl+Z</span> undo
                </p>
              </div>
            )}
          </div>

          {/* --- narrow rail: only what the current mode needs --- */}
          {mode !== MODES.INTERACTIVE && (
            <aside className="w-full lg:w-56 shrink-0 space-y-2.5 lg:overflow-y-auto lg:min-h-0">
              <Panel title="Playback" compact>
                <PlaybackControls
                  speed={speed}
                  onSpeed={changeSpeed}
                  paused={playback.paused}
                  onPause={pausePlayback}
                  onResume={resumePlayback}
                  pending={playback.pending}
                  total={playbackTotal}
                />
              </Panel>

              {guided && <CubeBasics firstColour={solution.firstColour} />}

              {mode === MODES.AUTO && solution && (
                <Panel title="Solution" compact collapsible defaultOpen={false}>
                  <p className="text-[10px] font-mono text-gray-400 break-words leading-relaxed">
                    {solution.moves.join("  ")}
                  </p>
                </Panel>
              )}

              <MethodComparison key={initial} facelets={initial} />
            </aside>
          )}
        </div>
      </div>
    </AppShell>
  );
}
