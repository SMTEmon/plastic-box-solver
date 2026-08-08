import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { Suspense } from "react";
import Cube from "../Components/Cube";

/**
 * onAnimatorReady receives the animator created inside Cube, so pages can
 * queue moves into it (keyboard turns, auto-solve playback, guided stepping).
 */
export default function CubeScene({ onAnimatorReady }) {
  return (
    <Canvas camera={{ position: [3.4, 3.4, 3.4] }}>
      <Suspense fallback={null}>
        <Environment preset="forest" />
      </Suspense>
      <Cube onAnimatorReady={onAnimatorReady} />
      <OrbitControls target={[0, 0, 0]} enablePan={false} />
    </Canvas>
  );
}
