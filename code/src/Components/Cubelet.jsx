import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

const colorSides = [
  [0, 1, "darkorange"],
  [0, -1, "red"],
  [1, 1, "white"],
  [1, -1, "yellow"],
  [2, 1, "green"],
  [2, -1, "blue"],
];

export default function Cubelet({ position, geometry }) {
  return (
    <>
      <mesh position={position} geometry={geometry}>
        {[...Array(6).keys()].map((i) => (
          <meshStandardMaterial
            key={i}
            attach={`material-${i}`}
            color={
              position[colorSides[i][0]] === colorSides[i][1]
                ? colorSides[i][2]
                : `black`
            }
          />
        ))}
      </mesh>
    </>
  );
}
