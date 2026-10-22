import { useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { detectMove, SWIPE_THRESHOLD } from "../cube/swipe.js";

/**
 * FR-20 touch extension — swipe on a face sticker to turn the corresponding
 * layer.
 *
 *   1. pointerdown  → raycast to identify the tapped face & cubelet position
 *   2. pointermove  → once the drag exceeds SWIPE_THRESHOLD, determine which
 *                     layer to turn using camera-aware kinematic projection
 *   3. pointerup    → re-enable OrbitControls
 *
 * Fully camera-aware: layers turn naturally in the exact direction of the user's
 * swipe gesture from any camera angle.
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
    const controls = controlsRef?.current;

    function onPointerDown(e) {
      if (!cubeGroupRef.current) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;

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

      // Face normal in world space
      const normalMat = new THREE.Matrix3().getNormalMatrix(
        hit.object.matrixWorld,
      );
      const wn = hit.face.normal
        .clone()
        .applyMatrix3(normalMat)
        .normalize();

      const normalVec = new THREE.Vector3(
        Math.round(wn.x),
        Math.round(wn.y),
        Math.round(wn.z),
      );

      // Cubelet grid position (-1, 0, 1), snapped by animate.js
      const cubeletPos = [
        Math.round(hit.object.position.x),
        Math.round(hit.object.position.y),
        Math.round(hit.object.position.z),
      ];

      // Suppress OrbitControls while swiping on a face
      if (controlsRef?.current) controlsRef.current.enabled = false;

      stateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        pointerId: e.pointerId,
        hitPoint: hit.point.clone(),
        normalVec,
        cubeletPos,
        committed: false,
      };
    }

    function onPointerMove(e) {
      const st = stateRef.current;
      if (!st || st.committed) return;
      if (st.pointerId !== undefined && e.pointerId !== st.pointerId) return;

      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (dx * dx + dy * dy < SWIPE_THRESHOLD * SWIPE_THRESHOLD) return;

      const swipeDelta = new THREE.Vector2(dx, dy);
      const move = detectMove(
        st.hitPoint,
        st.normalVec,
        st.cubeletPos,
        swipeDelta,
        camera,
        canvas,
      );
      if (!move) return;

      st.committed = true;
      onMove(move);
    }

    function onPointerUp(e) {
      if (stateRef.current) {
        if (
          stateRef.current.pointerId !== undefined &&
          e?.pointerId !== undefined &&
          e.pointerId !== stateRef.current.pointerId
        ) {
          return;
        }
        if (controlsRef?.current) controlsRef.current.enabled = true;
        stateRef.current = null;
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      if (controls) controls.enabled = true;
    };
  }, [enabled, onMove, camera, gl, cubeGroupRef, controlsRef]);

  return null;
}
