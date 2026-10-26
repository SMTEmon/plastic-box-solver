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
    title: (ctx) => `Step 1: Bottom Cross (${ctx.bottomColor})`,
    targetFace: "D",
    targetLabel: "Bottom Cross",
    formula: "Intuitive (Align side color first)",
    tip: (ctx) =>
      `Match each ${ctx.bottomColorLower} edge's side sticker with its matching side center first, then rotate it onto the bottom (D) face.`,
    learn: {
      summary: (ctx) =>
        `Form a cross on the bottom face where each edge matches both the ${ctx.bottomColorLower} center and its adjacent side center.`,
      humanNote: (ctx) =>
        `Look at both colors on each edge piece — never just the ${ctx.bottomColorLower} sticker alone.`,
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Bottom layer": {
    title: "Step 2: First Layer Corners",
    targetFace: "D",
    targetLabel: "Bottom Corners",
    formula: "Right 4-Moves: R U R' U' | Left: L' U' L U",
    tip: (ctx) =>
      `Position the corner in the top layer directly above its matching slot, hold it in front-right, and repeat the 4-moves (R U R' U') until it slots in with ${ctx.bottomColorLower} facing down.`,
    learn: {
      summary:
        "Slot each first-layer corner into place between its matching color centers using the foundational 4-move trigger.",
      humanNote:
        "The 4-move sequence (R U R' U') is the single most important muscle-memory trigger in cubing ('Sexy Move').",
      jpermUrl: "https://jperm.net/3x3#4moves",
    },
  },
  "Middle layer": {
    title: "Step 3: Second Layer Edges",
    targetFace: "Middle",
    targetLabel: "Middle Ring",
    formula: "Right: U R U' R' U' F' U F | Left: U' L' U L U F U' F'",
    tip: (ctx) =>
      `Find an edge in the top layer without the top face color (${ctx.topColorLower}). Match its front sticker to its matching center, turn top AWAY from the destination slot, run the 4-moves on the target side, rotate to face the other side, and run opposite 4-moves.`,
    learn: {
      summary:
        "Insert all 4 middle-layer edges without disturbing the solved first layer.",
      humanNote: (ctx) =>
        `Any edge containing ${ctx.topColorLower} belongs on the top layer. Finding an edge without ${ctx.topColorLower} guarantees it belongs in the middle layer!`,
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Top cross": {
    title: (ctx) => `Step 4: Top Cross (${ctx.topColor})`,
    targetFace: "U",
    targetLabel: "Top Face",
    formula: "F (R U R' U') F'",
    tip: "Hold Dot (any angle), L-shape (at 9 and 12 o'clock), or Horizontal Line. Turn Front clockwise (F), execute the 4-moves (R U R' U'), and restore Front (F').",
    learn: {
      summary: (ctx) =>
        `Orient the 4 top edges to form a ${ctx.topColorLower} cross on the top face.`,
      humanNote:
        "Ignore corner pieces completely during this step — focus solely on the 4 edge pieces.",
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
      summary:
        "Align the 4 top cross edges so their side colors match their adjacent centers.",
      humanNote:
        "Sune is one of the most famous algorithms in speedcubing: (R U R') U (R U2 R').",
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
      summary:
        "Cycle the 4 top corners into their matching 3-color positions before twisting them upright.",
      humanNote:
        "A corner is 'in position' if its 3 colors match the 3 surrounding center faces, regardless of which way the stickers face.",
      jpermUrl: "https://jperm.net/3x3",
    },
  },
  "Solved": {
    title: "Step 7: Solve the Cube! (Orient Corners)",
    targetFace: "All",
    targetLabel: "All 6 Faces",
    formula: "Repeat R' D' R D + U",
    tip: (ctx) =>
      `CRITICAL: Hold an unsolved corner in front-right. Repeat R' D' R D until the top color (${ctx.topColorLower}) faces up. Then turn ONLY the U layer to bring the next unsolved corner in — NEVER rotate the whole cube!`,
    learn: {
      summary:
        "Twist each corner upright with repeated R' D' R D, rotating only the U layer between corners to finish the solve.",
      humanNote:
        "The #1 beginner mistake is rotating the whole cube during this step. Only turn the U layer to cycle corners into the front-right slot!",
      jpermUrl: "https://jperm.net/3x3",
    },
  },

  // --- CFOP Stages ---
  "Cross": {
    title: "CFOP Cross",
    targetFace: "D",
    targetLabel: "Bottom Cross",
    formula: "Intuitive (~8 moves max)",
    tip: (ctx) =>
      `Plan all 4 bottom (${ctx.bottomColorLower}) edges during inspection and solve directly into the D layer without using a top daisy.`,
    learn: {
      summary:
        "The first step of CFOP: solve all four cross edges directly on the bottom face.",
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
      summary:
        "First Two Layers: simultaneously pair a corner and its matching edge, inserting them together into one of 4 slots.",
      engineNote: "Matches 1 of 41 canonical pairing cases.",
      humanNote:
        "Saves ~20 moves compared to the Beginner method by solving corners and middle edges simultaneously.",
      jpermUrl: "https://jperm.net/algs/f2l",
    },
  },
  "OLL": {
    title: "Orient Last Layer (OLL)",
    targetFace: "U",
    targetLabel: "Orient Top Face",
    formula:
      "2-Look: F (R U R' U') F' (Edges) + Sune: R U R' U R U2 R' (Corners)",
    tip: (ctx) =>
      `Make the entire top face solid ${ctx.topColorLower} in a single algorithm (or 2-look: edges cross first, then corners).`,
    learn: {
      summary:
        "Orientation of the Last Layer: makes the entire top face solid in a single algorithm.",
      engineNote:
        "The solver executes 1 of 57 canonical algorithms in a single step.",
      humanNote:
        "Speedcubers learn '2-Look OLL' (only 9 algorithms: Cross + Corners) before learning all 57.",
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
      summary:
        "Permutation of the Last Layer: rearranges the top-layer pieces into their solved positions.",
      engineNote:
        "The solver executes 1 of 21 canonical permutation algorithms.",
      humanNote:
        "Speedcubers start with '2-Look PLL' (6 algorithms: Corners first, then Edges).",
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
 * Resolves dynamic center colors if facelets are provided.
 *
 * @param {string|null|undefined} stageName
 * @param {string} [facelets]
 * @returns {StageGuide | null}
 */
export function getStageGuide(stageName, facelets) {
  if (!stageName) return null;
  const rawGuide = STAGE_GUIDES[stageName];
  if (!rawGuide) {
    return {
      title: stageName,
      formula: "Standard Execution",
      tip: "Follow the guided move sequence on the 3D cube.",
    };
  }

  const topColor = getCenterInfo(facelets, "U")?.name || "Yellow";
  const bottomColor = getCenterInfo(facelets, "D")?.name || "White";

  const ctx = {
    topColor,
    topColorLower: topColor.toLowerCase(),
    bottomColor,
    bottomColorLower: bottomColor.toLowerCase(),
  };

  const resolve = (val) => (typeof val === "function" ? val(ctx) : val);

  return {
    ...rawGuide,
    title: resolve(rawGuide.title),
    tip: resolve(rawGuide.tip),
    targetLabel: resolve(rawGuide.targetLabel),
    formula: resolve(rawGuide.formula),
    learn: rawGuide.learn
      ? {
          ...rawGuide.learn,
          summary: resolve(rawGuide.learn.summary),
          engineNote: resolve(rawGuide.learn.engineNote),
          humanNote: resolve(rawGuide.learn.humanNote),
        }
      : undefined,
  };
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

/**
 * Returns the target Y coordinate(s) for 3D focus mode layer ghosting.
 * - Bottom layer: [-1]
 * - Middle layer: [0]
 * - Top layer: [1]
 * - First Two Layers (F2L): [-1, 0]
 * - Solved / All: null (all layers active)
 *
 * @param {string} [stageName]
 * @returns {number[]|null}
 */
export function getActiveLayerY(stageName) {
  if (!stageName) return null;
  const guide = STAGE_GUIDES[stageName];
  if (!guide) {
    const lower = stageName.toLowerCase();
    if (lower.includes("cross") || lower.includes("bottom")) return [-1];
    if (lower.includes("middle")) return [0];
    if (lower.includes("top") || lower.includes("oll") || lower.includes("pll") || lower.includes("corner")) return [1];
    return null;
  }

  if (stageName === "F2L") return [-1, 0];
  if (guide.targetFace === "D") return [-1];
  if (guide.targetFace === "Middle") return [0];
  if (guide.targetFace === "U") return [1];
  return null;
}

/**
 * Cube Anatomy cards for the "Cubing 101" interactive onboarding tab.
 * Explains the 3 distinct piece types on a 3x3 cube (6 Centers, 12 Edges, 8 Corners).
 */
export const CUBE_ANATOMY = [
  {
    id: "centers",
    title: "6 Centers",
    count: 6,
    stickers: 1,
    stickerBadge: "1 Sticker · Fixed",
    badgeClass: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30",
    cardClass: "border-cyan-500/25 bg-cyan-500/[0.04]",
    description:
      "Fixed to the internal core and never move relative to each other. A center piece always defines which color belongs on that face (White opposite Yellow, Green opposite Blue, Red opposite Orange).",
  },
  {
    id: "edges",
    title: "12 Edges",
    count: 12,
    stickers: 2,
    stickerBadge: "2 Stickers · Side Bridge",
    badgeClass: "bg-amber-400/15 text-amber-300 border-amber-400/30",
    cardClass: "border-amber-500/25 bg-amber-500/[0.04]",
    description:
      "Sit between two center pieces and carry 2 colors. An edge piece can only ever move to another edge spot — it can never become a corner or center.",
  },
  {
    id: "corners",
    title: "8 Corners",
    count: 8,
    stickers: 3,
    stickerBadge: "3 Stickers · 3-Way Corner",
    badgeClass: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30",
    cardClass: "border-emerald-500/25 bg-emerald-500/[0.04]",
    description:
      "Sit where three faces meet and carry 3 colors. When solved, each corner must rest between the 3 center faces matching its 3 stickers.",
  },
];

/**
 * JPerm's Foundational 4-Move Sequences (Right & Left triggers).
 */
export const FOUR_MOVE_SEQUENCES = [
  {
    id: "right_4_moves",
    title: "Right 4-Moves",
    badge: "Right Hand (R U R' U')",
    formula: "R U R' U'",
    moves: ["R", "U", "R'", "U'"],
    accentClass: "border-neon-blue/35 bg-neon-blue/[0.05]",
    badgeClass: "bg-neon-blue/15 text-neon-blue border-neon-blue/30",
    steps: [
      { move: "R", arrow: "↻", action: "Right side UP (clockwise)" },
      { move: "U", arrow: "↻", action: "Top layer LEFT with right index (clockwise)" },
      { move: "R'", arrow: "↺", action: "Right side DOWN (counter-clockwise)" },
      { move: "U'", arrow: "↺", action: "Top layer RIGHT with left index (counter-clockwise)" },
    ],
    note: "Powers Step 2 (Bottom Corners), Step 3 (Middle Edges), and Step 4 (Top Cross).",
  },
  {
    id: "left_4_moves",
    title: "Left 4-Moves",
    badge: "Left Hand (L' U' L U)",
    formula: "L' U' L U",
    moves: ["L'", "U'", "L", "U"],
    accentClass: "border-teal-400/35 bg-teal-400/[0.05]",
    badgeClass: "bg-teal-400/15 text-teal-300 border-teal-400/30",
    steps: [
      { move: "L'", arrow: "↺", action: "Left side UP (counter-clockwise)" },
      { move: "U'", arrow: "↺", action: "Top layer RIGHT with left index (counter-clockwise)" },
      { move: "L", arrow: "↻", action: "Left side DOWN (clockwise)" },
      { move: "U", arrow: "↻", action: "Top layer LEFT with right index (clockwise)" },
    ],
    note: "Exact mirror of the Right 4-Moves, used for left-side corner and middle-edge insertions.",
  },
];

