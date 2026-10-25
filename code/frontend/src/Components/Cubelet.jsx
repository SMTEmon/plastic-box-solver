import * as THREE from "three";
import { Text } from "@react-three/drei";

const centerLabels = {
  "1,0,0": { text: "R", rotation: [0, Math.PI / 2, 0], pos: [0.51, 0, 0] },
  "-1,0,0": { text: "L", rotation: [0, -Math.PI / 2, 0], pos: [-0.51, 0, 0] },
  "0,1,0": { text: "U", rotation: [-Math.PI / 2, 0, 0], pos: [0, 0.51, 0] },
  "0,-1,0": { text: "D", rotation: [Math.PI / 2, 0, 0], pos: [0, -0.51, 0] },
  "0,0,1": { text: "F", rotation: [0, 0, 0], pos: [0, 0, 0.51] },
  "0,0,-1": { text: "B", rotation: [0, Math.PI, 0], pos: [0, 0, -0.51] },
};

const colorSides = [
  [0, 1, "red"],         // +x Right
  [0, -1, "darkorange"], // -x Left
  [1, 1, "white"],       // +y Up
  [1, -1, "yellow"],     // -y Down
  [2, 1, "green"],       // +z Front
  [2, -1, "blue"],       // -z Back
];

const letterToColor = {
  W: "white",
  Y: "yellow",
  R: "red",
  O: "darkorange",
  G: "green",
  B: "blue",
};

// Module-level pre-instantiated materials map (7 materials: 6 colours + black body)
const MATERIALS = {
  white: new THREE.MeshStandardMaterial({ color: "white" }),
  yellow: new THREE.MeshStandardMaterial({ color: "yellow" }),
  red: new THREE.MeshStandardMaterial({ color: "red" }),
  darkorange: new THREE.MeshStandardMaterial({ color: "darkorange" }),
  green: new THREE.MeshStandardMaterial({ color: "green" }),
  blue: new THREE.MeshStandardMaterial({ color: "blue" }),
  black: new THREE.MeshStandardMaterial({ color: "black" }),
};

export default function Cubelet({ position, geometry, stickers }) {
  const isCenter = Math.abs(position[0]) + Math.abs(position[1]) + Math.abs(position[2]) === 1;
  const posKey = `${position[0]},${position[1]},${position[2]}`;
  const labelInfo = isCenter ? centerLabels[posKey] : null;

  const materials = [0, 1, 2, 3, 4, 5].map((i) => {
    const color =
      stickers && stickers[i]
        ? letterToColor[stickers[i]] || "black"
        : position[colorSides[i][0]] === colorSides[i][1]
          ? colorSides[i][2]
          : "black";
    return MATERIALS[color] || MATERIALS.black;
  });

  return (
    <>
      <mesh position={position} geometry={geometry} material={materials}>
        {labelInfo && (
          <Text
            position={labelInfo.pos}
            rotation={labelInfo.rotation}
            fontSize={0.36}
            color="#0f172a"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.03}
            outlineColor="#ffffff"
          >
            {labelInfo.text}
          </Text>
        )}
      </mesh>
    </>
  );
}
