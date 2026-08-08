/**
 * Turns solver notation into something a person can actually follow.
 *
 * "R'" means nothing to someone who has never solved a cube, and the whole
 * point of Guided Mode is teaching people who never learned. So every step is
 * rendered as: which face, which way, and -- because whole-cube rotations move
 * the centres around -- what colour that face is RIGHT NOW.
 */

import { FACE_ORDER } from "./facelets.js";

const FACE_NAMES = {
  U: "Top",
  D: "Bottom",
  L: "Left",
  R: "Right",
  F: "Front",
  B: "Back",
};

/** Which way is "clockwise" when you are looking straight at that face. */
const FACE_HINTS = {
  U: "looking down at it from above",
  D: "looking up at it from below",
  L: "looking at it from the left",
  R: "looking at it from the right",
  F: "looking straight at it",
  B: "looking at it from behind",
};

const ROTATION_NAMES = {
  X: { axis: "like R", plain: "Roll the whole cube away from you (top goes back)" },
  Y: { axis: "like U", plain: "Spin the whole cube to the left (front goes left)" },
  Z: { axis: "like F", plain: "Tilt the whole cube clockwise" },
};

const ROTATION_NAMES_PRIME = {
  X: "Roll the whole cube towards you (top comes forward)",
  Y: "Spin the whole cube to the right (front goes right)",
  Z: "Tilt the whole cube counter-clockwise",
};

const COLOUR_NAMES = {
  w: "white",
  y: "yellow",
  r: "red",
  o: "orange",
  g: "green",
  b: "blue",
};

export const COLOUR_HEX = {
  w: "#f5f5f5",
  y: "#ffd400",
  r: "#ff4d4d",
  o: "#ff8c00",
  g: "#2ecc71",
  b: "#2d4cff",
};

/** The colour currently sitting on a face's centre, from a facelet string. */
export function centreColour(facelets, face) {
  const i = FACE_ORDER.indexOf(face);
  return i < 0 ? null : facelets[i * 9 + 4];
}

/**
 * Describe one move in plain English.
 *
 * @param {string} move     e.g. "R", "U'", "F2", "Y'"
 * @param {string} facelets current state, used to name the face's colour
 * @returns {{
 *   token: string, isRotation: boolean, face: string|null,
 *   faceName: string, turns: number, clockwise: boolean,
 *   colour: string|null, colourName: string|null, colourHex: string|null,
 *   title: string, detail: string, arrow: string
 * }}
 */
export function describeMove(move, facelets = null) {
  const token = move[0];
  const double = move.endsWith("2");
  const prime = move.endsWith("'");
  const turns = double ? 2 : 1;
  const clockwise = !prime;
  const isRotation = token in ROTATION_NAMES;

  if (isRotation) {
    const plain = double
      ? `${ROTATION_NAMES[token].plain} -- twice (a half turn)`
      : prime
        ? ROTATION_NAMES_PRIME[token]
        : ROTATION_NAMES[token].plain;
    return {
      token: move,
      isRotation: true,
      face: null,
      faceName: "Whole cube",
      turns,
      clockwise,
      colour: null,
      colourName: null,
      colourHex: null,
      title: "Turn the whole cube",
      detail: `${plain}. Don't turn a single layer -- reorient the entire cube in your hands.`,
      arrow: prime ? "↺" : "↻",
    };
  }

  const colour = facelets ? centreColour(facelets, token) : null;
  const faceName = FACE_NAMES[token] ?? token;
  const degrees = double ? "180" : "90";
  const direction = double
    ? "half turn"
    : clockwise
      ? "clockwise"
      : "counter-clockwise";

  return {
    token: move,
    isRotation: false,
    face: token,
    faceName,
    turns,
    clockwise,
    colour,
    colourName: colour ? COLOUR_NAMES[colour] : null,
    colourHex: colour ? COLOUR_HEX[colour] : null,
    title: `${faceName} face — ${direction}`,
    detail: colour
      ? `Turn the ${faceName.toLowerCase()} layer (the ${COLOUR_NAMES[colour]} centre) ${degrees}° ${direction}, ${FACE_HINTS[token]}.`
      : `Turn the ${faceName.toLowerCase()} layer ${degrees}° ${direction}, ${FACE_HINTS[token]}.`,
    arrow: double ? "↻↻" : clockwise ? "↻" : "↺",
  };
}

/** Short label for a compact move chip, e.g. "Right cw". */
export function shortLabel(move) {
  const d = describeMove(move);
  if (d.isRotation) return `Cube ${d.arrow}`;
  return `${d.faceName} ${d.turns === 2 ? "x2" : d.clockwise ? "cw" : "ccw"}`;
}

/** Plain-English name for each of the seven beginner stages. */
export const STAGE_HELP = {
  "Bottom cross":
    "Make a plus sign on the bottom face, with each arm matching the side it touches.",
  "Bottom layer":
    "Fill in the four bottom corners so the whole bottom face and the ring around it are done.",
  "Middle layer": "Put the four middle-row edge pieces where they belong.",
  "Top cross": "Make a plus sign on the top face (colours on the sides don't matter yet).",
  "Top face": "Make the entire top face one colour.",
  "Position corners": "Slide the top corners into their correct spots.",
  Solved: "Final turns to line everything up.",
};
