/**
 * Tutorial Catalog and Client-Side Fallback Generator.
 *
 * Defines stage metadata, categories, tips, and formulas matching the backend
 * tutorial system. Provides offline fallback generation using frontend moves.js
 * when the API is unreachable.
 */

import { SOLVED } from "./facelets.js";
import { applyMoves, invert } from "./moves.js";

export const TUTORIAL_CATEGORIES = [
  "Beginner Method",
  "Core Drills",
  "CFOP",
];

export const TUTORIAL_STAGES = [
  {
    id: "top_cross",
    stage_name: "Top cross",
    title: "Step 4: Top Cross",
    category: "Beginner Method",
    formula: "F R U R' U' F'",
    formula_name: "FRURUF",
    description: "Form a yellow cross on the top face using the canonical F (R U R' U') F' trigger.",
    tip: "Hold horizontal bar horizontal, or L-shape at 9 and 12 o'clock, then turn Front clockwise, do 4-moves, and restore Front.",
    difficulty: "Beginner",
    method: "Beginner",
    icon: "cross",
    color: "amber",
  },
  {
    id: "match_cross",
    stage_name: "Match cross",
    title: "Step 5: Match Cross Colors (Sune)",
    category: "Beginner Method",
    formula: "R U R' U R U2 R'",
    formula_name: "Sune Algorithm",
    description: "Align top cross edge colors with their matching side centers using the famous Sune algorithm.",
    tip: "Keep two matching edges at back and right, then run Sune: (R U R') U (R U2 R').",
    difficulty: "Beginner",
    method: "Beginner",
    icon: "rotate",
    color: "blue",
  },
  {
    id: "match_corners",
    stage_name: "Match corners",
    title: "Step 6: Match Corners Position (Niklas)",
    category: "Beginner Method",
    formula: "U R U' L' U R' U' L",
    formula_name: "Niklas Algorithm",
    description: "Cycle top corners into their matching 3-color slots before twisting them upright.",
    tip: "Hold a correctly positioned corner in front-right. Execute Niklas to cycle the other three corners.",
    difficulty: "Intermediate",
    method: "Beginner",
    icon: "corners",
    color: "purple",
  },
  {
    id: "middle_layer_right",
    stage_name: "Middle layer",
    title: "Step 3: Middle Layer (Right Insert)",
    category: "Beginner Method",
    formula: "U R U' R' U' F' U F",
    formula_name: "Right Edge Insertion",
    description: "Slot a middle-layer edge into the front-right slot from the top layer without disturbing the bottom layer.",
    tip: "Turn top away from destination, do right 4-moves, rotate to face side, and do restore moves.",
    difficulty: "Intermediate",
    method: "Beginner",
    icon: "layers",
    color: "emerald",
  },
  {
    id: "middle_layer_left",
    stage_name: "Middle layer",
    title: "Step 3: Middle Layer (Left Insert)",
    category: "Beginner Method",
    formula: "U' L' U L U F U' F'",
    formula_name: "Left Edge Insertion",
    description: "Slot a middle-layer edge into the front-left slot from the top layer.",
    tip: "Mirror of the right insert: turn top away to the right, do left 4-moves, and restore with front turns.",
    difficulty: "Intermediate",
    method: "Beginner",
    icon: "layers",
    color: "teal",
  },
  {
    id: "bottom_layer",
    stage_name: "Bottom layer",
    title: "Step 2: First Layer Corner Insert",
    category: "Beginner Method",
    formula: "R U R' U'",
    formula_name: "Corner Slot Insert",
    description: "Insert a first layer corner above its matching slot down into the bottom layer.",
    tip: "Position corner directly above its target slot. Execute Sexy Move (R U R' U') until the corner is oriented down.",
    difficulty: "Beginner",
    method: "Beginner",
    icon: "corner-down",
    color: "cyan",
  },
  {
    id: "solved",
    stage_name: "Solved",
    title: "Step 7: Orient Corners (Finish Solve)",
    category: "Beginner Method",
    formula: "R' D' R D R' D' R D",
    formula_name: "Corner Twist Repeat",
    description: "Twist each final corner upright until yellow faces up to solve the complete cube.",
    tip: "CRITICAL: Hold unsolved corner in front-right. Repeat R' D' R D until yellow faces up. Turn ONLY the U layer for the next corner!",
    difficulty: "Intermediate",
    method: "Beginner",
    icon: "check",
    color: "rose",
  },
  {
    id: "bottom_cross",
    stage_name: "Bottom cross",
    title: "Step 1: Bottom Cross (F2 Insert)",
    category: "Beginner Method",
    formula: "U F2",
    formula_name: "Daisy to Cross Insert",
    description: "Align a white cross edge on the top layer with its side center, then turn Front twice (F2) to insert.",
    tip: "Match the side sticker of the white edge to its center on the top layer, then turn F2.",
    difficulty: "Beginner",
    method: "Beginner",
    icon: "plus",
    color: "emerald",
  },
  {
    id: "sexy_move",
    stage_name: "Drills",
    title: "Drill: Right 4-Moves (Sexy Move)",
    category: "Core Drills",
    formula: "R U R' U'",
    formula_name: "Sexy Move",
    description: "The fundamental muscle-memory sequence in cubing: Right UP, Top LEFT, Right DOWN, Top RIGHT.",
    tip: "Practicing this 6 times returns the cube back to its exact initial state!",
    difficulty: "Beginner",
    method: "Drill",
    icon: "zap",
    color: "neon-blue",
  },
  {
    id: "left_4_moves",
    stage_name: "Drills",
    title: "Drill: Left 4-Moves (Lefty Trigger)",
    category: "Core Drills",
    formula: "L' U' L U",
    formula_name: "Left 4-Moves",
    description: "The left-hand mirror of the 4-moves: Left UP, Top RIGHT, Left DOWN, Top LEFT.",
    tip: "Essential for left-side corner and middle-edge insertions.",
    difficulty: "Beginner",
    method: "Drill",
    icon: "zap",
    color: "teal",
  },
  {
    id: "cfop_t_perm",
    stage_name: "PLL",
    title: "CFOP PLL: T-Perm",
    category: "CFOP",
    formula: "R U R' U' R' F R2 U' R' U' R U R' F'",
    formula_name: "T-Permutation",
    description: "Canonical PLL algorithm that swaps two adjacent corners and two adjacent edges in a T-shape.",
    tip: "Recognized by matching headlights on the left and bar on the right.",
    difficulty: "Advanced",
    method: "CFOP",
    icon: "arrows",
    color: "rose",
  },
  {
    id: "cfop_y_perm",
    stage_name: "PLL",
    title: "CFOP PLL: Y-Perm",
    category: "CFOP",
    formula: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    formula_name: "Y-Permutation",
    description: "Canonical PLL algorithm that swaps two diagonal corners and two adjacent edges.",
    tip: "Formed by an F-trigger, Sexy move variant, and second trigger restoration.",
    difficulty: "Advanced",
    method: "CFOP",
    icon: "arrows",
    color: "orange",
  },
];

export const STAGES_BY_ID = Object.fromEntries(
  TUTORIAL_STAGES.map((s) => [s.id, s]),
);

export function parseFormulaMoves(formulaStr) {
  if (!formulaStr) return [];
  const cleaned = formulaStr.replace(/[()|+]/g, " ");
  return cleaned.split(/\s+/).filter(Boolean);
}

export function generateClientFallbackCase(stageId) {
  const meta = STAGES_BY_ID[stageId] || TUTORIAL_STAGES[0];
  const targetMoves = parseFormulaMoves(meta.formula);
  const invMoves = targetMoves.map(invert).reverse();

  const initialFacelets = applyMoves(SOLVED, invMoves);
  const targetFacelets = applyMoves(initialFacelets, targetMoves);

  return {
    id: meta.id,
    stage_name: meta.stage_name,
    title: meta.title,
    category: meta.category,
    formula: meta.formula,
    formula_name: meta.formula_name,
    description: meta.description,
    tip: meta.tip,
    difficulty: meta.difficulty,
    facelets: initialFacelets,
    target_moves: targetMoves,
    target_facelets: targetFacelets,
    scramble_moves: invMoves,
  };
}
