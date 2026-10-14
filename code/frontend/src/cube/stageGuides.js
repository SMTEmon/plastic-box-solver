/**
 * Pedagogical guides, key speedcubing formulas, and practical tips
 * for each stage produced by the backend solver segmentation.
 *
 * Keys match the exact stage names emitted by backend/app/cube/stages.py:
 * - Beginner: "Bottom cross", "Bottom layer", "Middle layer", "Top cross",
 *             "Top face", "Position corners", "Solved"
 * - CFOP:     "Cross", "F2L", "OLL", "PLL"
 */

export const STAGE_GUIDES = {
  // --- Beginner Method Stages ---
  "Bottom cross": {
    title: "White Cross (Bottom)",
    formula: "Intuitive",
    tip: "Align each white edge sticker with its matching side center first, then rotate it onto the D face.",
  },
  "Bottom layer": {
    title: "First Layer Corners",
    formula: "R U R' U' (Right) / L' U' L (Left)",
    tip: "Position the corner directly above where it belongs, then repeat the 4-move trigger until it is oriented correctly.",
  },
  "Middle layer": {
    title: "Middle Layer Edges",
    formula: "Right: U R U' R' U' F' U F | Left: U' L' U L U F U' F'",
    tip: "Align the top edge with its matching side center, then insert it into the target slot with the corresponding trigger.",
  },
  "Top cross": {
    title: "Yellow Cross (Top)",
    formula: "F R U R' U' F'",
    tip: "Progress from dot -> L-shape (hold at 9 and 12 o'clock) -> horizontal line -> cross.",
  },
  "Top face": {
    title: "Yellow Face (Corners)",
    formula: "Sune: R U R' U R U2 R'",
    tip: "Orient top yellow corners while preserving the cross until the entire yellow face is solid.",
  },
  "Position corners": {
    title: "Last Layer Corners",
    formula: "Niklas: U R U' L' U R' U' L | Orient: R' D' R D",
    tip: "Permute corners to their matching positions, then orient them with R' D' R D without rotating the cube body.",
  },
  "Solved": {
    title: "Cube Solved",
    formula: "Complete",
    tip: "Congratulations! All 6 faces and layers are solved.",
  },

  // --- CFOP Stages ---
  "Cross": {
    title: "CFOP Cross",
    formula: "Intuitive (~8 moves max)",
    tip: "Plan all 4 bottom edges during inspection and solve directly into the D layer.",
  },
  "F2L": {
    title: "First Two Layers (F2L)",
    formula: "Pair & Insert (41 cases)",
    tip: "Pair each white corner with its matching middle edge in the top layer, then insert them together into their slot.",
  },
  "OLL": {
    title: "Orient Last Layer (OLL)",
    formula: "57 Algorithms (or 2-look: F R U R' U' F' + Sune)",
    tip: "Orient all top-layer stickers to face yellow upward in a single step.",
  },
  "PLL": {
    title: "Permute Last Layer (PLL)",
    formula: "21 Algorithms (T-Perm, Y-Perm, U-Perm, etc.)",
    tip: "Permute the edges and corners of the top layer around the yellow center to complete the solve.",
  },
};

/**
 * Safe lookup helper for a given stage name.
 * Returns a fallback object if the stage is not explicitly mapped.
 *
 * @param {string|null|undefined} stageName
 * @returns {{ title: string, formula: string, tip: string } | null}
 */
export function getStageGuide(stageName) {
  if (!stageName) return null;
  return (
    STAGE_GUIDES[stageName] ?? {
      title: stageName,
      formula: "Standard Execution",
      tip: "Follow the guided move sequence on the 3D cube.",
    }
  );
}
