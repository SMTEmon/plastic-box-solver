/**
 * Turns solver notation into something a complete beginner can follow.
 *
 * "R'" means nothing to someone who has never solved a cube, and that is
 * exactly who Guided Mode is for. Even "turn the right face clockwise" is too
 * abstract -- clockwise from WHERE? People get this wrong constantly, because
 * clockwise on the right face looks counter-clockwise from the front.
 *
 * So every instruction is phrased as a DIRECTION OF TRAVEL you can see:
 * "the right column rolls UP", "the top layer slides LEFT". No mental rotation
 * required.
 *
 * Every direction below was verified against the engine by applying the move
 * to a solved cube and checking which face's stickers ended up where. They are
 * described from the default view: green facing you, white on top.
 */

import { FACE_ORDER } from "./facelets.js";

export const COLOUR_NAMES = {
  w: "white",
  y: "yellow",
  r: "red",
  o: "orange",
  g: "green",
  b: "blue",
};

export const COLOUR_HEX = {
  w: "#f1f5f9",
  y: "#fbbf24",
  r: "#f43f5e",
  o: "#fb923c",
  g: "#22c55e",
  b: "#3b82f6",
};

const FACE_NAMES = {
  U: "top",
  D: "bottom",
  L: "left",
  R: "right",
  F: "front",
  B: "back",
};

/**
 * For each face turn: what to grab, and which way it visibly travels.
 * `cw` is the plain move, `ccw` is the primed move.
 *
 * Verified: U sends the front's top row to the LEFT face, so the top layer
 * travels left. R brings the bottom face up to the front, so the right column
 * rolls up. F brings the left face up to the top, so the front spins with its
 * top edge going right. B brings the right face up to the top, so the back
 * layer's top edge travels left as seen from the front.
 */
const TRAVEL = {
  U: {
    grab: "the whole top layer",
    cw: { dir: "LEFT", arrow: "←", say: "slides to the LEFT" },
    ccw: { dir: "RIGHT", arrow: "→", say: "slides to the RIGHT" },
  },
  D: {
    grab: "the whole bottom layer",
    cw: { dir: "RIGHT", arrow: "→", say: "slides to the RIGHT" },
    ccw: { dir: "LEFT", arrow: "←", say: "slides to the LEFT" },
  },
  R: {
    grab: "the right-hand column",
    cw: { dir: "UP", arrow: "↑", say: "rolls UP (front of it goes up)" },
    ccw: { dir: "DOWN", arrow: "↓", say: "rolls DOWN (front of it goes down)" },
  },
  L: {
    grab: "the left-hand column",
    cw: { dir: "DOWN", arrow: "↓", say: "rolls DOWN (front of it goes down)" },
    ccw: { dir: "UP", arrow: "↑", say: "rolls UP (front of it goes up)" },
  },
  F: {
    grab: "the face pointing at you",
    cw: { dir: "CLOCKWISE", arrow: "↻", say: "spins CLOCKWISE (its top edge goes right)" },
    ccw: {
      dir: "ANTICLOCKWISE",
      arrow: "↺",
      say: "spins ANTI-CLOCKWISE (its top edge goes left)",
    },
  },
  B: {
    grab: "the layer at the very back",
    cw: {
      dir: "LEFT",
      arrow: "←",
      say: "turns so its top edge travels LEFT (seen from the front)",
    },
    ccw: {
      dir: "RIGHT",
      arrow: "→",
      say: "turns so its top edge travels RIGHT (seen from the front)",
    },
  },
};

const ROTATION = {
  X: {
    cw: "Tip the whole cube BACKWARDS — the face that was on top goes to the back.",
    ccw: "Tip the whole cube FORWARDS — the face that was on top comes towards you.",
    grab: "the entire cube",
  },
  Y: {
    cw: "Spin the whole cube to the LEFT — the face you were looking at moves left.",
    ccw: "Spin the whole cube to the RIGHT — the face you were looking at moves right.",
    grab: "the entire cube",
  },
  Z: {
    cw: "Tilt the whole cube CLOCKWISE, keeping the same face towards you.",
    ccw: "Tilt the whole cube ANTI-CLOCKWISE, keeping the same face towards you.",
    grab: "the entire cube",
  },
};

/** The colour currently sitting on a face's centre. */
export function centreColour(facelets, face) {
  const i = FACE_ORDER.indexOf(face);
  return i < 0 ? null : facelets[i * 9 + 4];
}

