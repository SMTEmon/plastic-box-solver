import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";
import KeyboardControls from "../Components/KeyboardControls";
import MoveButtons from "../Components/MoveButtons";
import PlaybackControls from "../Components/PlaybackControls";
import AssistDialog from "../Components/AssistDialog";
import GuidedPanel, { StageProgress } from "../Components/GuidedPanel";
import MethodComparison from "../Components/MethodComparison";
import {
  Panel,
  PageHeader,
  Button,
  Note,
  Segmented,
  Stat,
} from "../Components/ui.jsx";
import { cubeApi, solvesApi } from "../lib/api.js";
import { invert } from "../cube/moves.js";
import { centreColour, COLOUR_HEX } from "../cube/notation.js";
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

/** Which colour is on which face right now -- centres move during rotations. */
function FaceLegend({ facelets }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
      {Object.keys(FACE_LABELS).map((f) => (
        <div key={f} className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span
            className="w-3 h-3 rounded border border-white/15 shrink-0"
            style={{ background: COLOUR_HEX[centreColour(facelets, f)] }}
          />
          {FACE_LABELS[f]}
        </div>
      ))}
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
  const [tick, setTick] = useState(0);
  const [speed, setSpeedState] = useState(0.5);
  const [playback, setPlayback] = useState({ pending: 0, paused: false });
  const [playbackTotal, setPlaybackTotal] = useState(0);
  const [dialog, setDialog] = useState(null); // "auto" | "guided" | null
  const [guidedMethod, setGuidedMethod] = useState("beginner");
  const [saveState, setSaveState] = useState(null); // null | "saving" | "saved" | msg

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

  /**
   * FR-13a: save a finished solve.
   *
   * Only when it was genuinely the user's own work: solved, unassisted, at
   * least one move made, and signed in. submittedRef guards against the effect
   * firing twice for one solve.
   */
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

  /**
   * Speed and method are chosen in the dialog, so nothing moves until the user
   * says go. Auto-Solve is always Kociemba; Guided is Beginner or CFOP.
   */
  const beginAssisted = async ({ speed: chosenSpeed, method }) => {
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
      await fetchSolution(method);
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
        onCancel={() => setDialog(null)}
        onStart={beginAssisted}
      />

      <PageHeader
        title="Solve"
        subtitle={
          guided
            ? "Follow one step at a time — the cube shows you what each move does"
            : mode === MODES.AUTO
              ? "Watch the computed solution play out"
              : "Turn the cube yourself. The timer starts on your first move."
        }
      >
        <Segmented
          value={mode}
          onChange={onModeChange}
          disabled={loading}
          options={[
            { value: MODES.INTERACTIVE, label: "Interactive" },
            { value: MODES.GUIDED, label: "Guided" },
            { value: MODES.AUTO, label: "Auto-Solve" },
          ]}
        />
      </PageHeader>

      {error && <Note tone="error" className="mb-4">{error}</Note>}

      {guided && solution.fellBack && (
        <Note tone="warn" className="mb-3">
          CFOP hit a bug in the solver library on this particular cube, so you
          are being shown the <strong>beginner method</strong> instead. Same
          destination, more moves.
        </Note>
      )}

      {guided && (
        <div className="mb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] text-gray-500">
              Teaching with{" "}
              <span className="text-accent-violet font-medium">
                {solution.methodLabel}
              </span>{" "}
              &middot; {solution.moveCount} moves &middot; Kociemba would take{" "}
              {optimalMoveCount}
            </span>
          </div>
          <StageProgress
            stages={solution.stages}
            cursor={cursor}
            currentStage={stage}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem] items-start">
        {/* --- main column --- */}
        <div className="min-w-0 space-y-3">
          <div
            className={`relative rounded-2xl overflow-hidden border border-dark-border bg-dark-bg/70 ${
              guided ? "h-[42vh] min-h-[260px]" : "h-[54vh] min-h-[340px]"
            }`}
          >
            <CubeScene
              onAnimatorReady={onAnimatorReady}
              onProgress={onProgress}
              showLabels={showLabels}
              viewRef={viewRef}
            />
            <div className="absolute top-2 right-2 flex gap-1.5">
              <button
                onClick={() => viewRef.current?.resetView()}
                className="px-2.5 py-1.5 rounded-lg border border-dark-border bg-dark-surface/90 backdrop-blur text-gray-300 text-[11px] cursor-pointer hover:text-white hover:border-neon-blue transition-colors"
                title="Put the camera back to the default view"
              >
                Reset view
              </button>
              <button
                onClick={() => setShowLabels((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border bg-dark-surface/90 backdrop-blur text-[11px] cursor-pointer transition-colors ${
                  showLabels
                    ? "border-neon-blue text-neon-blue"
                    : "border-dark-border text-gray-400 hover:text-white"
                }`}
              >
                Face labels
              </button>
            </div>
          </div>

          {/* In Guided Mode the instruction is the product, not a sidebar note. */}
          {guided && (
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
          )}

          {mode === MODES.INTERACTIVE && (
            <Panel title="Turn the cube">
              <MoveButtons onMove={doMove} disabled={!canTurn} />
              <p className="text-[11px] text-gray-500 mt-3">
                Keyboard:{" "}
                <span className="font-mono text-gray-400">U D L R F B</span> turn
                clockwise &middot;{" "}
                <span className="font-mono text-gray-400">Shift</span> reverses
                &middot; <span className="font-mono text-gray-400">2</span> then
                a key gives a half turn &middot;{" "}
                <span className="font-mono text-gray-400">Ctrl+Z</span> undo
              </p>
            </Panel>
          )}

          {mode === MODES.AUTO && solution && (
            <Panel title="Solution">
              <p className="text-[11px] font-mono text-gray-400 break-words leading-relaxed">
                {solution.moves.join("  ")}
              </p>
            </Panel>
          )}
        </div>

        {/* --- sidebar: status only --- */}
        <div className="space-y-3 lg:sticky lg:top-0">
          <Panel title="This attempt" tone={solved ? "green" : "default"}>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Time" value={`${elapsed.toFixed(1)}s`} />
              <Stat label="Moves" value={history.length} />
              <Stat
                label="Efficiency"
                value={efficiency ? `${efficiency.toFixed(0)}%` : "--"}
                tone={efficiency >= 50 ? "green" : "default"}
              />
            </div>
            <div className="mt-3 text-[11px] text-gray-500">
              Optimal for this scramble:{" "}
              <span className="text-gray-300 font-mono">
                {optimalMoveCount || "?"}
              </span>{" "}
              moves
            </div>

            {solved && (
              <Note tone="success" className="mt-3">
                <strong>Solved</strong> in {elapsed.toFixed(1)}s and{" "}
                {history.length} moves{assisted ? " (assisted)" : ""}.
                {saveState === "saving" && " Saving..."}
                {saveState === "saved" && " Saved to your history."}
                {!token && !assisted && " Sign in to save it."}
              </Note>
            )}
            {assisted && !solved && (
              <Note tone="warn" className="mt-3">
                Assisted run — this attempt will not be submitted to the
                leaderboard.
              </Note>
            )}
            {saveState && saveState !== "saving" && saveState !== "saved" && (
              <Note tone="error" className="mt-3">
                Could not save: {saveState}
              </Note>
            )}
          </Panel>

          {mode !== MODES.INTERACTIVE && (
            <Panel title="Playback">
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
          )}

          <Panel title="Which side is which">
            <FaceLegend facelets={facelets} />
          </Panel>

          <MethodComparison key={initial} facelets={initial} />

          <Panel title="Actions">
            <div className="grid gap-2">
              <Button onClick={resetCube}>Reset to scramble</Button>
              <Button onClick={() => navigate("/cube-input")}>New cube</Button>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
