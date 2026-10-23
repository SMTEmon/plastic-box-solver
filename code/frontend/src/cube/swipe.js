import * as THREE from "three";
import { MOVE_SPEC } from "./animate.js";

export const SWIPE_THRESHOLD = 30; // minimum px drag to commit a move

const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const AXIS_LAYER_TO_FACE = {
  "0,1": "R",  "0,-1": "L",  "0,0": "M",
  "1,1": "U",  "1,-1": "D",  "1,0": "E",
  "2,1": "F",  "2,-1": "B",  "2,0": "S",
};

/** Project a 3D world-space point to 2D pixel coordinates on canvas. */
export function toScreen(worldPoint, camera, canvas) {
  const v = worldPoint.clone().project(camera);
  return new THREE.Vector2(
    (v.x + 1) * 0.5 * canvas.clientWidth,
    (1 - v.y) * 0.5 * canvas.clientHeight,
  );
}

/** Given a face normal and integer cubelet position, return candidate moves. */
export function getCandidateMoves(normalVec, cubeletPos) {
  const normalAxis = ["x", "y", "z"].find((a) => Math.abs(normalVec[a]) > 0.5);
  if (!normalAxis) return [];
  const tangentAxes = ["x", "y", "z"].filter((a) => a !== normalAxis);

  const candidates = [];
  for (const axis of tangentAxes) {
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    const layer = cubeletPos[axisIndex];
    const baseFace = AXIS_LAYER_TO_FACE[`${axisIndex},${layer}`];
    if (baseFace) {
      candidates.push(baseFace);
      candidates.push(baseFace + "'");
    }
  }
  return candidates;
}

/**
 * Detect the cube move matching a 2D screen swipe by kinematic projection.
 *
 * For each candidate move that turns a layer containing the touched sticker,
 * we compute the instantaneous 3D velocity v = ω × r, project it onto the
 * 2D screen, and compare it with the swipe direction. The move whose projected
 * screen motion best aligns with the swipe is selected.
 */
export function detectMove(
  hitPoint,
  normalVec,
  cubeletPos,
  screenSwipeDelta,
  camera,
  canvas,
) {
  const candidates = getCandidateMoves(normalVec, cubeletPos);
  if (candidates.length === 0) return null;

  const swipeDir = screenSwipeDelta.clone().normalize();
  const screenOrigin = toScreen(hitPoint, camera, canvas);

  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of candidates) {
    const isPrime = move.endsWith("'");
    const base = move[0];
    const spec = MOVE_SPEC[base];
    if (!spec) continue;

    const rotSign = isPrime ? -spec.sign : spec.sign;
    const omega = AXIS_VECTORS[spec.axis].clone().multiplyScalar(rotSign);

    // Instantaneous velocity: v = ω × r
    const v = new THREE.Vector3().crossVectors(omega, hitPoint);
    const step = 0.1;
    const far = hitPoint.clone().addScaledVector(v, step);
    const screenMoveDir = toScreen(far, camera, canvas).sub(screenOrigin);
    const len = screenMoveDir.length();
    if (len < 1e-6) continue;
    screenMoveDir.divideScalar(len);

    const score = swipeDir.dot(screenMoveDir);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestScore > 0 ? bestMove : null;
}
