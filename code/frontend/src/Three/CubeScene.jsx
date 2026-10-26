import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Suspense, useRef } from "react";
import Cube from "../Components/Cube";
import SwipeControls from "../Components/SwipeControls";

/**
 * onAnimatorReady receives the animator created inside Cube, so pages can
 * queue moves into it (keyboard turns, auto-solve playback, guided stepping).
 *
 * onMove + swipeEnabled power the touch swipe-to-turn layer controls.
 */
export default function CubeScene({
  onAnimatorReady,
  controlsRef,
  onMove,
  swipeEnabled,
  facelets,
  sceneEpoch,
  onMoveDone,
  activeFace,
}) {
  const cubeGroupRef = useRef();
  const fallbackControlsRef = useRef();
  const effectiveControlsRef = controlsRef ?? fallbackControlsRef;

  return (
    <Canvas camera={{ position: [3.4, 3.4, 3.4] }}>
      <Suspense fallback={null}>
        <Environment preset="forest" />
      </Suspense>
      <Cube
        onAnimatorReady={onAnimatorReady}
        cubeGroupRef={cubeGroupRef}
        facelets={facelets}
        sceneEpoch={sceneEpoch}
        onMoveDone={onMoveDone}
        activeFace={activeFace}
      />
      <OrbitControls ref={effectiveControlsRef} target={[0, 0, 0]} enablePan={false} makeDefault />
      <SwipeControls
        cubeGroupRef={cubeGroupRef}
        controlsRef={effectiveControlsRef}
        onMove={onMove}
        enabled={swipeEnabled}
      />
      <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
        <GizmoViewport
          axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
          labels={["R", "U", "F"]}
          labelColor="white"
        />
      </GizmoHelper>
    </Canvas>
  );
}
