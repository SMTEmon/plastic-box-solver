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
 *   limit > 0  -> cubelets with position[axis] >  limit
 *   limit < 0  -> cubelets with position[axis] <  limit
 *   limit null -> every cubelet (whole-cube rotation)
 * `sign` is the rotation direction about that axis, right-hand rule.
 *
 * A face turn's sign is -LAYER (a clockwise turn seen from outside), which is
 * where the six face entries come from. The whole-cube rotations do NOT follow
 * that rule -- the model gives X/Y/Z a direction of +1 regardless (see ROT_DIR
 * in moves.js), so they spin the opposite way to R/U/F.
 *
 * Getting this wrong is silent and nasty: the store reports "solved" while the
 * cube on screen is visibly scrambled, because a guided solution contains
 * whole-cube rotations. tests/visualParity.test.js pins every one of these
 * signs against the model's own permutation tables.
 */
export const MOVE_SPEC = {
  U: { axis: "y", limit: 0.5, sign: -1 },
  D: { axis: "y", limit: -0.5, sign: 1 },
  R: { axis: "x", limit: 0.5, sign: -1 },
  L: { axis: "x", limit: -0.5, sign: 1 },
  F: { axis: "z", limit: 0.5, sign: -1 },
  B: { axis: "z", limit: -0.5, sign: 1 },
  X: { axis: "x", limit: null, sign: 1 },
  Y: { axis: "y", limit: null, sign: 1 },
  Z: { axis: "z", limit: null, sign: 1 },
  M: { axis: "x", limit: 0, sign: 1 },
  E: { axis: "y", limit: 0, sign: 1 },
  S: { axis: "z", limit: 0, sign: -1 },
};

export const BASE_DURATION_MS = 200;
export const ASSISTED_BASE_DURATION_MS = 600;

function getQueueMultiplier(qLen) {
  if (qLen >= 4) return 3.5;
  if (qLen >= 3) return 2.8;
  if (qLen >= 2) return 2.2;
  if (qLen >= 1) return 1.6;
  return 1.0;
}


function reparentBack(cubeGroup, rotationGroup) {
  rotationGroup.children
    .slice()
    .reverse()
    .forEach((c) => {
      cubeGroup.attach(c);
      // Every .attach() recomputes a world transform, so positions drift a
      // little each turn (0.9999998 instead of 1). Over a 168-move guided
      // playback that drift can grow past the +/-0.5 layer test and the wrong
      // cubelets get picked up. Snap back to the integer lattice each time.
      c.position.set(
        Math.round(c.position.x),
        Math.round(c.position.y),
        Math.round(c.position.z),
      );
    });
  rotationGroup.quaternion.set(0, 0, 0, 1);
  rotationGroup.rotation.set(0, 0, 0);
  rotationGroup.updateMatrixWorld?.(true);
  cubeGroup.updateMatrixWorld?.(true);
}

function attachLayer(cubeGroup, rotationGroup, axis, limit) {
  cubeGroup.children
    .slice()
    .reverse()
    .filter((c) =>
      limit === null
        ? true
        : limit === 0
          ? Math.abs(c.position[axis]) < 0.5
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
  let currentTween = null;
  let currentMoveInfo = null;

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

    // Interactive user turns (count === true) always use snappy 200ms duration,
    // scaling up dynamically when moves accumulate in the input queue.
    // Practice drill turns (count === "drill") use consistent BASE_DURATION_MS
    // so each cycle of the 4-Move Reset Drill is clearly visible.
    // Assisted moves (count === false, i.e. Guided / Auto-Solve) use dedicated
    // ASSISTED_BASE_DURATION_MS strictly controlled by the user's selected playback speed.
    const duration =
      count === true
        ? (BASE_DURATION_MS * quarters) / getQueueMultiplier(queue.length)
        : count === "drill"
          ? BASE_DURATION_MS * quarters
          : (ASSISTED_BASE_DURATION_MS * quarters) / speed;

    currentMoveInfo = { move, count, spec, target, quarters };

    currentTween = new JEasing(rotationGroup.current.rotation)
      .to({ [spec.axis]: target }, duration)
      .easing(JEASINGS.Cubic.InOut)
      .onComplete(() => {
        if (rotationGroup.current && spec) {
          rotationGroup.current.rotation[spec.axis] = target;
          rotationGroup.current.updateMatrixWorld?.(true);
        }
        reparentBack(cubeGroup.current, rotationGroup.current);
        busy = false;
        currentTween = null;
        currentMoveInfo = null;
        onMoveDone?.(move, count); // <-- logical state advances HERE
        instance.onStep?.(move, count);
        runNext(); // <-- drain the rest of the queue
      })
      .start();
  }

  function fastForward() {
    if (!busy || !currentTween || !currentMoveInfo) return;
    const { move, count, spec, target } = currentMoveInfo;
    const tween = currentTween;

    JEASINGS.removeJEasing(tween);
    currentTween = null;
    currentMoveInfo = null;

    if (rotationGroup.current && spec) {
      rotationGroup.current.rotation[spec.axis] = target;
      rotationGroup.current.updateMatrixWorld?.(true);
    }
    if (cubeGroup.current && rotationGroup.current) {
      reparentBack(cubeGroup.current, rotationGroup.current);
    }
    busy = false;

    onMoveDone?.(move, count);
    instance.onStep?.(move, count);

    // If there are moves left in the queue, immediately start the next one
    if (queue.length > 0) {
      runNext();
    }
  }

  function fastForwardAll() {
    while (busy || queue.length > 0) {
      fastForward();
    }
  }

  function cancel() {
    queue.length = 0;
    if (busy && currentTween) {
      JEASINGS.removeJEasing(currentTween);
      currentTween = null;
    }
    currentMoveInfo = null;
    if (cubeGroup.current && rotationGroup.current) {
      rotationGroup.current.rotation.set(0, 0, 0);
      rotationGroup.current.quaternion.set(0, 0, 0, 1);
      rotationGroup.current.updateMatrixWorld?.(true);
      reparentBack(cubeGroup.current, rotationGroup.current);
    }
    busy = false;
  }

  const instance = {
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
      cancel();
    },
    cancel,
    fastForward,
    fastForwardAll,
    setSpeed(multiplier) {
      speed = Math.max(0.25, multiplier);
    },
    get speed() {
      return speed;
    },
    get pending() {
      return queue.length + (busy ? 1 : 0);
    },
    get isBusy() {
      return busy;
    },
    onStep: null,
  };

  return instance;
}
