import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import JEASINGS from "jeasings";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import Cubelet from "./Cubelet";
import { mapFacesToCubelets } from "../lib/mapToCubelets.js";
import { faceletsToFaces } from "../cube/facelets.js";
import { createAnimator } from "../cube/animate.js";
import { useCubeStore } from "../store/cubeStore.js";

/**
 * 27 cubelets plus the rotation group the animator re-parents layers into.
 *
 * Sticker colours are derived from the store's logical facelets ONCE per
 * sceneEpoch (i.e. on load/reset). In between, the animation owns the visuals:
 * turning a layer physically moves those meshes and their colours travel with
 * them. Re-deriving colours on every move would apply each turn twice.
 */
export default function Cube({ onAnimatorReady, onProgress }) {
  const cubeGroup = useRef();
  const rotationGroup = useRef();

  const sceneEpoch = useCubeStore((s) => s.sceneEpoch);

  const roundedBoxGeometry = useMemo(
    () => new RoundedBoxGeometry(1, 1, 1, 3, 0.1),
    [],
  );

  useFrame(() => {
    JEASINGS.update();
  });

  // Read facelets imperatively so this only recomputes when the epoch changes.
  const stickersMap = useMemo(() => {
    try {
      return mapFacesToCubelets(
        faceletsToFaces(useCubeStore.getState().facelets),
      );
    } catch (e) {
      console.warn("Cube: could not map facelets ->", e.message);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneEpoch]);

  // One animator for the lifetime of the scene.
  useEffect(() => {
    const animator = createAnimator({
      cubeGroup,
      rotationGroup,
      onMoveDone: (move, count) => {
        useCubeStore.getState().applyMove(move, count);
      },
      onProgress: (p) => onProgress?.(p),
    });
    onAnimatorReady?.(animator);
    return () => animator.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {/* key on sceneEpoch: remount all cubelets at their home positions
          whenever a new cube is loaded, so the scene matches the logical state. */}
      <group ref={cubeGroup} key={sceneEpoch}>
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
      <group ref={rotationGroup} />
    </>
  );
}
