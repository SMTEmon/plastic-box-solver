/**
 * Zustand store for the interactive Tutorial / Formula Practice System.
 *
 * Manages stage selection, dynamic case fetching, real-time move validation,
 * automatic reset on wrong move, and practice statistics.
 */

import { create } from "zustand";
import { applyMove } from "../cube/moves.js";
import { tutorialApi } from "../lib/api.js";
import {
  TUTORIAL_STAGES,
  generateClientFallbackCase,
} from "../cube/tutorialData.js";

export const useTutorialStore = create((set, get) => ({
  // Stage selection
  selectedStageId: null,
  activeCategory: "Beginner Method",
  availableStages: TUTORIAL_STAGES,

  // Current case & cube state
  currentCase: null,
  facelets: null,
  sceneEpoch: 0,
  moveCursor: 0,
  history: [],
  wrongMoveAlert: null,
  isCompleted: false,

  // Session stats
  casesSolved: 0,
  wrongMovesCount: 0,
  totalAttempts: 0,

  // Loading & error
  loading: false,
  error: null,

  setActiveCategory: (cat) => set({ activeCategory: cat }),

  /** Select a stage and load a fresh case for it */
  selectStage: async (stageId) => {
    set({
      selectedStageId: stageId,
      loading: true,
      error: null,
      moveCursor: 0,
      history: [],
      wrongMoveAlert: null,
      isCompleted: false,
    });

    try {
      const caseData = await tutorialApi.generateCase(stageId);
      set((s) => ({
        currentCase: caseData,
        facelets: caseData.facelets,
        sceneEpoch: s.sceneEpoch + 1,
        moveCursor: 0,
        history: [],
        isCompleted: false,
        loading: false,
      }));
    } catch {
      // Graceful fallback to client generator if backend offline
      const fallback = generateClientFallbackCase(stageId);
      set((s) => ({
        currentCase: fallback,
        facelets: fallback.facelets,
        sceneEpoch: s.sceneEpoch + 1,
        moveCursor: 0,
        history: [],
        isCompleted: false,
        loading: false,
      }));
    }
  },

  /** Request another randomized case for the currently selected stage */
  loadNewCase: async () => {
    const { selectedStageId } = get();
    if (!selectedStageId) return;

    set({
      loading: true,
      error: null,
      wrongMoveAlert: null,
      isCompleted: false,
      moveCursor: 0,
      history: [],
    });

    try {
      const caseData = await tutorialApi.generateCase(selectedStageId);
      set((s) => ({
        currentCase: caseData,
        facelets: caseData.facelets,
        sceneEpoch: s.sceneEpoch + 1,
        moveCursor: 0,
        history: [],
        isCompleted: false,
        loading: false,
        totalAttempts: s.totalAttempts + 1,
      }));
    } catch {
      const fallback = generateClientFallbackCase(selectedStageId);
      set((s) => ({
        currentCase: fallback,
        facelets: fallback.facelets,
        sceneEpoch: s.sceneEpoch + 1,
        moveCursor: 0,
        history: [],
        isCompleted: false,
        loading: false,
        totalAttempts: s.totalAttempts + 1,
      }));
    }
  },

  /**
   * Validates a move against the target formula.
   * If correct: advances logical state and progress cursor.
   * If wrong: immediately resets cube to the start of this case!
   */
  validateAndApplyMove: (move) => {
    const { currentCase, moveCursor, facelets, isCompleted } = get();
    if (!currentCase || isCompleted) return { ignored: true };

    const expected = currentCase.target_moves[moveCursor];
    if (!expected) return { ignored: true };

    if (move === expected) {
      // Correct move
      const nextFacelets = applyMove(facelets, move);
      const nextCursor = moveCursor + 1;
      const completed = nextCursor >= currentCase.target_moves.length;

      set((s) => ({
        facelets: nextFacelets,
        moveCursor: nextCursor,
        history: [...s.history, move],
        wrongMoveAlert: null,
        isCompleted: completed,
        casesSolved: completed ? s.casesSolved + 1 : s.casesSolved,
      }));

      return { correct: true, completed, expected };
    } else {
      // Wrong move - cube resets!
      set((s) => ({
        facelets: currentCase.facelets,
        moveCursor: 0,
        history: [],
        sceneEpoch: s.sceneEpoch + 1,
        wrongMoveAlert: {
          move,
          expected,
          timestamp: Date.now(),
        },
        wrongMovesCount: s.wrongMovesCount + 1,
      }));

      return { correct: false, completed: false, expected };
    }
  },

  /** Manually rewind to the start of the current case */
  resetCurrentCase: () => {
    const { currentCase } = get();
    if (!currentCase) return;
    set((s) => ({
      facelets: currentCase.facelets,
      moveCursor: 0,
      history: [],
      wrongMoveAlert: null,
      isCompleted: false,
      sceneEpoch: s.sceneEpoch + 1,
    }));
  },

  clearWrongMoveAlert: () => set({ wrongMoveAlert: null }),

  /** Return to stage selection hub */
  exitToCatalog: () =>
    set({
      selectedStageId: null,
      currentCase: null,
      facelets: null,
      moveCursor: 0,
      history: [],
      wrongMoveAlert: null,
      isCompleted: false,
      error: null,
    }),
}));
