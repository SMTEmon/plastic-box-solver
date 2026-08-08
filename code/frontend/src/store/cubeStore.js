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
  startedAt: null, // ms timestamp of the user's first move
  finishedAt: null,
  assisted: false, // FR-12b: did they use guided or auto-solve this session?

  mode: MODES.INTERACTIVE,
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
    set((s) => ({
      initial: facelets,
      facelets,
      history: [],
      redoStack: [],
      startedAt: null,
      finishedAt: null,
      assisted: false,
      solution: null,
      cursor: 0,
      mode: MODES.INTERACTIVE,
      optimalMoveCount,
      sceneEpoch: s.sceneEpoch + 1,
    })),

  /** Rewind to the scramble without clearing the solution we fetched. */
  reset: () =>
    set((s) => ({
      facelets: s.initial,
      history: [],
      redoStack: [],
      startedAt: null,
      finishedAt: null,
      cursor: 0,
      sceneEpoch: s.sceneEpoch + 1,
    })),

  // --- moves ---

  /**
   * Advance logical state by one move.
   * countIt=false for assisted playback, so auto-solve moves never inflate
   * the user's move count.
   */
  applyMove: (move, countIt = true) =>
    set((s) => {
      const next = applyMoveToFacelets(s.facelets, move);
      const solved = isSolved(next);
      const startedAt = s.startedAt ?? (countIt ? Date.now() : null);
      return {
        facelets: next,
        history: countIt ? [...s.history, move] : s.history,
        redoStack: countIt ? [] : s.redoStack,
        startedAt,
        finishedAt: solved && startedAt ? (s.finishedAt ?? Date.now()) : s.finishedAt,
      };
    }),

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
    return ((finishedAt ?? Date.now()) - startedAt) / 1000;
  },

  /**
   * Live display only. The number that gets STORED is computed server-side in
   * routers/solves.py -- the client never duplicates the formula.
   */
  efficiency: () => {
    const { optimalMoveCount, history } = get();
    if (!history.length || !optimalMoveCount) return 0;
    return Math.min(100, (optimalMoveCount / history.length) * 100);
  },

  isSolved: () => isSolved(get().facelets),

  /** Which of the 7 beginner stages the guided cursor is currently inside. */
  currentStage: () => {
    const { solution, cursor } = get();
    if (!solution?.stages?.length) return null;
    return (
      solution.stages.find((s) => cursor >= s.start && cursor < s.end) ??
      solution.stages[solution.stages.length - 1]
    );
  },
}));
