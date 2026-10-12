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
  B: "blue"
};

export default function Cubelet({ position, geometry, stickers }) {
  const isCenter = Math.abs(position[0]) + Math.abs(position[1]) + Math.abs(position[2]) === 1;
  const posKey = `${position[0]},${position[1]},${position[2]}`;
  const labelInfo = isCenter ? centerLabels[posKey] : null;

  return (
    <>
      <mesh position={position} geometry={geometry}>
        {[...Array(6).keys()].map((i) => (
          <meshStandardMaterial
            key={i}
            attach={`material-${i}`}
            color={
              stickers && stickers[i]
                ? letterToColor[stickers[i]] || "black"
                : position[colorSides[i][0]] === colorSides[i][1]
                  ? colorSides[i][2]
                  : `black`
            }
          />
        ))}
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
