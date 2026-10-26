import { useRef } from "react";
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

// Module-level pre-instantiated 20% opacity ghost materials for focus mode
const GHOST_MATERIALS = {
  white: new THREE.MeshStandardMaterial({ color: "white", transparent: true, opacity: 0.2, depthWrite: false }),
  yellow: new THREE.MeshStandardMaterial({ color: "yellow", transparent: true, opacity: 0.2, depthWrite: false }),
  red: new THREE.MeshStandardMaterial({ color: "red", transparent: true, opacity: 0.2, depthWrite: false }),
  darkorange: new THREE.MeshStandardMaterial({ color: "darkorange", transparent: true, opacity: 0.2, depthWrite: false }),
  green: new THREE.MeshStandardMaterial({ color: "green", transparent: true, opacity: 0.2, depthWrite: false }),
  blue: new THREE.MeshStandardMaterial({ color: "blue", transparent: true, opacity: 0.2, depthWrite: false }),
  black: new THREE.MeshStandardMaterial({ color: "black", transparent: true, opacity: 0.15, depthWrite: false }),
};

export default function Cubelet({ position, geometry, stickers }) {
  const meshRef = useRef();
  const textRef = useRef();

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

  const ghostMaterials = [0, 1, 2, 3, 4, 5].map((i) => {
    const color =
      stickers && stickers[i]
        ? letterToColor[stickers[i]] || "black"
        : position[colorSides[i][0]] === colorSides[i][1]
          ? colorSides[i][2]
          : "black";
    return GHOST_MATERIALS[color] || GHOST_MATERIALS.black;
  });

  return (
    <>
      <mesh
        ref={(el) => {
          meshRef.current = el;
          if (el) {
            el.userData.isCubelet = true;
            el.userData.normalMaterials = materials;
            el.userData.ghostMaterials = ghostMaterials;
            el.userData.textRef = textRef;
          }
        }}
        position={position}
        geometry={geometry}
        material={materials}
      >
        {labelInfo && (
          <Text
            ref={textRef}
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
