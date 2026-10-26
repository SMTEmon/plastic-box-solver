import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import JEASINGS from "jeasings";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

import Cubelet from "./Cubelet";
import { mapFacesToCubelets } from "../lib/mapToCubelets.js";
import { faceletsToFaces } from "../cube/facelets.js";
import { createAnimator } from "../cube/animate.js";
import { getActiveLayerY } from "../cube/stageGuides.js";
import { useCubeStore, MODES } from "../store/cubeStore.js";

const ROUNDED_BOX_GEOMETRY = new RoundedBoxGeometry(1, 1, 1, 3, 0.1);

// Placed at 1.85 so edge cubelets sweeping to ~1.58 during layer turns never clip
const FIXED_LABELS = [
  { face: "R", pos: [1.85, 0, 0], rot: [0, Math.PI / 2, 0] },
  { face: "L", pos: [-1.85, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { face: "U", pos: [0, 1.85, 0], rot: [-Math.PI / 2, 0, 0] },
  { face: "D", pos: [0, -1.85, 0], rot: [Math.PI / 2, 0, 0] },
  { face: "F", pos: [0, 0, 1.85], rot: [0, 0, 0] },
  { face: "B", pos: [0, 0, -1.85], rot: [0, Math.PI, 0] },
];

/**
 * 27 cubelets plus the rotation group the animator re-parents layers into.
 *
 * Sticker colours are derived from the store's logical facelets ONCE per
 * sceneEpoch (i.e. on load/reset). In between, the animation owns the visuals:
 * turning a layer physically moves those meshes and their colours travel with
 * them. Re-deriving colours on every move would apply each turn twice.
 */
export default function Cube({ onAnimatorReady, cubeGroupRef }) {
  const internalRef = useRef();
  const cubeGroup = cubeGroupRef ?? internalRef;
  const rotationGroup = useRef();

  const sceneEpoch = useCubeStore((s) => s.sceneEpoch);
  const solution = useCubeStore((s) => s.solution);
  const cursor = useCubeStore((s) => s.cursor);
  const mode = useCubeStore((s) => s.mode);
  const currentMove =
    mode === MODES.GUIDED || mode === MODES.AUTO
      ? solution?.moves?.[cursor]
      : null;
  const activeFace =
    currentMove && "URFDLB".includes(currentMove[0]) ? currentMove[0] : null;

  const tempVec = useRef(new THREE.Vector3()).current;
  const wasFocusModeRef = useRef(false);
  const lastActiveYRef = useRef(null);

  useFrame(() => {
    JEASINGS.update();

    const { focusMode, mode: currentMode } = useCubeStore.getState();
    const isFocusActive = Boolean(focusMode && currentMode === MODES.GUIDED);
    const stage = isFocusActive ? useCubeStore.getState().currentStage() : null;
    const activeY = isFocusActive ? getActiveLayerY(stage?.name) : null;

    const isRotating = Boolean(rotationGroup.current?.children?.length);
    const focusChanged = wasFocusModeRef.current !== isFocusActive;
    const activeYChanged = JSON.stringify(lastActiveYRef.current) !== JSON.stringify(activeY);

    if (!isFocusActive && !wasFocusModeRef.current) {
      return;
    }

    // Skip per-frame traversal when cube is idle and focus state hasn't changed
    if (!isRotating && !focusChanged && !activeYChanged) {
      return;
    }

    wasFocusModeRef.current = isFocusActive;
    lastActiveYRef.current = activeY;

    const updateMesh = (mesh) => {
      if (!mesh?.userData?.isCubelet) return;
      const { normalMaterials, ghostMaterials } = mesh.userData;

      if (!isFocusActive || !activeY) {
        if (mesh.material !== normalMaterials) {
          mesh.material = normalMaterials;
        }
        return;
      }

      mesh.getWorldPosition(tempVec);
      const currentY = Math.round(tempVec.y);
      const isActive = activeY.includes(currentY);

      if (isActive) {
        if (mesh.material !== normalMaterials) {
          mesh.material = normalMaterials;
        }
      } else {
        if (mesh.material !== ghostMaterials) {
          mesh.material = ghostMaterials;
        }
      }
    };

    if (cubeGroup.current) {
      cubeGroup.current.children.forEach(updateMesh);
    }
    if (rotationGroup.current) {
      rotationGroup.current.children.forEach(updateMesh);
    }
  });

  // Read facelets imperatively so this only recomputes when the epoch changes.
  const stickersMap = useMemo(() => {
    try {
      return mapFacesToCubelets(faceletsToFaces(useCubeStore.getState().facelets));
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneEpoch]);

  useEffect(() => {
    if (!cubeGroup.current || !rotationGroup.current) return;
    const animator = createAnimator(cubeGroup.current, rotationGroup.current);
    onAnimatorReady?.(animator);
    return () => animator.cancel();
  }, [onAnimatorReady, cubeGroup]);

  return (
    <>
      <group key={sceneEpoch} ref={cubeGroup}>
        {[-1, 0, 1].map((x) =>
          [-1, 0, 1].map((y) =>
            [-1, 0, 1].map((z) => (
              <Cubelet
                key={`${x},${y},${z}`}
                position={[x, y, z]}
                geometry={ROUNDED_BOX_GEOMETRY}
                stickers={
                  stickersMap
                    ? stickersMap[`${x},${y},${z}`]
                    : undefined
                }
              />
            )),
          ),
        )}
      </group>
      <group ref={rotationGroup} />

      {/* World-space face indicators that never rotate away during turns or reorientations */}
      <Suspense fallback={null}>
        {FIXED_LABELS.map(({ face, pos, rot }) => {
          const isActive = activeFace === face;
          return (
            <Text
              key={face}
              position={pos}
              rotation={rot}
              fontSize={isActive ? 0.38 : 0.3}
              color={isActive ? "#00f3ff" : "#94a3b8"}
              anchorX="center"
              anchorY="middle"
              outlineWidth={isActive ? 0.04 : 0.02}
              outlineColor={isActive ? "#003b46" : "#0f172a"}
            >
              {face}
            </Text>
          );
        })}
      </Suspense>
    </>
  );
}
