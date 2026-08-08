import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Html } from "@react-three/drei";
import { Suspense, useRef, useImperativeHandle } from "react";
import Cube from "../Components/Cube";

/** Where each face label floats, just outside the cube. */
const LABELS = [
  { face: "U", name: "TOP", position: [0, 2.1, 0] },
  { face: "D", name: "BOTTOM", position: [0, -2.1, 0] },
  { face: "R", name: "RIGHT", position: [2.1, 0, 0] },
  { face: "L", name: "LEFT", position: [-2.1, 0, 0] },
  { face: "F", name: "FRONT", position: [0, 0, 2.1] },
  { face: "B", name: "BACK", position: [0, 0, -2.1] },
];

/**
 * Floating face names. Orbiting the camera makes it very easy to lose track of
 * which side is which, and every instruction is phrased in terms of these
 * names, so they have to be visible in the scene rather than in a legend.
 */
function FaceLabels() {
  return LABELS.map(({ face, name, position }) => (
    <Html key={face} position={position} center distanceFactor={9}>
      <div
        style={{
          padding: "2px 7px",
          borderRadius: 6,
          border: "1px solid rgba(0,243,255,0.45)",
          background: "rgba(10,10,18,0.82)",
          color: "#00f3ff",
          font: "600 11px ui-monospace, monospace",
          letterSpacing: "0.06em",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {name}
      </div>
    </Html>
  ));
}

const HOME_CAMERA = [3.6, 3.4, 4.2];

/**
 * @param onAnimatorReady receives the animator created inside Cube, so pages
 *        can queue moves into it.
 * @param viewRef         imperative handle exposing resetView().
 */
export default function CubeScene({
  onAnimatorReady,
  showLabels = false,
  viewRef,
}) {
  const controls = useRef();

  useImperativeHandle(viewRef, () => ({
    resetView: () => controls.current?.reset(),
  }));

  return (
    <Canvas camera={{ position: HOME_CAMERA }}>
      <Suspense fallback={null}>
        <Environment preset="forest" />
      </Suspense>
      <Cube onAnimatorReady={onAnimatorReady} />
      {showLabels && <FaceLabels />}
      <OrbitControls ref={controls} target={[0, 0, 0]} enablePan={false} />
    </Canvas>
  );
}
