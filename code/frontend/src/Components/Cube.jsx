import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import JEASINGS, { JEasing } from "jeasings";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import Cubelet from "./Cubelet";
import Buttons from "./Buttons";
import { parseCubeString } from "../lib/cubeInput.js";
import { mapFacesToCubelets } from "../lib/mapToCubelets.js";

export default function Cube({ initialFaces }) {
  const ref = useRef();

  const roundedBoxGeometry = useMemo(() => {
    return new RoundedBoxGeometry(1, 1, 1, 3, 0.1);
  }, []);

  useFrame(() => {
    JEASINGS.update();
  });

  // prepare cubelet stickers map if initialFaces provided
  let stickersMap = null;
  try {
    if (initialFaces) {
      const faces =
        typeof initialFaces === "string"
          ? parseCubeString(initialFaces)
          : initialFaces;
      stickersMap = mapFacesToCubelets(faces);
    }
  } catch (e) {
    // swallow parse errors for now, fall back to default rendering
    console.warn("Invalid initialFaces provided:", e.message);
    stickersMap = null;
  }

  return (
    <>
      <group ref={ref}>
        {[...Array(3).keys()].map((x) =>
          [...Array(3).keys()].map((y) =>
            [...Array(3).keys()].map((z) => (
              <Cubelet
                key={x + y * 3 + z * 9}
                position={[x - 1, y - 1, z - 1]}
                geometry={roundedBoxGeometry}
                stickers={
                  stickersMap
                    ? stickersMap[`${x - 1},${y - 1},${z - 1}`]
                    : undefined
                }
              />
            )),
          ),
        )}
      </group>
      <Buttons cubeGroup={ref} />
    </>
  );
}
