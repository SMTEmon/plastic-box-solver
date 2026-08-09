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

const COLOUR_NAMES = {
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
 * What each of the seven stages is actually building, in plain words, plus
 * what "done" looks like so a beginner can check their own progress.
 */
export const STAGE_HELP = {
  "Bottom cross": {
    goal: "Make a plus sign on the bottom face.",
    detail:
      "Four edge pieces around the bottom centre, forming a cross. Each arm must also match the colour of the side it touches — a cross that looks right from below but has mismatched sides does not count.",
  },
  "Bottom layer": {
    goal: "Finish the entire bottom face and the ring around it.",
    detail:
      "Drop the four corner pieces into place. When this is done the bottom is one solid colour and the bottom row of all four sides matches their own centres.",
  },
  "Middle layer": {
    goal: "Fill in the middle row.",
    detail:
      "Four edge pieces belong in the middle band. The bottom two layers will be completely finished after this — only the top remains.",
  },
  "Top cross": {
    goal: "Make a plus sign on the top face.",
    detail:
      "Only the top face colour matters here. The sides of those edge pieces will be wrong for now, and that is expected.",
  },
  "Top face": {
    goal: "Make the whole top face one colour.",
    detail:
      "Twist the top corners so the entire top is a single colour. The sides will still look scrambled — the pieces are in the right place but facing wrong.",
  },
  "Position corners": {
    goal: "Slide the top corners into their correct spots.",
    detail:
      "Each corner has three colours and only one spot they all match. This puts them there.",
  },
  Solved: {
    goal: "Final turns.",
    detail: "The last few moves line up the remaining edges. The cube is done.",
  },
};
