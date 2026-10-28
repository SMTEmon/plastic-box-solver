import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import JEASINGS from "jeasings";

import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";
import KeyboardControls from "../Components/KeyboardControls";
import SolveHeader from "../Components/SolveHeader";
import SolveControlsDock from "../Components/SolveControlsDock";
import CoachSidebar from "../Components/CoachSidebar";
import SolveCelebration from "../Components/SolveCelebration";
import { cubeApi, solvesApi } from "../lib/api.js";
import { isSolved as isFaceletsSolved } from "../cube/facelets.js";
import { invert } from "../cube/moves.js";
import { getStageGuide, RESET_DRILL_MOVES } from "../cube/stageGuides.js";
import { useAuthStore } from "../store/authStore.js";
import { useCubeStore, MODES } from "../store/cubeStore.js";

const CAMERA_POSITIONS = {
  top: { x: 3.4, y: 3.4, z: 3.4 },
  bottom: { x: 3.4, y: -3.4, z: 3.4 },
};

function animateCameraTo(controls, viewType = "top") {
  if (!controls?.object) return;
  const target = CAMERA_POSITIONS[viewType] ?? CAMERA_POSITIONS.top;

  new JEASINGS.JEasing(controls.object.position)
    .to(target, 600)
    .easing(JEASINGS.Cubic.Out)
    .onUpdate(() => {
      controls.target.set(0, 0, 0);
      controls.update();
    })
    .start();
}