/**
 * Describe one move for a beginner.
 *
 * @param {string} move      "R", "U'", "F2", "Y'" ...
 * @param {string} facelets  current state, so the face can be named by colour
 */
export function describeMove(move, facelets = null) {
  const token = move[0];
  const double = move.endsWith("2");
  const prime = move.endsWith("'");
  const isRotation = token in ROTATION;

  if (isRotation) {
    const spec = ROTATION[token];
    const base = prime ? spec.ccw : spec.cw;
    return {
      token: move,
      isRotation: true,
      face: null,
      grab: spec.grab,
      headline: "Turn the WHOLE cube",
      instruction: double ? `${base} Do it twice.` : base,
      warning:
        "This is not a layer turn — pick the cube up and reorient it in your hands. Nothing moves relative to anything else.",
      arrow: prime ? "↺" : "↻",
      quarters: double ? 2 : 1,
      colour: null,
      colourName: null,
      colourHex: null,
    };
  }

  const spec = TRAVEL[token];
  if (!spec) {
    return {
      token: move,
      isRotation: false,
      face: token,
      grab: "",
      headline: move,
      instruction: "",
      arrow: "",
      quarters: 1,
      colour: null,
      colourName: null,
      colourHex: null,
    };
  }

  const motion = prime ? spec.ccw : spec.cw;
  const colour = facelets ? centreColour(facelets, token) : null;
  const faceName = FACE_NAMES[token];
  const colourName = colour ? COLOUR_NAMES[colour] : null;

  // Naming the colour matters: after a whole-cube rotation "right" is a
  // different colour than it was, and the colour is what people actually look
  // at when they pick up the cube.
  const where = colourName
    ? `${spec.grab} — the one with the ${colourName} centre`
    : spec.grab;

  return {
    token: move,
    isRotation: false,
    face: token,
    grab: spec.grab,
    headline: double
      ? `Turn the ${faceName.toUpperCase()} side HALF WAY around`
      : `Turn the ${faceName.toUpperCase()} side ${motion.dir}`,
    instruction: double
      ? `Take ${where} and turn it twice in the same direction, so it ends up facing the opposite way. Direction does not matter for a half turn.`
      : `Take ${where}. It ${motion.say}. That is one quarter turn — a 90° click.`,
    warning: null,
    arrow: double ? `${motion.arrow}${motion.arrow}` : motion.arrow,
    quarters: double ? 2 : 1,
    colour,
    colourName,
    colourHex: colour ? COLOUR_HEX[colour] : null,
  };
}

/** Compact label for a "coming up next" chip. */
export function shortLabel(move) {
  const d = describeMove(move);
  if (d.isRotation) return `whole cube ${d.arrow}`;
  return `${FACE_NAMES[d.face]} ${d.arrow}`;
}

/**
 * The three kinds of piece. Almost every "why did that move break what I just
 * did?" moment comes from not knowing this, so it is worth teaching before the
 * first move rather than after the tenth mistake.
 */
export const CUBE_BASICS = [
  {
    title: "Centres never move",
    body:
      "The six centre stickers are bolted to the core. Turn a face and the centre just spins in place. That means the centre colour IS that side's identity: the side with the red centre is the red side, permanently, no matter how scrambled the rest looks.",
  },
  {
    title: "Edges have 2 colours, corners have 3",
    body:
      "There are 12 edge pieces (two stickers each) and 8 corner pieces (three stickers each). A sticker never leaves its piece. So you are not moving 54 stickers around — you are moving 20 pieces, and each one has exactly one correct home.",
  },
  {
    title: "You solve layer by layer",
    body:
      "Every beginner method builds one layer, then the next, then the last. The hard part is placing new pieces without destroying what you already built — which is what the repeated sequences (algorithms) are for. They take a piece the long way round so the finished part ends up untouched.",
  },
  {
    title: "A quarter turn is one click",
    body:
      "Every instruction here is a 90° turn of one layer, or 180° for a half turn. If you ever lose your place, press Back and watch the 3D cube replay the move.",
  },
];

/**
 * What each of the seven stages is actually building, in plain words, plus
 * what "done" looks like so a beginner can check their own progress.
 */
