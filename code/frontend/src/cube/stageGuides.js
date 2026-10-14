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
  "Top cross": {
    title: "Yellow Cross (Top)",
    formula: "F R U R' U' F'",
    tip: "From a dot -> L-shape (hold at 9 and 12 o'clock) -> horizontal line -> cross.",
  },

  // --- CFOP Stages ---
  "Cross": {
    title: "CFOP Cross",
    formula: "Intuitive (~8 moves max)",
    tip: "Plan all 4 bottom edges during inspection and solve directly into the D layer.",
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