export default function SolveWorkspace() {
  const initial = useCubeStore((s) => s.initial);
  const history = useCubeStore((s) => s.history);
  const mode = useCubeStore((s) => s.mode);
  const solution = useCubeStore((s) => s.solution);
  const assisted = useCubeStore((s) => s.assisted);
  const solved = useCubeStore((s) => s.isSolved());
  const stage = useCubeStore((s) => s.currentStage());
  const facelets = useCubeStore((s) => s.facelets);
  const focusMode = useCubeStore((s) => s.focusMode);
  const toggleFocusMode = useCubeStore((s) => s.toggleFocusMode);
  const token = useAuthStore((s) => s.token);

  const turnCount = useMemo(
    () => history.filter((m) => !["X", "Y", "Z"].includes(m[0])).length,
    [history],
  );

  const animatorRef = useRef(null);
  const controlsRef = useRef(null);
  const submittedRef = useRef(false);
  const playbackRef = useRef({ isPlaying: false, targetEnd: 0 });
  const playbackTimerRef = useRef(null);
  const drillRef = useRef({
    active: false,
    step: 0,
    startedWallMs: 0,
    snapshot: null,
  });

  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState(null); // null | "saving" | "saved" | error msg
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoTrackCamera, setAutoTrackCamera] = useState(true);
  const [drillState, setDrillState] = useState({
    active: false,
    step: 0,
    completed: false,
  });
  const [followAlongNotice, setFollowAlongNotice] = useState(null);
  const followAlongTimerRef = useRef(null);
  const lastTrackedFaceRef = useRef(null);

  const activeGuide = getStageGuide(stage?.name, facelets);

  // Clean up any pending playback or follow-along timer on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
      }
      if (followAlongTimerRef.current) {
        clearTimeout(followAlongTimerRef.current);
      }
    };
  }, []);

  // Unified playback callback invoked on each animation step completion
  const handleStepDone = useCallback(
    (_move, count) => {
      if (drillRef.current.active && count === "drill") {
        const nextStep = drillRef.current.step + 1;
        if (nextStep >= RESET_DRILL_MOVES.length) {
          const deltaMs = Date.now() - drillRef.current.startedWallMs;
          drillRef.current = {
            active: false,
            step: RESET_DRILL_MOVES.length,
            startedWallMs: 0,
            snapshot: null,
          };
          useCubeStore.getState().shiftStartTime(deltaMs);
          setDrillState({
            active: false,
            step: RESET_DRILL_MOVES.length,
            completed: true,
          });
        } else {
          drillRef.current.step = nextStep;
          setDrillState({
            active: true,
            step: nextStep,
            completed: false,
          });
          animatorRef.current?.enqueue(RESET_DRILL_MOVES[nextStep], "drill");
        }
        return;
      }

      if (!playbackRef.current.isPlaying) return;

      const s = useCubeStore.getState();
      const targetEnd = playbackRef.current.targetEnd;

      if (s.cursor >= targetEnd || s.cursor >= s.solution?.moves?.length) {
        playbackRef.current.isPlaying = false;
        setIsPlaying(false);
      } else {
        // Natural breather between consecutive moves in playback (~180ms at 1x, ~360ms at 0.5x)
        const breatherMs = Math.round(180 / speed);
        playbackTimerRef.current = setTimeout(() => {
          if (!playbackRef.current.isPlaying) return;
          const curStore = useCubeStore.getState();
          if (
            curStore.cursor >= targetEnd ||
            curStore.cursor >= curStore.solution?.moves?.length
          ) {
            playbackRef.current.isPlaying = false;
            setIsPlaying(false);
            return;
          }
          const nextMove = curStore.solution.moves[curStore.cursor];
          animatorRef.current?.enqueue(nextMove, false);
          curStore.setCursor(curStore.cursor + 1);
        }, breatherMs);
      }
    },
    [speed],
  );

  const handleSetSpeed = useCallback((s) => {
    setSpeed(s);
    animatorRef.current?.setSpeed(s);
  }, []);

  const onAnimatorReady = useCallback(
    (a) => {
      animatorRef.current = a;
      a.setSpeed(speed);
      a.onStep = handleStepDone;
      setReady(true);
    },
    [speed, handleStepDone],
  );

  useEffect(() => {
    if (animatorRef.current) {
      animatorRef.current.onStep = handleStepDone;
    }
  }, [ready, handleStepDone]);

  // Scramble / CFOP baseline check on mount
  useEffect(() => {
    const s = useCubeStore.getState();
    let cancelled = false;
    if (s.isSolved() && !s.history.length) {
      (async () => {
        try {
          const { facelets: fl } = await cubeApi.scramble(20);
          if (cancelled) return;
          const cfop = await cubeApi.solve(fl, "cfop");
          if (cancelled) return;
          useCubeStore.getState().loadScramble(fl, cfop.optimalMoveCount);
        } catch (err) {
          if (!cancelled) setError(err.message);
        }
      })();
    } else if (!s.optimalMoveCount && s.initial && !isFaceletsSolved(s.initial)) {
      (async () => {
        try {
          const cfop = await cubeApi.solve(s.initial, "cfop");
          if (cancelled) return;
          useCubeStore.setState({ optimalMoveCount: cfop.optimalMoveCount });
        } catch (err) {
          if (!cancelled) setError(err.message);
        }
      })();
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // FR-13a: save a finished unassisted solve
  useEffect(() => {
    if (drillState.active) return;
    if (!solved) {
      submittedRef.current = false;
      return;
    }
    if (assisted || !turnCount || !token) return;
    if (submittedRef.current) return;
    submittedRef.current = true;

    let cancelled = false;
    (async () => {
      setSaveState("saving");
      try {
        const s = useCubeStore.getState();
        let optMoves = s.optimalMoveCount;
        if (!optMoves && s.initial && !isFaceletsSolved(s.initial)) {
          const cfop = await cubeApi.solve(s.initial, "cfop");
          optMoves = cfop.optimalMoveCount;
          useCubeStore.setState({ optimalMoveCount: optMoves });
        }
        await solvesApi.create({
          solve_time: Math.max(0.01, s.elapsedSeconds()),
          move_count: turnCount,
          optimal_moves: optMoves,
          method: "CFOP",
          scramble: s.initial,
          solution: s.history.join(" "),
        });
        if (!cancelled) setSaveState("saved");
      } catch (err) {
        if (!cancelled) setSaveState(err.message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [solved, assisted, turnCount, token, initial, drillState.active]);

  const cancelResetDrill = useCallback((restorePreDrill = true) => {
    if (!drillRef.current.active) return;
    const { snapshot, startedWallMs } = drillRef.current;
    drillRef.current = {
      active: false,
      step: 0,
      startedWallMs: 0,
      snapshot: null,
    };
    animatorRef.current?.cancel();
    if (restorePreDrill && snapshot) {
      useCubeStore.getState().restoreSnapshot(snapshot);
      if (startedWallMs > 0) {
        useCubeStore.getState().shiftStartTime(Date.now() - startedWallMs);
      }
    }
    setDrillState({
      active: false,
      step: 0,
      completed: false,
    });
  }, []);


  // Assisted playback controls
  const fetchSolution = useCallback(async (method) => {
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
  }, []);

  const pausePlayback = useCallback(() => {
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    playbackRef.current.isPlaying = false;
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    cancelResetDrill(true);
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    animatorRef.current?.fastForward();
    const s = useCubeStore.getState();
    if (!s.solution || !s.solution.moves?.length) return;
    if (s.cursor >= s.solution.moves.length) return;

    const targetEnd =
      s.mode === MODES.GUIDED
        ? (s.currentStage()?.end ?? s.solution.moves.length)
        : s.solution.moves.length;

    if (s.cursor >= targetEnd) return;

    playbackRef.current = { isPlaying: true, targetEnd };
    setIsPlaying(true);

    animatorRef.current?.setSpeed(speed);
    const move = s.solution.moves[s.cursor];
    animatorRef.current?.enqueue(move, false);
    s.setCursor(s.cursor + 1);
  }, [speed, cancelResetDrill]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, pausePlayback, startPlayback]);

  const stepForward = useCallback(() => {
    cancelResetDrill(true);
    if (isPlaying) pausePlayback();
    const s = useCubeStore.getState();
    if (!s.solution || s.cursor >= s.solution.moves.length) return;
    const move = s.solution.moves[s.cursor];
    animatorRef.current?.setSpeed(speed);
    animatorRef.current?.enqueue(move, false);
    s.setCursor(s.cursor + 1);
  }, [isPlaying, pausePlayback, speed, cancelResetDrill]);

  const stepBack = useCallback(() => {
    cancelResetDrill(true);
    if (isPlaying) pausePlayback();
    const s = useCubeStore.getState();
    if (!s.solution || s.cursor <= 0) return;
    const move = invert(s.solution.moves[s.cursor - 1]);
    animatorRef.current?.setSpeed(speed);
    animatorRef.current?.enqueue(move, false);
    s.setCursor(s.cursor - 1);
  }, [isPlaying, pausePlayback, speed, cancelResetDrill]);

  // User interactive & follow-along guided moves
  const doMove = useCallback(
    (move) => {
      const s = useCubeStore.getState();
      if (s.mode === MODES.GUIDED && s.solution?.moves?.length) {
        if (s.cursor >= s.solution.moves.length) return;
        if (isPlaying) pausePlayback();
        const expected = s.solution.moves[s.cursor];
        if (move === expected) {
          if (followAlongTimerRef.current) clearTimeout(followAlongTimerRef.current);
          setFollowAlongNotice({ type: "success", text: `✓ Correct turn! Executed ${move}` });
          followAlongTimerRef.current = setTimeout(() => setFollowAlongNotice(null), 1500);
          animatorRef.current?.setSpeed(speed);
          animatorRef.current?.enqueue(move, false);
          s.setCursor(s.cursor + 1);
        } else {
          if (followAlongTimerRef.current) clearTimeout(followAlongTimerRef.current);
          setFollowAlongNotice({
            type: "wrong",
            text: `Guide expects ${expected}, but you turned ${move}. Try turning ${expected}!`,
          });
          followAlongTimerRef.current = setTimeout(() => setFollowAlongNotice(null), 2500);
        }
        return;
      }
      animatorRef.current?.enqueue(move, true);
    },
    [isPlaying, pausePlayback, speed],
  );

  const doUndo = useCallback(() => {
    const s = useCubeStore.getState();
    if (s.mode === MODES.GUIDED) {
      stepBack();
      return;
    }
    animatorRef.current?.fastForward();
    const move = s.undo();
    if (move) animatorRef.current?.enqueue(move, false);
  }, [stepBack]);

  const doRedo = useCallback(() => {
    const s = useCubeStore.getState();
    if (s.mode === MODES.GUIDED) {
      stepForward();
      return;
    }
    animatorRef.current?.fastForward();
    const move = s.redo();
    if (move) animatorRef.current?.enqueue(move, false);
  }, [stepForward]);

  const runAutoSolve = useCallback(async () => {
    cancelResetDrill(true);
    pausePlayback();
    useCubeStore.getState().markAssisted();
    if (useCubeStore.getState().mode === MODES.AUTO) return;
    useCubeStore.getState().setMode(MODES.AUTO);
    await fetchSolution("optimal");
  }, [fetchSolution, pausePlayback, cancelResetDrill]);

  const startGuided = useCallback(
    async (method) => {
      cancelResetDrill(true);
      pausePlayback();
      useCubeStore.getState().markAssisted();
      useCubeStore.getState().setMode(MODES.GUIDED);
      await fetchSolution(method);
    },
    [fetchSolution, pausePlayback, cancelResetDrill],
  );

  const backToInteractive = useCallback(() => {
    cancelResetDrill(true);
    pausePlayback();
    if (followAlongTimerRef.current) clearTimeout(followAlongTimerRef.current);
    setFollowAlongNotice(null);
    animatorRef.current?.fastForwardAll();
    animatorRef.current?.setSpeed(1);
    useCubeStore.getState().setMode(MODES.INTERACTIVE);
  }, [pausePlayback, cancelResetDrill]);

  const resetCube = useCallback(() => {
    cancelResetDrill(false);
    pausePlayback();
    if (followAlongTimerRef.current) clearTimeout(followAlongTimerRef.current);
    setFollowAlongNotice(null);
    animatorRef.current?.cancel();
    submittedRef.current = false;
    setSaveState(null);
    setDrillState({ active: false, step: 0, completed: false });
    useCubeStore.getState().reset();
  }, [pausePlayback, cancelResetDrill]);

  const startResetDrill = useCallback(() => {
    if (!animatorRef.current || drillRef.current.active) return;
    pausePlayback();
    animatorRef.current.fastForwardAll();

    const s = useCubeStore.getState();
    drillRef.current = {
      active: true,
      step: 0,
      startedWallMs: Date.now(),
      snapshot: {
        facelets: s.facelets,
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
      },
    };
    setDrillState({
      active: true,
      step: 0,
      completed: false,
    });
    animatorRef.current.enqueue(RESET_DRILL_MOVES[0], "drill");
  }, [pausePlayback]);

  const [hideInteractiveCoach, setHideInteractiveCoach] = useState(() => {
    try {
      return localStorage.getItem("hide-interactive-coach") === "true";
    } catch {
      return false;
    }
  });

  const toggleInteractiveCoach = useCallback(() => {
    setHideInteractiveCoach((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("hide-interactive-coach", String(next));
      } catch {}
      return next;
    });
  }, []);

  const guided = mode === MODES.GUIDED && solution;
  const showSidebar = Boolean(
    (mode === MODES.INTERACTIVE && !hideInteractiveCoach) || guided || solved || error,
  );
  const canTurn = ready && ((mode === MODES.INTERACTIVE && !drillState.active) || mode === MODES.GUIDED);

  // Auto-track camera to active target face when enabled
  useEffect(() => {
    if (!guided || !autoTrackCamera || !controlsRef.current) return;
    const target = activeGuide?.targetFace;
    if (target === "D" || target === "U") {
      if (lastTrackedFaceRef.current !== target) {
        lastTrackedFaceRef.current = target;
        animateCameraTo(controlsRef.current, target === "D" ? "bottom" : "top");
      }
    }
  }, [guided, autoTrackCamera, activeGuide?.targetFace]);

  useEffect(() => {
    if (!guided) {
      lastTrackedFaceRef.current = null;
    }
  }, [guided]);

  const toggleAutoTrack = useCallback(() => {
    setAutoTrackCamera((prev) => {
      const next = !prev;
      if (next && controlsRef.current) {
        const target = activeGuide?.targetFace;
        if (target === "D" || target === "U") {
          lastTrackedFaceRef.current = target;
          animateCameraTo(controlsRef.current, target === "D" ? "bottom" : "top");
        }
      }
      return next;
    });
  }, [activeGuide?.targetFace]);

  return (
    <AppShell>
      <SolveCelebration solved={solved} suppressed={drillState.active} />
      <KeyboardControls
        onMove={doMove}
        onUndo={doUndo}
        onRedo={doRedo}
        enabled={canTurn}
      />

      <div className="flex flex-col gap-3 min-h-0 lg:h-[calc(100vh-2rem)]">
        <SolveHeader
          loading={loading}
          onStartGuided={startGuided}
          onRunAutoSolve={runAutoSolve}
          onBackToInteractive={backToInteractive}
          onResetCube={resetCube}
        />

        {/* Main Viewport & Sidebar Grid */}
        <div
          className={`flex-1 grid grid-cols-1 ${
            showSidebar ? "lg:grid-cols-4" : ""
          } gap-4 min-h-0 lg:overflow-hidden`}
        >
          {/* 3D Viewport & Bottom Controls */}
          <div
            className={`${
              showSidebar ? "lg:col-span-3" : "w-full"
            } flex flex-col gap-3 min-w-0 min-h-0`}
          >
            {/* 3D Viewport Canvas */}
            <div className="rounded-2xl overflow-hidden border border-dark-border bg-gradient-to-b from-dark-surface/50 to-dark-bg shadow-inner h-[38vh] min-h-[260px] max-h-[440px] lg:h-auto lg:flex-1 relative touch-none">
              <CubeScene
                onAnimatorReady={onAnimatorReady}
                controlsRef={controlsRef}
                onMove={doMove}
                swipeEnabled={canTurn}
              />

              {/* Floating Camera Pills Top-Right */}
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex items-center gap-0.5 sm:gap-1 bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-xl p-1 shadow-lg text-[10px] sm:text-xs z-10 max-w-[calc(100%-1rem)] overflow-x-auto">
                <button
                  type="button"
                  onClick={() => animateCameraTo(controlsRef.current, "top")}
                  title="View Top face (U)"
                  className="px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px]"
                >
                  Top (U)
                </button>
                <button
                  type="button"
                  onClick={() => animateCameraTo(controlsRef.current, "bottom")}
                  title="View Bottom face (D)"
                  className="px-2.5 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px]"
                >
                  Bottom (D)
                </button>
                <div className="w-px h-3.5 bg-dark-border mx-0.5" />
                <button
                  type="button"
                  onClick={() => controlsRef.current?.reset()}
                  title="Reset view to default angle"
                  className="px-2 py-1 rounded-lg text-neon-blue hover:bg-neon-blue/10 transition-colors cursor-pointer font-medium text-[11px] flex items-center gap-1"
                >
                  <span>↺</span>
                  <span>Align</span>
                </button>
                {mode === MODES.INTERACTIVE && !solved && (
                  <>
                    <div className="w-px h-3.5 bg-dark-border mx-0.5" />
                    <button
                      type="button"
                      onClick={toggleInteractiveCoach}
                      title={hideInteractiveCoach ? "Show Coaching Sidebar" : "Hide Coaching Sidebar"}
                      className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                        hideInteractiveCoach
                          ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span>{hideInteractiveCoach ? "📋 Show Coach" : "✕ Hide Coach"}</span>
                    </button>
                  </>
                )}
                {guided && (
                  <>
                    <div className="w-px h-3.5 bg-dark-border mx-0.5" />
                    <button
                      type="button"
                      onClick={toggleFocusMode}
                      title={
                        focusMode
                          ? "Focus Mode: ON (dims non-target layers - click to disable)"
                          : "Focus Mode: OFF (click to ghost inactive layers)"
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                        focusMode
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{focusMode ? "👁" : "👁‍🗨"}</span>
                      <span>Focus {focusMode ? "ON" : "OFF"}</span>
                    </button>
                    <div className="w-px h-3.5 bg-dark-border mx-0.5" />
                    <button
                      type="button"
                      onClick={toggleAutoTrack}
                      title={
                        autoTrackCamera
                          ? "Camera auto-tracking target face: ON (click to disable)"
                          : "Camera auto-tracking: OFF (click to enable)"
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                        autoTrackCamera
                          ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{autoTrackCamera ? "◉" : "○"}</span>
                      <span>Track {autoTrackCamera ? "ON" : "OFF"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Controls Dock */}
            <SolveControlsDock
              speed={speed}
              onSetSpeed={handleSetSpeed}
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              onStepForward={stepForward}
              onStepBack={stepBack}
              canTurn={canTurn}
              onMove={doMove}
              onUndo={doUndo}
              onRedo={doRedo}
              onResetCube={resetCube}
              followAlongNotice={followAlongNotice}
            />
          </div>

          {/* Right Sidebar: Coaching HUD or Stats */}
          {showSidebar && (
            <CoachSidebar
              error={error}
              saveState={saveState}
              elapsed={useCubeStore.getState().elapsedSeconds()}
              turnCount={turnCount}
              drillState={drillState}
              onStartDrill={startResetDrill}
              drillDisabled={!ready || isPlaying}
              onCancelAnimation={() => animatorRef.current?.cancel()}
              onToggleHide={toggleInteractiveCoach}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
