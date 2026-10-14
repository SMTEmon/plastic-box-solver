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
    learn: {
      summary: "Form a cross on the bottom face where each white edge's side color matches its adjacent center.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Bottom layer": {
    title: "First Layer Corners",
    formula: "R U R' U' (Right) / L' U' L (Left)",
    tip: "Position the corner directly above where it belongs, then repeat the 4-move trigger until it is oriented correctly.",
    learn: {
      summary: "Slot each white corner piece into place between its matching color centers.",
      humanNote: "The 4-move sequence (R U R' U') is known as the 'sexy move' or right trigger in speedcubing.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Middle layer": {
    title: "Middle Layer Edges",
    formula: "Right: U R U' R' U' F' U F | Left: U' L' U L U F U' F'",
    tip: "Align the top edge with its matching side center, then insert it into the target slot with the corresponding trigger.",
    learn: {
      summary: "Insert the 4 middle-layer edge pieces without breaking the solved bottom white layer.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Top cross": {
    title: "Yellow Cross (Top)",
    formula: "F R U R' U' F'",
    tip: "Progress from dot -> L-shape (hold at 9 and 12 o'clock) -> horizontal line -> cross.",
    learn: {
      summary: "Orient the 4 top yellow edges to form a yellow cross.",
      humanNote: "Also serves as the first step of '2-Look OLL' in CFOP.",
      jpermUrl: "https://jperm.net/algs/2look/oll",
    },
  },
  "Top face": {
    title: "Yellow Face (Corners)",
    formula: "Sune: R U R' U R U2 R'",
    tip: "Orient top yellow corners while preserving the cross until the entire yellow face is solid.",
    learn: {
      summary: "Orient the 4 top corners until the entire U face is solid yellow.",
      humanNote: "'Sune' is one of the oldest and most famous algorithms in cubing, cycling 3 corners while leaving edges untouched.",
      jpermUrl: "https://jperm.net/algs/2look/oll",
    },
  },
  "Position corners": {
    title: "Last Layer Corners",
    formula: "Niklas: U R U' L' U R' U' L | Orient: R' D' R D",
    tip: "Permute corners to their matching positions, then orient them with R' D' R D without rotating the cube body.",
    learn: {
      summary: "Cycle corners into their correct home positions (Niklas), then twist them upright with repeated R' D' R D.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Solved": {
    title: "Cube Solved",
    formula: "Complete",
    tip: "Congratulations! All 6 faces and layers are solved.",
    learn: {
      summary: "The puzzle is fully solved!",
      jpermUrl: "https://jperm.net",
    },
  },

  // --- CFOP Stages ---
  "Cross": {
    title: "CFOP Cross",
    formula: "Intuitive (~8 moves max)",
    tip: "Plan all 4 bottom edges during inspection and solve directly into the D layer.",
    learn: {
      summary: "The first step of CFOP: solve all four cross edges directly on the bottom face.",
      engineNote: "Any 3x3 cross can be solved in 8 moves or fewer.",
      jpermUrl: "https://jperm.net/3x3/cfop/cross",
    },
  },
  "F2L": {
    title: "First Two Layers (F2L)",
    formula: "Pair & Insert (41 cases)",
    tip: "Pair each white corner with its matching middle edge in the top layer, then insert them together into their slot.",
    learn: {
      summary: "First Two Layers: simultaneously pair a corner and its matching edge, then insert them together into one of 4 slots.",
      engineNote: "Matches 1 of 41 canonical pairing cases.",
      humanNote: "Saves massive time compared to Beginner method by solving corners and edges simultaneously.",
      jpermUrl: "https://jperm.net/algs/f2l",
    },
  },
  "OLL": {
    title: "Orient Last Layer (OLL)",
    formula: "57 Algorithms (or 2-look: F R U R' U' F' + Sune)",
    tip: "Orient all top-layer stickers to face yellow upward in a single step.",
    learn: {
      summary: "Orientation of the Last Layer: makes the entire top yellow face solid in a single algorithm.",
      engineNote: "The solver executes 1 of 57 canonical algorithms in a single step.",
      humanNote: "Speedcubers often learn '2-Look OLL' (only 9 algorithms: Cross + Corners) before learning all 57.",
      jpermUrl: "https://jperm.net/algs/oll",
    },
  },
  "PLL": {
    title: "Permute Last Layer (PLL)",
    formula: "21 Algorithms (T-Perm, Y-Perm, U-Perm, etc.)",
    tip: "Permute the edges and corners of the top layer around the yellow center to complete the solve.",
    learn: {
      summary: "Permutation of the Last Layer: rearranges the top-layer pieces into their solved positions.",
      engineNote: "The solver executes 1 of 21 canonical permutation algorithms (named after the letter shapes their swaps trace).",
      humanNote: "Speedcubers often start with '2-Look PLL' (6 algorithms: Corners first, then Edges).",
      jpermUrl: "https://jperm.net/algs/pll",
    },
  },
};

/**
 * @typedef {Object} StageLearn
 * @property {string} summary
 * @property {string} [engineNote]
 * @property {string} [humanNote]
 * @property {string} [jpermUrl]
 *
 * @typedef {Object} StageGuide
 * @property {string} title
 * @property {string} formula
 * @property {string} tip
 * @property {StageLearn} [learn]
 *
 * Safe lookup helper for a given stage name.
 * Returns a fallback object if the stage is not explicitly mapped.
 *
 * @param {string|null|undefined} stageName
 * @returns {StageGuide | null}
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
