import { applyMove } from "./moves.js";
import { isSolved as isFullySolved } from "./facelets.js";

export { isFullySolved };

const SIDES = [2, 1, 5, 4]; // F=2, R=1, B=5, L=4

function centre(fl, block) {
  return fl[block * 9 + 4];
}

function rowMatchesCentre(fl, block, row) {
  const base = block * 9 + row * 3;
  const ctr = centre(fl, block);
  for (let col = 0; col < 3; col++) {
    if (fl[base + col] !== ctr) return false;
  }
  return true;
}

export function downCrossDone(fl) {
  if (!fl || fl.length !== 54) return false;
  const dc = centre(fl, 3);
  const edgesMatch = [28, 30, 32, 34].every((i) => fl[i] === dc);
  if (!edgesMatch) return false;
  const sideChecks = [
    [2, 25],
    [1, 16],
    [5, 52],
    [4, 43],
  ];
  return sideChecks.every(([b, i]) => fl[i] === centre(fl, b));
}

export function firstLayerDone(fl) {
  if (!downCrossDone(fl)) return false;
  const dc = centre(fl, 3);
  for (let k = 0; k < 9; k++) {
    if (fl[27 + k] !== dc) return false;
  }
  return SIDES.every((b) => rowMatchesCentre(fl, b, 2));
}

export function middleLayerDone(fl) {
  return firstLayerDone(fl) && SIDES.every((b) => rowMatchesCentre(fl, b, 1));
}

export function upCrossDone(fl) {
  if (!middleLayerDone(fl)) return false;
  const uc = centre(fl, 0);
  return [1, 3, 5, 7].every((i) => fl[i] === uc);
}

export function upCrossMatched(fl) {
  if (!upCrossDone(fl)) return false;
  const centres = SIDES.map((b) => fl[b * 9 + 4]);
  for (const uTurn of ["", "U", "U2", "U'"]) {
    const tfl = uTurn ? applyMove(fl, uTurn) : fl;
    const edges = [tfl[19], tfl[10], tfl[46], tfl[37]];
    if (edges.every((c, idx) => c === centres[idx])) {
      return true;
    }
  }
  return false;
}

export function cornersMatched(fl) {
  if (!upCrossMatched(fl)) return false;
  const cUfl = new Set([fl[6], fl[18], fl[38]]);
  const cUfr = new Set([fl[8], fl[20], fl[9]]);
  const cUbr = new Set([fl[2], fl[45], fl[11]]);
  const cUbl = new Set([fl[0], fl[47], fl[36]]);

  const eUf = fl[19];
  const eUr = fl[10];
  const eUb = fl[46];
  const eUl = fl[37];

  return (
    cUfl.has(eUf) &&
    cUfl.has(eUl) &&
    cUfr.has(eUf) &&
    cUfr.has(eUr) &&
    cUbr.has(eUb) &&
    cUbr.has(eUr) &&
    cUbl.has(eUb) &&
    cUbl.has(eUl)
  );
}

export const BEGINNER_STAGES = [
  { name: "Bottom cross", test: downCrossDone },
  { name: "Bottom layer", test: firstLayerDone },
  { name: "Middle layer", test: middleLayerDone },
  { name: "Top cross", test: upCrossDone },
  { name: "Match cross", test: upCrossMatched },
  { name: "Match corners", test: cornersMatched },
  { name: "Solved", test: isFullySolved },
];

/**
 * Returns the highest completed stage index (-1 if none) and the next target stage.
 */
export function evaluateCubeStages(facelets) {
  if (!facelets || facelets.length !== 54) {
    return { completedIndex: -1, currentStage: BEGINNER_STAGES[0], allDone: false };
  }

  let completedIndex = -1;
  for (let i = 0; i < BEGINNER_STAGES.length; i++) {
    if (BEGINNER_STAGES[i].test(facelets)) {
      completedIndex = i;
    } else {
      break;
    }
  }

  const allDone = completedIndex === BEGINNER_STAGES.length - 1;
  const currentStage = allDone
    ? BEGINNER_STAGES[BEGINNER_STAGES.length - 1]
    : BEGINNER_STAGES[completedIndex + 1];

  return {
    completedIndex,
    currentStage,
    allDone,
  };
}
