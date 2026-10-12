import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, GizmoHelper, GizmoViewport } from "@react-three/drei";
import { Suspense } from "react";
import Cube from "../Components/Cube";

/**
 * onAnimatorReady receives the animator created inside Cube, so pages can
 * queue moves into it (keyboard turns, auto-solve playback, guided stepping).
 */
export default function CubeScene({ onAnimatorReady, controlsRef }) {
  return (
    <Canvas camera={{ position: [3.4, 3.4, 3.4] }}>
      <Suspense fallback={null}>
        <Environment preset="forest" />
      </Suspense>
      <Cube onAnimatorReady={onAnimatorReady} />
      <OrbitControls ref={controlsRef} target={[0, 0, 0]} enablePan={false} makeDefault />
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