export const STAGE_HELP = {
  "Bottom cross": {
    goal: "Make a plus sign on the bottom face.",
    detail:
      "Four edge pieces around the bottom centre, forming a cross. Each arm must ALSO match the colour of the side it touches — a cross that looks right from underneath but has mismatched sides is wrong and will break later.",
    why: "This is the anchor for everything else. Every later stage assumes these four edges are correct, so an error here quietly ruins the whole solve.",
    check: "Turn the cube over and look at the bottom: a plus sign in one colour. Then look at the four sides — each arm's second colour should match that side's centre.",
  },
  "Bottom layer": {
    goal: "Finish the entire bottom face and the ring around it.",
    detail:
      "Drop the four corner pieces in. Each corner has three colours, so there is exactly one slot where all three match.",
    why: "Corners are placed with a repeated sequence that takes the piece up, around and back down. That detour is the point: it returns everything else to where it was, so the cross you just built survives.",
    check: "The whole bottom face is one solid colour, and the bottom ROW of all four sides matches each side's centre.",
  },
  "Middle layer": {
    goal: "Fill in the middle row.",
    detail:
      "Four edge pieces belong in the middle band. None of them has the top colour on it — that is how you spot which pieces belong here.",
    why: "You cannot reach the middle without briefly disturbing the bottom, so the algorithm dips into the bottom layer and puts it straight back. Trust the sequence and do not stop half way.",
    check: "Two full layers done. On every side, the bottom two rows are solid and only the top row is still mixed.",
  },
  "Top cross": {
    goal: "Make a plus sign on the top face.",
    detail:
      "Only the top colour matters right now. The sides of those edges will look wrong, and that is expected — you are ORIENTING them, not placing them.",
    why: "Solving the last layer is split into two jobs: turn the pieces the right way up, then slide them to the right spots. Trying to do both at once is what makes the last layer feel impossible.",
    check: "A plus sign on top in the top colour. Ignore the sides completely.",
  },
  "Top face": {
    goal: "Make the whole top face one colour.",
    detail:
      "Twist the top corners so the entire top face is a single colour. The sides will still look scrambled — normal, and it is about to be fixed.",
    why: "Still orienting, not placing. The corners may already be in the right positions; they are just facing the wrong way. The sequence twists them in place.",
    check: "The whole top face is one solid colour. The sides are still a mess.",
  },
  "Position corners": {
    goal: "Slide the top corners into their correct spots.",
    detail:
      "Each corner has three colours, and only one slot where all three match a centre. This moves them there without disturbing the top face.",
    why: "Now you are PLACING rather than orienting. Everything is facing the right way, so the pieces only need to swap around.",
    check: "The three colours on every top corner match the three sides it touches.",
  },
  Solved: {
    goal: "Final turns.",
    detail: "The last few moves cycle the remaining top edges into place.",
    why: "This is the last thing left: a few edges in the right layer, facing the right way, but in each other's spots.",
    check: "Every face is a single colour. Done.",
  },

  // CFOP's four stages. It is a different pedagogy, not a shorter version of
  // the beginner method: the first two layers are built together rather than
  // one at a time, which is where most of the move saving comes from.
  Cross: {
    goal: "Make a cross on the bottom face.",
    detail:
      "Same start as the beginner method: four edges around the bottom centre, each arm matching the side it touches.",
    why: "CFOP and the beginner method agree completely on step one. Everything after this is where they differ.",
    check: "A plus sign on the bottom, and each arm's side colour matches that side's centre.",
  },
  "F2L — first two layers": {
    goal: "Build the bottom AND middle layers together.",
    detail:
      "A corner and its matching edge are paired up in the top layer and dropped into place as a unit, four times over.",
    why: "This is where CFOP saves its moves. The beginner method places the corner, then goes back for the edge; CFOP does both in one trip. Same result, roughly half the turns.",
    check: "The bottom two layers are completely solid. Only the top layer is still mixed.",
  },
  "OLL — orient last layer": {
    goal: "Make the whole top face one colour, in one go.",
    detail:
      "Where the beginner method needs two separate stages (cross, then corners), CFOP orients the entire last layer with a single algorithm.",
    why: "Orientation before placement, same principle as the beginner method — just done in one step instead of two.",
    check: "The whole top face is a single colour. The sides are still wrong.",
  },
  "PLL — permute last layer": {
    goal: "Slide the last-layer pieces into their correct spots.",
    detail:
      "Everything already faces the right way, so this only swaps pieces around. One algorithm finishes the cube.",
    why: "The final half of CFOP's two-step last layer. Orient, then permute.",
    check: "Every face is a single colour. Done.",
  },
};
