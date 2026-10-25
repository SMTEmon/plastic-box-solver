/**
 * Pedagogical guides, key speedcubing formulas, and practical tips
 * for each stage produced by the backend solver segmentation.
 *
 * Keys match the exact stage names emitted by backend/app/cube/stages.py:
 * - Beginner: "Bottom cross", "Bottom layer", "Middle layer", "Top cross",
 *             "Top face", "Position corners", "Solved"
 * - CFOP:     "Cross", "F2L", "OLL", "PLL"
 */

export const COLOR_MAP = {
  w: { name: "White", dot: "⚪", bg: "bg-white/10", text: "text-white", border: "border-white/30" },
  y: { name: "Yellow", dot: "🟡", bg: "bg-yellow-400/10", text: "text-yellow-400", border: "border-yellow-400/30" },
  g: { name: "Green", dot: "🟢", bg: "bg-emerald-400/10", text: "text-emerald-400", border: "border-emerald-400/30" },
  b: { name: "Blue", dot: "🔵", bg: "bg-blue-400/10", text: "text-blue-400", border: "border-blue-400/30" },
  r: { name: "Red", dot: "🔴", bg: "bg-red-400/10", text: "text-red-400", border: "border-red-400/30" },
  o: { name: "Orange", dot: "🟠", bg: "bg-orange-400/10", text: "text-orange-400", border: "border-orange-400/30" },
};

export const CENTER_INDICES = {
  U: 4,
  R: 13,
  F: 22,
  D: 31,
  L: 40,
  B: 49,
};

/**
 * Returns color metadata for a given face's center on the current cube state.
 * @param {string} facelets
 * @param {"U"|"R"|"F"|"D"|"L"|"B"|string} face
 */
export function getCenterInfo(facelets, face) {
  if (!facelets || facelets.length < 54) return null;
  const idx = CENTER_INDICES[face];
  if (idx === undefined) return null;
  const code = facelets[idx]?.toLowerCase();
  return COLOR_MAP[code] ?? null;
}

export const STAGE_GUIDES = {
  // --- Beginner Method Stages ---
  "Bottom cross": {
    title: "Bottom Cross",
    targetFace: "D",
    targetLabel: "Bottom Cross",
    formula: "Intuitive",
    tip: "Align each cross edge with its matching side center first, then rotate it onto the D face.",
    learn: {
      summary: "Form a cross on the bottom face where each edge's side sticker matches its adjacent center.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Bottom layer": {
    title: "First Layer Corners",
    targetFace: "D",
    targetLabel: "Bottom Corners",
    formula: "R U R' U' (Right) / L' U' L (Left)",
    tip: "Position the corner directly above where it belongs, then repeat the 4-move trigger until it is oriented correctly.",
    learn: {
      summary: "Slot each bottom corner piece into place between its matching color centers.",
      humanNote: "The 4-move sequence (R U R' U') is known as the 'sexy move' or right trigger in speedcubing.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Middle layer": {
    title: "Middle Layer Edges",
    targetFace: "Middle",
    targetLabel: "Middle Ring",
    formula: "Right: U R U' R' U' F' U F | Left: U' L' U L U F U' F'",
    tip: "Align the top edge with its matching side center, then insert it into the target slot with the corresponding trigger.",
    learn: {
      summary: "Insert the 4 middle-layer edge pieces without breaking the solved bottom layer.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Top cross": {
    title: "Top Cross",
    targetFace: "U",
    targetLabel: "Top Face",
    formula: "F R U R' U' F'",
    tip: "Progress from dot -> L-shape (hold at 9 and 12 o'clock) -> horizontal line -> cross on the top U face.",
    learn: {
      summary: "Orient the 4 top edges to form a cross on the top face.",
      humanNote: "Also serves as the first step of '2-Look OLL' in CFOP.",
      jpermUrl: "https://jperm.net/algs/2look/oll",
    },
  },
  "Top face": {
    title: "Top Face (Corners)",
    targetFace: "U",
    targetLabel: "Top Corners",
    formula: "Sune: R U R' U R U2 R'",
    tip: "Orient top corners while preserving the cross until the entire top U face is solid.",
    learn: {
      summary: "Orient the 4 top corners until the entire U face is solid.",
      humanNote: "'Sune' is one of the oldest and most famous algorithms in cubing, cycling 3 corners while leaving edges untouched.",
      jpermUrl: "https://jperm.net/algs/2look/oll",
    },
  },
  "Position corners": {
    title: "Last Layer Corners",
    targetFace: "U",
    targetLabel: "Last Layer",
    formula: "Niklas: U R U' L' U R' U' L | Orient: R' D' R D",
    tip: "Permute corners to their matching positions, then orient them with R' D' R D without rotating the cube body.",
    learn: {
      summary: "Cycle corners into their correct home positions (Niklas), then twist them upright with repeated R' D' R D.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Solved": {
    title: "Cube Solved",
    targetFace: "All",
    targetLabel: "All 6 Faces",
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
    targetFace: "D",
    targetLabel: "Bottom Cross",
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
    targetFace: "Middle",
    targetLabel: "First 2 Layers",
    formula: "Pair & Insert (41 cases)",
    tip: "Pair each corner with its matching middle edge in the top layer, then insert them together into their slot.",
    learn: {
      summary: "First Two Layers: simultaneously pair a corner and its matching edge, then insert them together into one of 4 slots.",
      engineNote: "Matches 1 of 41 canonical pairing cases.",
      humanNote: "Saves massive time compared to Beginner method by solving corners and edges simultaneously.",
      jpermUrl: "https://jperm.net/algs/f2l",
    },
  },
  "OLL": {
    title: "Orient Last Layer (OLL)",
    targetFace: "U",
    targetLabel: "Orient Top Face",
    formula: "57 Algorithms (or 2-look: F R U R' U' F' + Sune)",
    tip: "Orient all top-layer stickers to face upward in a single step.",
    learn: {
      summary: "Orientation of the Last Layer: makes the entire top face solid in a single algorithm.",
      engineNote: "The solver executes 1 of 57 canonical algorithms in a single step.",
      humanNote: "Speedcubers often learn '2-Look OLL' (only 9 algorithms: Cross + Corners) before learning all 57.",
      jpermUrl: "https://jperm.net/algs/oll",
    },
  },
  "PLL": {
    title: "Permute Last Layer (PLL)",
    targetFace: "U",
    targetLabel: "Permute Top Layer",
    formula: "21 Algorithms (T-Perm, Y-Perm, U-Perm, etc.)",
    tip: "Permute the edges and corners of the top layer around the center to complete the solve.",
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
 * @property {"D"|"U"|"Middle"|"All"} [targetFace]
 * @property {string} [targetLabel]
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

export const MOVE_DESCRIPTIONS = {
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
  M: "Middle slice turn downwards",
  "M'": "Middle slice turn upwards",
  M2: "Middle slice 180° turn",
  E: "Equatorial slice turn right",
  "E'": "Equatorial slice turn left",
  E2: "Equatorial slice 180° turn",
  S: "Standing slice clockwise",
  "S'": "Standing slice counter-clockwise",
  S2: "Standing slice 180° turn",
};

export function getMoveDescription(move) {
  if (!move) return "";
  return MOVE_DESCRIPTIONS[move] || `${move} turn`;
}

