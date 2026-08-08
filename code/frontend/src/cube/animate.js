/**
 * The animation engine, extracted from the old Leva-driven Buttons.jsx and
 * given the two things it was missing:
 *
 *   1. A QUEUE. The old code did `if (!JEASINGS.getLength())` and silently
 *      dropped any move requested while an animation was in flight -- fatal
 *      for playing back a 20-move solution.
 *   2. WHOLE-CUBE ROTATIONS (X/Y/Z). rubik_solver's beginner method emits
 *      these, so a real guided solution contains them.
 *
 * How a turn is animated: re-parent the nine cubelets of that layer from
 * cubeGroup into rotationGroup with .attach() (which preserves the world
 * transform), tween rotationGroup's rotation by 90 degrees, then re-parent
 * them back and zero the group. One group rotates, not nine objects.
 */

import JEASINGS, { JEasing } from "jeasings";

/**
 * token -> which cubelets move, about which axis, in which direction.
 *
 * The six face entries are lifted verbatim from the working Buttons.jsx, so
 * they are already visually calibrated against the model.
 *   limit > 0  -> cubelets with position[axis] >  limit
 *   limit < 0  -> cubelets with position[axis] <  limit
 *   limit null -> every cubelet (whole-cube rotation)
 * `sign` is the direction of a CLOCKWISE turn seen from outside that face.
 */
export const MOVE_SPEC = {
  U: { axis: "y", limit: 0.5, sign: -1 },
  D: { axis: "y", limit: -0.5, sign: 1 },
  R: { axis: "x", limit: 0.5, sign: -1 },
  L: { axis: "x", limit: -0.5, sign: 1 },
  F: { axis: "z", limit: 0.5, sign: -1 },
  B: { axis: "z", limit: -0.5, sign: 1 },
  X: { axis: "x", limit: null, sign: -1 },
  Y: { axis: "y", limit: null, sign: -1 },
  Z: { axis: "z", limit: null, sign: -1 },
};

export const BASE_DURATION_MS = 220;

function reparentBack(cubeGroup, rotationGroup) {
  rotationGroup.children
    .slice()
    .reverse()
    .forEach((c) => cubeGroup.attach(c));
  rotationGroup.quaternion.set(0, 0, 0, 1);
  rotationGroup.rotation.set(0, 0, 0);
}

function attachLayer(cubeGroup, rotationGroup, axis, limit) {
  cubeGroup.children
    .slice()
    .reverse()
    .filter((c) =>
      limit === null
        ? true
        : limit < 0
          ? c.position[axis] < limit
          : c.position[axis] > limit,
    )
    .forEach((c) => rotationGroup.attach(c));
}

/**
 * Create an animator bound to a cubeGroup / rotationGroup ref pair.
 *
 * onMoveDone(move) fires when each animation completes. That is the ONLY
 * place logical state should advance, so the render and the truth can never
 * drift apart.
 */
export function createAnimator({ cubeGroup, rotationGroup, onMoveDone }) {
  const queue = [];
  let busy = false;
  let speed = 1;

  function runNext() {
    if (busy || queue.length === 0) return;
    if (!cubeGroup.current || !rotationGroup.current) return;

    const { move, count } = queue.shift();
    const spec = MOVE_SPEC[move[0]];
    if (!spec) {
      console.warn("animate: unknown move token", move);
      return runNext();
    }

    const quarters = move.endsWith("2") ? 2 : 1;
    const dir = move.endsWith("'") ? -spec.sign : spec.sign;

    busy = true;
    reparentBack(cubeGroup.current, rotationGroup.current);
    attachLayer(cubeGroup.current, rotationGroup.current, spec.axis, spec.limit);

    const target =
      rotationGroup.current.rotation[spec.axis] +
      (Math.PI / 2) * quarters * dir;

    new JEasing(rotationGroup.current.rotation)
      .to({ [spec.axis]: target }, (BASE_DURATION_MS * quarters) / speed)
      .easing(JEASINGS.Cubic.InOut)
      .onComplete(() => {
        reparentBack(cubeGroup.current, rotationGroup.current);
        busy = false;
        onMoveDone?.(move, count); // <-- logical state advances HERE
        runNext(); // <-- drain the rest of the queue
      })
      .start();
  }

  return {
    /**
     * Queue one move or an array. Nothing is ever dropped.
     * count=false marks the moves as assisted playback, so they do not
     * inflate the user's move count.
     */
    enqueue(moves, count = true) {
      (Array.isArray(moves) ? moves : [moves]).forEach((move) =>
        queue.push({ move, count }),
      );
      runNext();
    },
    clear() {
      queue.length = 0;
    },
    setSpeed(multiplier) {
      speed = Math.max(0.25, multiplier);
    },
    get pending() {
      return queue.length + (busy ? 1 : 0);
    },
    get isBusy() {
      return busy;
    },
  };
}
