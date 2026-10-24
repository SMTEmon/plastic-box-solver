import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import JEASINGS from "jeasings";

import AppShell from "../Layout/AppShell";
import CubeScene from "../Three/CubeScene";
import KeyboardControls from "../Components/KeyboardControls";
import MoveButtons from "../Components/MoveButtons";
import { cubeApi, solvesApi } from "../lib/api.js";
import { isSolved as isFaceletsSolved } from "../cube/facelets.js";
import { invert } from "../cube/moves.js";
import { getStageGuide, getCenterInfo } from "../cube/stageGuides.js";
import { useAuthStore } from "../store/authStore.js";
import { useCubeStore, MODES } from "../store/cubeStore.js";

const CAMERA_POSITIONS = {
  top: { x: 3.4, y: 3.4, z: 3.4 },
  bottom: { x: 3.4, y: -3.4, z: 3.4 },
};

const MOVE_DESCRIPTIONS = {
  U: "Up face 90° clockwise",
  "U'": "Up face 90° counter-clockwise",
  U2: "Up face 180° double turn",
  D: "Down face 90° clockwise",
  "D'": "Down face 90° counter-clockwise",
  D2: "Down face 180° double turn",
  R: "Right face 90° clockwise",
  "R'": "Right face 90° counter-clockwise",
  R2: "Right face 180° double turn",
  L: "Left face 90° clockwise",
  "L'": "Left face 90° counter-clockwise",
  L2: "Left face 180° double turn",
  F: "Front face 90° clockwise",
  "F'": "Front face 90° counter-clockwise",
  F2: "Front face 180° double turn",
  B: "Back face 90° clockwise",
  "B'": "Back face 90° counter-clockwise",
  B2: "Back face 180° double turn",
  x: "Rotate cube along X axis",
  "x'": "Rotate cube along X inverted",
  x2: "Rotate cube 180° along X",
  y: "Rotate cube along Y axis",
  "y'": "Rotate cube along Y inverted",
  y2: "Rotate cube 180° along Y",
  z: "Rotate cube along Z axis",
  "z'": "Rotate cube along Z inverted",
  z2: "Rotate cube 180° along Z",
  X: "Rotate cube along X axis",
  "X'": "Rotate cube along X inverted",
  X2: "Rotate cube 180° along X",
  Y: "Rotate cube along Y axis",
  "Y'": "Rotate cube along Y inverted",
  Y2: "Rotate cube 180° along Y",
  Z: "Rotate cube along Z axis",
  "Z'": "Rotate cube along Z inverted",
  Z2: "Rotate cube 180° along Z",
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

function Panel({ title, children, className = "" }) {
  return (
    <div
      className={`bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl p-4 shadow-sm ${className}`}
    >
      {title && (
        <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3 flex items-center justify-between">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function Stat({ label, value, tone = "text-white" }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">
        {label}
      </div>
      <div className={`text-lg font-bold font-mono tracking-tight ${tone}`}>
        {value}
      </div>
    </div>
  );
}

function SpeedControl({ speed, onSetSpeed }) {
  return (
    <div className="flex items-center gap-1 text-xs bg-dark-bg/60 border border-dark-border rounded-xl p-1 shrink-0">
      {[0.5, 1, 1.5, 2].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onSetSpeed(s)}
          className={`px-2 py-0.5 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer ${
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

export default function SolveWorkspace() {
  const navigate = useNavigate();

  const initial = useCubeStore((s) => s.initial);
  const facelets = useCubeStore((s) => s.facelets);
  const history = useCubeStore((s) => s.history);
  const mode = useCubeStore((s) => s.mode);
  const solution = useCubeStore((s) => s.solution);
  const cursor = useCubeStore((s) => s.cursor);
  const assisted = useCubeStore((s) => s.assisted);
  const startedAt = useCubeStore((s) => s.startedAt);
  const finishedAt = useCubeStore((s) => s.finishedAt);
  const optimalMoveCount = useCubeStore((s) => s.optimalMoveCount);

  const token = useAuthStore((s) => s.token);

  const animatorRef = useRef(null);
  const controlsRef = useRef(null);
  const submittedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState(null); // null | "saving" | "saved" | error msg
  const [tick, setTick] = useState(0); // forces the timer to repaint
  const [showGuidedPicker, setShowGuidedPicker] = useState(false);
  const [assistWarning, setAssistWarning] = useState(null); // null | { type: "guided", method: "beginner" | "cfop" } | { type: "auto" }
  const [sidebarTab, setSidebarTab] = useState("coach"); // "coach" | "all_stages"

  // Playback & Speed controls
  const [speed, setSpeed] = useState(1);
  const [isPlayingStage, setIsPlayingStage] = useState(false);
  const stagePlaybackRef = useRef({ isPlaying: false, targetEnd: 0 });

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayIndex, setAutoPlayIndex] = useState(0);
  const autoPlayRef = useRef({ isPlaying: false, index: 0, moves: [] });

  const solved = useCubeStore((s) => s.isSolved());
  const stage = useCubeStore((s) => s.currentStage());
  const activeGuide = getStageGuide(stage?.name);

  const targetCenterInfo =
    activeGuide?.targetFace &&
    activeGuide.targetFace !== "Middle" &&
    activeGuide.targetFace !== "All"
      ? getCenterInfo(facelets, activeGuide.targetFace)
      : null;
  const frontCenterInfo = getCenterInfo(facelets, "F");

  const sidebarMovesRef = useRef(null);
  const allStagesRef = useRef(null);
  const autoTapeRef = useRef(null);

  // Auto-scroll the sidebar stage moves sequence to keep the active move in view
  useEffect(() => {
    if (!sidebarMovesRef.current) return;
    const container = sidebarMovesRef.current;
    const activeEl = container.querySelector('[data-active="true"]');
    if (!activeEl) return;

    const elRect = activeEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const isAbove = elRect.top < containerRect.top;
    const isBelow = elRect.bottom > containerRect.bottom;

    if (isAbove || isBelow) {
      container.scrollTo({
        top:
          container.scrollTop +
          (elRect.top - containerRect.top) -
          (container.clientHeight / 2 - elRect.height / 2),
        behavior: "smooth",
      });
    }
  }, [cursor, stage, sidebarTab]);

  // Auto-scroll the all stages breakdown container to keep the active stage in view
  useEffect(() => {
    if (sidebarTab !== "all_stages" || !allStagesRef.current) return;
    const container = allStagesRef.current;
    const activeEl = container.querySelector('[data-active-stage="true"]');
    if (!activeEl) return;

    const elRect = activeEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const isAbove = elRect.top < containerRect.top;
    const isBelow = elRect.bottom > containerRect.bottom;

    if (isAbove || isBelow) {
      container.scrollTo({
        top:
          container.scrollTop +
          (elRect.top - containerRect.top) -
          (container.clientHeight / 2 - elRect.height / 2),
        behavior: "smooth",
      });
    }
  }, [cursor, stage, sidebarTab]);

  // Auto-scroll the Auto-Solve mode move sequence ticker
  useEffect(() => {
    if (!autoTapeRef.current) return;
    const container = autoTapeRef.current;
    const activeEl = container.querySelector('[data-active="true"]');
    if (!activeEl) return;

    const elRect = activeEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    container.scrollTo({
      left:
        container.scrollLeft +
        (elRect.left - containerRect.left) -
        (container.clientWidth / 2 - elRect.width / 2),
      behavior: "smooth",
    });
  }, [autoPlayIndex]);

  const handleSetSpeed = useCallback((s) => {
    setSpeed(s);
    animatorRef.current?.setSpeed(s);
  }, []);

  const handleStepDone = useCallback(() => {
    // 1. Guided mode stage playback
    if (stagePlaybackRef.current.isPlaying) {
      const s = useCubeStore.getState();
      const targetEnd = stagePlaybackRef.current.targetEnd;

      if (s.cursor >= targetEnd || s.cursor >= s.solution.moves.length) {
        stagePlaybackRef.current.isPlaying = false;
        setIsPlayingStage(false);
      } else {
        const nextMove = s.solution.moves[s.cursor];
        animatorRef.current?.enqueue(nextMove, false);
        s.setCursor(s.cursor + 1);
      }
    }

    // 2. Auto-solve mode playback
    if (autoPlayRef.current.isPlaying) {
      const nextIdx = autoPlayRef.current.index + 1;
      autoPlayRef.current.index = nextIdx;
      setAutoPlayIndex(nextIdx);

      if (nextIdx >= autoPlayRef.current.moves.length) {
        autoPlayRef.current.isPlaying = false;
        setIsAutoPlaying(false);
      } else {
        const nextMove = autoPlayRef.current.moves[nextIdx];
        animatorRef.current?.enqueue(nextMove, false);
      }
    }
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

  /**
   * Landing here with a solved cube (deep link, refresh) means there is
   * nothing to solve. Pull a scramble so the page is never a dead end.
   * Also ensure CFOP baseline optimalMoveCount is populated if missing.
   */
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

  // Live timer -- 10 Hz while a solve is in progress.
  useEffect(() => {
    if (!startedAt || finishedAt || solved) return;
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, [startedAt, finishedAt, solved]);

  // Recomputed whenever `tick` advances, so the clock repaints while running.
  const { elapsed, efficiency } = useMemo(
    () => ({
      elapsed: useCubeStore.getState().elapsedSeconds(),
      efficiency: useCubeStore.getState().efficiency(),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, history.length, finishedAt, solved, optimalMoveCount],
  );

  /**
   * FR-13a: save a finished solve.
   *
   * Only when it was genuinely the user's own work: solved, unassisted, at
   * least one move made, and signed in. submittedRef guards against the effect
   * firing twice for one solve.
   */
  useEffect(() => {
    if (!solved) {
      submittedRef.current = false;
      setSaveState(null);
      return;
    }
    if (assisted || !history.length || !token) return;
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
          move_count: s.history.length,
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
  }, [solved, assisted, history.length, token, initial]);

  // --- user moves ---------------------------------------------------------

  const doMove = useCallback((move) => {
    //animatorRef.current?.fastForward();
    animatorRef.current?.enqueue(move, true);
  }, []);

  /**
   * undo() only rewinds the bookkeeping and hands back the move to play.
   * Enqueue it with count=false so the animator advances `facelets` exactly
   * once and the inverse never lands back in history.
   */
  const doUndo = useCallback(() => {
    animatorRef.current?.fastForward();
    const move = useCubeStore.getState().undo();
    if (move) animatorRef.current?.enqueue(move, false);
  }, []);

  const doRedo = useCallback(() => {
    animatorRef.current?.fastForward();
    const move = useCubeStore.getState().redo();
    if (move) animatorRef.current?.enqueue(move, false);
  }, []);

  // --- assisted modes -----------------------------------------------------

  const fetchSolution = async (method) => {
    setLoading(true);
    setError("");
    try {
      const data = await cubeApi.solve(facelets, method);
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

  const pauseStage = useCallback(() => {
    stagePlaybackRef.current.isPlaying = false;
    setIsPlayingStage(false);
    animatorRef.current?.fastForward();
  }, []);

  const playStage = useCallback(() => {
    animatorRef.current?.fastForward();
    const s = useCubeStore.getState();
    if (!s.solution) return;
    const currentStage = s.currentStage();
    if (!currentStage) return;

    const targetEnd = currentStage.end;
    if (s.cursor >= targetEnd || s.cursor >= s.solution.moves.length) return;

    stagePlaybackRef.current = { isPlaying: true, targetEnd };
    setIsPlayingStage(true);

    animatorRef.current?.setSpeed(speed);
    const move = s.solution.moves[s.cursor];
    animatorRef.current?.enqueue(move, false);
    s.setCursor(s.cursor + 1);
  }, [speed]);

  const togglePlayStage = useCallback(() => {
    if (isPlayingStage) {
      pauseStage();
    } else {
      playStage();
    }
  }, [isPlayingStage, pauseStage, playStage]);

  const pauseAutoSolve = useCallback(() => {
    if (autoPlayRef.current.isPlaying) {
      autoPlayRef.current.isPlaying = false;
      setIsAutoPlaying(false);
      if (animatorRef.current?.isBusy) {
        animatorRef.current?.fastForward();
        const nextIdx = Math.min(
          autoPlayRef.current.moves.length,
          autoPlayRef.current.index + 1,
        );
        autoPlayRef.current.index = nextIdx;
        setAutoPlayIndex(nextIdx);
      }
    } else {
      animatorRef.current?.fastForward();
    }
  }, []);

  const resumeAutoSolve = useCallback(() => {
    const moves = autoPlayRef.current.moves;
    const idx = autoPlayRef.current.index;
    if (!moves.length || idx >= moves.length) return;

    animatorRef.current?.fastForward();
    autoPlayRef.current.isPlaying = true;
    setIsAutoPlaying(true);
    animatorRef.current?.setSpeed(speed);
    animatorRef.current?.enqueue(moves[idx], false);
  }, [speed]);

  const togglePlayAuto = useCallback(() => {
    if (isAutoPlaying) {
      pauseAutoSolve();
    } else {
      resumeAutoSolve();
    }
  }, [isAutoPlaying, pauseAutoSolve, resumeAutoSolve]);

  const stepForwardAuto = useCallback(() => {
    if (isAutoPlaying) pauseAutoSolve();
    animatorRef.current?.fastForward();
    const moves = autoPlayRef.current.moves;
    const idx = autoPlayRef.current.index;
    if (!moves.length || idx >= moves.length) return;

    const move = moves[idx];
    animatorRef.current?.setSpeed(speed);
    animatorRef.current?.enqueue(move, false);

    const nextIdx = idx + 1;
    autoPlayRef.current.index = nextIdx;
    setAutoPlayIndex(nextIdx);
  }, [isAutoPlaying, pauseAutoSolve, speed]);

  const stepBackAuto = useCallback(() => {
    if (isAutoPlaying) pauseAutoSolve();
    animatorRef.current?.fastForward();
    const moves = autoPlayRef.current.moves;
    const idx = autoPlayRef.current.index;
    if (!moves.length || idx <= 0) return;

    const move = invert(moves[idx - 1]);
    animatorRef.current?.setSpeed(speed);
    animatorRef.current?.enqueue(move, false);

    const prevIdx = idx - 1;
    autoPlayRef.current.index = prevIdx;
    setAutoPlayIndex(prevIdx);
  }, [isAutoPlaying, pauseAutoSolve, speed]);

  /** FR-11 -- queue the whole optimal solution and let it play with controlled playback. */
  const runAutoSolve = useCallback(async () => {
    useCubeStore.getState().markAssisted();
    if (useCubeStore.getState().mode === MODES.AUTO) return;
    useCubeStore.getState().setMode(MODES.AUTO);
    const data = await fetchSolution("optimal");
    if (!data || !data.moves?.length) return;

    autoPlayRef.current = { isPlaying: true, index: 0, moves: data.moves };
    setAutoPlayIndex(0);
    setIsAutoPlaying(true);
    animatorRef.current?.setSpeed(speed);
    animatorRef.current?.enqueue(data.moves[0], false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facelets, speed]);

  /** FR-10 -- guided solve, stepped one move at a time. */
  const startGuided = useCallback(
    async (method) => {
      pauseAutoSolve();
      pauseStage();
      setShowGuidedPicker(false);
      useCubeStore.getState().markAssisted();
      useCubeStore.getState().setMode(MODES.GUIDED);
      await fetchSolution(method);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [facelets, pauseAutoSolve, pauseStage],
  );

  const handleSelectGuided = useCallback(
    (method) => {
      if (assisted) {
        startGuided(method);
      } else {
        setAssistWarning({ type: "guided", method });
      }
    },
    [assisted, startGuided],
  );

  const handleSelectAuto = useCallback(() => {
    if (assisted) {
      runAutoSolve();
    } else {
      setAssistWarning({ type: "auto" });
    }
  }, [assisted, runAutoSolve]);

  const confirmAssistWarning = useCallback(() => {
    if (!assistWarning) return;
    const action = assistWarning;
    setAssistWarning(null);
    if (action.type === "guided") {
      startGuided(action.method);
    } else if (action.type === "auto") {
      runAutoSolve();
    }
  }, [assistWarning, startGuided, runAutoSolve]);

  const cancelAssistWarning = useCallback(() => {
    setAssistWarning(null);
  }, []);

  const stepForward = useCallback(() => {
    if (isPlayingStage) pauseStage();
    animatorRef.current?.fastForward();
    const s = useCubeStore.getState();
    if (!s.solution || s.cursor >= s.solution.moves.length) return;
    const move = s.solution.moves[s.cursor];
    animatorRef.current?.enqueue(move, false);
    s.setCursor(s.cursor + 1);
  }, [isPlayingStage, pauseStage]);

  const stepBack = useCallback(() => {
    if (isPlayingStage) pauseStage();
    animatorRef.current?.fastForward();
    const s = useCubeStore.getState();
    if (!s.solution || s.cursor <= 0) return;
    const move = invert(s.solution.moves[s.cursor - 1]);
    animatorRef.current?.enqueue(move, false);
    s.setCursor(s.cursor - 1);
  }, [isPlayingStage, pauseStage]);

  const backToInteractive = useCallback(() => {
    pauseStage();
    pauseAutoSolve();
    animatorRef.current?.fastForwardAll();
    animatorRef.current?.setSpeed(1);
    setShowGuidedPicker(false);
    setAssistWarning(null);
    useCubeStore.getState().setMode(MODES.INTERACTIVE);
  }, [pauseStage, pauseAutoSolve]);

  const resetCube = useCallback(() => {
    pauseStage();
    pauseAutoSolve();
    animatorRef.current?.cancel();
    setShowGuidedPicker(false);
    setAssistWarning(null);
    submittedRef.current = false;
    setSaveState(null);
    useCubeStore.getState().reset();
  }, [pauseStage, pauseAutoSolve]);

  const guided = mode === MODES.GUIDED && solution;
  const canTurn = ready && mode === MODES.INTERACTIVE;

  const [autoTrackCamera, setAutoTrackCamera] = useState(true);
  const lastTrackedFaceRef = useRef(null);

  // Automatically track camera to active target face when enabled
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
          animateCameraTo(
            controlsRef.current,
            target === "D" ? "bottom" : "top",
          );
        }
      }
      return next;
    });
  }, [activeGuide?.targetFace]);

  // Guided and Auto-solve keyboard shortcuts (Space to toggle play/pause, Right Arrow to advance, Shift+Space / Backspace / Left Arrow to go back)
  useEffect(() => {
    if (!guided && mode !== MODES.AUTO) return;

    const onKeyDown = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.code === "Space" || e.key === " " || e.key === "ArrowRight") {
        e.preventDefault();
        if (mode === MODES.AUTO) {
          if (isAutoPlaying) {
            pauseAutoSolve();
          } else if (e.shiftKey) {
            stepBackAuto();
          } else if (e.code === "Space" || e.key === " ") {
            togglePlayAuto();
          } else {
            stepForwardAuto();
          }
          return;
        }

        if (isPlayingStage) {
          pauseStage();
          return;
        }
        if (e.shiftKey) {
          stepBack();
        } else {
          stepForward();
        }
        return;
      }

      if (
        e.key === "Backspace" ||
        e.key === "ArrowLeft" ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        if (mode === MODES.AUTO) {
          if (isAutoPlaying) {
            pauseAutoSolve();
            return;
          }
          stepBackAuto();
          return;
        }

        if (isPlayingStage) {
          pauseStage();
          return;
        }
        stepBack();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    guided,
    mode,
    isPlayingStage,
    pauseStage,
    stepBack,
    stepForward,
    isAutoPlaying,
    pauseAutoSolve,
    stepBackAuto,
    stepForwardAuto,
    togglePlayAuto,
  ]);

  // Handle ESC / Enter shortcuts for the in-app assisted warning modal
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
    <AppShell>
      <KeyboardControls
        onMove={doMove}
        onUndo={doUndo}
        onRedo={doRedo}
        enabled={canTurn && !assistWarning}
      />

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

      <div className="flex flex-col gap-3 h-[calc(100vh-2rem)]">
        {/* --- Top Header HUD --- */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl px-4 py-3 shrink-0 shadow-sm">
          {/* Left stats: Timer, Moves, Efficiency, Scramble info */}
          <div className="flex items-center gap-5">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
                Timer
              </span>
              <span className="font-mono text-xl font-bold text-white tracking-tight">
                {elapsed.toFixed(1)}
                <span className="text-xs text-gray-400 font-normal">s</span>
              </span>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block">
                Moves
              </span>
              <span className="font-mono text-lg font-bold text-white">
                {history.length}{" "}
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
                className={`font-mono text-lg font-bold ${efficiency && efficiency >= 50 ? "text-neon-green" : "text-white"}`}
              >
                {efficiency ? `${efficiency.toFixed(0)}%` : "--"}
              </span>
            </div>
          </div>

          {/* Right Mode Switcher & Quick Actions */}
          <div className="flex items-center gap-2">
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
                    onClick={backToInteractive}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
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
              onClick={resetCube}
              title="Reset to scramble"
              className="px-3 py-2 rounded-xl bg-white/5 border border-dark-border hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>↺</span> Reset
            </button>
            <button
              onClick={() => navigate("/cube-input")}
              title="Load new cube"
              className="px-3 py-2 rounded-xl bg-white/5 border border-dark-border hover:bg-white/10 text-xs font-medium text-gray-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>+</span> New
            </button>
          </div>
        </div>

        {/* Main Stage & Sidebar Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-hidden">
          {/* 3D Viewport & Bottom Controls */}
          <div className="lg:col-span-3 flex flex-col gap-3 min-w-0 h-full overflow-hidden">
            {/* 3D Viewport Canvas */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-dark-border bg-gradient-to-b from-dark-surface/50 to-dark-bg shadow-inner min-h-[300px] relative">
              <CubeScene
                onAnimatorReady={onAnimatorReady}
                controlsRef={controlsRef}
                onMove={doMove}
                swipeEnabled={canTurn && !assistWarning}
              />

              {/* Floating Camera Pills Top-Right */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-xl p-1 shadow-lg text-xs z-10">
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
                {guided && (
                  <>
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

            {/* Bottom Controls Dock (Fixed Compact Height ~74px - Zero layout shift across modes) */}
            <div className="bg-dark-surface/90 backdrop-blur-md border border-dark-border rounded-2xl p-2.5 sm:px-4 sm:py-3 shrink-0 shadow-md min-h-[74px] flex flex-col justify-center">
              {guided ? (
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
                            Move {cursor + 1}/{solution.moves.length}
                          </span>
                          {stage?.name && (
                            <span className="text-xs font-semibold text-gray-300 truncate">
                              {stage.name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-white mt-0.5 truncate">
                          {MOVE_DESCRIPTIONS[solution.moves[cursor]] ||
                            `${solution.moves[cursor]} turn`}
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

                    {/* Center: Playback Control Trio */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={stepBack}
                        disabled={cursor <= 0 || isPlayingStage}
                        title="Previous move (Backspace)"
                        className="py-2 px-3 rounded-xl border border-dark-border bg-dark-bg text-gray-200 text-xs font-semibold cursor-pointer hover:text-white hover:border-gray-500 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                      >
                        <span>← Back</span>
                        <kbd className="hidden 2xl:inline text-[9px] font-mono text-gray-400 px-1 py-0.5 rounded bg-black/40 border border-dark-border">
                          Backspace
                        </kbd>
                      </button>

                      <button
                        type="button"
                        onClick={togglePlayStage}
                        disabled={cursor >= solution.moves.length}
                        className={`py-2 px-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
                          isPlayingStage
                            ? "border-amber-400/50 bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
                            : "border-neon-blue/40 bg-neon-blue/15 text-neon-blue hover:bg-neon-blue/25"
                        }`}
                      >
                        <span>{isPlayingStage ? "⏸ Pause" : "▶ Play"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={stepForward}
                        disabled={
                          cursor >= solution.moves.length || isPlayingStage
                        }
                        title="Next move (Space)"
                        className="py-2 px-4 rounded-xl bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-neon-blue/25 active:scale-95"
                      >
                        <span>Next Move →</span>
                        <kbd className="hidden 2xl:inline text-[9px] font-mono text-black/80 font-bold px-1.5 py-0.5 rounded bg-black/15">
                          Space
                        </kbd>
                      </button>
                    </div>

                    {/* Right: Speed & Stage Progress */}
                    <div className="flex items-center gap-3 shrink-0">
                      <SpeedControl speed={speed} onSetSpeed={handleSetSpeed} />
                      {stage && (
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
                      onClick={resetCube}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 text-black font-bold text-xs shadow-md cursor-pointer hover:bg-emerald-400 transition-colors"
                    >
                      Reset Scramble
                    </button>
                  </div>
                )
              ) : mode === MODES.AUTO && solution ? (
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-3">
                  {/* Left: Auto-Solve status & Move badge */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-neon-blue text-black flex items-center justify-center font-mono font-black text-xl shadow-lg shadow-neon-blue/25 border border-cyan-200 shrink-0 select-none">
                      {autoPlayIndex < solution.moves.length
                        ? solution.moves[autoPlayIndex]
                        : "✓"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-neon-blue px-2 py-0.5 rounded-full bg-neon-blue/15 border border-neon-blue/30">
                          Auto-Solve
                        </span>
                        <span className="text-xs font-mono font-semibold text-gray-400">
                          {autoPlayIndex < solution.moves.length
                            ? `${autoPlayIndex + 1}/${solution.moves.length}`
                            : "Done"}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white mt-0.5 truncate">
                        {autoPlayIndex < solution.moves.length
                          ? MOVE_DESCRIPTIONS[solution.moves[autoPlayIndex]] ||
                            `${solution.moves[autoPlayIndex]} turn`
                          : "Solve completed!"}
                      </div>
                    </div>
                  </div>

                  {/* Center: Playback Control Trio & Speed */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={stepBackAuto}
                      disabled={autoPlayIndex <= 0 || isAutoPlaying}
                      title="Previous move (Backspace or ←)"
                      className="py-2 px-3 rounded-xl border border-dark-border bg-dark-bg text-gray-200 text-xs font-semibold cursor-pointer hover:text-white hover:border-gray-500 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    >
                      <span>← Prev</span>
                      <kbd className="hidden 2xl:inline text-[9px] font-mono text-gray-400 px-1 py-0.5 rounded bg-black/40 border border-dark-border">
                        Backspace
                      </kbd>
                    </button>

                    <button
                      type="button"
                      onClick={togglePlayAuto}
                      disabled={autoPlayIndex >= solution.moves.length}
                      title="Toggle play/pause (Space)"
                      className={`py-2 px-3.5 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
                        isAutoPlaying
                          ? "border-amber-400/50 bg-amber-400/20 text-amber-300 hover:bg-amber-400/30"
                          : "border-neon-blue/40 bg-neon-blue/15 text-neon-blue hover:bg-neon-blue/25"
                      }`}
                    >
                      <span>{isAutoPlaying ? "⏸ Pause" : "▶ Play"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={stepForwardAuto}
                      disabled={
                        autoPlayIndex >= solution.moves.length || isAutoPlaying
                      }
                      title="Next move (→)"
                      className="py-2 px-4 rounded-xl bg-gradient-to-r from-neon-blue to-blue-500 hover:from-neon-blue/90 hover:to-blue-400 text-black text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-neon-blue/25 active:scale-95"
                    >
                      <span>Next →</span>
                      <kbd className="hidden 2xl:inline text-[9px] font-mono text-black/80 font-bold px-1.5 py-0.5 rounded bg-black/15">
                        →
                      </kbd>
                    </button>

                    <SpeedControl speed={speed} onSetSpeed={handleSetSpeed} />
                  </div>

                  {/* Right: Sequence Ticker (Auto-scrolling) */}
                  <div
                    ref={autoTapeRef}
                    className="hidden lg:flex items-center gap-1 overflow-x-auto max-w-sm py-1 px-2 bg-dark-bg/60 border border-dark-border rounded-xl"
                  >
                    {solution.moves.map((m, i) => (
                      <span
                        key={i}
                        data-active={i === autoPlayIndex ? "true" : undefined}
                        className={`text-[11px] font-mono px-2 py-0.5 rounded shrink-0 transition-all font-bold ${
                          i === autoPlayIndex
                            ? "bg-neon-blue text-black shadow-sm scale-105 border border-cyan-300"
                            : i < autoPlayIndex
                              ? "text-gray-500 line-through"
                              : "text-gray-400 bg-white/5"
                        }`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Left: MoveButtons */}
                  <div className="flex items-center gap-3">
                    <MoveButtons onMove={doMove} disabled={!canTurn} />
                  </div>

                  {/* Center: Keyboard hint */}
                  <div className="hidden sm:block text-[11px] text-gray-400 text-center">
                    Turn:{" "}
                    <span className="font-mono text-gray-200">U D L R F B</span>{" "}
                    &middot;{" "}
                    <span className="font-mono text-gray-200">Shift</span>{" "}
                    counter &middot;{" "}
                    <span className="font-mono text-gray-200">2</span> double
                    &middot;{" "}
                    <span className="font-mono text-gray-200">Ctrl+Z</span> undo
                  </div>

                  {/* Right: Undo / Redo */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={doUndo}
                      disabled={!canTurn || history.length === 0}
                      className="px-3 py-1.5 rounded-xl border border-dark-border bg-dark-bg/80 text-gray-300 hover:text-white hover:border-gray-500 text-xs font-semibold disabled:opacity-30 cursor-pointer shadow-sm transition-all"
                    >
                      ↶ Undo
                    </button>
                    <button
                      type="button"
                      onClick={doRedo}
                      disabled={!canTurn}
                      className="px-3 py-1.5 rounded-xl border border-dark-border bg-dark-bg/80 text-gray-300 hover:text-white hover:border-gray-500 text-xs font-semibold disabled:opacity-30 cursor-pointer shadow-sm transition-all"
                    >
                      ↷ Redo
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Coaching HUD or Stats */}
          <div className="lg:col-span-1 flex flex-col gap-3 h-full overflow-y-auto pr-0.5">
            {solved && (
              <Panel title="Result" className="border-neon-green/40 shadow-sm">
                <div className="text-neon-green font-bold text-sm mb-1 flex items-center gap-1.5">
                  <span>🎉</span>
                  <span>Cube Solved!</span>
                </div>
                <div className="text-xs text-gray-400">
                  {elapsed.toFixed(1)}s &middot; {history.length} moves
                  {assisted ? " (assisted)" : ""}
                </div>
                {saveState === "saving" && (
                  <div className="text-[11px] text-gray-400 mt-1.5">
                    Saving solve to your history...
                  </div>
                )}
                {saveState === "saved" && (
                  <div className="text-[11px] text-neon-green mt-1.5">
                    ✓ Saved to your dashboard &amp; leaderboard.
                  </div>
                )}
                {!token && !assisted && (
                  <div className="text-[11px] text-amber-300 mt-1.5">
                    Log in to save your solve to the dashboard and leaderboard.
                  </div>
                )}
                {saveState && saveState !== "saving" && saveState !== "saved" && (
                  <div className="text-[11px] text-rose-400 mt-1.5">
                    Could not save solve: {saveState}
                  </div>
                )}
              </Panel>
            )}

            {assisted && (
              <div className="text-xs text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded-2xl p-3">
                <span className="font-semibold block mb-0.5">Assisted Run</span>
                This attempt won&apos;t be submitted to the leaderboard.
              </div>
            )}

            {error && (
              <Panel title="Error" className="border-red-500/40">
                <div className="text-xs text-red-400">{error}</div>
              </Panel>
            )}

            {guided ? (
              <>
                {/* Segmented Tab Controls: Coach & Moves vs All Stages */}
                <div className="flex rounded-xl bg-dark-bg/80 p-1 border border-dark-border text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setSidebarTab("coach")}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                      sidebarTab === "coach"
                        ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40 shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Coach & Moves
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab("all_stages")}
                    className={`flex-1 py-1.5 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                      sidebarTab === "all_stages"
                        ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/40 shadow-sm"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    All Stages ({solution.stages.length})
                  </button>
                </div>

                {sidebarTab === "coach" ? (
                  /* --- Tab 1: Coach & Current Stage Moves View --- */
                  stage ? (
                    <Panel
                      title={
                        <div className="flex items-center justify-between w-full">
                          <span className="text-white font-bold">
                            {stage.name}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neon-blue/15 text-neon-blue border border-neon-blue/30 font-semibold">
                            {Math.max(
                              0,
                              Math.min(
                                stage.end - stage.start,
                                cursor - stage.start,
                              ),
                            )}
                            /{stage.end - stage.start} done
                          </span>
                        </div>
                      }
                      className="border-neon-blue/30"
                    >
                      {/* The moves for this specific stage */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                          Stage Moves Sequence:
                        </div>
                        <div
                          ref={sidebarMovesRef}
                          className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin scroll-smooth"
                        >
                          {solution.moves
                            .slice(stage.start, stage.end)
                            .map((m, mIdx) => {
                              const globalIdx = stage.start + mIdx;
                              const isCurrent = globalIdx === cursor;
                              const isPast = globalIdx < cursor;

                              return (
                                <span
                                  key={globalIdx}
                                  data-active={isCurrent ? "true" : undefined}
                                  className={`text-xs font-mono px-2.5 py-1 rounded-xl transition-all font-bold shrink-0 ${
                                    isCurrent
                                      ? "bg-neon-blue text-black shadow-lg shadow-neon-blue/30 scale-105 border-2 border-cyan-200 ring-2 ring-neon-blue/30"
                                      : isPast
                                        ? "bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/20 line-through"
                                        : "bg-dark-bg text-gray-300 border border-dark-border"
                                  }`}
                                >
                                  {m}
                                </span>
                              );
                            })}
                        </div>
                      </div>

                      {/* Stage Algorithm box if available */}
                      {activeGuide?.formula && (
                        <div className="bg-dark-bg/90 border border-dark-border rounded-xl p-2.5 text-center my-3">
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">
                            Algorithm
                          </div>
                          <div className="font-mono text-sm font-bold text-neon-blue tracking-wider">
                            {activeGuide.formula}
                          </div>
                        </div>
                      )}

                      {/* Target Face & Reference Center */}
                      <div className="mt-3 pt-2.5 border-t border-dark-border text-xs space-y-1.5">
                        {activeGuide?.targetFace &&
                          activeGuide.targetFace !== "Middle" &&
                          activeGuide.targetFace !== "All" && (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">
                                Target Face:
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-white">
                                  {activeGuide.targetLabel ?? activeGuide.title}
                                </span>
                                {targetCenterInfo && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 ${targetCenterInfo.bg} ${targetCenterInfo.text} ${targetCenterInfo.border}`}
                                  >
                                    <span>{targetCenterInfo.dot}</span>
                                    <span>{targetCenterInfo.name}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                        {frontCenterInfo && (
                          <div className="flex items-center justify-between text-gray-400 text-[11px]">
                            <span>Reference Front (F):</span>
                            <span className="font-medium text-gray-200 flex items-center gap-1">
                              <span>{frontCenterInfo.dot}</span>
                              <span>{frontCenterInfo.name}</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Coach Tip & Learn */}
                      {activeGuide?.tip && (
                        <p className="text-xs text-gray-300 leading-relaxed mt-3 pt-2.5 border-t border-dark-border">
                          {activeGuide.tip}
                        </p>
                      )}

                      {activeGuide?.learn && (
                        <div className="mt-2.5 pt-2 border-t border-dark-border text-[11px] text-gray-400 space-y-1.5">
                          {activeGuide.learn.humanNote && (
                            <p>
                              <span className="text-amber-400 font-semibold">
                                Human Tip:
                              </span>{" "}
                              {activeGuide.learn.humanNote}
                            </p>
                          )}
                          {activeGuide.learn.engineNote && (
                            <p>
                              <span className="text-neon-blue font-semibold">
                                Engine:
                              </span>{" "}
                              {activeGuide.learn.engineNote}
                            </p>
                          )}
                          {activeGuide.learn.jpermUrl && (
                            <a
                              href={activeGuide.learn.jpermUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-neon-blue hover:underline text-[10px] font-medium pt-1"
                            >
                              Learn on JPerm.net &rarr;
                            </a>
                          )}
                        </div>
                      )}
                    </Panel>
                  ) : (
                    <Panel
                      title="Solve Complete"
                      className="border-emerald-500/40"
                    >
                      <div className="text-center py-4 space-y-2">
                        <div className="text-3xl">🎉</div>
                        <div className="font-bold text-white text-sm">
                          All Stages Solved!
                        </div>
                        <div className="text-xs text-gray-400">
                          You successfully completed all{" "}
                          {solution.stages.length} stages of the{" "}
                          {solution.method_used?.toUpperCase() || "Guided"}{" "}
                          solve.
                        </div>
                      </div>
                    </Panel>
                  )
                ) : (
                  /* --- Tab 2: All Stages Overview View --- */
                  <Panel
                    title={
                      <div className="flex items-center justify-between w-full">
                        <span>All Stages ({solution.stages.length})</span>
                        {solution.method_used && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              solution.method_used === "cfop"
                                ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                                : "bg-neon-blue/20 text-neon-blue border border-neon-blue/40"
                            }`}
                          >
                            {solution.method_used.toUpperCase()}
                          </span>
                        )}
                      </div>
                    }
                  >
                    <div
                      ref={allStagesRef}
                      className="space-y-3 max-h-[460px] overflow-y-auto pr-1"
                    >
                      {solution.stages.map((stg) => {
                        const isDone = cursor >= stg.end;
                        const isCurrent = stage?.name === stg.name;
                        const stageMoves = solution.moves.slice(
                          stg.start,
                          stg.end,
                        );
                        const movesDone = Math.max(
                          0,
                          Math.min(stg.end - stg.start, cursor - stg.start),
                        );

                        return (
                          <div
                            key={stg.name}
                            data-active-stage={isCurrent ? "true" : undefined}
                            className={`p-3 rounded-xl border transition-all ${
                              isCurrent
                                ? "border-neon-blue/40 bg-neon-blue/[0.04] ring-1 ring-neon-blue/20"
                                : isDone
                                  ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                                  : "border-dark-border bg-dark-bg/40 opacity-70"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    isCurrent
                                      ? "bg-neon-blue animate-pulse"
                                      : isDone
                                        ? "bg-emerald-400"
                                        : "bg-gray-600"
                                  }`}
                                />
                                <span className="font-bold text-xs text-white">
                                  {stg.name}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                                  isDone
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                                    : isCurrent
                                      ? "bg-neon-blue/20 text-neon-blue border border-neon-blue/30"
                                      : "bg-white/5 text-gray-400"
                                }`}
                              >
                                {isDone
                                  ? "✓ Done"
                                  : isCurrent
                                    ? `${movesDone}/${stg.end - stg.start}`
                                    : `${stg.end - stg.start} moves`}
                              </span>
                            </div>

                            {/* Move tokens for this stage */}
                            <div className="flex flex-wrap gap-1 pt-1">
                              {stageMoves.map((m, mIdx) => {
                                const globalIdx = stg.start + mIdx;
                                const isMCurrent = globalIdx === cursor;
                                const isMPast = globalIdx < cursor;

                                return (
                                  <span
                                    key={globalIdx}
                                    data-active={
                                      isMCurrent ? "true" : undefined
                                    }
                                    className={`text-[11px] font-mono px-2 py-0.5 rounded-md transition-all font-bold ${
                                      isMCurrent
                                        ? "bg-neon-blue text-black shadow scale-105 border border-cyan-200"
                                        : isMPast
                                          ? "text-emerald-400/70 line-through"
                                          : "text-gray-300 bg-black/20"
                                    }`}
                                  >
                                    {m}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>
                )}
              </>
            ) : (
              /* Interactive / Auto-solve Stats & Reference Panel */
              <Panel title="Attempt Summary">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <Stat label="Time" value={`${elapsed.toFixed(1)}s`} />
                  <Stat label="Moves" value={history.length} />
                  <Stat
                    label="Efficiency"
                    value={efficiency ? `${efficiency.toFixed(0)}%` : "--"}
                    tone={efficiency >= 50 ? "text-neon-green" : "text-white"}
                  />
                  <Stat label="CFOP Moves" value={optimalMoveCount || "?"} />
                </div>
                <div className="text-[11px] text-gray-500 pt-2 border-t border-dark-border">
                  Efficiency measured against CFOP method baseline.
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
