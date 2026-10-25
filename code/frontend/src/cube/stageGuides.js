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
  // --- Beginner Method Stages (aligned with JPerm 7-step tutorial) ---
  "Bottom cross": {
    title: "Step 1: Bottom White Cross",
    targetFace: "D",
    targetLabel: "Bottom Cross",
    formula: "Intuitive (Align side color first)",
    tip: "Match each white edge's side sticker with its matching side center first, then rotate it onto the bottom (D) face.",
    learn: {
      summary: "Form a cross on the bottom face where each edge matches both the white center and its adjacent side center.",
      humanNote: "Look at both colors on each edge piece — never just the white sticker alone.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Bottom layer": {
    title: "Step 2: First Layer Corners",
    targetFace: "D",
    targetLabel: "Bottom Corners",
    formula: "Right 4-Moves: R U R' U' | Left: L' U' L U",
    tip: "Position the corner in the top layer directly above its matching slot, hold it in front-right, and repeat the 4-moves (R U R' U') until it slots in with white facing down.",
    learn: {
      summary: "Slot each first-layer corner into place between its matching color centers using the foundational 4-move trigger.",
      humanNote: "The 4-move sequence (R U R' U') is the single most important muscle-memory trigger in cubing ('Sexy Move').",
      jpermUrl: "https://jperm.net/3x3#4moves",
    },
  },
  "Middle layer": {
    title: "Step 3: Second Layer Edges",
    targetFace: "Middle",
    targetLabel: "Middle Ring",
    formula: "Right: U R U' R' U' F' U F | Left: U' L' U L U F U' F'",
    tip: "Find a top edge without yellow. Match its front color to its center, then turn top AWAY from the destination and run the 4-moves, rotate cube, and run opposite 4-moves.",
    learn: {
      summary: "Insert all 4 middle-layer edges without disturbing the solved first layer.",
      humanNote: "JPerm memory trick: Turn top away from target -> 4-moves on target side -> rotate to face other side -> opposite 4-moves.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Top cross": {
    title: "Step 4: Top Yellow Cross",
    targetFace: "U",
    targetLabel: "Top Face",
    formula: "F (R U R' U') F'",
    tip: "Hold Dot (any angle), L-shape (at 9 and 12 o'clock), or Horizontal Line. Turn Front clockwise (F), execute the 4-moves (R U R' U'), and restore Front (F').",
    learn: {
      summary: "Orient the 4 top edges to form a yellow cross on the top face.",
      humanNote: "Ignore corner pieces completely during this step — focus solely on the 4 edge pieces.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Match cross": {
    title: "Step 5: Match Cross Colors",
    targetFace: "U",
    targetLabel: "Top Cross Edges",
    formula: "Sune: R U R' U R U2 R'",
    tip: "Turn top until 2 cross edges match their side centers. Hold them at back and right (or anywhere if opposite), then execute Sune to cycle the remaining edges into place.",
    learn: {
      summary: "Align the 4 top cross edges so their side colors match their adjacent centers.",
      humanNote: "Sune is one of the most famous algorithms in speedcubing: (R U R') U (R U2 R').",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Match corners": {
    title: "Step 6: Match Corners (Position)",
    targetFace: "U",
    targetLabel: "Last Layer Corners",
    formula: "Niklas: U R U' L' U R' U' L",
    tip: "Find a corner in the correct slot between its 3 colors (even if twisted). Hold it in front-right and execute Niklas until all 4 corners are in their matching slots.",
    learn: {
      summary: "Cycle the 4 top corners into their matching 3-color positions before twisting them upright.",
      humanNote: "A corner is 'in position' if its 3 colors match the 3 surrounding center faces, regardless of which way the stickers face.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Solved": {
    title: "Step 7: Solve the Cube! (Orient Corners)",
    targetFace: "All",
    targetLabel: "All 6 Faces",
    formula: "Repeat R' D' R D + U",
    tip: "CRITICAL: Hold an unsolved corner in front-right. Repeat R' D' R D until yellow faces up. Then turn ONLY the U layer to bring the next unsolved corner in — NEVER rotate the whole cube!",
    learn: {
      summary: "Twist each corner upright with repeated R' D' R D, rotating only the U layer between corners to finish the solve.",
      humanNote: "The #1 beginner mistake is rotating the whole cube during this step. Only turn the U layer to cycle corners into the front-right slot!",
      jpermUrl: "https://jperm.net/3x3",
    },
  },

  // --- CFOP Stages ---
  "Cross": {
    title: "CFOP Cross",
    targetFace: "D",
    targetLabel: "Bottom Cross",
    formula: "Intuitive (~8 moves max)",
    tip: "Plan all 4 bottom edges during inspection and solve directly into the D layer without using a top daisy.",
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
    tip: "Pair each corner with its matching middle edge in the top layer, then insert them together into their slot in one smooth motion.",
    learn: {
      summary: "First Two Layers: simultaneously pair a corner and its matching edge, inserting them together into one of 4 slots.",
      engineNote: "Matches 1 of 41 canonical pairing cases.",
      humanNote: "Saves ~20 moves compared to the Beginner method by solving corners and middle edges simultaneously.",
      jpermUrl: "https://jperm.net/algs/f2l",
    },
  },
  "OLL": {
    title: "Orient Last Layer (OLL)",
    targetFace: "U",
    targetLabel: "Orient Top Face",
    formula: "2-Look: F (R U R' U') F' (Edges) + Sune: R U R' U R U2 R' (Corners)",
    tip: "Make the entire top face solid yellow in a single algorithm (or 2-look: edges cross first, then corners).",
    learn: {
      summary: "Orientation of the Last Layer: makes the entire top face solid in a single algorithm.",
      engineNote: "The solver executes 1 of 57 canonical algorithms in a single step.",
      humanNote: "Speedcubers learn '2-Look OLL' (only 9 algorithms: Cross + Corners) before learning all 57.",
      jpermUrl: "https://jperm.net/algs/2look/oll",
    },
  },
  "PLL": {
    title: "Permute Last Layer (PLL)",
    targetFace: "U",
    targetLabel: "Permute Top Layer",
    formula: "2-Look: T-Perm (Corners) + U-Perm / H-Perm (Edges)",
    tip: "Permute the edges and corners of the top layer around the center to complete the solve.",
    learn: {
      summary: "Permutation of the Last Layer: rearranges the top-layer pieces into their solved positions.",
      engineNote: "The solver executes 1 of 21 canonical permutation algorithms.",
      humanNote: "Speedcubers start with '2-Look PLL' (6 algorithms: Corners first, then Edges).",
      jpermUrl: "https://jperm.net/algs/2look/pll",
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

