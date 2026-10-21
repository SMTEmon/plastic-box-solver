import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const SWIPE_THRESHOLD = 30; // minimum px drag to commit a move

/**
 * Right-handed tangent frames per face normal.
 * For each face: t1 × t2 = normal.
 *
 * The swipe-to-move formula relies on this orientation:
 *   swipe along t1 → rotation axis = t2, direction = -swipeSign * t2
 *   swipe along t2 → rotation axis = t1, direction = -swipeSign * t1
 */
const TANGENT_FRAMES = {
  "0,0,1":  { t1: [1, 0, 0],  t2: [0, 1, 0] },  // Front
  "0,0,-1": { t1: [-1, 0, 0], t2: [0, 1, 0] },  // Back
  "1,0,0":  { t1: [0, 0, -1], t2: [0, 1, 0] },  // Right
  "-1,0,0": { t1: [0, 0, 1],  t2: [0, 1, 0] },  // Left
  "0,1,0":  { t1: [0, 0, 1],  t2: [1, 0, 0] },  // Up
  "0,-1,0": { t1: [0, 0, -1], t2: [1, 0, 0] },  // Down
};

/**
 * rotation axis index + layer position → face / slice letter.
 * axis 0 = x, 1 = y, 2 = z.
 */
const AXIS_LAYER_TO_FACE = {
  "0,1": "R",  "0,-1": "L",  "0,0": "M",
  "1,1": "U",  "1,-1": "D",  "1,0": "E",
  "2,1": "F",  "2,-1": "B",  "2,0": "S",
};

/**
 * The rotation sign that corresponds to a clockwise (non-prime) quarter turn,
 * mirroring MOVE_SPEC.sign in animate.js.
 */
const FACE_CW_SIGN = {
  U: -1, D: 1, R: -1, L: 1, F: -1, B: 1,
  M: 1, E: 1, S: -1,
};

/**
 * FR-20 touch extension — swipe on a face sticker to turn the corresponding
 * layer.
 *
 *   1. pointerdown  → raycast to identify the tapped face & cubelet position
 *   2. pointermove  → once the drag exceeds SWIPE_THRESHOLD, determine which
 *                     layer to turn and in which direction
 *   3. pointerup    → re-enable OrbitControls
 *
 * The mapping is fully camera-aware: tangent directions are projected to screen
 * space, so swipes work correctly from any camera angle.
 *
 * Renders nothing — it is a behaviour, not a widget.
 */
export default function SwipeControls({
  cubeGroupRef,
  controlsRef,
  onMove,
  enabled = true,
}) {
  const { camera, gl } = useThree();
  const stateRef = useRef(null);
  const raycasterRef = useRef(new THREE.Raycaster());

  useEffect(() => {
    if (!enabled || !onMove) return;
    const canvas = gl.domElement;

    /** Project a 3D world-space point to 2D pixel coordinates. */
    function toScreen(worldPoint) {
      const v = worldPoint.clone().project(camera);
      return new THREE.Vector2(
        (v.x + 1) * 0.5 * canvas.clientWidth,
        (1 - v.y) * 0.5 * canvas.clientHeight,
      );
    }

    /** Project a 3D tangent direction to a normalised 2D screen direction. */
    function projectDir(origin, dir3) {
      const far = origin
        .clone()
        .addScaledVector(new THREE.Vector3(...dir3), 0.5);
      const screenDir = toScreen(far).sub(toScreen(origin));
      const len = screenDir.length();
      return len > 1e-6 ? screenDir.divideScalar(len) : screenDir;
    }

    // ------------------------------------------------------------------
    // Pointer handlers
    // ------------------------------------------------------------------

    function onPointerDown(e) {
      if (!cubeGroupRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );

      raycasterRef.current.setFromCamera(mouse, camera);
      const hits = raycasterRef.current.intersectObjects(
        cubeGroupRef.current.children,
        false,
      );
      if (hits.length === 0) return;

      const hit = hits[0];

      // Face normal in world space (accounts for accumulated cubelet rotation)
      const normalMat = new THREE.Matrix3().getNormalMatrix(
        hit.object.matrixWorld,
      );
      const wn = hit.face.normal
        .clone()
        .applyMatrix3(normalMat)
        .normalize();

      const rounded = [
        Math.round(wn.x),
        Math.round(wn.y),
        Math.round(wn.z),
      ];
      const normalKey = rounded.join(",");
      const frame = TANGENT_FRAMES[normalKey];
      if (!frame) return; // hit an internal face — ignore

      // Cubelet grid position (-1, 0, 1), already snapped by animate.js
      const cubeletPos = [
        Math.round(hit.object.position.x),
        Math.round(hit.object.position.y),
        Math.round(hit.object.position.z),
      ];

      // Project the two tangent directions to screen space at the hit point
      const hitWorld = hit.point.clone();
      const screenT1 = projectDir(hitWorld, frame.t1);
      const screenT2 = projectDir(hitWorld, frame.t2);

      // Suppress OrbitControls while swiping on a face
      if (controlsRef?.current) controlsRef.current.enabled = false;

      stateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        cubeletPos,
        frame,
        screenT1,
        screenT2,
        committed: false,
      };
    }

    function onPointerMove(e) {
      const st = stateRef.current;
      if (!st || st.committed) return;

      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (dx * dx + dy * dy < SWIPE_THRESHOLD * SWIPE_THRESHOLD) return;

      const swipe = new THREE.Vector2(dx, dy).normalize();

      // Decompose swipe into the two projected tangent directions
      const dot1 = swipe.dot(st.screenT1);
      const dot2 = swipe.dot(st.screenT2);

      let swipeSign, perpTangent;

      if (Math.abs(dot1) >= Math.abs(dot2)) {
        // Swipe is predominantly along T1 → rotation determined by T2
        swipeSign = dot1 > 0 ? 1 : -1;
        perpTangent = st.frame.t2;
      } else {
        // Swipe is predominantly along T2 → rotation determined by T1
        swipeSign = dot2 > 0 ? 1 : -1;
        perpTangent = st.frame.t1;
      }

      // The rotation axis is along the perpendicular tangent
      const rotAxisIndex = perpTangent.findIndex((v) => v !== 0);
      if (rotAxisIndex === -1) return;

      // rotation_vector = -swipeSign * perpTangent
      const perpSign = perpTangent[rotAxisIndex]; // +1 or -1
      const rotSign = -swipeSign * perpSign;

      // Which layer? Cubelet position along the rotation axis.
      const layerPos = st.cubeletPos[rotAxisIndex];
      const faceKey = `${rotAxisIndex},${layerPos}`;
      const faceLetter = AXIS_LAYER_TO_FACE[faceKey];
      if (!faceLetter) return;

      const cwSign = FACE_CW_SIGN[faceLetter];
      if (cwSign === undefined) return;

      // If the computed rotation matches the face's CW sign → plain move,
      // otherwise → prime (counter-clockwise).
      const isPrime = rotSign !== cwSign;
      const move = faceLetter + (isPrime ? "'" : "");

      st.committed = true;
      onMove(move);
    }

    function onPointerUp() {
      if (stateRef.current) {
        if (controlsRef?.current) controlsRef.current.enabled = true;
        stateRef.current = null;
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      // Ensure controls are re-enabled on cleanup
      if (controlsRef?.current) controlsRef.current.enabled = true;
    };
  }, [enabled, onMove, camera, gl, cubeGroupRef, controlsRef]);

  return null;
}

