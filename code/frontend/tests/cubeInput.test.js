import assert from "node:assert/strict";
import test from "node:test";

import { parseCubeFaceRows } from "../src/lib/cubeInput.js";

test("parses cube face rows in the order they are entered", () => {
  assert.deepEqual(parseCubeFaceRows("RRRRGRRRR\nGGGGRGGG"), [
    "RRRRGRRRR",
    "GGGGRGGG",
  ]);
});

test("ignores blank lines and surrounding whitespace", () => {
  assert.deepEqual(parseCubeFaceRows("  RRRRGRRRR  \n\n  GGGGRGGG  \n"), [
    "RRRRGRRRR",
    "GGGGRGGG",
  ]);
});
