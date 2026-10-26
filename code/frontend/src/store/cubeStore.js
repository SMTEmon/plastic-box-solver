/**
 * The single source of truth for what the cube currently IS.
 *
 * Before this store existed, Buttons.jsx mutated the Three.js scene graph
 * directly and nothing anywhere recorded the cube's logical state. That made
 * solved-detection, honest move counting, efficiency and solve submission all
 * impossible. Everything now derives from `facelets` here.
 *
 * THE INVARIANT: this store is advanced ONLY when an animation completes
 * (see cube/animate.js -> onMoveDone). Never advance it when a move is merely
 * requested, or the sticker colours swap mid-spin and the cube visibly glitches.
 */

import { create } from "zustand";
import { applyMove as applyMoveToFacelets, invert } from "../cube/moves.js";
import { SOLVED, isSolved } from "../cube/facelets.js";
import {
  evaluateCubeStages,
  BEGINNER_STAGES,
} from "../cube/stagePredicates.js";

export const MODES = {
  INTERACTIVE: "interactive",
  GUIDED: "guided",
  AUTO: "auto",
};

export const useCubeStore = create((set, get) => ({
  // --- state ---
  initial: SOLVED, // the scramble we started from (needed to POST the solve)
  facelets: SOLVED, // current logical state -- the truth
  history: [], // moves the USER made (excludes assisted playback)
  redoStack: [], // FR-18
  stageCheckpoints: {}, // name -> { facelets, history } captured at stage transitions
  interactiveStage: {
    name: "Bottom cross",
    interactive: true,
    completedIndex: -1,
    allDone: false,
  },
  startedAt: null, // ms timestamp of the user's first move
  finishedAt: null,
  assisted: false, // FR-12b: did they use guided or auto-solve this session?

  mode: MODES.INTERACTIVE,
  focusMode: false,
  solution: null, // { moves, moveCount, stages, optimalMoves, optimalMoveCount }
  cursor: 0, // index into solution.moves, for guided stepping
  optimalMoveCount: 0, // efficiency denominator, from /api/cube/solve

  /**
   * Bumped whenever the cube is (re)loaded from scratch.
   *
   * Why this exists: during a solve the SCENE GRAPH is the visual truth --
   * the animation physically moves cubelet meshes, and their sticker colours
   * travel with them. If we also re-derived colours from `facelets` on every
   * move we would apply each turn twice. So Cube.jsx re-derives sticker
   * colours only when this number changes, i.e. on load/reset, and lets the
   * animation own the visuals in between.
   */
  sceneEpoch: 0,

  // --- lifecycle ---

  /** Load a new scramble and reset everything about the attempt. */
  loadScramble: (facelets, optimalMoveCount = 0) =>
    set((s) => {
      const evalResult = evaluateCubeStages(facelets);
      return {
        initial: facelets,
        facelets,
        history: [],
        redoStack: [],
        stageCheckpoints: {},
        interactiveStage: {
          name: evalResult.currentStage.name,
          interactive: true,
          completedIndex: evalResult.completedIndex,
          allDone: evalResult.allDone,
        },
        startedAt: null,
        finishedAt: null,
        assisted: false,
        solution: null,
        cursor: 0,
        mode: MODES.INTERACTIVE,
        optimalMoveCount,
        sceneEpoch: s.sceneEpoch + 1,
      };
    }),

  /** Rewind to the scramble without clearing the solution we fetched. */
  reset: () =>
    set((s) => {
      const evalResult = evaluateCubeStages(s.initial);
      return {
        facelets: s.initial,
        interactiveStage: {
          name: evalResult.currentStage.name,
          interactive: true,
          completedIndex: evalResult.completedIndex,
          allDone: evalResult.allDone,
        },
        stageCheckpoints: {},
        history: [],
        redoStack: [],
        startedAt: null,
        finishedAt: null,
        cursor: 0,
        sceneEpoch: s.sceneEpoch + 1,
      };
    }),

  /** Revert to the cube state when a specific stage was reached */
  restoreCheckpoint: (stageName) =>
    set((s) => {
      const cp = s.stageCheckpoints[stageName];
      const target = cp?.facelets ?? s.initial;
      const history = cp?.history ?? [];
      const stageEval = evaluateCubeStages(target);
      return {
        facelets: target,
        history,
        redoStack: [],
        interactiveStage: {
          name: stageEval.currentStage.name,
          interactive: true,
          completedIndex: stageEval.completedIndex,
          allDone: stageEval.allDone,
        },
        sceneEpoch: s.sceneEpoch + 1,
      };
    }),

  // --- moves ---

  /**
   * Advance logical state by one move.
   * countIt=false for assisted playback, so auto-solve moves never inflate
   * the user's move count.
   * countIt="drill" for practice drills (e.g. 4-Move Reset Drill), updating
   * only facelets without touching history, redoStack, startedAt, or finishedAt.
   */
  applyMove: (move, countIt = true) =>
    set((s) => {
      const next = applyMoveToFacelets(s.facelets, move);
      if (countIt === "drill") {
        return {
          facelets: next,
        };
      }
      const solved = isSolved(next);
      const now = Date.now();
      const isRot = Boolean(move && ["X", "Y", "Z"].includes(move[0]));
      const startedAt = s.startedAt ?? (countIt && !isRot ? now : (solved ? now : null));

      // Skip re-evaluating interactiveStage on whole-cube rotations (X/Y/Z)
      const stageEval = isRot ? s.interactiveStage : evaluateCubeStages(next);

      // Snapshot { facelets, history } only on counted user turns, never during assisted playback
      const nextHistory = countIt ? [...s.history, move] : s.history;
      const stageCheckpoints = { ...s.stageCheckpoints };
      if (countIt && !s.assisted && !isRot && stageEval?.completedIndex >= 0) {
        for (let i = 0; i <= stageEval.completedIndex; i++) {
          const name = BEGINNER_STAGES[i].name;
          if (!stageCheckpoints[name]) {
            stageCheckpoints[name] = { facelets: next, history: nextHistory };
          }
        }
      }

      return {
        facelets: next,
        stageCheckpoints,
        interactiveStage: {
          name: stageEval.name ?? stageEval.currentStage?.name ?? "Bottom cross",
          interactive: true,
          completedIndex: stageEval.completedIndex ?? -1,
          allDone: stageEval.allDone ?? false,
        },
        history: nextHistory,
        redoStack: countIt ? [] : s.redoStack,
        startedAt,
        finishedAt: solved ? (s.finishedAt ?? now) : null,
      };
    }),

  /** Offset startedAt by duration spent in a practice drill so solve timer is unaffected. */
  shiftStartTime: (deltaMs) =>
    set((s) =>
      s.startedAt && !s.finishedAt && deltaMs > 0
        ? { startedAt: s.startedAt + deltaMs }
        : {},
    ),

  /** Restore a pre-drill cube state snapshot and remount the 3D scene if interrupted. */
  restoreSnapshot: (snapshot) =>
    set((s) => ({
      facelets: snapshot.facelets ?? s.facelets,
      startedAt: snapshot.startedAt !== undefined ? snapshot.startedAt : s.startedAt,
      finishedAt: snapshot.finishedAt !== undefined ? snapshot.finishedAt : s.finishedAt,
      sceneEpoch: s.sceneEpoch + 1,
    })),

  /**
   * FR-18 undo. Updates the move bookkeeping ONLY and returns the move to
   * animate; `facelets` is left alone so the animator's onMoveDone can advance
   * it exactly once, like every other move. Enqueue the returned move with
   * count=false so it does not re-enter history.
   * Returns null when there is nothing to undo.
   */
  undo: () => {
    const { history, redoStack } = get();
    if (!history.length) return null;
    const last = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      redoStack: [...redoStack, last],
    });
    return invert(last);
  },

  /** FR-18 redo. Same contract as undo(): bookkeeping here, facelets there. */
  redo: () => {
    const { redoStack, history } = get();
    if (!redoStack.length) return null;
    const move = redoStack[redoStack.length - 1];
    set({
      history: [...history, move],
      redoStack: redoStack.slice(0, -1),
    });
    return move;
  },

  // --- solve modes ---

  setMode: (mode) => set({ mode }),
  setFocusMode: (focusMode) => set({ focusMode }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),

  setSolution: (solution) =>
    set({
      solution,
      cursor: 0,
      optimalMoveCount: solution?.optimalMoveCount ?? get().optimalMoveCount,
    }),

  setCursor: (cursor) => set({ cursor }),

  /** Permanent for the session -- an assisted solve is never submitted. */
  markAssisted: () => set({ assisted: true }),

  // --- derived ---

  elapsedSeconds: () => {
    const { startedAt, finishedAt } = get();
    if (!startedAt) return 0;
    const end = finishedAt ?? (get().isSolved() ? startedAt : Date.now());
    return Math.max(0, (end - startedAt) / 1000);
  },

  /**
   * Live display only. The number that gets STORED is computed server-side in
   * routers/solves.py -- the client never duplicates the formula.
   */
  efficiency: () => {
    const { optimalMoveCount, history } = get();
    const turns = history.filter((m) => !["X", "Y", "Z"].includes(m[0])).length;
    if (!turns || !optimalMoveCount) return 0;
    return Math.min(100, (optimalMoveCount / turns) * 100);
  },

  isSolved: () => isSolved(get().facelets),

  /** Which stage the guided cursor is currently inside (works for both
   *  beginner's 7 stages and CFOP's 4 stages — driven by solution.stages).
   *  In Interactive mode, evaluates live stage progress against beginner method.
   *  Returns null in Auto-Solve or when guided stages are empty. */
  currentStage: () => {
    const { solution, cursor, mode, interactiveStage } = get();
    if (mode === MODES.INTERACTIVE) return interactiveStage;
    if (mode === MODES.GUIDED && solution?.stages?.length) {
      return (
        solution.stages.find((s) => cursor >= s.start && cursor < s.end) ??
        solution.stages[solution.stages.length - 1]
      );
    }
    return null;
  },
}));
