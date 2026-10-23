import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  getCandidateMoves,
  detectMove,
  toScreen,
} from "../src/cube/swipe.js";
import { MOVE_SPEC } from "../src/cube/animate.js";

const AXIS_VECTORS = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

const canvas = { clientWidth: 400, clientHeight: 400 };

test("getCandidateMoves returns correct layer moves per face", () => {
  // Front face (normal 0, 0, 1), top-right corner (1, 1, 1)
  const frontTopRight = getCandidateMoves(new THREE.Vector3(0, 0, 1), [1, 1, 1]);
  assert.deepEqual(frontTopRight.sort(), ["R", "R'", "U", "U'"].sort());

  // Front face, center (0, 0, 1) -> slice candidates M and E
  const frontCenter = getCandidateMoves(new THREE.Vector3(0, 0, 1), [0, 0, 1]);
  assert.deepEqual(frontCenter.sort(), ["E", "E'", "M", "M'"].sort());

  // Right face (normal 1, 0, 0), front-top (1, 1, 1)
  const rightFrontTop = getCandidateMoves(new THREE.Vector3(1, 0, 0), [1, 1, 1]);
  assert.deepEqual(rightFrontTop.sort(), ["F", "F'", "U", "U'"].sort());

  // Up face (normal 0, 1, 0), front-center (0, 1, 1)
  const upFrontCenter = getCandidateMoves(new THREE.Vector3(0, 1, 0), [0, 1, 1]);
  assert.deepEqual(upFrontCenter.sort(), ["F", "F'", "M", "M'"].sort());
});

test("detectMove maps swipes correctly across all 6 faces with default camera", () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(3.4, 3.4, 3.4);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const faces = [
    { name: "Front", normal: new THREE.Vector3(0, 0, 1) },
    { name: "Up", normal: new THREE.Vector3(0, 1, 0) },
    { name: "Right", normal: new THREE.Vector3(1, 0, 0) },
  ];

  for (const f of faces) {
    for (let c1 = -1; c1 <= 1; c1++) {
      for (let c2 = -1; c2 <= 1; c2++) {
        const pos = [0, 0, 0];
        if (f.name === "Front") { pos[0] = c1; pos[1] = c2; pos[2] = 1; }
        else if (f.name === "Up") { pos[0] = c1; pos[1] = 1; pos[2] = c2; }
        else if (f.name === "Right") { pos[0] = 1; pos[1] = c1; pos[2] = c2; }

        const hitPoint = new THREE.Vector3(...pos).add(f.normal.clone().multiplyScalar(0.5));
        const candidates = getCandidateMoves(f.normal, pos);

        for (const expectedMove of candidates) {
          const isPrime = expectedMove.endsWith("'");
          const base = expectedMove[0];
          const spec = MOVE_SPEC[base];
          const rotSign = isPrime ? -spec.sign : spec.sign;
          const omega = AXIS_VECTORS[spec.axis].clone().multiplyScalar(rotSign);
          const v = new THREE.Vector3().crossVectors(omega, hitPoint);
          const screenOrigin = toScreen(hitPoint, camera, canvas);
          const far = hitPoint.clone().addScaledVector(v, 0.1);
          const screenDir = toScreen(far, camera, canvas).sub(screenOrigin);

          const detected = detectMove(hitPoint, f.normal, pos, screenDir, camera, canvas);
          assert.equal(
            detected,
            expectedMove,
            `Failed on face ${f.name}, pos [${pos}], expected ${expectedMove}, got ${detected}`,
          );
        }
      }
    }
  }
});

test("detectMove maps swipes correctly from opposite camera perspective", () => {
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
  camera.position.set(-3.4, -3.4, -3.4);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const faces = [
    { name: "Back", normal: new THREE.Vector3(0, 0, -1) },
    { name: "Down", normal: new THREE.Vector3(0, -1, 0) },
    { name: "Left", normal: new THREE.Vector3(-1, 0, 0) },
  ];

  for (const f of faces) {
    for (let c1 = -1; c1 <= 1; c1++) {
      for (let c2 = -1; c2 <= 1; c2++) {
        const pos = [0, 0, 0];
        if (f.name === "Back") { pos[0] = c1; pos[1] = c2; pos[2] = -1; }
        else if (f.name === "Down") { pos[0] = c1; pos[1] = -1; pos[2] = c2; }
        else if (f.name === "Left") { pos[0] = -1; pos[1] = c1; pos[2] = c2; }

        const hitPoint = new THREE.Vector3(...pos).add(f.normal.clone().multiplyScalar(0.5));
        const candidates = getCandidateMoves(f.normal, pos);

        for (const expectedMove of candidates) {
          const isPrime = expectedMove.endsWith("'");
          const base = expectedMove[0];
          const spec = MOVE_SPEC[base];
          const rotSign = isPrime ? -spec.sign : spec.sign;
          const omega = AXIS_VECTORS[spec.axis].clone().multiplyScalar(rotSign);
          const v = new THREE.Vector3().crossVectors(omega, hitPoint);
          const screenOrigin = toScreen(hitPoint, camera, canvas);
          const far = hitPoint.clone().addScaledVector(v, 0.1);
          const screenDir = toScreen(far, camera, canvas).sub(screenOrigin);

          const detected = detectMove(hitPoint, f.normal, pos, screenDir, camera, canvas);
          assert.equal(
            detected,
            expectedMove,
            `Failed on face ${f.name}, pos [${pos}], expected ${expectedMove}, got ${detected}`,
          );
        }
      }
    }
  }
});
