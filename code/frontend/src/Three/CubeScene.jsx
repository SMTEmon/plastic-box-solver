import { Canvas } from "@react-three/fiber";
import { Stats, OrbitControls, Environment } from "@react-three/drei";
import { Suspense } from "react";
import Cube from "../Components/Cube";

export default function CubeScene({ initialFaces, interactive = false }) {
  return (
    <Canvas camera={{ position: [3, 3, 3] }}>
      <Suspense>
        <Environment preset="forest" />
      </Suspense>
      <Cube initialFaces={initialFaces} interactive={interactive} />
      <OrbitControls target={[0, 0, 0]} />
      {interactive && <Stats />}
    </Canvas>
  );
}