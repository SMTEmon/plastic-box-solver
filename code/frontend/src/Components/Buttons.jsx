import { useControls, button } from "leva";
import { useRef } from "react";
import JEASINGS, { JEasing } from "jeasings";

function resetCubeGroup(cubeGroup, rotationGroup) {
  rotationGroup.children
    .slice()
    .reverse()
    .forEach(function (c) {
      cubeGroup.attach(c);
    });
  rotationGroup.quaternion.set(0, 0, 0, 1);
}

function attachToRotationGroup(cubeGroup, rotationGroup, axis, limit) {
  cubeGroup.children
    .slice()
    .reverse()
    .filter(function (c) {
      return limit < 0 ? c.position[axis] < limit : c.position[axis] > limit;
    })
    .forEach(function (c) {
      rotationGroup.attach(c);
    });
}

function animateRotationGroup(rotationGroup, axis, multiplier) {
  new JEasing(rotationGroup.rotation)
    .to(
      {
        [axis]: rotationGroup.rotation[axis] + (Math.PI / 2) * multiplier,
      },
      250,
    )
    .easing(JEASINGS.Cubic.InOut)
    .start();
}

function rotate(cubeGroup, rotationGroup, axis, limit, multiplier) {
  if (!JEASINGS.getLength()) {
    resetCubeGroup(cubeGroup, rotationGroup);
    attachToRotationGroup(cubeGroup, rotationGroup, axis, limit);
    animateRotationGroup(rotationGroup, axis, multiplier);
  }
}

export default function Buttons({ cubeGroup }) {
  const rotationGroup = useRef();

  useControls("Cube", {
    "Left CW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "x", -0.5, 1);
    }),
    "Left CCW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "x", -0.5, -1);
    }),
    "Right CW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "x", 0.5, -1);
    }),
    "Right CCW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "x", 0.5, 1);
    }),
    "Back CW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "z", -0.5, 1);
    }),
    "Back CCW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "z", -0.5, -1);
    }),
    "Front CW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "z", 0.5, -1);
    }),
    "Front CCW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "z", 0.5, 1);
    }),
    "Top CW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "y", 0.5, -1);
    }),
    "Top CCW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "y", 0.5, 1);
    }),
    "Bottom CW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "y", -0.5, 1);
    }),
    "Bottom CCW": button(() => {
      rotate(cubeGroup.current, rotationGroup.current, "y", -0.5, -1);
    }),
  });

  return (
    <>
      <group ref={rotationGroup} />
    </>
  );
}
