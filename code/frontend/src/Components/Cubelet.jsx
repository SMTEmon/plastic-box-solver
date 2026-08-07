import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

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
      </mesh>
    </>
  );
}
